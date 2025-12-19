import React, { useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
} from 'react-native';
import { OnboardingContext } from '../../contexts/OnboardingContext';
import { SettingsContext } from '../../contexts/SettingsContext';
import { ShieldUser } from 'lucide-react-native';

const backgroundImg = require('../../assets/launch.jpg'); // <-- replace with your image

export default function SetupCompleteScreen({ navigation }) {
  const onboarding = useContext(OnboardingContext);
  const settings = useContext(SettingsContext);

  const handleLaunch = () => {
    settings.setAccessPin(onboarding.pin);
    settings.setEmergencyMessage(onboarding.sosMessage);
    settings.setEmergencyContact({
      name: onboarding.emergencyName,
      number: onboarding.emergencyNumber,
      relationship: onboarding.emergencyRelationship,
    });
    settings.setAutoWipeTTL(onboarding.autoWipeChoice);
    settings.setLocationEnabled(onboarding.locationEnabled);
    settings.setCameraEnabled(onboarding.cameraEnabled);
    settings.setMicEnabled(onboarding.micEnabled);
    settings.setGalleryEnabled(onboarding.galleryEnabled);
    settings.setBiometricEnabled(onboarding.biometricEnabled);
    settings.setHasCompletedOnboarding(true);
  };

  return (
    <ImageBackground
      source={backgroundImg}
      style={styles.background}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={styles.outerContainer}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <View style={styles.innerContainer}>
          <Text style={styles.heading}>You’re All Set</Text>

          <ShieldUser color="#fff" size={150} strokeWidth={1.5} />

          <Text style={styles.liveText}>
            {'\n'}Your disguise is now live.{'\n'}
          </Text>
          <Text style={styles.subText}>
            NyayaGhost will appear as a normal app on your device, until unlocked.
          </Text>

          <TouchableOpacity
            style={styles.launchButton}
            onPress={handleLaunch}
            activeOpacity={0.85}
          >
            <Text style={styles.launchButtonText}>Launch App</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.75}>
            <Text style={styles.goBackText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  outerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)', // dark overlay for readability
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  heading: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 24,
  },
  liveText: {
    color: '#fff',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 24,
  },
  subText: {
    color: '#d1d5db',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  launchButton: {
    width: 200,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#00aeffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  launchButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  goBackText: {
    color: '#93c5fd',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});
