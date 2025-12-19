import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Video } from 'expo-av';
import { useIsFocused } from '@react-navigation/native';
import BackButton from '../../components/UI/BackButton';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

const videos = [
  { src: require('../../assets/DefenseVideos/Video1.mp4'), label: 'An Ear Clap', instruction: 'Aim for the attacker’s ear with a sharp clap to disorient them.' },
  { src: require('../../assets/DefenseVideos/Video2.mp4'), label: 'Eye jab', instruction: 'Use your fingers to jab the attacker’s eyes quickly and firmly.' },
  { src: require('../../assets/DefenseVideos/Video3.mp4'), label: 'Mentally Prepare for an Attack', instruction: 'Stay alert and mentally ready to defend yourself at all times.' },
  { src: require('../../assets/DefenseVideos/Video4.mp4'), label: 'Downward Stabbing', instruction: 'Use a downward stabbing motion to strike vulnerable areas.' },
  { src: require('../../assets/DefenseVideos/Video5.mp4'), label: 'Chain jab', instruction: 'Quickly jab multiple times in succession to overwhelm the attacker.' },
  { src: require('../../assets/DefenseVideos/Video6.mp4'), label: 'Basic Moves', instruction: 'Learn and practice basic defensive moves regularly.' },
  { src: require('../../assets/DefenseVideos/Video7.mp4'), label: 'Escape a Bear Hug', instruction: 'Use leverage and quick movements to break free from a bear hug.' },
  { src: require('../../assets/DefenseVideos/Video8.mp4'), label: 'Use Heels as a Weapon', instruction: 'Kick backward with your heels aiming for vulnerable targets.' },
];

export default function DefenseScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const videoRef = useRef(null);
  const isFocused = useIsFocused();

  // Preload videos once
  useEffect(() => {
    (async () => {
      for (let v of videos) {
        await Video.prefetch(v.src); // Preloads into cache
      }
    })();
  }, []);

  useEffect(() => {
    if (!isFocused && videoRef.current) {
      videoRef.current.pauseAsync();
      setCurrentIndex(0);
    }
  }, [isFocused]);

  const goPrev = () => {
    const newIndex = currentIndex === 0 ? videos.length - 1 : currentIndex - 1;
    changeVideo(newIndex);
  };

  const goNext = () => {
    const newIndex = currentIndex === videos.length - 1 ? 0 : currentIndex + 1;
    changeVideo(newIndex);
  };

  const changeVideo = async (newIndex) => {
    setBuffering(true);
    setCurrentIndex(newIndex);
    if (videoRef.current) {
      await videoRef.current.stopAsync();
      await videoRef.current.loadAsync(videos[newIndex].src, { shouldPlay: true }, true);
    }
    setBuffering(false);
  };

  const { src, label, instruction } = videos[currentIndex];

  return (
    <View style={styles.container}>
      {/* Top half */}
      <View style={styles.topHalf}>
        <BackButton onPress={() => navigation.goBack()} color="#fff" />
        <Text style={styles.title}>Self-Defense</Text>

        <View style={styles.videoContainer}>
          {buffering && (
            <ActivityIndicator
              size="large"
              color="#fff"
              style={StyleSheet.absoluteFill}
            />
          )}
          <Video
            ref={videoRef}
            source={src}
            rate={1.0}
            resizeMode="contain"
            useNativeControls
            shouldPlay
            onLoadStart={() => setBuffering(true)}
            onReadyForDisplay={() => setBuffering(false)}
            style={styles.video}
          />
        </View>
      </View>

      {/* Bottom half */}
      <View style={styles.bottomHalf}>
        <View style={styles.textContainer}>
          <Text style={styles.videoLabel}>{label}</Text>
          <Text style={styles.instruction}>{instruction}</Text>
        </View>

        <View style={styles.paginationContainer}>
          <TouchableOpacity style={styles.navButton} onPress={goPrev}>
            <Text style={styles.navText}>‹ Prev</Text>
          </TouchableOpacity>

          <View style={styles.dotsContainer}>
            {videos.map((_, idx) => (
              <View
                key={idx}
                style={[styles.dot, currentIndex === idx && styles.activeDot]}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.navButton} onPress={goNext}>
            <Text style={styles.navText}>Next ›</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  topHalf: {
    backgroundColor: '#7c5913ff',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#fff',
    marginVertical: 15,
    marginTop: 100,
  },
  videoContainer: {
    width: screenWidth * 0.9,
    height: screenHeight / 2.5,
    backgroundColor: '#000',
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  bottomHalf: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 25,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  videoLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: '#7c5913',
    marginBottom: 8,
  },
  instruction: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 22,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  navText: {
    fontSize: 18,
    color: '#7c5913',
    fontWeight: '600',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#bbb',
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: '#7c5913',
    transform: [{ scale: 1.2 }],
  },
});
