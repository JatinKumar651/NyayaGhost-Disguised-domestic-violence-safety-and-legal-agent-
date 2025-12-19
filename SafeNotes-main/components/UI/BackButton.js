import React, { useContext, useRef, useEffect } from 'react';
import { Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { TabHistoryContext } from '../../contexts/TabHistoryContext';

const BackButton = ({ color = 'white', size = 26, style }) => {
  const navigation = useNavigation();
  const { popTab } = useContext(TabHistoryContext);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  const handleBack = () => {
    const lastTab = popTab();
    if (lastTab === 'Home') {
      navigation.navigate('MainTabs', { screen: 'Home' });
    } else if (lastTab) {
      navigation.navigate(lastTab);
    } else {
      navigation.goBack();
    }
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <Pressable
        onPress={handleBack}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.button}
      >
        <ChevronLeft color={color} size={size} strokeWidth={2.2} />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 50,
    left: 15,
    zIndex: 1,
  },
  button: {
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 50,
    elevation: 4, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BackButton;
