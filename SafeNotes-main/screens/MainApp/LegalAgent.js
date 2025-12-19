// ─── LegalAgent.js ────────────────────────────────

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  ImageBackground,
  Dimensions,
  Animated,
  Easing,
  ScrollView,
  Pressable,
  PanResponder,
} from 'react-native';
import { theme } from '../../constants/colors';
import { BookOpen, MessageCircle, FileText, MapPin } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import BackButton from '../../components/UI/BackButton';

const { height, width } = Dimensions.get('window');
const cardSize = (width - 80) / 2;

export default function LegalAgent({ navigation }) {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 0,
        backgroundColor: theme.background,
      }}
    >
      {/* Top background */}
      <View style={styles.topSection} />

      {/* Bottom background */}
      <View style={styles.bottomSection} />

      {/* BackButton */}
      <View style={styles.backButtonContainer}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>

      {/* Heading Section */}
      <ImageBackground
        source={require('../../assets/sat.png')}
        style={styles.backgroundContainer}
        imageStyle={styles.backgroundImage}
        blurRadius={1}
        resizeMode="cover"
      >
        <View style={styles.textBlock}>
          <Text style={styles.heading}>   Legal{"\n"}Advisory</Text>
          <Text style={styles.quote}>
            Justice, fairness, and guidance{"\n"}— always by your side.
          </Text>
        </View>
      </ImageBackground>

      {/* White Section */}
      <View style={styles.whiteSection}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

          <AnimatedCard
            icon={<BookOpen color={'#1565c0'} size={32} />}
            label="Legal Rights Guide"
            align="left"
            gradientColors={['#1565c0', '#42a5f5']}
            sideText={[
              "Quickly learn your fundamental rights.",
              "Understand laws that protect you.",
              "Simple explanations for complex legal terms."
            ]}
            footerText="Get clear, simple summaries of legal principles you can trust."
            onPress={()=> navigation.navigate('LegalRightsGuide')}
          />

          <AnimatedCard
            icon={<MessageCircle color={'#2e7d32'} size={32} />}
            label="Interactive Legal Assistant"
            align="right"
            gradientColors={['#2e7d32', '#66bb6a']}
            sideText={[
              "Ask your legal questions anytime.",
              "Receive guided support instantly.",
              "Tailored responses to your situation."
            ]}
            footerText="Your AI-powered assistant is here to simplify legal complexities."
            onPress={()=> navigation.navigate('LegalAssistant')}
          />

          <AnimatedCard
            icon={<FileText color={'#e65100'} size={32} />}
            label="Legal Document Generator"
            align="left"
            gradientColors={['#e65100', '#ff9800']}
            sideText={[
              "Draft agreements, affidavits, and notices.",
              "Provide details and generate instantly.",
              "Professional and ready to use."
            ]}
            footerText="Auto-generate professional documents tailored to your needs."
            onPress={() => navigation.navigate('LegalDocumentGenerator')}
          />

          {/* Lawyers Directory (with navigation) */}
          <AnimatedCard
            icon={<MapPin color={'#6a1b9a'} size={32} />}
            label="Lawyers Directory"
            align="right"
            gradientColors={['#6a1b9a', '#ab47bc']}
            sideText={[
              "Search for trusted local lawyers.",
              "They provide legal support.",
              "Quick connections for urgent needs."
            ]}
            footerText="Get connected to trusted professionals in your area."
            onPress={() => navigation.navigate("LawyerDirectory")}
          />

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/* Animated Card Component */
function AnimatedCard({ icon, label, align, sideText, footerText, gradientColors, onPress }) {
  const anim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const tiltAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, []);

  const slideIn = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [align === 'left' ? -width : width, 0],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Tilt effect for card only
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        tiltAnim.setValue({
          x: gesture.dx / 20,
          y: gesture.dy / 20,
        });
      },
      onPanResponderRelease: () => {
        Animated.spring(tiltAnim, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.08,
      friction: 5,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={{ marginBottom: 35, width: '100%' }}>
      <View
        style={{
          flexDirection: align === 'left' ? 'row' : 'row-reverse',
          alignItems: 'flex-start',
        }}
      >
        {/* Only Card Animated */}
        <Animated.View
          style={{
            transform: [
              { translateX: slideIn },
              { scale: scaleAnim },
              { translateX: tiltAnim.x },
              { translateY: tiltAnim.y },
            ],
            opacity,
          }}
          {...panResponder.panHandlers}
        >
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={onPress} // 🔥 Add navigation here
            style={{ borderRadius: 26 }}
          >
            <BlurView intensity={70} tint="light" style={styles.blurCard}>
              <LinearGradient colors={gradientColors} style={styles.cardGradient}>
                <View style={styles.iconCircle}>{icon}</View>
                <Text style={styles.cardText}>{label}</Text>
              </LinearGradient>
            </BlurView>
          </Pressable>
        </Animated.View>

        {/* Side Text stays static */}
        <View style={{ flex: 1, paddingHorizontal: 14 }}>
          {Array.isArray(sideText) ? (
            sideText.map((point, idx) => (
              <View
                key={idx}
                style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 }}
              >
                <Text style={styles.bullet}>{'\u2022'}</Text>
                <Text style={styles.sideText}>{point}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.sideText}>{sideText}</Text>
          )}
        </View>
      </View>

      {/* Footer also static */}
      <Text style={styles.footerText}>{footerText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topSection: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '10%',
    backgroundColor: '#9c711bff',
    zIndex: -1,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '10%',
    backgroundColor: '#9c711bff',
    zIndex: -1,
  },
  backButtonContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
    left: 10,
    zIndex: 10,
  },
  backgroundContainer: {
    height: height * 0.38,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginTop: 17,
  },
  backgroundImage: {
    opacity: 0.5,
  },
  textBlock: {
    alignItems: 'flex-start',
  },
  heading: {
    fontSize: 44,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  quote: {
    fontSize: 15,
    marginTop: 6,
    color: '#FFFFFF',
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  whiteSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 40,
    marginTop: -20,
  },

  /** ---- Cards ---- */
  blurCard: {
    width: cardSize,
    height: cardSize,
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  cardGradient: {
    flex: 1,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  iconCircle: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    padding: 14,
    borderRadius: 50,
    marginBottom: 10,
  },
  cardText: {
    marginTop: 4,
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },

  /** Side bullet text */
  sideText: {
    fontSize: 15,
    color: '#9c711bff',
    lineHeight: 22,
    flexShrink: 1,
    flex: 1,
    textAlign: 'justify',
    fontWeight: '600',
  },
  bullet: {
    fontSize: 25,
    color: '#9c711bff',
    marginRight: 8,
    lineHeight: 22,
  },

  /** Footer */
  footerText: {
    fontSize: 15,
    color: '#9c711bff',
    marginTop: 14,
    paddingHorizontal: 8,
    lineHeight: 20,
    textAlign: 'justify',
    fontWeight: '600',
  },
});
