import React, { useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, Animated, Image, StyleSheet, Dimensions, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import BackButton from '../../components/UI/BackButton';

const avatars = [
  {
    id: '1',
    name: 'Hope',
    image: require('../../assets/a.jpg'),
    description: 'Friendly AI assistant for general help and app guidance.'
  },
  {
    id: '2',
    name: 'Calm',
    image: require('../../assets/b.png'),
    description: 'Empathetic support companion for emotional wellness.'
  },
  {
    id: '3',
    name: 'Safe',
    image: require('../../assets/c.jpg'),
    description: 'Crisis assistant for urgent help and safety planning.'
  },
  {
    id: '4',
    name: 'Guard',
    image: require('../../assets/d.jpg'),
    description: 'Protective assistant offering guidance on staying safe.'
  },
  {
    id: '5',
    name: 'Light',
    image: require('../../assets/e.png'),
    description: 'Calming companion providing emotional support and reassurance.'
  },
  {
    id: '6',
    name: 'Pal',
    image: require('../../assets/bot.png'),
    description: 'Reliable AI friend for everyday advice and encouragement.'
  },
  {
    id: '7',
    name: 'Phoenix',
    image: require('../../assets/bot.jpg'),
    description: 'Empowerment guide helping users rebuild confidence and strength.'
  }
];

const { width } = Dimensions.get('window');
const ITEM_WIDTH = Math.round(width * 0.6);

export default function AIAvatarSelectionScreen() {
  const navigation = useNavigation();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Update selectedIndex as the slider scrolls
  const onMomentumScrollEnd = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / ITEM_WIDTH);
    setSelectedIndex(newIndex);
  };

  const handleStart = () => {
    if (selectedIndex !== null) {
      const selected = avatars[selectedIndex];
      const greeting = `Hi, I'm ${selected.name}. I'm here to listen and support you.`;
      // Speak the greeting aloud only if not muted
      if (!isMuted) {
        Speech.speak(greeting, {
          language: 'en',
          rate: 1.0,
          pitch: 1.0,
          volume: 1.0,
        });
      }
      // Pass greeting and flag to ChatbotScreen
      navigation.navigate('ChatbotScreen', {
        avatar: selected,
        initialGreeting: greeting,
        showInitialGreeting: true
      });
    }
  };

  const selectedAvatar = avatars[selectedIndex];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <BackButton style={styles.backButton} />
        <Text style={styles.title}>Choose Your Avatar</Text>
      </View>
      {/* Mute button */}
      <View style={styles.muteRow}>
        <TouchableOpacity
          style={[styles.muteButton, isMuted && styles.muteButtonActive]}
          onPress={() => setIsMuted(m => !m)}
          accessibilityLabel={isMuted ? 'Unmute audio' : 'Mute audio'}
        >
          <Ionicons
            name={isMuted ? 'volume-mute' : 'volume-high'}
            size={28}
            color={isMuted ? '#fff' : '#007AFF'}
            style={{ marginRight: 6 }}
          />
        </TouchableOpacity>
      </View>
      {/* Avatar name and description above carousel */}
      <View style={styles.avatarInfoContainer}>
        <Text style={styles.avatarNameBig}>{selectedAvatar.name}</Text>
        <Text style={styles.avatarDescription}>{selectedAvatar.description}</Text>
      </View>
      {/* Centered selected avatar */}
      <View style={styles.selectedAvatarCenter}>
        <Image source={selectedAvatar.image} style={styles.selectedAvatarImage} />
      </View>
      {/* Animated horizontal carousel */}
      <Animated.FlatList
        data={avatars}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        keyExtractor={item => item.id}
        contentContainerStyle={{ alignItems: 'center', marginTop: 16, marginBottom: 8 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={({ item, index }) => {
          const inputRange = [
            (index - 1) * ITEM_WIDTH,
            index * ITEM_WIDTH,
            (index + 1) * ITEM_WIDTH,
          ];
          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.85, 1.1, 0.85],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.5, 1, 0.5],
            extrapolate: 'clamp',
          });
          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSelectedIndex(index)}
              style={{ width: ITEM_WIDTH, alignItems: 'center', justifyContent: 'center' }}
            >
              <Animated.View
                style={[styles.avatarItem, selectedIndex === index && styles.selectedAvatar, { transform: [{ scale }], opacity }]}
              >
                <Image source={item.image} style={styles.avatarImage} />
                <Text style={styles.avatarName}>{item.name}</Text>
              </Animated.View>
            </TouchableOpacity>
          );
        }}
      />
      <TouchableOpacity
        style={[styles.startButton, selectedIndex === null && styles.startButtonDisabled]}
        onPress={handleStart}
        disabled={selectedIndex === null}
      >
        <Text style={styles.startButtonText}>Let's Start</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  muteRow: {
    width: '100%',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  muteButton: {
    backgroundColor: '#eee',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 2,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    shadowColor: '#007AFF',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  muteButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#fff',
  },
  container: {
    flex: 1,
    paddingTop: 70,
    backgroundColor: '#9c711bff',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingTop: 50,
    paddingLeft: -3,
  },
  backButton: {
    position: 'absolute',
    left: 8,
    top: 0,
    zIndex: 10,
  },
  title: {
    flex: 1,
    fontSize: 38,
    fontWeight: '700',
    color: '#ffffffff',
    textAlign: 'center',
    marginLeft: 32,
  },
  avatarInfoContainer: {
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingTop: 30,
  },
  avatarNameBig: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000ff',
    marginBottom: 4,
    textAlign: 'center',
  },
  avatarDescription: {
    fontSize: 15,
    color: '#fefefeff',
    textAlign: 'center',
    marginBottom: 8,
  },
  selectedAvatarCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  selectedAvatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 2,
    borderWidth: 3,
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
    backgroundColor: '#fff',
   
  },
  avatarItem: {
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 18,
    marginHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    
  },
  selectedAvatar: {
    borderColor: '#007AFF',
    shadowOpacity: 0.25,
    elevation: 16,
    
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  avatarName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  startButton: {
    marginBottom: 100,
    backgroundColor: '#007AFF',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 28,
    shadowColor: '#007AFF',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  startButtonDisabled: {
    backgroundColor: '#aaa',
    shadowOpacity: 0,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
});
