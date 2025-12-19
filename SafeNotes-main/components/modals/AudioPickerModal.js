import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av'; // For playing audio
import { supabase } from '../../services/supabaseClient';

/**
 * Props:
 * - visible: boolean
 * - onClose: function
 * - onConfirm: function (receives array of selected audio objects with { id, public_url, mime_type, tags })
 * - selectedItems: array (currently selected)
 */

export default function AudioPickerModal({ visible, onClose, onConfirm, selectedItems = [] }) {
  const [audioFiles, setAudioFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(selectedItems);
  const [playingId, setPlayingId] = useState(null);
  const soundObjects = useRef({}); // To hold Audio.Sound instances keyed by id

  // Fetch audio files list from Supabase 'recordings' bucket and 'public.record_audio' table
  useEffect(() => {
    if (visible) {
      refreshAudioFiles();
    } else {
      stopAllSounds();
      setSelected(selectedItems);
    }
  }, [visible]);

  const refreshAudioFiles = async () => {
    setLoading(true);
    try {
      // Fetch records from public.record_audio table (assume suitable supabase client)
      const { data, error } = await supabase
        .from('record_audio')
        .select('id, public_url, mime_type, tags')
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.warn('Failed to fetch audio records:', error);
        setAudioFiles([]);
      } else {
        setAudioFiles(data || []);
      }
    } catch (e) {
      console.warn('Error fetching audio records:', e);
      setAudioFiles([]);
    }
    setLoading(false);
  };

  const toggleSelect = (item) => {
    if (selected.some(s => s.id === item.id)) {
      // Deselect
      setSelected(selected.filter(s => s.id !== item.id));
    } else {
      // Select up to 5
      if (selected.length >= 5) {
        alert('You can select up to 5 audio files only.');
        return;
      }
      setSelected([...selected, item]);
    }
  };

  const playPauseAudio = async (item) => {
    const currentlyPlaying = playingId === item.id;

    // If playing same, pause and unload
    if (currentlyPlaying) {
      // Stop and unload this sound
      const sound = soundObjects.current[item.id];
      if (sound) {
        await sound.pauseAsync();
        await sound.unloadAsync();
        soundObjects.current[item.id] = null;
      }
      setPlayingId(null);
      return;
    }

    // Stop any currently playing sound
    await stopAllSounds();

    // Load and play this audio
    try {
      const sound = new Audio.Sound();
      await sound.loadAsync({ uri: item.public_url }, { shouldPlay: true });
      soundObjects.current[item.id] = sound;
      setPlayingId(item.id);

      // When playback finishes, reset playingId and unload sound
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isPlaying && status.positionMillis === status.durationMillis) {
          setPlayingId(null);
          sound.unloadAsync();
          soundObjects.current[item.id] = null;
        }
      });
    } catch (err) {
      console.warn('Audio playback error:', err);
      alert('Could not play audio.');
    }
  };

  const stopAllSounds = async () => {
    const unloadPromises = Object.entries(soundObjects.current).map(async ([key, sound]) => {
      if (sound) {
        try {
          await sound.stopAsync();
          await sound.unloadAsync();
          soundObjects.current[key] = null;
        } catch (e) {
          // ignore errors
        }
      }
    });
    await Promise.all(unloadPromises);
    setPlayingId(null);
  };

  const renderItem = ({ item }) => {
    const isSelected = selected.some(s => s.id === item.id);
    const isPlaying = playingId === item.id;

    return (
      <TouchableOpacity
        style={[styles.itemContainer, isSelected && styles.selectedItem]}
        onPress={() => toggleSelect(item)}
        activeOpacity={0.8}
      >
        <View style={styles.leftSide}>
          <Ionicons
            name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={isSelected ? theme.accent : theme.text}
          />
          <View style={styles.audioInfo}>
            <Text style={styles.audioTitle} numberOfLines={1}>
              {item.public_url.split('/').pop()}
            </Text>
            <Text style={styles.audioTags}>
              Tags: {item.tags?.join(', ') || 'none'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => playPauseAudio(item)} style={styles.playPauseBtn}>
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={24}
            color={theme.accent}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.title}>Select up to 5 Audio Files</Text>
          {loading ? (
            <ActivityIndicator size="large" color={theme.accent} />
          ) : audioFiles.length === 0 ? (
            <Text style={styles.emptyText}>No audio recordings found.</Text>
          ) : (
            <FlatList
              data={audioFiles}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              extraData={{ selected, playingId }}
            />
          )}

          <View style={styles.btnRow}>
            <TouchableOpacity onPress={() => {
              stopAllSounds();
              onClose();
            }} style={[styles.btn, styles.cancelBtn]}>
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              stopAllSounds();
              onConfirm(selected);
            }} style={[styles.btn, styles.confirmBtn]}>
              <Text style={styles.btnText}>Confirm ({selected.length})</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const theme = {
  background: '#121212',
  card: '#1e1e1e',
  accent: '#0af',
  text: '#fff',
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: theme.card,
    borderRadius: 16,
    paddingVertical: 20,
    width: '90%',
    maxHeight: '80%',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyText: {
    color: theme.text,
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    justifyContent: 'space-between',
  },
  selectedItem: {
    backgroundColor: '#0a2fff22',
  },
  leftSide: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  audioInfo: {
    marginLeft: 12,
    flexShrink: 1,
  },
  audioTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '600',
  },
  audioTags: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 2,
  },
  playPauseBtn: {
    padding: 8,
    marginLeft: 12,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  cancelBtn: {
    backgroundColor: '#666',
  },
  confirmBtn: {
    backgroundColor: theme.accent,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
