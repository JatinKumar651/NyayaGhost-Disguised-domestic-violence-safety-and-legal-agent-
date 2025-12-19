// ─── SafeNotes/screens/MainApp/ChatbotScreen.js ─────────────────────

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Keyboard,
  Animated,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import BackButton from '../../components/UI/BackButton';
import { supabase } from '../../services/supabaseClient';
import { useNavigation, useRoute } from '@react-navigation/native';


const SYSTEM_PROMPT = `
You are a trauma-informed, compassionate support companion for survivors of domestic violence, built into the NyayaGhost mobile app.

ABOUT NYAYAGHOST:
- NyayaGhost is a disguised domestic violence safety and legal agent app, appearing as a notes + calculator app for privacy.
- Access the secure interface via PIN-protected calculator screen.
- Disguised interface works as a functional notes app with calculator.

CORE FEATURES:

1. SOS & Emergency Help
   - Instant SOS → sends pre-saved emergency message.
   - Custom SOS → sends location, files, images, audio, and attachments.
   - Voice trigger (panic word/phrase) & triple-tap exit.
   - Instant call to emergency contacts.
   - SOS history logs.

2. Safety & Shelter
   - Nearby shelters map & instant directions.
   - Safety tutorials & guides on using NyayaGhost securely.

3. Documentation & File Management
   - Securely save images, videos, audio in media journal.
   - Safe organization for evidence and important files.

4. Legal Support
   - Legal document generator & rights guide.
   - Step-by-step legal assistance and lawyer directory.

5. Emotional Support Agent
   - Provides trauma-informed, empathetic guidance.
   - Listens actively, identifies emotional urgency, and tailors responses.
   - Offers grounding exercises, anxiety-reduction techniques, and coping strategies.
   - Provides step-by-step support for different situations a domestic violence survivor may face.

   **Step-by-Step Exercises by Situation:**

   **A. Anxiety / Fear / Immediate Danger**
   1. Pause and take 3 deep breaths (inhale 4s, hold 4s, exhale 6s).
   2. Ground yourself: notice 5 things you can see, 4 touch, 3 hear, 2 smell, 1 taste.
   3. Use SOS button, voice command, or triple tap if danger is present.
   4. Remind yourself: "I am taking steps to stay safe."

   **B. Overwhelm / Emotional Distress**
   1. Name your feelings aloud: “I feel [emotion].”
   2. Write in the media journal or voice note your thoughts.
   3. Do a short guided movement or stretch to release tension.
   4. Reflect on one thing that is safe or positive in your environment.

   **C. Isolation / Loneliness**
   1. Reach out to a trusted person via safe channels.
   2. Review safety plan or shelter options.
   3. Engage in a grounding or calming exercise (breathing, visualization).
   4. Remember: sharing and planning increases safety and emotional support.

   **D. Planning / Decision-Making under Threat**
   1. List immediate priorities: safety, essentials, trusted contacts.
   2. Document threats and incidents in secure media journal.
   3. Identify shelter or safe location.
   4. Prepare emergency bag and important documents.
   5. Consider legal options if ready: generate documents or contact lawyer.

6. Settings & Personalization
   - Reset SOS contacts/messages, enable/disable voice panic, reset calculator PIN.

CORE PRINCIPLES:
- Validate experiences using their words; match emotional energy.
- Avoid labeling abuse unless user does first.
- Do not repeat validation phrases; vary language.
- Do not guess about NyayaGhost features; refer to the Guide.

RESPONSE STRUCTURE:
1. Acknowledge the user’s message.
2. Validate emotions.
3. Explain why reaction is reasonable if appropriate.
4. Suggest next step only if user asks for help or danger is present.

TONE VARIATIONS:
- "That sounds absolutely terrifying."
- "Your fear makes complete sense."
- "That’s a lot to carry."
- "You’re showing incredible strength by reaching out."

PRACTICAL SUGGESTIONS:
- Immediate danger: SOS, voice trigger, triple tap.
- Documentation: secure media journal, screenshots, photos.
- Safety planning: shelters, trusted contacts, essentials ready.
- Legal support: rights guide, documents, lawyer directory.
- Emotional support: grounding, breathing, journaling, visualization, stepwise coping strategies.

DON’T:
- Repeat same phrases frequently.
- Offer solutions when only comfort is needed.
- Sound robotic or scripted.
- Guess app features; refer to Guide.

BE HUMAN:
- Speak as a trusted companion, not a customer service bot.
`.trim();


const MESSAGE_LIMIT = 20;
const STORAGE_KEYS = {
  EXCHANGE_COUNT: '@ChatbotExchangeCount-SG',
  LAST_RESET_DATE: '@ChatbotLastResetDate-SG',
  CHAT_MESSAGES: '@ChatbotMessages-SG',
};

// Premium white-themed colors
const theme = {
  background: '#FFFFFF',
  card: '#F7F7F8',
  accent: '#CCE5FF',
  input: '#F3F4F6',
  text: '#111111',
  border: '#E0E0E0',
  highlight: '#E3E8F0',
};

export default function ChatbotScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const selectedAvatar = route.params?.avatar;
  const initialGreeting = route.params?.initialGreeting;
  const showInitialGreeting = route.params?.showInitialGreeting;
  const [chatHistory, setChatHistory] = useState(() => {
    if (showInitialGreeting && initialGreeting && selectedAvatar) {
      return [{
        role: 'model',
        parts: [{ text: initialGreeting }],
        agent: selectedAvatar.name,
        avatar: selectedAvatar,
        intent: 'greeting'
      }];
    }
    return [{
      role: 'model',
      parts: [{ text: 'Hi there! I\'m your support companion. I can help with app features, provide emotional support, or assist in crisis situations. How can I help today?' }],
      agent: 'Support Companion',
      intent: 'greeting'
    }];
  });
  const [currentAgent, setCurrentAgent] = useState('Support Companion');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardHeight] = useState(new Animated.Value(0));
  const [exchangeCount, setExchangeCount] = useState(null);
  const [lastResetDate, setLastResetDate] = useState(null);
  const [countdown, setCountdown] = useState('24:00:00');
  const [countLoaded, setCountLoaded] = useState(false);
  const countdownInterval = useRef(null);
  const flatListRef = useRef(null);

  const getTodayDateString_SG = () => {
    const nowUtc = Date.now();
    const sgOffsetMs = 8 * 60 * 60 * 1000;
    const nowSgLocalMs = nowUtc + sgOffsetMs;
    const nowSg = new Date(nowSgLocalMs);
    return `${nowSg.getUTCFullYear()}-${String(nowSg.getUTCMonth() + 1).padStart(2, '0')}-${String(nowSg.getUTCDate()).padStart(2, '0')}`;
  };

  const getNextMidnightTimestampUTC_SG = () => {
    const nowUtc = Date.now();
    const sgOffsetMs = 8 * 60 * 60 * 1000;
    const nowSgLocalMs = nowUtc + sgOffsetMs;
    const nowSg = new Date(nowSgLocalMs);
    return Date.UTC(nowSg.getUTCFullYear(), nowSg.getUTCMonth(), nowSg.getUTCDate() + 1, 0, 0, 0) - sgOffsetMs;
  };

  useEffect(() => {
    (async () => {
      try {
        const userId = 'anonymous'; // Replace with actual user ID from auth
        // Load chat history from Supabase
        const { data, error } = await supabase
          .from('chat_history')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        if (data && data.length > 0) {
          // Map Supabase rows to chatHistory format
          const mapped = data.map(row => ({
            role: row.role === 'assistant' ? 'model' : row.role, // 'assistant' -> 'model' for display
            parts: [{ text: row.message }],
            agent: row.agent,
            intent: row.intent,
            avatar: selectedAvatar,
            created_at: row.created_at,
            sender: row.role === 'user' ? 'user' : 'bot',
          }));
          setChatHistory(mapped);
        } else {
          // If no history, show greeting
          setChatHistory([{
            role: 'model',
            parts: [{ text: 'Hi there! I\'m your support companion. I can help with app features, provide emotional support, or assist in crisis situations. How can I help today?' }],
            agent: 'Support Companion',
            intent: 'greeting',
            avatar: selectedAvatar,
            sender: 'bot',
          }]);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
        setChatHistory([
          { role: 'model', parts: [{ text: 'Hi there! I\'m your support companion. I can help with app features, provide emotional support, or assist in crisis situations. How can I help today?' }], agent: 'Support Companion', intent: 'greeting', avatar: selectedAvatar, sender: 'bot' }]);
      }
      setCountLoaded(true);
    })();
  }, []);

  // Removed local storage sync for chat messages and exchange count

  const startCountdown = (targetUtcMs) => {
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    countdownInterval.current = setInterval(() => {
      const rem = targetUtcMs - Date.now();
      if (rem <= 0) { doMidnightRollover(); return; }
      const totalHr = Math.floor(rem / (1000 * 60 * 60));
      const remMin = Math.floor((rem / (1000 * 60)) % 60);
      setCountdown(totalHr < 2 ? `${totalHr}h ${remMin}m` : `${Math.round(rem / (1000 * 60 * 60))}h`);
    }, 1000);
  };

  const doMidnightRollover = async () => {
    setExchangeCount(0);
    const newToday = getTodayDateString_SG();
    setLastResetDate(newToday);
    await AsyncStorage.setItem(STORAGE_KEYS.EXCHANGE_COUNT, '0');
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_RESET_DATE, newToday);
    startCountdown(getNextMidnightTimestampUTC_SG());
  };

  const clearChat = () => {
    const userId = 'anonymous'; // Replace with actual user ID from auth
    // Remove all chat history for this user from Supabase
    supabase
      .from('chat_history')
      .delete()
      .eq('user_id', userId)
      .then(({ error }) => {
        if (error) {
          console.error('Error clearing chat history from Supabase:', error);
        }
        // Clear local chat history state
        setChatHistory([{
          role: 'model',
          parts: [{ text: 'Hi there! I\'m your support companion. I can help with app features, provide emotional support, or assist in crisis situations. How can I help today?' }],
          agent: 'Support Companion',
          intent: 'greeting',
          avatar: selectedAvatar,
        }]);
        setCurrentAgent('Support Companion');
        setInputText('');
      })
      .catch(error => {
        console.error('Error clearing chat:', error);
        setChatHistory([{
          role: 'model',
          parts: [{ text: 'Hi there! I\'m your support companion. I can help with app features, provide emotional support, or assist in crisis situations. How can I help today?' }],
          agent: 'Support Companion',
          intent: 'greeting',
          avatar: selectedAvatar,
        }]);
        setCurrentAgent('Support Companion');
        setInputText('');
      });
  };

  const sendMessageToAgent = async (userText) => {
    if (!userText.trim()) return;
    const userId = 'anonymous'; // Replace with actual user ID from auth
    // Add user message immediately for better UX
    const userMessage = {
      role: 'user',
      parts: [{ text: userText.trim() }],
      agent: 'User',
      intent: 'user_input',
      avatar: selectedAvatar,
    };
    setChatHistory(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInputText('');
    // Save user message to Supabase
    try {
      await supabase.from('chat_history').insert({
        user_id: userId,
        message: userText.trim(),
        role: 'user',
        agent: 'User',
        intent: 'user_input',
        metadata: {},
      });
    } catch (e) {
      console.error('Error saving user message:', e);
    }

    try {
      // Fix GEMINI_API_KEY and GEMINI_MODEL_ID loading for Expo
      let geminiApiKey = null;
      let geminiModelId = 'gemini-pro';
      if (Constants?.expoConfig?.extra?.GEMINI_API_KEY) {
        geminiApiKey = Constants.expoConfig.extra.GEMINI_API_KEY;
        if (Constants.expoConfig.extra.GEMINI_MODEL_ID) geminiModelId = Constants.expoConfig.extra.GEMINI_MODEL_ID;
      } else if (Constants?.manifest?.extra?.GEMINI_API_KEY) {
        geminiApiKey = Constants.manifest.extra.GEMINI_API_KEY;
        if (Constants.manifest.extra.GEMINI_MODEL_ID) geminiModelId = Constants.manifest.extra.GEMINI_MODEL_ID;
      } else if (process.env.GEMINI_API_KEY) {
        geminiApiKey = process.env.GEMINI_API_KEY;
        if (process.env.GEMINI_MODEL_ID) geminiModelId = process.env.GEMINI_MODEL_ID;
      }
      if (!geminiApiKey) throw new Error('GEMINI_API_KEY not found in env');

      // Prepare prompt for Gemini
      const prompt = `${SYSTEM_PROMPT}\n\nUser: ${userText}`;

      // Call Gemini API with correct model
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModelId}:generateContent?key=${geminiApiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: prompt }] }
          ]
        })
      });
      let botText = 'Sorry, I could not generate a response.';
      if (response.ok) {
        const data = await response.json();
        if (data && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          botText = data.candidates[0].content.parts[0].text;
        } else if (data?.error?.message) {
          botText = `Gemini error: ${data.error.message}`;
        }
      } else {
        const errorData = await response.json();
        botText = errorData?.error?.message ? `Gemini error: ${errorData.error.message}` : botText;
      }
      setCurrentAgent('Support Companion');
      const botMessage = {
        role: 'model',
        parts: [{ text: botText }],
        agent: 'Support Companion',
        intent: 'gemini_response',
        avatar: selectedAvatar
      };
      setChatHistory(prev => [...prev, botMessage]);
      // Save bot message to Supabase
      try {
        await supabase.from('chat_history').insert({
          user_id: userId,
          message: botText,
          role: 'assistant',
          agent: 'Support Companion',
          intent: 'gemini_response',
          metadata: {},
        });
      } catch (e) {
        console.error('Error saving bot message:', e);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setChatHistory(prev => [...prev, {
        role: 'model',
        parts: [{ text: 'I apologize, but I encountered an error. Please try again.' }],
        agent: 'System',
        intent: 'error',
        avatar: selectedAvatar
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPress = () => {
    if (inputText.trim() && !isLoading) sendMessageToAgent(inputText);
  };

  // Animated fade-in wrapper for messages
  const AnimatedMessage = ({ children, style }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true
      }).start();
    }, []);
    return (
      <Animated.View style={[{ opacity: fadeAnim }, style]}>
        {children}
      </Animated.View>
    );
  };

  // Function to render text with clickable navigation links
  const renderTextWithLinks = (text, isUser) => {
    const linkRegex = /\[🔗\s*([^\]]+)\]\(navigate:([^:)]+)(?::([^)]+))?\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(
          <Text key={`text-${lastIndex}`} style={isUser ? styles.userText : styles.botText}>
            {text.substring(lastIndex, match.index)}
          </Text>
        );
      }

      // Add the clickable link
      const linkText = match[1];
      const screen = match[2];
      const tab = match[3];

      parts.push(
        <TouchableOpacity
          key={`link-${match.index}`}
          onPress={() => {
            try {
              if (tab) {
                navigation.navigate(screen, { screen: tab });
              } else {
                navigation.navigate(screen);
              }
            } catch (error) {
              console.warn('Navigation error:', error);
            }
          }}
          style={styles.navigationLink}
        >
          <Text style={styles.navigationLinkText}>{linkText}</Text>
        </TouchableOpacity>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <Text key={`text-${lastIndex}`} style={isUser ? styles.userText : styles.botText}>
          {text.substring(lastIndex)}
        </Text>
      );
    }

    if (parts.length > 0) {
      return <View style={styles.textWithLinks}>{parts}</View>;
    } else {
      return <Text style={isUser ? styles.userText : styles.botText}>{text}</Text>;
    }
  };

  const renderMessageItem = ({ item }) => {
    const isUser = item.sender === 'user';
    return (
      <AnimatedMessage style={[
        styles.messageRow,
        { justifyContent: isUser ? 'flex-end' : 'flex-start' }
      ]}>
        {!isUser && (
          <Image
            source={item.avatar?.image || selectedAvatar?.image || require('../../assets/bot.jpg')}
            style={styles.botAvatar}
          />
        )}
        <View style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.botBubble
        ]}>
          {!isUser && item.agent && (
            <Text style={styles.agentLabel}>{item.agent}</Text>
          )}
          {renderTextWithLinks(item.text, isUser)}
        </View>
      </AnimatedMessage>
    );
  };

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardWillShow', e => {
      Animated.timing(keyboardHeight, { toValue: e.endCoordinates.height, duration: e.duration || 250, useNativeDriver: false }).start();
    });
    const hideSub = Keyboard.addListener('keyboardWillHide', e => {
      Animated.timing(keyboardHeight, { toValue: 0, duration: e.duration || 250, useNativeDriver: false }).start();
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  if (!countLoaded) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  const messages = chatHistory.filter(m => (m.role === 'user' || m.role === 'model') && !m.hidden)
    .map((m, i) => ({ 
      id: `m-${i}`, 
      sender: m.role === 'user' ? 'user' : 'bot', 
      text: m.parts[0]?.text || '',
      agent: m.agent,
      intent: m.intent
    }));

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={{ flex: 1, paddingTop: Platform.OS === 'android' ? 10 : StatusBar.currentHeight, backgroundColor: theme.background }}>
        <View style={styles.container}>
          {/* Display selected avatar at the top */}
          {selectedAvatar && (
            <View style={styles.avatarTopContainer}>
              <Image source={selectedAvatar.image} style={styles.avatarTopImage} />
              <Text style={styles.avatarTopName}>{selectedAvatar.name}</Text>
            </View>
          )}
          <View style={styles.header}>
            <BackButton style={styles.backButton} />
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Assistant</Text>
              <Text style={styles.agentIndicator}>{currentAgent}</Text>
            </View>
            <TouchableOpacity onPress={clearChat} style={styles.clearButtonSmall}>
              <Text style={styles.clearButtonTextSmall}>Clear</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.chatContentContainer}
            keyboardShouldPersistTaps="handled"
            overScrollMode='never'
            ref={flatListRef}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={10}
            getItemLayout={null}
            ListFooterComponent={
              isLoading ? (
                <View 
                  style={[styles.messageRow, { justifyContent: 'flex-start' }]}
                >
                  <View style={[styles.bubble, styles.botBubble, styles.loadingBubble]}>
                    <LoadingDots />
                  </View>
                </View>
              ) : null
            }
          />
          <Animated.View style={styles.inputWrapper}>
            <TextInput
              style={[styles.inputField, { color: theme.text }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your message..."
              placeholderTextColor="#999999"
              editable={!isLoading}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, (isLoading || !inputText.trim()) && styles.sendButtonDisabled]}
              onPress={handleSendPress}
              disabled={isLoading || !inputText.trim()}
            >
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function LoadingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const animateDot = (dot, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.delay(200),
        ])
      );
    };

    const animation1 = animateDot(dot1, 0);
    const animation2 = animateDot(dot2, 200);
    const animation3 = animateDot(dot3, 400);

    animation1.start();
    animation2.start();
    animation3.start();

    return () => {
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, []);

  return (
    <View style={styles.loadingDotsContainer}>
      <Animated.View style={[styles.loadingDot, { opacity: dot1 }]} />
      <Animated.View style={[styles.loadingDot, { opacity: dot2 }]} />
      <Animated.View style={[styles.loadingDot, { opacity: dot3 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  avatarTopContainer: {
    alignItems: 'center',
    marginTop: -7,
    marginBottom: 8,
    
  },
  avatarTopImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 4,
  },
  avatarTopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  container: {
    flex: 1,
    backgroundColor: theme.background,
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 5,
    paddingBottom: 12,
    position: 'relative',
    paddingHorizontal: 24,
    justifyContent: 'center',
   
  },
  backButton: {
    position: 'absolute',
    left: 24,
    top: 0,
    zIndex: 10,
  },
  clearButtonSmall: {
    position: 'absolute',
    right: 24,
    top: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#810808ff',
  },
  clearButtonTextSmall: {
    color: '#fff',
    backgroundColor:'#810808ff',
    fontSize: 14,
    fontWeight: '600',
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Inter',
     color:'#9c711bff',
     paddingBottom:5,
  },
  agentIndicator: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    fontStyle: 'italic',
  },
  agentLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  chatContentContainer: {
    paddingVertical: 16,
    flexGrow: 1,
    justifyContent: 'flex-end',
    backgroundColor:'#9c711bff',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    marginVertical: 6,
  },
  bubble: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 22,
    marginVertical: 8,
    maxWidth: '80%',
    flexShrink: 1,
    shadowColor: '#8AB4F8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: theme.accent,
    borderBottomRightRadius: 6,
    alignSelf: 'flex-end',
  },
  botBubble: {
    backgroundColor: theme.input,
    borderBottomLeftRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.border,
  },
  userText: {
    color: theme.text,
    fontSize: 16,
    lineHeight: 22,
  },
  botText: {
    color: theme.text,
    fontSize: 16,
    lineHeight: 22,
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#F5F5F5',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
  },
  inputField: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: theme.input,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 8,
    color: theme.text,
  },
  sendButton: {
    backgroundColor:  "#006898ff",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: "#006898ff",
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  textWithLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  navigationLink: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 2,
    marginVertical: 1,
  },
  navigationLinkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginHorizontal: 3,
  },
  loadingBubble: {
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
