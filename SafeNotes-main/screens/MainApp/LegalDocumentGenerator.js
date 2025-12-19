import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Constants from "expo-constants";
import * as GoogleGenerativeAI from "@google/generative-ai";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import BackButton from "../../components/UI/BackButton";

const DOCUMENT_TYPES = [
  "Domestic Violence Petition",
  "FIR Draft",
  "Protection Order Application",
  "Affidavit",
  "Legal Notice",
];

export default function LegalDocumentGenerator() {
  const extra = Constants.expoConfig?.extra ?? {};
  const GEMINI_API_KEY = extra.GEMINI_API_KEY || "";

  const genAI = GEMINI_API_KEY
    ? new GoogleGenerativeAI.GoogleGenerativeAI(GEMINI_API_KEY)
    : null;

  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0]);
  const [caseDetails, setCaseDetails] = useState("");
  const [timeline, setTimeline] = useState("");
  const [complainantName, setComplainantName] = useState("");
  const [complainantAge, setComplainantAge] = useState("");
  const [complainantAddress, setComplainantAddress] = useState("");
  const [complainantContact, setComplainantContact] = useState("");
  const [children, setChildren] = useState("");
  const [respondentName, setRespondentName] = useState("");
  const [respondentAge, setRespondentAge] = useState("");
  const [respondentAddress, setRespondentAddress] = useState("");
  const [court, setCourt] = useState("");
  const [reliefs, setReliefs] = useState("");
  const [customClause, setCustomClause] = useState("");
  const [witnesses, setWitnesses] = useState("");
  const [evidence, setEvidence] = useState("");
  const [other, setOther] = useState("");
  const [generatedDocument, setGeneratedDocument] = useState("");
  const [loading, setLoading] = useState(false);

  // --- NEW STATES for refinement ---
  const [refineQuery, setRefineQuery] = useState("");
  const [refining, setRefining] = useState(false);

  const composePersonDetails = (name, age, address, contact) => {
    return `Name: ${name || "Not Provided"}\nAge: ${
      age || "Not Provided"
    }\nAddress: ${address || "Not Provided"}${
      contact ? `\nContact: ${contact}` : ""
    }`.trim();
  };

  const generateDocumentAsync = async () => {
    if (!GEMINI_API_KEY || !genAI) {
      Alert.alert("Error", "Gemini API key is not configured.");
      return;
    }
    if (!caseDetails || !complainantName || !respondentName || !court) {
      Alert.alert(
        "Missing Fields",
        "Please complete: Case Description, Complainant Name, Respondent Name, Court Name."
      );
      return;
    }

    setLoading(true);

    const complainant = composePersonDetails(
      complainantName,
      complainantAge,
      complainantAddress,
      complainantContact
    );
    const respondent = composePersonDetails(
      respondentName,
      respondentAge,
      respondentAddress,
      ""
    );

    try {
      // Step 1 – Auto-detect relevant laws
      const lawPrompt = `
You are a legal AI specializing in Indian law. 
Analyze the following case information and suggest the most relevant laws and sections 
to cite in a domestic violence petition/FIR/application:

Case Description:
${caseDetails}

Requested Reliefs:
${reliefs}

Clauses Provided:
${customClause}

Output only a clean list of laws and sections that should be cited. 
Do not explain, just give them in bullet points.
`;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const lawsResp = await model.generateContent(lawPrompt);
      const applicableLaws = (lawsResp.response.text() || "").trim();

      // Step 2 – Build structured details block
      const sections = [];
      sections.push(`Complainant Details:\n${complainant}`);
      sections.push(`Respondent Details:\n${respondent}`);
      sections.push(`Court Details:\n${court}`);
      if (children) sections.push(`Children (if any):\n${children}`);
      if (timeline) sections.push(`Incident Timeline:\n${timeline}`);
      if (caseDetails) sections.push(`Case Description:\n${caseDetails}`);
      if (evidence) sections.push(`Key Evidence:\n${evidence}`);
      if (witnesses) sections.push(`Witnesses:\n${witnesses}`);
      if (reliefs) sections.push(`Requested Reliefs/Orders:\n${reliefs}`);
      if (customClause) sections.push(`Relevant Clauses:\n${customClause}`);
      if (applicableLaws)
        sections.push(`Applicable Laws (auto-detected):\n${applicableLaws}`);
      if (other) sections.push(`Other facts to include:\n${other}`);

      const detailsBlock = sections.join("\n\n");

      // Step 3 – Draft petition
      const draftPrompt = `
You are an AI legal assistant specializing in Indian law. Draft a comprehensive, professional ${documentType}
using ALL the details and facts below. Incorporate every user-provided field faithfully, in professional legal style.

--- DETAILS ---
${detailsBlock}
--- END ---

Drafter Instructions:
- Structure the draft as a formal Indian legal petition, with sections, numbered paragraphs, and subheadings.
- Follow the Protection of Women from Domestic Violence Act, 2005 and any relevant IPC/CrPC provisions.
- Always include facts, roles, timeline, acts of violence, evidence, witnesses, requested orders, laws.
- Draft in fluent supportive English.
Provide the complete draft between delimiters [START DRAFT] ... [END DRAFT].
`;

      const draftResp = await model.generateContent(draftPrompt);
      const rawDraft = draftResp.response.text();
      const match = rawDraft.match(/\[START DRAFT\]([\s\S]*?)\[END DRAFT\]/);
      let draft = match ? match[1].trim() : rawDraft.trim();

      // Clean unwanted '*' characters used for bullets
      draft = draft.replace(/^\*+\s?/gm, "").replace(/\*/g, "");

      setGeneratedDocument(draft);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to generate document. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- NEW FUNCTION: Refine Draft ---
  const refineDraftAsync = async () => {
    if (!refineQuery.trim() || !generatedDocument) {
      Alert.alert("Missing Input", "Enter refinement instructions.");
      return;
    }
    if (!genAI) {
      Alert.alert("Error", "Gemini API key not configured.");
      return;
    }

    setRefining(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const refinePrompt = `
You are a legal AI assistant. Refine the following draft based on the user's request.
Make only the changes asked, without removing important details.

--- CURRENT DRAFT ---
${generatedDocument}
--- END DRAFT ---

--- USER REQUEST ---
${refineQuery}
--- END REQUEST ---

Provide the updated draft only, no explanations.
`;

      const refineResp = await model.generateContent(refinePrompt);
      const newDraft = (refineResp.response.text() || "").trim();
      setGeneratedDocument(newDraft);
      setRefineQuery(""); // clear input
    } catch (err) {
      console.error("Refine error:", err);
      Alert.alert("Error", "Failed to refine draft. Try again.");
    } finally {
      setRefining(false);
    }
  };

  const downloadPDF = async () => {
    if (!generatedDocument) {
      Alert.alert("No document", "Please generate a document first.");
      return;
    }

    try {
      const htmlContent = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${documentType}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; white-space: pre-wrap; }
            h1 { text-align: center; }
            pre { font-family: monospace; white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h1>${documentType}</h1>
          <pre>${generatedDocument}</pre>
        </body>
      </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      if (Platform.OS === "ios" || Platform.OS === "android") {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Share PDF document",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("PDF generated", `Your PDF is saved at: ${uri}`);
      }
    } catch (error) {
      console.error("PDF generation error:", error);
      Alert.alert("Error", "Failed to generate or share PDF.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
<View style={styles.headerRow}>
  <BackButton style={styles.backButton} />
  <Text style={styles.title}>Legal Document Generator</Text>
</View>

        {/* Document Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Document Type *</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={documentType}
              onValueChange={setDocumentType}
              style={styles.picker}
              itemStyle={{ fontSize: 16, color: "#000" }}
            >
              {DOCUMENT_TYPES.map((docType) => (
                <Picker.Item key={docType} label={docType} value={docType} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Case Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Case Description *</Text>
          <TextInput
            style={[styles.textArea, styles.input]}
            multiline
            placeholder="Describe the incident(s) of domestic violence"
            value={caseDetails}
            onChangeText={setCaseDetails}
          />
        </View>

        {/* Incident Timeline */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Incident Timeline (Optional)</Text>
          <TextInput
            style={[styles.textArea, styles.input]}
            multiline
            placeholder="Enter incident timeline/chronology"
            value={timeline}
            onChangeText={setTimeline}
          />
        </View>

        {/* Complainant Details */}
        <Text style={styles.sectionHeader}>Complainant Details</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={complainantName}
            onChangeText={setComplainantName}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Age (Optional)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={complainantAge}
            onChangeText={setComplainantAge}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address (Optional)</Text>
          <TextInput
            style={[styles.textArea, styles.input]}
            multiline
            value={complainantAddress}
            onChangeText={setComplainantAddress}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Contact Number (Optional)</Text>
          <TextInput
            style={styles.input}
            keyboardType="phone-pad"
            value={complainantContact}
            onChangeText={setComplainantContact}
          />
        </View>

        {/* Children / Dependents */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Children / Dependents (Optional)</Text>
          <TextInput
            style={[styles.textArea, styles.input]}
            multiline
            value={children}
            onChangeText={setChildren}
          />
        </View>

        {/* Respondent Details */}
        <Text style={styles.sectionHeader}>Respondent Details</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={respondentName}
            onChangeText={setRespondentName}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Age (Optional)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={respondentAge}
            onChangeText={setRespondentAge}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address (Optional)</Text>
          <TextInput
            style={[styles.textArea, styles.input]}
            multiline
            value={respondentAddress}
            onChangeText={setRespondentAddress}
          />
        </View>

        {/* Court */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Court Name & Location *</Text>
          <TextInput
            style={styles.input}
            value={court}
            onChangeText={setCourt}
          />
        </View>

        {/* Reliefs */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Requested Reliefs / Orders (Optional)</Text>
          <TextInput
            style={[styles.textArea, styles.input]}
            multiline
            value={reliefs}
            onChangeText={setReliefs}
          />
        </View>

        {/* Custom Clause */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Custom Clause (Optional)</Text>
          <TextInput
            style={[styles.textArea, styles.input]}
            multiline
            value={customClause}
            onChangeText={setCustomClause}
          />
        </View>

        {/* Witnesses */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Witnesses (Optional)</Text>
          <TextInput
            style={[styles.textArea, styles.input]}
            multiline
            value={witnesses}
            onChangeText={setWitnesses}
          />
        </View>

        {/* Evidence */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Evidence / Proof (Optional)</Text>
          <TextInput
            style={[styles.textArea, styles.input]}
            multiline
            value={evidence}
            onChangeText={setEvidence}
          />
        </View>

        {/* Other */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Other Information (Optional)</Text>
          <TextInput
            style={[styles.textArea, styles.input]}
            multiline
            value={other}
            onChangeText={setOther}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={generateDocumentAsync}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Generating..." : "Generate Document"}
          </Text>
        </TouchableOpacity>

        {generatedDocument ? (
          <>
            <View style={styles.generatedContainer}>
              <Text style={styles.generatedTitle}>Generated Document</Text>
              <ScrollView style={styles.generatedScroll}>
                <Text style={styles.generatedText}>{generatedDocument}</Text>
              </ScrollView>
            </View>

            {/* Refinement Section */}
            <View style={{ marginTop: 20 }}>
              <Text style={styles.label}>Refine Draft</Text>
              <TextInput
                style={[styles.textArea, styles.input]}
                multiline
                placeholder="E.g., make it more formal, add IPC 498A reference..."
                value={refineQuery}
                onChangeText={setRefineQuery}
              />
              <TouchableOpacity
                style={[styles.button, refining && styles.buttonDisabled]}
                onPress={refineDraftAsync}
                disabled={refining}
              >
                <Text style={styles.buttonText}>
                  {refining ? "Refining..." : "Refine Draft"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.downloadButton} onPress={downloadPDF}>
              <Text style={styles.buttonText}>Download Draft as PDF</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: { padding: 15, paddingBottom: 40, backgroundColor: "#fefcf8" },

headerRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 20,
  paddingTop: 50,
  paddingHorizontal: 10,
},

backButton: {
   // space between button and title

  marginLeft: -15,
},

title: {
  fontSize: 36,
  fontWeight: "bold",
  color: "#9c711bff",
  flex: 1,
  textAlign: "center",  
    paddingTop: 30,  // keeps title centered even with BackButton
},


  sectionHeader: {
    marginTop: 25,
    marginBottom: 10,
    fontWeight: "700",
    fontSize: 20,
    color: "#9c711bff",
    borderBottomWidth: 2,
    borderBottomColor: "#9c711bff",
    paddingBottom: 5,
  },

  inputGroup: { marginBottom: 15 },

  label: { marginBottom: 6, fontWeight: "600", color: "#333" },

  input: {
    borderWidth: 1,
    borderColor: "#c9b68aff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 9,
    fontSize: 16,
    backgroundColor: "#fffdf9",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },

  textArea: { minHeight: 90, textAlignVertical: "top" },

  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#c9b68aff",
    borderRadius: 10,
    backgroundColor: "#fffdf9",
    overflow: "hidden",
  },
  picker: { width: "100%", height: Platform.OS === "ios" ? 160 : 55 },

  button: {
    marginTop: 25,
    backgroundColor: "#9c711bff",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#9c711bff",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },

  buttonDisabled: { backgroundColor: "#cbb78cff" },

  downloadButton: {
    marginTop: 18,
    backgroundColor: "#6a4d11ff",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#6a4d11ff",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },

  buttonText: {
    color: "#fffdf9",
    fontWeight: "700",
    fontSize: 18,
    letterSpacing: 0.5,
  },

  generatedContainer: {
    marginTop: 35,
    borderTopWidth: 2,
    borderTopColor: "#9c711bff",
    paddingTop: 18,
  },

  generatedTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    color: "#9c711bff",
    textAlign: "center",
  },

  generatedScroll: {
    maxHeight: 320,
    paddingHorizontal: 6,
    backgroundColor: "#fffdf9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c9b68aff",
    padding: 10,
  },

  generatedText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 15,
    color: "#222",
    lineHeight: 22,
  },
});
