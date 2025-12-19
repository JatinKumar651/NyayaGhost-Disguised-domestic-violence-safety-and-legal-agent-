import React, { useEffect, useContext, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  SafeAreaView,
  StatusBar,
  Animated,
  Easing,
  Modal,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TabHistoryContext } from '../../contexts/TabHistoryContext';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { supabase } from '../../services/supabaseClient';
import * as SMS from 'expo-sms';
import { MessageSquareText, Paperclip, Home, Bot, Bell } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

export default function HomeScreen() {
  const { pushTab } = useContext(TabHistoryContext);
  const navigation = useNavigation();

  const bounceAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;

  const [infoVisible, setInfoVisible] = useState(false);
  const modalAnim = useRef(new Animated.Value(0)).current; 
  const linkAnim = useRef(new Animated.Value(1)).current; 

  useEffect(() => {
    pushTab('Home');

    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -12,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(ringAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(linkAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
        Animated.timing(linkAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const openInfoModal = () => {
    setInfoVisible(true);
    modalAnim.setValue(0);
    Animated.timing(modalAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  };

  const closeInfoModal = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
      easing: Easing.in(Easing.ease),
    }).start(() => setInfoVisible(false));
  };

  const handleSOS = async () => {
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
  };

  const confirmAndSendSOS = () => {
    Alert.alert(
      'Confirm SOS',
      'Are you sure you want to send an SOS alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', style: 'destructive', onPress: handleSOS },
      ]
    );
  };

  const ringScale = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });
  const ringOpacity = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  const modalScale = modalAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });
  const modalOpacity = modalAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <SafeAreaView
      style={{
        flex: 1,
        paddingTop: Platform.OS === 'android' ? 10 : StatusBar.currentHeight,
        backgroundColor: '#fefefe',
      }}
    >
      {/* Top 20% background */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: screenHeight * 0.07,
          backgroundColor: '#9c711bff',
        }}
      />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Home</Text>
        </View>

        {/* Important Info Link */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Learn how to use emergency{'\n'}features. Tap{' '}
            <Animated.Text
              style={[styles.linkText, { transform: [{ scale: linkAnim }] }]}
              onPress={openInfoModal}
            >
              here
            </Animated.Text>
            !
          </Text>
        </View>

        {/* Info Modal */}
        {infoVisible && (
          <Modal transparent animationType="none" visible={infoVisible} onRequestClose={closeInfoModal}>
            <BlurView intensity={80} tint="dark" style={styles.modalOverlay}>
              <Animated.View style={[styles.modalContent, { transform: [{ scale: modalScale }], opacity: modalOpacity }]}>
                <ScrollView contentContainerStyle={{ padding: 20 }}>
                  <Text style={styles.modalTitle}>How to Use NyayaGhost SOS</Text>
                  <Text style={styles.modalText}>• Press SOS to send an Instant SMS</Text>
                  <Text style={styles.modalText}>• Triple tap anywhere for Panic Exit</Text>
                  <Text style={styles.modalText}>• Say "Emergency" to send SOS using Voice Recognition</Text>
                  <Text style={styles.modalText}>• Say "Start" to start recording audio using Voice Recognition</Text>
                  <TouchableOpacity style={styles.closeButton} onPress={closeInfoModal}>
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                </ScrollView>
              </Animated.View>
            </BlurView>
          </Modal>
        )}

        {/* Floating SOS Button */}
        <View style={styles.sosWrapper}>
          <Animated.View style={[styles.ring, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
          <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
            <LinearGradient
              colors={['#FF5252', '#FF1744']}
              style={styles.sosButton}
              start={[0, 0]}
              end={[1, 1]}
            >
              <TouchableOpacity style={styles.sosInner} onPress={confirmAndSendSOS}>
                <Text style={styles.sosText}>SOS</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          <AnimatedCard icon={<Bell color={'#d32f2f'} size={50} />} label="Custom SOS" onPress={() => { pushTab('Home'); navigation.navigate('SOS'); }} />
          <AnimatedCard icon={<MessageSquareText color={'#555'} size={50} />} label="Legal Advisory" onPress={() => { pushTab('Home'); navigation.navigate('LegalAgent'); }} />
          <AnimatedCard icon={<Paperclip color={'#555'} size={50} />} label="Journal" onPress={() => { pushTab('Home'); navigation.navigate('Journal'); }} />
          <AnimatedCard icon={<Home color={'#555'} size={50} />} label="Shelter" onPress={() => { pushTab('Home'); navigation.navigate('NearbyShelter'); }} />
        </View>

        {/* Chatbot Button */}
        <Animated.View style={[styles.chatbotButton, { transform: [{ translateY: bounceAnim }] }]}>
          <TouchableOpacity onPress={() => { Haptics.selectionAsync(); navigation.navigate('AIAvatarSelectionScreen'); }}>
            <Bot color={'#fff'} size={36} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// Animated Grid Card
function AnimatedCard({ icon, label, onPress }) {
  const anim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, []);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.07,
      useNativeDriver: true,
      friction: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }, { scale: scaleAnim }], opacity }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <BlurView intensity={70} tint="light" style={styles.card}>
          {icon}
          <Text style={styles.cardText}>{label}</Text>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
}

const cardSize = (screenWidth - 60) / 2;

const styles = StyleSheet.create({
  sosWrapper: { position: 'absolute', top: 80, right: 30, width: screenWidth * 0.36, height: screenWidth * 0.36, justifyContent: 'center', alignItems: 'center' },
  ring: { position: 'absolute', width: screenWidth * 0.36, height: screenWidth * 0.36, borderRadius: (screenWidth * 0.36) / 2, borderWidth: 3, borderColor: '#FF5252' },
  sosButton: { width: screenWidth * 0.36, height: screenWidth * 0.36, borderRadius: (screenWidth * 0.36) / 2, justifyContent: 'center', alignItems: 'center' },
  sosInner: { justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', borderRadius: (screenWidth * 0.36) / 2 },
  sosText: { color: '#fff', fontWeight: 'bold', fontSize: screenWidth * 0.12, fontFamily: 'Inter' },
  chatbotButton: { marginBottom: 29, position: 'absolute', bottom: 70, right: 32, backgroundColor: '#4A90E2', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', zIndex: 20, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 10 },
  container: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: 24, paddingTop: 130 },
  header: { marginBottom: 15 },
  title: { fontSize: 48, fontWeight: 'bold', fontFamily: 'Inter', color: '#9c711bff' },
  infoContainer: { paddingHorizontal: 0, paddingVertical: 8, backgroundColor: 'transparent', borderRadius: 16, marginBottom: 25 },
  infoText: { fontSize: 16, color: '#333', lineHeight: 22 },
  linkText: { color: '#FF5252', fontWeight: '700', textDecorationLine: 'underline' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', maxHeight: '70%', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 20 },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  modalText: { fontSize: 16, marginBottom: 12, lineHeight: 22 },
  closeButton: { marginTop: 20, backgroundColor: '#0262cfff', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  closeButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 20 },
  card: { width: cardSize, height: cardSize, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 10, backgroundColor: 'rgba(225, 225, 224, 1)', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  cardText: { marginTop: 12, color: '#333', fontSize: 16, fontFamily: 'Inter', fontWeight: '600', textAlign: 'center' },
});
