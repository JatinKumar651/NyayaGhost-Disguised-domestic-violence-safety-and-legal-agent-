import JournalScreen from '../screens/MainApp/JournalScreen';
import ChatbotScreen from '../screens/MainApp/ChatbotScreen';
import React, { useContext } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SettingsContext } from '../contexts/SettingsContext'
import LegalDocumentGenerator from "../screens/MainApp/LegalDocumentGenerator";
import LegalRightsGuide from '../screens/MainApp/LegalRightsGuide';


// Disguised flow
import NotesHome from '../screens/DisguisedNotes/NotesHome'
import NoteDetailScreen from '../screens/DisguisedNotes/NoteDetailScreen'
import CalculatorUnlock from '../screens/DisguisedNotes/CalculatorUnlock'

// Main app flow
import TabNavigator from './TabNavigator'
import SOSScreen from '../screens/MainApp/SOSScreen'
import InstantSOSScreen from '../screens/MainApp/InstantSOSScreen'
import JournalViewScreen from '../screens/MainApp/JournalViewScreen'
import ListeningScreen from '../screens/MainApp/ListeningScreen'
import LawyerDirectory from '../screens/MainApp/LawyerDirectory';
// Onboarding flow
import OnboardingNavigator from './OnboardingNavigator'
import AIAvatarSelectionScreen from '../screens/MainApp/AIAvatarSelectionScreen';

// For switching between real and disguised UI
import { TapGestureHandler } from 'react-native-gesture-handler';
import { View } from 'react-native';
import * as Haptics from 'expo-haptics';

// Legal Assistant Screen
import LegalAssistant from "../screens/MainApp/LegalAssistant";


const Stack = createNativeStackNavigator()

export default function RootNavigator() {
  const {
    isUnlocked,
    setIsUnlocked,
    hasCompletedOnboarding,
  } = useContext(SettingsContext);

  const tripleTapHandler = ({ nativeEvent }) => {
    if (nativeEvent.state === 5) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsUnlocked(false);
    }
  };

  if (!hasCompletedOnboarding) {
    return <OnboardingNavigator />;
  }

  if (isUnlocked) {
    return (
      <TapGestureHandler
        numberOfTaps={3}
        maxDelayMs={150}
        shouldCancelWhenOutside={false}
        onHandlerStateChange={tripleTapHandler}
      >
        <View style={{ flex: 1 }}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="SOS" component={SOSScreen} />
            <Stack.Screen name="InstantSOS" component={InstantSOSScreen} />
            <Stack.Screen name="MediaView" component={JournalViewScreen} />
            <Stack.Screen name="LegalAgent" component={require('../screens/MainApp/LegalAgent').default} />
            <Stack.Screen name="NearbyShelter" component={require('../screens/MainApp/NearbyShelter').default} />
            <Stack.Screen name="Journal" component={JournalScreen} />
            <Stack.Screen name="ChatbotScreen" component={ChatbotScreen} />
            <Stack.Screen name="Listening" component={ListeningScreen} />
      <Stack.Screen name="AIAvatarSelectionScreen" component={AIAvatarSelectionScreen} />
            {/* ✅ Add Lawyer Directory screen */}
            <Stack.Screen name="LawyerDirectory" component={LawyerDirectory} />
   <Stack.Screen name="LegalDocumentGenerator" component={LegalDocumentGenerator} />
   <Stack.Screen name="LegalAssistant" component={LegalAssistant} />
   <Stack.Screen name="LegalRightsGuide" component={LegalRightsGuide} />
          </Stack.Navigator>
        </View>
      </TapGestureHandler>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NotesHome" component={NotesHome} />
      <Stack.Screen name="NoteDetail" component={NoteDetailScreen} />
      <Stack.Screen name="CalculatorUnlock" component={CalculatorUnlock} />
    </Stack.Navigator>
  );
}

