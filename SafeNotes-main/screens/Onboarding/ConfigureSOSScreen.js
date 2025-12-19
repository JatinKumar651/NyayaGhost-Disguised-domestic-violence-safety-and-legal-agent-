// screens/Onboarding/ConfigureSOSScreen.js

import React, { useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { theme } from '../../constants/colors';
import { OnboardingContext } from '../../contexts/OnboardingContext';

export default function ConfigureSOSScreen({ navigation, onFinish }) {
  const {
    sosMessage,
    emergencyName,
    emergencyNumber,
    emergencyRelationship,
    emergencyEmail,
    setField,
  } = useContext(OnboardingContext);

  const handleSaveSOS = () => {
    const digitsOnly = emergencyNumber.replace(/\D/g, '');
    if (!sosMessage.trim() || !emergencyName.trim() || !digitsOnly || !emergencyRelationship.trim() || !emergencyEmail.trim()) {
      alert('Please fill in all fields before saving.');
      return;
    }
    if (digitsOnly && (!/^[6-9]/.test(digitsOnly) || digitsOnly.length !== 10)) {
      alert('Emergency contact number must be 10 digits and start with 6, 7, 8, or 9.');
      setField('emergencyNumber', '');
      return;
    }
    if (!emergencyEmail.endsWith('@gmail.com')) {
      alert('Emergency email must be a valid @gmail.com address.');
      setField('emergencyEmail', '');
      return;
    }
    // Save all emergency details to Supabase
    (async () => {
      try {
        const { supabase } = require('../../services/supabaseClient');
        await supabase
          .from('emergency_contacts')
          .upsert([
            {
              name: emergencyName,
              number: digitsOnly,
              relationship: emergencyRelationship,
              email: emergencyEmail,
              message: sosMessage,
            }
          ]);
      } catch (err) {
        console.error('Supabase emergency details save failed:', err);
      }
    })();
    console.log('Collected SOS Data:', {
      sosMessage,
      emergencyName,
      emergencyNumber: digitsOnly,
      emergencyRelationship,
      emergencyEmail,
    });
    navigation.navigate('SetPreferences');
    onFinish && onFinish();
  };

  return (
    <KeyboardAvoidingView
      style={styles.outerContainer}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Configure SOS</Text>

        <Text style={styles.sectionText}>
          Your SOS message will be sent via SMS with your location and selected media & audio , if enabled.{'\n\n'}
        </Text>

        <Text style={styles.sectionHeading}>Message</Text>
        <TextInput
          style={styles.textInputMulti}
          multiline
          value={sosMessage}
          onChangeText={(text) => setField('sosMessage', text)}
          placeholder="eg. Please send help. I may be in danger and unable to speak up. Please check on me."
          placeholderTextColor="#666"
        />

        <Text style={styles.sectionHeading}>Emergency Details</Text>
        <Text style={styles.sectionText}>(Optional but recommended)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Add Name..."
          placeholderTextColor="#666"
          value={emergencyName}
          onChangeText={(text) => setField('emergencyName', text)}
        />
        <TextInput
          style={styles.textInput}
          placeholder="Add Emergency Email..."
          placeholderTextColor="#666"
          keyboardType="email-address"
          value={emergencyEmail}
          onChangeText={(text) => setField('emergencyEmail', text)}
        />

        <View style={styles.phoneRow}>
          <View style={styles.prefixBox}>
            <Text style={styles.prefixText}>+91</Text>
          </View>

          <TextInput
            style={styles.phoneInput}
            placeholder="Add Number..."
            placeholderTextColor="#666"
            keyboardType="phone-pad"
            value={emergencyNumber}
            onChangeText={(text) => {
              const digitsOnly = text.replace(/\D/g, '');
              if (digitsOnly.length === 10 && !/^[6-9]/.test(digitsOnly)) {
                alert('Phone number must start with 6, 7, 8, or 9 and be 10 digits long.');
                setField('emergencyNumber', '');
              } else if (digitsOnly.length <= 10) {
                setField('emergencyNumber', digitsOnly);
              }
            }}
          />
        </View>

        <TextInput
          style={styles.textInput}
          placeholder="Add Relationship..."
          placeholderTextColor="#666"
          value={emergencyRelationship}
          onChangeText={(text) => setField('emergencyRelationship', text)}
        />

        {/* Back & Save Buttons (in flow, not floating) */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.backButton]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSaveSOS}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: "#F8F9FB", // light neutral background
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  heading: {
    color: "#1E1E1E",
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 12,
    marginTop: 15,
  },
  sectionHeading: {
    color: "#222",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 10,
  },
  sectionText: {
    color: "#6B7280",
    fontSize: 15,
    marginBottom: 16,
    lineHeight: 20,
  },
  textInputMulti: {
    backgroundColor: "#FFFFFF",
    color: "#111",
    fontSize: 16,
    borderRadius: 12,
    padding: 14,
    height: 90,
    textAlignVertical: "top",
    marginBottom: 20,
    borderColor: "#E5E7EB",
    borderWidth: 1,
    lineHeight: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    color: "#111",
    fontSize: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderColor: "#E5E7EB",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  prefixBox: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderRightWidth: 1,
    borderColor: "#E5E7EB",
  },
  prefixText: {
    color: "#111",
    fontSize: 16,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    color: "#111",
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderColor: "#E5E7EB",
    borderWidth: 1,
  },
  buttonRow: {
    marginTop: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignSelf: "center",
    width: 328,
  },
  button: {
    width: 150,
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  backButton: {
    backgroundColor: "#bf0000ff",
  },
  saveButton: {
    backgroundColor: '#325480',
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
});
