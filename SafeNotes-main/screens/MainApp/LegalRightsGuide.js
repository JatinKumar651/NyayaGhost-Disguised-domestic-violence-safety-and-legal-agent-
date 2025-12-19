// screens/MainApp/LegalRightsGuide.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  ImageBackground,
  FlatList,
  Animated,
} from "react-native";
import BackButton from '../../components/UI/BackButton';

import ipcData from "../../data/ipc.json";
import pwdvaData from "../../data/pwdva.json";

export default function LegalRightsGuide({ navigation }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedLaw, setSelectedLaw] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  const allData = [
    ...ipcData.map((r) => ({ ...r, source: "IPC" })),
    ...pwdvaData.map((r) => ({ ...r, source: "PWDVA" })),
  ];

  const allKeywords = Array.from(
    allData.reduce((acc, item) => {
      acc.add(item.title);
      return acc;
    }, new Set())
  );

  const handleSearch = () => {
    const lowerQuery = query.toLowerCase();
    const filtered = allData.filter(
      (item) =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.description.toLowerCase().includes(lowerQuery)
    );
    setResults(filtered);
    setShowSuggestions(false);
    fadeIn();
  };

  const handleKeywordPress = (keyword) => {
    setQuery(keyword);
    setShowSuggestions(false);
  };

  const filteredSuggestions = allKeywords.filter(
    (kw) => kw.toLowerCase().includes(query.toLowerCase()) && query.length > 0
  );

  const fadeIn = () => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>

      {/* Upper Part: Search Section with Primary Background */}
      <View style={styles.upperSection}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Legal Rights Guide</Text>

        <TextInput
          style={styles.input}
          placeholder='Select or type a keyword'
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setShowSuggestions(true);
          }}
        />

        {/* Autocomplete Suggestions */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={filteredSuggestions}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleKeywordPress(item)}
                >
                  <Text>{item}</Text>
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}

        {/* Keywords scroll */}
        <ScrollView
          style={styles.keywordsContainer}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
        >
          {allKeywords.map((kw, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.keywordBox}
              onPress={() => handleKeywordPress(kw)}
            >
              <Text style={styles.keywordText}>{kw}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.button} onPress={handleSearch}>
          <Text style={styles.buttonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Lower Part: Results Section with Background Image */}
      <ImageBackground
        source={require("../../assets/legal_bg.png")}
        style={styles.lowerSection}
        resizeMode="cover"
      >
        <Animated.ScrollView style={{ ...styles.results, opacity: fadeAnim }}>
          {results.length > 0 ? (
            results.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.card}
                onPress={() => setSelectedLaw(item)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardSource}>{item.source} - Section {item.section}</Text>
                </View>
                <Text style={styles.cardDesc} numberOfLines={3}>{item.description}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.noResults}>No results found. Try another keyword.</Text>
          )}
        </Animated.ScrollView>
      </ImageBackground>

      {/* Modal for Details */}
      {selectedLaw && (
        <Modal
          visible={true}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedLaw(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>
                {selectedLaw.source} - Section {selectedLaw.section}
              </Text>
              <Text style={styles.modalSubtitle}>{selectedLaw.title}</Text>
              <ScrollView>
                <Text style={styles.modalDesc}>{selectedLaw.description}</Text>
              </ScrollView>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedLaw(null)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
upperSection: {
  height: 360,   // fixed height
  backgroundColor: "#9c711bff",
  padding: 16,
  paddingTop: 60,
},
lowerSection: {
  flex: 1,       // takes remaining space
  padding: 16,
  backgroundColor: "transparent",
},

  title: { fontSize: 38, fontWeight: "bold", color: "#000000ff", textAlign: "center", marginBottom: 16, paddingTop: 40 },
  input: { borderWidth: 1, borderColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  suggestionsContainer: { maxHeight: 150, borderWidth: 1, borderColor: "#ccc", borderRadius: 10, backgroundColor: "#fff", marginBottom: 10, elevation: 2 },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  keywordsContainer: { maxHeight: 50, marginBottom: 16 },
  keywordBox: { backgroundColor: "#000000ff", paddingVertical: 6, paddingHorizontal: 14, borderRadius: 22, marginRight: 8, elevation: 2 },
  keywordText: { color: "#888",  fontSize: 14, fontWeight: "600" },
  button: { backgroundColor: "#fff", padding: 14, borderRadius: 14, alignItems: "center", marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  buttonText: { color: "#9c711bff", fontWeight: "bold", fontSize: 16 },
  results: { flex: 1 },
  card: { backgroundColor: "#fffef6", borderRadius: 14, padding: 16, marginBottom: 14, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 5, elevation: 3 },
  cardHeader: { marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#9c711bff" },
  cardSource: { fontSize: 13, color: "#555", marginTop: 2 },
  cardDesc: { fontSize: 14, color: "#333" },
  noResults: { textAlign: "center", fontSize: 16, color: "#fff", marginTop: 20 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  modalBox: { width: "85%", backgroundColor: "#000000ff", padding: 20, borderRadius: 18, maxHeight: "80%" },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#9c711bff", marginBottom: 8 },
  modalSubtitle: { fontSize: 16,color: "#888", fontWeight: "600", marginBottom: 10 },
  modalDesc: { fontSize: 15, color: "#888", },
  closeButton: { backgroundColor: "#9c711bff", padding: 12, borderRadius: 14, alignItems: "center", marginTop: 16 },
  closeButtonText: { color: "#fff", fontWeight: "bold" },
});
