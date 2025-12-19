// screens/Onboarding/SetPreferences.js

import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

import { OnboardingContext } from '../../contexts/OnboardingContext';
import { theme } from '../../constants/colors';

const RadioUnchecked = () => (
  <View style={styles.radioOuter}>
    <View style={styles.radioInnerUnselected} />
  </View>
);
const RadioChecked = () => (
  <View style={styles.radioOuter}>
    <View style={styles.radioInnerSelected} />
  </View>
);

const CheckboxUnchecked = () => <View style={styles.checkboxBase} />;
const CheckboxChecked = () => (
  <View style={[styles.checkboxBase, styles.checkboxBaseChecked]}>
    <Text style={styles.checkboxMark}>✓</Text>
  </View>
);

export default function SetPreferencesScreen({ navigation, onFinish }) {
  const [modalVisible, setModalVisible] = useState(false);

  const {
    autoWipeChoice,
    locationEnabled,
    cameraEnabled,
    micEnabled,
    galleryEnabled,
    setField,
    biometricEnabled,
  } = useContext(OnboardingContext);

  const handleSaveAll = () => {
    console.log('Collected preferences data:', {
      autoWipeChoice,
      locationEnabled,
      cameraEnabled,
      micEnabled,
      galleryEnabled,
    });
    navigation.navigate('SetupComplete');
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
        <Text style={styles.heading}>Set Preferences</Text>
        <Text style={styles.subheading}>
          Set permissions to control what NyayaGhost can access on your device. All can be changed later under Settings.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Auto-wipe</Text>
          <Text style={styles.sectionText}>
            Auto-deletes media logs older than a set limit.
          </Text>

          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownText}>Select auto-wipe type</Text>
            <Text style={styles.dropdownValue}>
              {autoWipeChoice === 'never' ? 'Never' : `Every ${autoWipeChoice}`}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Location</Text>
          <Text style={styles.sectionText}>
            Location is shared in your SOS as a link if enabled.
          </Text>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setField('locationEnabled', !locationEnabled)}
            activeOpacity={0.7}
          >
            {locationEnabled ? <CheckboxChecked /> : <CheckboxUnchecked />}
            <Text style={styles.checkboxLabel}>Enable location tracking</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Media</Text>
          <Text style={styles.sectionText}>
            These control how you can upload media into your SafeNotes Journal.
          </Text>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setField('cameraEnabled', !cameraEnabled)}
            activeOpacity={0.7}
          >
            {cameraEnabled ? <CheckboxChecked /> : <CheckboxUnchecked />}
            <Text style={styles.checkboxLabel}>Enable camera access</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setField('micEnabled', !micEnabled)}
            activeOpacity={0.7}
          >
            {micEnabled ? <CheckboxChecked /> : <CheckboxUnchecked />}
            <Text style={styles.checkboxLabel}>Enable microphone access</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setField('galleryEnabled', !galleryEnabled)}
            activeOpacity={0.7}
          >
            {galleryEnabled ? <CheckboxChecked /> : <CheckboxUnchecked />}
            <Text style={styles.checkboxLabel}>Enable media gallery access</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Biometric Unlock</Text>
          <Text style={styles.sectionText}>
            Allows long-press on "=" in the calculator to use Face ID or fingerprint unlock.
          </Text>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setField('biometricEnabled', !biometricEnabled)}
            activeOpacity={0.7}
          >
            {biometricEnabled ? <CheckboxChecked /> : <CheckboxUnchecked />}
            <Text style={styles.checkboxLabel}>Enable biometric unlock</Text>
          </TouchableOpacity>
        </View>

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
            onPress={handleSaveAll}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Finish</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalHeading}>Auto-Wipe Settings</Text>
              <Text style={styles.modalHelpText}>
                Journal entries will automatically be deleted:
              </Text>

              {['24h', '48h', 'never'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.radioRow}
                  onPress={() => setField('autoWipeChoice', option)}
                  activeOpacity={0.7}
                >
                  {autoWipeChoice === option ? <RadioChecked /> : <RadioUnchecked />}
                  <Text style={styles.radioLabel}>
                    {option === 'never' ? 'Never' : `Every ${option}`}
                  </Text>
                </TouchableOpacity>
              ))}

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalDiscard]}
                  onPress={() => setModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalDiscardText}>Discard</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalSave]}
                  onPress={() => setModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: "#F8F9FB", // soft neutral background
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  heading: {
    color: "#1E1E1E",
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 8,
  },
  subheading: {
    color: "#6B7280",
    fontSize: 15,
    marginBottom: 24,
    lineHeight: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeading: {
    color: "#111",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
  },
  sectionText: {
    color: "#6B7280",
    fontSize: 15,
    marginBottom: 12,
  },
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderColor: "#E5E7EB",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  dropdownText: {
    color: "#111",
    fontSize: 16,
  },
  dropdownValue: {
    color: "#6B7280",
    fontSize: 16,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkboxBase: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#9CA3AF",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxBaseChecked: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  checkboxMark: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  checkboxLabel: {
    color: "#111",
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignSelf: "center",
    width: 328,
    marginTop: 12,
  },
  button: {
    width: 150,
    height: 50,
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
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContainer: {
    width: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  modalHeading: {
    color: "#111",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  modalHelpText: {
    color: "#6B7280",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 14,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#9CA3AF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  radioInnerUnselected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "transparent",
  },
  radioInnerSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563EB",
  },
  radioLabel: {
    color: "#111",
    fontSize: 16,
  },
  modalButtonRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalDiscard: {
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  modalDiscardText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "600",
  },
  modalSave: {},
  modalSaveText: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "600",
  },
});
