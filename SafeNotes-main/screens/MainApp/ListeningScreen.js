import Constants from 'expo-constants';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { createClient } from '@supabase/supabase-js';
import BackButton from '../../components/UI/BackButton';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';


// Theme (Premium White + Gold)
const theme = {
  background: "#ffffff",
  card: "#ffffff",
  primary: "#d4af37", // premium gold
  text: "#222222",
  border: "#e5e5e5",
};


// Local recordings folder
const localDir = FileSystem.documentDirectory + 'recordings/';

// Initialize Supabase
const { SUPABASE_URL, SUPABASE_ANON_KEY } = Constants.expoConfig.extra;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper to format duration
function formatDuration(milliseconds) {
  const minutes = Math.floor(milliseconds / 1000 / 60);
  const seconds = Math.floor((milliseconds / 1000) % 60);
  return seconds < 10 ? `${minutes}:0${seconds}` : `${minutes}:${seconds}`;
}

// Save file locally
async function copyRecordingLocally(uri, fileName) {
  try {
    const dirInfo = await FileSystem.getInfoAsync(localDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(localDir, { intermediates: true });
    }
    const localUri = localDir + fileName;
    await FileSystem.copyAsync({ from: uri, to: localUri });
    return localUri;
  } catch (error) {
    console.error('Error saving file locally:', error);
    return null;
  }
}

// Delete file locally
async function deleteLocalFile(uri) {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch (error) {
    console.error('Error deleting local file:', error);
  }
}

export default function ListeningScreen({ navigation }) {
  const [recording, setRecording] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingIndex, setPlayingIndex] = useState(null);
  const [playingProgress, setPlayingProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const insets = useSafeAreaInsets();
  const route = useRoute();
  const stopTimerRef = useRef(null);

  // Load existing local recordings on mount
  useEffect(() => {
    async function loadLocalRecordings() {
      try {
        const dirInfo = await FileSystem.getInfoAsync(localDir);
        if (!dirInfo.exists) return;

        const files = await FileSystem.readDirectoryAsync(localDir);
        const loaded = [];

        for (let fileName of files) {
          const fileUri = localDir + fileName;
          const { sound, status } = await Audio.Sound.createAsync({ uri: fileUri });
          loaded.push({
            sound,
            duration: formatDuration(status.durationMillis),
            durationSec: Math.floor(status.durationMillis / 1000),
            file: fileUri,
            localUri: fileUri,
            publicUrl: null,
            supabasePath: null
          });
        }
        setRecordings(loaded);
      } catch (error) {
        console.error('Error loading local recordings:', error);
      }
    }
    loadLocalRecordings();
  }, []);

  useEffect(() => {
    if (route.params?.autoStart) {
      startRecording(true);
    }
    return () => {
      stopRecording();
    };
  }, [route.params?.autoStart]);

  async function startRecording(auto = false) {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        alert('Permission to access microphone is required!');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setRecordingDuration(0);

      const interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      recording._intervalId = interval;

      if (auto) {
        stopTimerRef.current = setTimeout(() => {
          stopRecording();
        }, 60000);
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    try {
      if (!recording) return;

      if (recording._intervalId) clearInterval(recording._intervalId);
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }

      const status = await recording.getStatusAsync();
      if (status.isRecording) {
        await recording.stopAndUnloadAsync();
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      const uri = recording.getURI();
      const fileName = `recording-${Date.now()}.wav`;

      const localUri = await copyRecordingLocally(uri, fileName);
      const uploadResult = await uploadRecordingToSupabase(uri, fileName);

      const { sound, status: soundStatus } = await recording.createNewLoadedSoundAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.isPlaying) {
          setPlayingProgress(Math.floor(status.positionMillis / 1000));
        }
        if (status.didJustFinish) {
          setIsPlaying(false);
          setPlayingIndex(null);
          setPlayingProgress(0);
        }
      });

      const newRecording = {
        sound,
        duration: formatDuration(soundStatus.durationMillis),
        durationSec: Math.floor(soundStatus.durationMillis / 1000),
        file: uri,
        localUri,
        publicUrl: uploadResult?.publicUrl,
        supabasePath: uploadResult?.filePath,
      };

      setRecordings(prev => [...prev, newRecording]);
      setRecording(null);
      setRecordingDuration(0);
    } catch (error) {
      console.error('Failed to stop recording', error);
    }
  }

  async function uploadRecordingToSupabase(uri, fileName) {
    try {
      setUploading(true);
      const fileData = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { error: uploadError } = await supabase.storage
        .from('recordings')
        .upload(fileName, Buffer.from(fileData, 'base64'), {
          cacheControl: '3600',
          upsert: false,
          contentType: 'audio/x-wav',
        });

      if (uploadError) {
        alert('Upload failed: ' + uploadError.message);
        setUploading(false);
        return null;
      }

      const { data } = supabase.storage.from('recordings').getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('record_audio')
        .insert([
          {
            public_url: data.publicUrl,
            mime_type: 'audio/x-wav',
            tags: ['recording'],
          },
        ]);

      if (insertError) {
        alert('Failed to save recording info: ' + insertError.message);
        setUploading(false);
        return null;
      }

      setUploading(false);
      return { publicUrl: data.publicUrl, filePath: fileName };
    } catch (err) {
      console.error('Upload error:', err);
      setUploading(false);
      return null;
    }
  }

  async function playRecording(index) {
    const rec = recordings[index];
    if (!rec) return;
    await rec.sound.setVolumeAsync(1.0);
    if (!isPlaying || playingIndex !== index) {
      await rec.sound.replayAsync();
    } else {
      await rec.sound.playAsync();
    }
    setPlayingIndex(index);
    setIsPlaying(true);
  }

  async function pauseRecording(index) {
    const rec = recordings[index];
    if (!rec) return;
    await rec.sound.pauseAsync();
    setIsPlaying(false);
  }

  async function deleteRecording(index) {
    const rec = recordings[index];
    if (!rec) return;

    Alert.alert('Delete Recording', 'Are you sure you want to delete this?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (rec.supabasePath) {
            const { error } = await supabase.storage.from('recordings').remove([rec.supabasePath]);
            if (error) alert('Failed to delete from Supabase');
          }
          if (rec.localUri) {
            await deleteLocalFile(rec.localUri);
          }
          setRecordings(prev => prev.filter((_, i) => i !== index));
          if (playingIndex === index) {
            setPlayingIndex(null);
            setIsPlaying(false);
            setPlayingProgress(0);
          }
        },
      },
    ]);
  }

  function clearAllRecordings() {
    if (recordings.length === 0) {
      alert('No recordings to delete');
      return;
    }
    Alert.alert('Delete All', 'Are you sure you want to delete all recordings?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete All',
        style: 'destructive',
        onPress: async () => {
          const paths = recordings.filter(r => r.supabasePath).map(r => r.supabasePath);
          if (paths.length) {
            await supabase.storage.from('recordings').remove(paths);
          }
          for (let rec of recordings) {
            if (rec.localUri) await deleteLocalFile(rec.localUri);
          }
          setRecordings([]);
          setPlayingIndex(null);
          setIsPlaying(false);
          setPlayingProgress(0);
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Back button */}
      <View
        style={[
          styles.floatingBackBtn,
          { top: Platform.OS === 'android' ? (StatusBar.currentHeight || 10) : insets.top + 5 },
        ]}
      >
        <BackButton onPress={() => navigation.goBack()} />
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Listening</Text>
      </View>

      {/* Record/Stop */}
      <TouchableOpacity
        style={[styles.recordBtn, recording && styles.stopBtn]}
        onPress={recording ? stopRecording : () => startRecording(false)}
        disabled={uploading}
      >
        <Ionicons name={recording ? 'stop-circle' : 'mic-circle'} size={56} color="#fff" />
        <Text style={styles.recordBtnText}>
          {recording ? 'Stop Recording' : 'Start Recording'}
        </Text>
      </TouchableOpacity>

      {/* Timer */}
      {recording && (
        <Text style={{ textAlign: 'center', marginTop: 10, fontSize: 16, color: theme.text }}>
          ⏱ {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}
        </Text>
      )}

      {uploading && (
        <ActivityIndicator style={{ marginVertical: 10 }} size="large" color={theme.primary} />
      )}

      {/* List */}
      <ScrollView style={{ width: '100%', marginTop: 20 }}>
        {recordings.map((rec, index) => (
          <View key={index} style={styles.recordCard}>
            <Text style={styles.recordName}>
              🎵 Recording #{index + 1} | {rec.duration}
            </Text>
            <View style={styles.actionRow}>
              {playingIndex === index && isPlaying ? (
                <TouchableOpacity onPress={() => pauseRecording(index)}>
                  <Ionicons name="pause-circle" size={30} color={theme.primary} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => playRecording(index)}>
                  <Ionicons name="play-circle" size={30} color={theme.primary} />
                </TouchableOpacity>
              )}
              {playingIndex === index && (
                <Text style={{ marginLeft: 8, color: theme.text }}>
                  {Math.floor(playingProgress / 60)}:
                  {String(playingProgress % 60).padStart(2, '0')} / {rec.duration}
                </Text>
              )}
              <TouchableOpacity onPress={() => deleteRecording(index)}>
                <Ionicons name="trash" size={30} color="#e63946" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {recordings.length > 0 && (
        <TouchableOpacity style={styles.clearAllBtn} onPress={clearAllRecordings}>
          <Text style={styles.clearAllText}>Clear All Recordings</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background, paddingTop: 10 },
  floatingBackBtn: {
    position: 'absolute',
    left: 10,
    zIndex: 100,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  header: { marginTop: 30, alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 34, fontWeight: 'bold', color: theme.text, paddingTop: 20 },
  recordBtn: {
    backgroundColor: theme.primary,
    borderRadius: 50,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 20,
    marginHorizontal: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  stopBtn: { backgroundColor: "#e63946" },
  recordBtnText: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 5 },
  recordCard: {
    backgroundColor: theme.card,
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.border,
  },
  recordName: { fontSize: 16, color: theme.text, flex: 1 },
  actionRow: { flexDirection: 'row', gap: 15, marginLeft: 10, alignItems: 'center' },
  clearAllBtn: {
    backgroundColor: "#e63946",
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  clearAllText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
