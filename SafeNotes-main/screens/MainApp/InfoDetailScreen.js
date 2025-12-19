import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import { theme } from '../../constants/colors';
import InfoCard from '../../components/UI/InfoCard';
import infoIconMap from '../../components/UI/InfoIconMap';
import MarkdownContent from '../../components/UI/MarkdownContent';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

// Light modern theme overrides
const lightTheme = {
  background: '#F7F9FC',
  card: 'rgba(255,255,255,0.9)',
  accent: '#4F8EF7',
  text: '#1A1A1A',
};

export default function InfoDetail({ route }) {
  const { icon, title, content } = route.params;
  const navigation = useNavigation();

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        paddingTop:
          Platform.OS === 'android' ? StatusBar.currentHeight : 0,
        backgroundColor: lightTheme.background,
      }}
    >
      <View style={styles.container}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              backgroundColor: lightTheme.card,
            },
          ]}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: pressed ? '#1A1A1A' : '#000000',
              },
            ]}
          >
            <ChevronLeft color="white" size={26} />
          </Pressable>
          <InfoCard iconComponent={infoIconMap[icon]} title={title} />
        </Animated.View>

        {/* Scrollable content */}
        <Animated.View
          style={{
            flex: 1,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <ScrollView
            style={styles.scroll}
            overScrollMode="never"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.scrollInner}>
              <MarkdownContent content={content} theme={lightTheme} />
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22, // makes it circular
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollInner: {
    paddingBottom: 60,
  },
});
