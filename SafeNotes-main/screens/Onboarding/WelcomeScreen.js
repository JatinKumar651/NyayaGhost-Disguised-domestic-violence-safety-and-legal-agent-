import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  SafeAreaView,
  ImageBackground,
  Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../constants/colors';
import Animated, { Easing, useSharedValue, withTiming, useAnimatedStyle, withRepeat, withSequence } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Ionicons';

const background = require('../../assets/home.jpg');
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function WelcomeScreen() {
  const navigation = useNavigation();
  const bottomHeight = SCREEN_HEIGHT * 0.45; // slightly higher for text

  const buttonAnim = useSharedValue(0);
  const arrowAnim = useSharedValue(0);

  // Initialize animations once on mount
  useEffect(() => {
    // Horizontal pulse animation for button
    buttonAnim.value = withRepeat(
      withSequence(
        withTiming(10, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(-10, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Arrow bounce animation
    arrowAnim.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: buttonAnim.value }],
  }));

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: arrowAnim.value }],
  }));

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 10 : 0 },
      ]}
    >
      <ImageBackground source={background} style={styles.background} resizeMode="cover">
        {/* Overlay */}
        <View style={styles.overlay} />

        {/* Bottom curved SVG container */}
        <View style={[styles.bottomContainer, { height: bottomHeight }]}>
          <Svg
            width={SCREEN_WIDTH}
            height={bottomHeight}
            viewBox={`0 0 ${SCREEN_WIDTH} ${bottomHeight}`}
            style={StyleSheet.absoluteFill}
          >
            <Path
              fill="#fff"
              d={`
                M 0 ${bottomHeight} 
                L 0 30 
                Q ${SCREEN_WIDTH * 0.5} 0 ${SCREEN_WIDTH} 110 
                L ${SCREEN_WIDTH} ${bottomHeight} 
                Z
              `}
            />
          </Svg>

          {/* Content inside curved container */}
          <View style={styles.bottomContent}>
            {/* Title & Quote */}
            <View style={styles.bottomTextContainer}>
              <Text style={styles.title}>NyayaGhost</Text>
              <Text style={styles.quote}>
                "Empower your home with safety and{"\n"}justice.  
                Know your rights,{"\n"}protect your family."
              </Text>
            </View>

            {/* Animated Button */}
            <Animated.View style={buttonStyle}>
              <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate('PinSetup')}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Begin Setup</Text>
                <Animated.View style={arrowStyle}>
                  <Icon name="arrow-forward-circle" size={28} color="#fff" style={{ marginLeft: 10 }} />
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor:'#9c711bff',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    
  },
  bottomContent: {
    flex: 1,
    justifyContent: 'flex-end', // push content to bottom
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
    
  },
bottomTextContainer: {
  marginBottom: 20,
  alignItems: 'flex-start',
   // align content to the left
},

title: {
  color: '#000', // black on white background
  fontSize: 32,
  fontFamily: 'Inter',
  fontWeight: '700',
  textAlign: 'left', // left align
  marginBottom: 20,
   marginLeft: 0,
},

quote: {
  color: '#333',
  fontSize: 16,
  fontFamily: 'Inter',
  fontStyle: 'italic',
  textAlign: 'left', // left align
  lineHeight: 22,
  marginBottom: 30,
},

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:'#9c711bff',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 30,
    elevation: 6,
    shadowColor: '#4B7BEC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
});
