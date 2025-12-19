import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { theme } from '../../constants/colors';
import BackButton from '../../components/UI/BackButton';
import { SettingsContext } from '../../contexts/SettingsContext';
import { ChevronRight } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { resetAppDataAndRestartOnboarding } from '../../services/resetAppDataAndRestartOnboarding';
import { Audio } from 'expo-av';

// Import voice recognition service functions
import {
  startBackgroundListening,
  stopBackgroundListening,
  registerListeningStoppedCallback
} from '../../services/voiceRecognition';

// Modals
import EditMessageModal from '../../components/modals/EditMessageModal';
import EditContactModal from '../../components/modals/EditContactModal';
import ChangePinModal from '../../components/modals/ChangePinModal';
import SelectTTLModal from '../../components/modals/SelectTTLModal';

export default function SettingsScreen() {
  const {
    locationEnabled,
    setLocationEnabled,
    cameraEnabled,
    setCameraEnabled,
    micEnabled,
    setMicEnabled,
    galleryEnabled,
    setGalleryEnabled,
    emergencyMessage,
    setEmergencyMessage,
    emergencyContact,
    setEmergencyContact,
    accessPin,
    setAccessPin,
    autoWipeTTL,
    setAutoWipeTTL,
    biometricEnabled,
    setBiometricEnabled,
  } = useContext(SettingsContext);

  // New state for voice recognition toggle
  const [voiceRecognitionEnabled, setVoiceRecognitionEnabled] = useState(false);

  // Modal states
  const [showPinModal, setShowPinModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showTTLModal, setShowTTLModal] = useState(false);

  const { setHasCompletedOnboarding } = useContext(SettingsContext);

  useEffect(() => {
    // Register callback so when the service stops automatically,
    // the toggle here is also turned off
    registerListeningStoppedCallback(() => {
      console.log('[SettingsScreen] Voice recognition stopped from service.');
      setVoiceRecognitionEnabled(false);
    });
  }, []);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        paddingTop: Platform.OS === 'android' ? 10 : StatusBar.currentHeight,
        backgroundColor: theme.background,
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 100 }}
          overScrollMode='never'
        >
          <View style={styles.header}>
            <BackButton style={styles.backButton} />
            <Text style={styles.title}>Settings</Text>
          </View>

          {/* PRIVACY */}
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.group}>
            <SettingRow label="Update access PIN" onPress={() => setShowPinModal(true)} />
            <ValueRow
              label="Auto-wipe settings"
              value={autoWipeTTL === 'never' ? 'Never' : autoWipeTTL}
              onPress={() => setShowTTLModal(true)}
            />
            <ToggleRow
              label="Enable location tracking"
              value={locationEnabled}
              onValueChange={(val) => {
                setLocationEnabled(val);
                SecureStore.setItemAsync('locationEnabled', val.toString());
              }}
            />
            <ToggleRow
              label="Enable camera access"
              value={cameraEnabled}
              onValueChange={(val) => {
                setCameraEnabled(val);
                SecureStore.setItemAsync('cameraEnabled', val.toString());
              }}
            />

            {/* Microphone Access Toggle */}
            <ToggleRow
              label="Enable microphone access"
              value={micEnabled}
              onValueChange={async (val) => {
                if (val) {
                  const { status } = await Audio.requestPermissionsAsync();
                  if (status === 'granted') {
                    setMicEnabled(true);
                    SecureStore.setItemAsync('micEnabled', 'true');
                  } else {
                    Alert.alert(
                      'Microphone Permission Required',
                      'You must allow microphone access to enable voice recognition.'
                    );
                    setMicEnabled(false);
                    SecureStore.setItemAsync('micEnabled', 'false');
                  }
                } else {
                  setMicEnabled(false);
                  SecureStore.setItemAsync('micEnabled', 'false');
                  // Stop voice recognition if running
                  if (voiceRecognitionEnabled) {
                    setVoiceRecognitionEnabled(false);
                    stopBackgroundListening();
                  }
                }
              }}
            />

            {/* Voice Recognition Toggle */}
            <ToggleRow
              label="Enable voice recognition"
              value={voiceRecognitionEnabled}
              onValueChange={async (val) => {
                if (val) {
                  if (!micEnabled) {
                    Alert.alert(
                      'Microphone Required',
                      'You must enable microphone access before starting voice recognition.'
                    );
                    return;
                  }
                  setVoiceRecognitionEnabled(true);
                  startBackgroundListening();
                } else {
                  setVoiceRecognitionEnabled(false);
                  stopBackgroundListening();
                }
              }}
            />

            <ToggleRow
              label="Enable media gallery access"
              value={galleryEnabled}
              onValueChange={(val) => {
                setGalleryEnabled(val);
                SecureStore.setItemAsync('galleryEnabled', val.toString());
              }}
            />
            <ToggleRow
              label="Enable biometric unlock"
              value={biometricEnabled}
              onValueChange={(val) => setBiometricEnabled(val)}
              last
            />
          </View>

          {/* SAFETY */}
          <Text style={styles.sectionTitle}>Safety</Text>
          <View style={styles.group}>
            <SettingRow
              label="Edit emergency message"
              onPress={() => setShowMessageModal(true)}
            />
            <SettingRow
              label="Change emergency contact"
              onPress={() => setShowContactModal(true)}
              last
            />
          </View>

          {/* RESET */}
          <Text style={styles.sectionTitle}>Reset</Text>
          <View style={styles.resetGroup}>
            <ResetRow
              label="Reset app data"
              onPress={() =>
                Alert.alert(
                  'Reset App',
                  'This will erase all data and restart onboarding. Chatbot limits will remain.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reset',
                      style: 'destructive',
                      onPress: async () => {
                        await resetAppDataAndRestartOnboarding();
                        setHasCompletedOnboarding(false);
                      },
                    },
                  ]
                )
              }
              last
            />
          </View>
        </ScrollView>

        {/* Modals */}
        <EditMessageModal
          visible={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          currentMessage={emergencyMessage}
          onSave={setEmergencyMessage}
        />
        <EditContactModal
          visible={showContactModal}
          onClose={() => setShowContactModal(false)}
          currentContact={emergencyContact}
          onSave={setEmergencyContact}
        />
        <ChangePinModal
          visible={showPinModal}
          onClose={() => setShowPinModal(false)}
          onSave={setAccessPin}
        />
        <SelectTTLModal
          visible={showTTLModal}
          onClose={() => setShowTTLModal(false)}
          currentTTL={autoWipeTTL}
          onSave={setAutoWipeTTL}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// UI Components
function SettingRow({ label, onPress, last = false }) {
  return (
    <TouchableOpacity
      style={[styles.row, last && styles.lastRow]}
      onPress={onPress}
    >
      <Text style={styles.rowText}>{label}</Text>
      <ChevronRight color={theme.muted} size={20} />
    </TouchableOpacity>
  );
}

function ResetRow({ label, onPress, last = false }) {
  return (
    <TouchableOpacity
      style={[styles.row, last && styles.lastRow]}
      onPress={onPress}
    >
      <Text style={styles.resetText}>{label}</Text>
      <ChevronRight color={theme.muted} size={20} />
    </TouchableOpacity>
  );
}

function ToggleRow({ label, value, onValueChange, last = false }) {
  return (
    <View style={[styles.row, last && styles.lastRow]}>
      <Text style={styles.rowText}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#555', true: '#000000ff' }}
        thumbColor="#fff"
      />
    </View>
  );
}

function ValueRow({ label, value, onPress, last = false }) {
  return (
    <TouchableOpacity style={[styles.row, last && styles.lastRow]} onPress={onPress}>
      <Text style={styles.rowText}>{label}</Text>
      <Text style={styles.valueText}>{value}</Text>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA", // light modern background
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: "#111",
    letterSpacing: -0.5,
    marginTop: 40,
  },
  sectionTitle: {
    color: "#111",
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Inter',
    marginTop: 16,
    marginBottom: 8,
  },
  group: {

    borderRadius: 16,
    paddingVertical: 4,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    backgroundColor: '#9c711bff',
  },
  resetGroup: {
    backgroundColor: "#6a0000ff",
    borderRadius: 16,
    paddingVertical: 4,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    minHeight: 54,
    borderBottomWidth: 1,
    borderColor: "#E5E5EA", // light border
  },
  rowText: {
    color: "#222",
    fontFamily: 'Inter',
    fontSize: 16,
        color: "#ffffffff",
  },
  resetText: {
    color: "#ffffffff", // iOS destructive red
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    
  },
  lastRow: {
    borderBottomWidth: 0,
    
  },
  backButton: {
    position: 'absolute',
    left: -5,
    top: 0,
  },
  valueText: {
    fontSize: 15,
    paddingRight: 3,
    color: "#ffffffff",
    fontFamily: 'Inter',
  },
});
