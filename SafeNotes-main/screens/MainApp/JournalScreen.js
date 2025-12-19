// JournalScreen.js
import React, { useContext } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
  StatusBar,
  SafeAreaView,
  LinearGradient
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../constants/colors';
import { SettingsContext } from '../../contexts/SettingsContext';
import { ImageIcon, Camera, Mic } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { saveMediaLocally } from '../../services/saveMediaLocally';
import Constants from 'expo-constants';
import { Video } from 'expo-av';
import BackButton from '../../components/UI/BackButton';

// Import your upload function here
import { uploadMediaFromLocal } from '../../services/uploadMediaFromLocal';

export default function JournalScreen() {
  const [media, setMedia] = React.useState([]);
  const navigation = useNavigation();
  const { autoWipeTTL, cameraEnabled, galleryEnabled, setIsUnlocked } =
    useContext(SettingsContext);
  const isExpoGo = Constants.appOwnership === 'expo';

  const STORAGE_KEY = 'journalMedia';

  useFocusEffect(
    React.useCallback(() => {
      loadMediaFromAsyncStorage();
    }, [autoWipeTTL])
  );

  function resolveMediaType(uri, fallback = 'unknown') {
    if (uri.endsWith('.mp4')) return 'video';
    if (uri.endsWith('.jpg') || uri.endsWith('.jpeg') || uri.endsWith('.png'))
      return 'image';
    if (uri.endsWith('.m4a') || uri.endsWith('.mp3') || uri.endsWith('.aac'))
      return 'audio';
    return fallback;
  }

  async function loadMediaFromAsyncStorage() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      let parsed = stored ? JSON.parse(stored) : [];

      if (autoWipeTTL !== 'never') {
        const threshold =
          Date.now() - (autoWipeTTL === '24h' ? 86400000 : 172800000);
        const fresh = [];
        for (const item of parsed) {
          if (item.timestamp > threshold) {
            fresh.push(item);
          } else {
            try {
              await FileSystem.deleteAsync(item.uri, { idempotent: true });
            } catch {
              console.warn('Failed to delete expired media:', item.uri);
            }
          }
        }
        parsed = fresh;
      }

      parsed.sort((a, b) => b.timestamp - a.timestamp);
      setMedia(parsed);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch (e) {
      console.warn('Failed to load Journal from AsyncStorage:', e);
    }
  }

  const showPermissionDialog = (type, onCancel) => {
    Alert.alert(
      `${type} Disabled`,
      `You’ve disabled ${type.toLowerCase()} access in settings. To use this feature, enable it in Settings.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => onCancel?.() },
        {
          text: 'Go to Settings',
          onPress: () => navigation.navigate('Settings'),
        },
      ]
    );
  };

  const handleGalleryUpload = async () => {
    if (!galleryEnabled) {
      showPermissionDialog('Media Gallery', () => {});
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      const uri = asset.uri;
      const savedPath = await saveMediaLocally(uri);
      const type = resolveMediaType(savedPath, asset?.type ?? 'unknown');

      const info = await FileSystem.getInfoAsync(savedPath);
      if (!info.exists) {
        Alert.alert('Save failed', 'Could not save selected media.');
        return;
      }

      let publicUrl = null;
      try {
        publicUrl = await uploadMediaFromLocal(
          savedPath,
          asset.mimeType || 'application/octet-stream'
        );
        console.log('Uploaded media public URL:', publicUrl);
      } catch (uploadError) {
        console.warn('Upload to Supabase failed:', uploadError);
        Alert.alert('Upload Error', 'Failed to upload media to cloud storage.');
      }

      const entry = {
        id: Date.now().toString(),
        uri: savedPath,
        type,
        timestamp: Date.now(),
        publicUrl, 
      };

      const updated = [entry, ...media];
      setMedia(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      setTimeout(() => {
        setIsUnlocked(true);
      }, 500);
      setTimeout(() => {
        navigation.navigate('Journal');
      }, 500);
    } catch {
      Alert.alert(
        'Upload Error',
        'Something went wrong while uploading media.'
      );
    }
  };

  const renderItem = ({ item }) => {
    if (!item || !item.uri || !item.type) return null;

    const openMedia = () => {
      const mediaIndex = media.findIndex((m) => m.id === item.id);
      if (mediaIndex === -1) {
        Alert.alert('Error', 'Media not found.');
        return;
      }
      navigation.navigate('MediaView', {
        media,
        index: mediaIndex,
      });
    };

    if (item.type === 'audio') {
      return (
        <TouchableOpacity style={styles.itemContainer} onPress={openMedia}>
          <View style={styles.audioPlaceholder}>
            <Ionicons name="mic-outline" color={'#444'} size={32} />
          </View>
        </TouchableOpacity>
      );
    }

    if (item.type === 'video') {
      return (
        <TouchableOpacity style={styles.itemContainer} onPress={openMedia}>
          <View style={styles.videoWrapper}>
            <Video
              source={{ uri: item.publicUrl ?? item.uri }}
              style={styles.videoThumbnail}
              useNativeControls={false}
              resizeMode="cover"
              shouldPlay={false}
            />
            <View style={styles.playIcon}>
              <Ionicons
                name="play"
                size={36}
                color="#fff"
                style={{
                  transform: [{ translateY: -6 }, { translateX: -5 }],
                }}
              />
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    if (item.type === 'image') {
      return (
        <TouchableOpacity style={styles.itemContainer} onPress={openMedia}>
          <Image
            source={{ uri: item.publicUrl ?? item.uri }}
            style={styles.image}
          />
        </TouchableOpacity>
      );
    }

    return null;
  };

  const handleCameraCapture = async () => {
    if (!cameraEnabled) {
      showPermissionDialog('Camera');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        videoMaxDuration: 30,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        const mediaType = asset.type ?? result.type;
        const uri = asset.uri;
        const entry = {
          id: Date.now().toString(),
          uri,
          type: mediaType,
          timestamp: Date.now(),
        };
        const updated = [entry, ...media];
        setMedia(updated);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        setIsUnlocked(true);
        navigation.navigate('Journal');
      }
    } catch {
      Alert.alert('Error', 'Could not open camera.');
    }
  };

  const handleDeleteAll = () => {
    if (media.length === 0) {
      Alert.alert('Nothing to delete', 'Your journal is already empty.');
      return;
    }

    Alert.alert(
      'Delete all media?',
      'This will permanently delete all journal entries. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const item of media) {
                await FileSystem.deleteAsync(item.uri, { idempotent: true });
              }
              setMedia([]);
              await AsyncStorage.removeItem(STORAGE_KEY);
            } catch (e) {
              Alert.alert('Error', 'Failed to delete all media.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        paddingTop: Platform.OS === 'android' ? 10 : StatusBar.currentHeight,
        backgroundColor: '#F9F9F9',
      }}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <BackButton style={styles.backButton} />
          <Text style={styles.title}>Journal</Text>
        </View>

        <Text style={styles.autowipe}>
          Auto-wipe:{' '}
          {autoWipeTTL === 'never' ? 'Never' : 'Every ' + autoWipeTTL}
        </Text>

        <View style={styles.subRow}>
          <Text style={styles.subtext}>Video max 30s </Text>
          <TouchableOpacity onPress={handleDeleteAll} style={styles.deleteButton}>
            <Text style={styles.deleteAllText}>Delete All</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={media}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={3}
          contentContainerStyle={styles.grid}
          overScrollMode="never"
        />

        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={[
              styles.fab,
              { backgroundColor: cameraEnabled ? '#1A73E8' : '#BBB' },
            ]}
            onPress={handleCameraCapture}
          >
            <Camera color="#fff" size={28} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.fab,
              { backgroundColor: galleryEnabled ? '#FFB300' : '#BBB' },
            ]}
            onPress={handleGalleryUpload}
          >
            <ImageIcon color="#fff" size={28} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fab, { backgroundColor: '#34A853' }]}
            onPress={() => navigation.navigate('Listening')}
          >
            <Mic color="#fff" size={28} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 15,
    paddingBottom: 5,
    position: 'relative',
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
   
    letterSpacing: 0.5,
     color: '#9c711bff',
  },
  autowipe: {
    color: '#444',
    fontSize: 18,
    marginTop: 10,
    marginBottom: 10,
    fontWeight: '500'
  },
  subtext: {
    color: '#777',
    fontSize: 14,
  },
  grid: {
    paddingBottom: 120,
    
  },
  itemContainer: {
    flex: 1 / 3,
    aspectRatio: 1,
    margin: 5,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    
  },
  audioPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    backgroundColor: '#EEE',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    flexDirection: 'row',
    gap: 16,
  },
  fab: {
    width: 62,
    height: 62,
    borderRadius: 31,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5
    
  },
  backButton: {
    position: 'absolute',
    left: -5,
    top: -40,
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  playIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -16 }, { translateY: -16 }],
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  deleteAllText: {
    color: '#ffffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#770000ff'
  }
});
