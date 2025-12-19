// services/voiceRecognition.js
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import Constants from 'expo-constants';
import { navigate } from '../navigation/RootNavigation';
import * as Location from 'expo-location';
import { supabase } from './supabaseClient';
import * as SMS from 'expo-sms';
import { Alert } from 'react-native';

const DEEPGRAM_API_KEY = Constants.expoConfig.extra.DEEPGRAM_API_KEY;
const TRIGGER_WORD = 'start';
const EMERGENCY_WORD = 'emergency';
const RECORD_INTERVAL = 5000; // Interval between each recording
const RECORD_DURATION = 3000; // How long each recording lasts (ms)

let isListening = false;
let isRecording = false;
let recording = null;
let intervalId = null;
let detectionLock = false;
let onListeningStopped = null;

export function registerListeningStoppedCallback(cb) {
  onListeningStopped = cb;
}

export async function startBackgroundListening() {
  if (isListening) return;
  if (!DEEPGRAM_API_KEY) {
    console.error('[VoiceRecognition] Missing Deepgram API key');
    return;
  }

  console.log('[VoiceRecognition] Starting listening...');
  isListening = true;
  detectionLock = false;

  // Give the mic a short rest to release from previous use
  await new Promise(res => setTimeout(res, 500));

  intervalId = setInterval(recordAndDetect, RECORD_INTERVAL);
  recordAndDetect();
}

export async function stopBackgroundListening() {
  console.log('[VoiceRecognition] Stopping listening...');
  isListening = false;

  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  await cleanupRecording();

  if (onListeningStopped) {
    onListeningStopped();
  }
}

async function cleanupRecording() {
  try {
    if (recording) {
      console.log('[VoiceRecognition] Cleaning up existing recording...');
      await recording.stopAndUnloadAsync();
    }
  } catch (e) {
    console.warn('[VoiceRecognition] cleanupRecording stop error:', e);
  } finally {
    recording = null;
    isRecording = false;
  }

  try {
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  } catch {}
}

async function recordAndDetect() {
  if (!isListening || isRecording) return;

  isRecording = true;
  let uri = null;

  try {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[VoiceRecognition] Mic permission not granted');
      isRecording = false;
      return;
    }

    await cleanupRecording();

    console.log('[VoiceRecognition] Recording...');
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
    await recording.startAsync();

    await new Promise(res => setTimeout(res, RECORD_DURATION));

    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        uri = recording.getURI();
      } catch (e) {
        console.warn('[VoiceRecognition] Failed to stop recording:', e);
      } finally {
        recording = null;
      }
    }

    if (uri) {
      await sendToDeepgram(uri);
    }

  } catch (err) {
    console.error('[VoiceRecognition] Error in recordAndDetect:', err);
  } finally {
    isRecording = false;
  }
}

async function sendToDeepgram(uri) {
  try {
    console.log('[VoiceRecognition] Sending to Deepgram...');
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    });

    const res = await axios.post(
      'https://api.deepgram.com/v1/listen',
      formData,
      {
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    const transcript = (res.data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '')
      .trim()
      .toLowerCase();

    console.log('[VoiceRecognition] Transcript:', transcript);

    if (!detectionLock) {
      if (transcript.includes(TRIGGER_WORD)) {
        detectionLock = true;
        console.log(`[VoiceRecognition] Trigger "${TRIGGER_WORD}" detected.`);
        await stopBackgroundListening();
        navigate('Listening', { autoStart: true });
      } else if (transcript.includes(EMERGENCY_WORD)) {
        detectionLock = true;
        console.log('[VoiceRecognition] Emergency word detected — sending SOS');
        await stopBackgroundListening();
        await sendInstantSOS();
      } else {
        console.log('[VoiceRecognition] No trigger word detected.');
      }
    }

  } catch (err) {
    console.error('[VoiceRecognition] Deepgram API error:', err.response?.data || err.message);
  } finally {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {}
  }
}

async function sendInstantSOS() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location access is required to send SOS');
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    const locationUrl = `https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`;

    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      Alert.alert('Error', 'No emergency contact found');
      return;
    }

    const messageToSend = `${data.message}\n\nMy Location: ${locationUrl}`;

    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Error', 'SMS service is not available on this device');
      return;
    }

    await SMS.sendSMSAsync([data.number], messageToSend);
    Alert.alert('SOS Sent', `Message sent to ${data.name}`);
  } catch (err) {
    console.error(err);
    Alert.alert('Error', 'Failed to send SOS');
  }
}
