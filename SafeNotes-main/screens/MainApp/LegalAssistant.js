import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StatusBar,
  Keyboard,
  Animated,
} from "react-native";
import Constants from "expo-constants";
import { theme } from "../../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { Linking, Alert } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import BackButton from "../../components/UI/BackButton";
import { supabase } from "../../services/supabaseClient";
import { useNavigation } from "@react-navigation/native";
import * as GoogleGenerativeAI from "@google/generative-ai";

/*
  LegalAssistant.js
  - Trauma-informed legal assistant focused on domestic violence (India)
  - Uses Gemini (Gemini 2.5 flash preferred) for conversation & extraction
  - Falls back to SerpAPI for validated IPC/PDV sections when Gemini is unsure
  - Stores all interactions in Supabase table `legal_assistant_interactions`
  - Can extract FIR fields and generate/share a PDF FIR draft
*/

// --- Helper: load keys from Expo Constants or process.env ---
const loadKey = (name) => {
  const extra = Constants.expoConfig?.extra ?? Constants.manifest?.extra ?? {};
  if (extra && extra[name]) return extra[name];
  if (process.env && process.env[name]) return process.env[name];
  return null;
};

const GEMINI_API_KEY = loadKey('GEMINI_API_KEY');
const GEMINI_MODEL_ID = loadKey('GEMINI_MODEL_ID') || 'gemini-2.5-flash';
const SERPAPI_KEY = loadKey('SERPAPI_KEY') || loadKey('SERPAPI');

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI.GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Minimal system prompt tailored for legal assistant (domestic violence focus)
// Enhanced system prompt with clear transitions between info gathering and FIR creation
const SYSTEM_PROMPT = `You are a trauma-informed legal assistant focused on domestic violence in India. Your role has two phases:

PHASE 1 - Information Gathering:
- Ask essential questions in a compassionate, step-by-step way
- Required fields: victim name, age, contact, incident date/time/place, brief chronology
- Optional fields: witness details, evidence details, medical reports
- Clarify unclear details gently
- When suggesting IPC sections, if unsure say "NEEDS_SEARCH"

PHASE 2 - FIR Creation (when you have sufficient info):
- Signal readiness by saying "I have enough information to prepare the FIR draft."
- If user requests FIR or if you have all essential details, begin compiling
- Present your final response before PDF creation clearly marked with "READY_FOR_FIR"

Always maintain trauma-informed, empathetic communication while gathering facts systematically.`;

// Template for generating proper FIR document
const FIR_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Arial, sans-serif; line-height: 1.6; padding: 40px; }
  .header { text-align: center; margin-bottom: 30px; }
  .section { margin: 20px 0; }
  .section-title { font-weight: bold; margin-bottom: 10px; }
  .footer { margin-top: 40px; }
  .signature-line { margin-top: 20px; border-top: 1px solid #000; width: 200px; }
</style>
</head>
<body>
  <div class="header">
    <h2>FIRST INFORMATION REPORT</h2>
    <p>(Under Section 154 Cr.P.C)</p>
  </div>
  {{CONTENT}}
  <div class="footer">
    <div style="float:left">
      <p>Date: {{DATE}}</p>
      <p class="signature-line">Signature of Complainant</p>
    </div>
    <div style="float:right">
      <p class="signature-line">Signature of Officer</p>
    </div>
  </div>
</body>
</html>`;

export default function LegalAssistant() {
  const navigation = useNavigation();
  const selectedAvatar = null;
  const [messages, setMessages] = useState([{
    role: 'assistant',
    text: 'Hi — I am here to listen and help. Tell me what happened when you are ready.'
  }]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatRef = useRef(null);

  // Memoized message item to reduce re-renders for large lists
  const MessageItem = React.memo(({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}>
        {!isUser && <Image source={require('../../assets/bot.jpg')} style={styles.botAvatar} />}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
          <Text style={styles.messageText}>{item.text}</Text>
        </View>
      </View>
    );
  });

  const renderItem = React.useCallback(({ item }) => <MessageItem item={item} />, [MessageItem]);

  useEffect(() => {
    // Always start fresh when entering the Legal Assistant screen.
    // Do NOT populate UI from stored interactions so user gets a new chat each time.
    setMessages([
      {
        role: 'assistant',
        text: 'Hi — I am here to listen and help. Tell me what happened when you are ready.'
      }
    ]);
  }, []);

  const saveInteraction = async (role, message, metadata = {}) => {
    try {
      await supabase.from('legal_assistant_interactions').insert([{ role, message, metadata }]);
    } catch (e) {
      console.warn('Supabase insert failed', e);
    }
  };

  const querySerpApiForIPC = async (query) => {
    if (!SERPAPI_KEY) return null;
    try {
      const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&engine=google&lr=lang_en&gl=IN&api_key=${SERPAPI_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      // return top organic results snippets
      const items = (data.organic_results || []).slice(0,5).map(r => ({ title: r.title, link: r.link, snippet: r.snippet }));
      return items;
    } catch (err) {
      console.warn('SerpAPI error', err);
      return null;
    }
  };

  const callGemini = async (prompt) => {
    if (!genAI) throw new Error('Gemini not configured');
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_ID });
    const resp = await model.generateContent(prompt);
    // model library returns object with response.text()
    const text = (resp?.response?.text && resp.response.text()) || resp?.text || '';
    return text;
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const userText = inputText.trim();
    const userMsg = { role: 'user', text: userText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    await saveInteraction('user', userText);
    setIsLoading(true);

    try {
      // Build conversation prompt
      const prompt = `${SYSTEM_PROMPT}\n\nUser: ${userText}\nAssistant:`;
      let aiReply = '';
      try {
        aiReply = await callGemini(prompt);
      } catch (err) {
        console.warn('Gemini call failed', err);
        aiReply = 'I am having trouble reaching the helper service right now. Please try again shortly.';
      }

      // If model says NEEDS_SEARCH, run SerpAPI
      let metadata = {};
      if (aiReply && aiReply.includes('NEEDS_SEARCH')) {
        const results = await querySerpApiForIPC(userText + ' IPC relevant sections domestic violence India');
        metadata.sources = results;
        // ask Gemini to re-evaluate with top sources
        const sourceSummary = (results || []).map(r => `${r.title} - ${r.link}`).join('\n');
        try {
          const sourcePrompt = `${SYSTEM_PROMPT}\n\nSources:\n${sourceSummary}\n\nUser: ${userText}\nAssistant:`;
          aiReply = await callGemini(sourcePrompt);
        } catch (e) {
          console.warn('Gemini re-eval failed', e);
        }
      }

      const botMsg = { role: 'assistant', text: aiReply };
      setMessages(prev => [...prev, botMsg]);
      await saveInteraction('assistant', aiReply, metadata);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFIRAndShare = async () => {
    // Ask Gemini to extract FIR fields from conversation in a structured format
    const convoText = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');
    const extractPrompt = `
      Extract structured FIR information from the conversation below. Format as sections:
      
      Complainant Details: [Name, Age, Contact, Address]
      Incident Details: [Date, Time, Place, Detailed description of incident]
      Accused Details: [Name(s), Relationship to victim, Description]
      Witness Details: [Names and contact info if available]
      Evidence Details: [Any physical evidence, medical reports, photos, etc.]
      IPC Sections: [Relevant sections with brief explanations]

      Format each section clearly. If any section lacks information, note as "Information not provided."

      Conversation:
      ${convoText}
    `;
    
    setIsLoading(true);
    try {
      const contentText = await callGemini(extractPrompt);
      
      // Structure the content into sections
      const sections = [
        'Complainant Details',
        'Incident Details',
        'Accused Details',
        'Witness Details',
        'Evidence Details',
        'IPC Sections'
      ];

      // Parse and format sections
      let structuredContent = sections.map(section => {
        const regex = new RegExp(`${section}:[\\s\\S]*?(?=(${sections.join('|')}:|$))`, 'i');
        const match = contentText.match(regex);
        const content = match ? match[0].replace(`${section}:`, '').trim() : 'Information not provided';
        
        return `
          <div class="section">
            <div class="section-title">${section}</div>
            <div>${content}</div>
          </div>`;
      }).join('');

      // Generate formatted HTML using template
      const formattedHtml = FIR_TEMPLATE
        .replace('{{CONTENT}}', structuredContent)
        .replace('{{DATE}}', new Date().toLocaleDateString('en-IN'));

      const { uri } = await Print.printToFileAsync({
        html: formattedHtml,
        base64: false
      });

      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      } else {
        Alert.alert('FIR PDF saved', `File: ${uri}`);
      }
    } catch (err) {
      console.warn('FIR generation error', err);
      Alert.alert('Error', 'Could not generate FIR.');
    } finally { setIsLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#ffffff' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <BackButton />
          <Text style={styles.title}>Legal Assistant</Text>
          <TouchableOpacity onPress={() => { setMessages([{ role: 'assistant', text: "Hi — I am here to listen and help. Tell me what happened when you are ready." }]); }}>
            <Text style={{ color: '#9c711b' }}>Reset</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(item, idx) => `m-${idx}`}
          renderItem={renderItem}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
        />

        <View style={styles.inputWrapper}>
          <TextInput value={inputText} onChangeText={setInputText} placeholder="Describe the incident or ask for help" style={styles.inputField} multiline editable={!isLoading} />
          <TouchableOpacity onPress={handleSend} style={[styles.sendButton, (!inputText.trim() || isLoading) && { opacity: 0.5 }]} disabled={!inputText.trim() || isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendButtonText}>Send</Text>}
          </TouchableOpacity>
        </View>

        <View style={{ padding: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
          <TouchableOpacity style={styles.generateButton} onPress={generateFIRAndShare}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Generate FIR PDF</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 10 : 26,
    paddingBottom: 10,
    backgroundColor: '#fff'
  },
  title: { fontSize: 22, fontWeight: '700', color: '#9c711b' },
  messageRow: { flexDirection: 'row', paddingHorizontal: 12, marginVertical: 8, alignItems: 'flex-start' },
  userRow: { justifyContent: 'flex-end' },
  botRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', padding: 12, borderRadius: 16 },
  userBubble: { backgroundColor: '#f3f4f6', borderBottomRightRadius: 6 },
  botBubble: { backgroundColor: '#fff8f0', borderWidth: 1, borderColor: '#e6d2a3' },
  messageText: { color: '#111', fontSize: 16 },
  botAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 8 },
  inputWrapper: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderColor: '#eee', backgroundColor: '#fff' },
  inputField: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#e8e1d1' },
  sendButton: { backgroundColor: '#9c711b', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, marginLeft: 8, justifyContent: 'center', alignItems: 'center' },
  sendButtonText: { color: '#fff', fontWeight: '700' },
  generateButton: { backgroundColor: '#6a4d11', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 }
});



