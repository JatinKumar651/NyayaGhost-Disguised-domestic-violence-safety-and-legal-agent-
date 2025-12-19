// SOSScreen.js — White theme, all text black, modern minimalist

import React, { useState, useContext, useEffect } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { SettingsContext } from '../../contexts/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import { uploadMediaFromLocal } from '../../services/uploadMediaFromLocal';
import EditContactModal from '../../components/modals/EditContactModal';
import { supabase } from '../../services/supabaseClient';
import MediaPickerModal from '../../components/modals/MediaPickerModal';
import AudioPickerModal from '../../components/modals/AudioPickerModal';
import BackButton from '../../components/UI/BackButton';

// ——— Light palette (all text black) ———
const COLORS = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  text: '#000000',
  stroke: '#E5E7EB',     // subtle border
  strokeBold: '#111111', // for prominent borders
  overlay: 'rgba(0,0,0,0.6)',
};

export default function SOSScreen() {
  const navigation = useNavigation();
  const {
    emergencyMessage,
    setEmergencyMessage,
    emergencyContact,
    setEmergencyContact,
    locationEnabled,
    setLocationEnabled,
    setIsUnlocked,
  } = useContext(SettingsContext);

  const [message, setMessage] = useState(emergencyMessage);
  const [includeLocation, setIncludeLocation] = useState(locationEnabled);
  const [mediaSelected, setMediaSelected] = useState([]);
  const [audioSelected, setAudioSelected] = useState([]);
  const [recipient, setRecipient] = useState('emergency');
  const [confirmSPF, setConfirmSPF] = useState(false);
  const [showDeleteHelpModal, setShowDeleteHelpModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showPostSendReminder, setShowPostSendReminder] = useState(false); // kept if you use later
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showAudioPicker, setShowAudioPicker] = useState(false);
  const [showDeleteReminder, setShowDeleteReminder] = useState(false);
  const [showSentConfirmation, setShowSentConfirmation] = useState(false);

  const handleSendSOS = async () => {
    if (!recipient) {
      Alert.alert(
        'No Recipient Selected',
        'Please select who you want to send your SOS to before proceeding.'
      );
      return;
    }

    if (recipient === 'spf') {
      if (!message.trim()) {
        Alert.alert(
          'Message Required',
          'To send an SOS to the police, your message must include a description and location. Please write a brief message before proceeding.'
        );
        return;
      }

      if (!confirmSPF) {
        Alert.alert(
          'Disclaimer Required',
          'You must confirm that you understand this is for emergencies only before sending to the police.'
        );
        return;
      }

      Alert.alert(
        'SPF SMS Disabled',
        'For MVP safety purposes, SMS to the Police Force is disabled.\n\nPlease select your emergency contact to send your SOS.'
      );
      return;
    }

    if (recipient === 'emergency' && !message.trim()) {
      Alert.alert(
        'Empty Message',
        'Are you sure you want to send an SOS without a message?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send Anyway',
            onPress: () => proceedToSend(),
          },
        ]
      );
      return;
    }
    Alert.alert(
      'Send SOS?',
      'Are you sure you want to send this SOS message now?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Send Now',
          onPress: () => proceedToSend(),
        },
      ]
    );
  };

  const proceedToSend = async () => {
    let msg = message;
    let latitude = null;
    let longitude = null;
    let finalMediaUrls = [];
    let finalAudioUrls = [];

    if (includeLocation) {
      try {
        let permissionGranted = false;
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status === 'granted') {
          permissionGranted = true;
        } else {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') permissionGranted = true;
        }

        if (permissionGranted) {
          const loc = await Location.getCurrentPositionAsync({});
          latitude = loc.coords.latitude;
          longitude = loc.coords.longitude;
          const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
          msg += `\n\nMy location: ${mapsLink}`;
        } else {
          throw new Error('Location permission not granted');
        }
      } catch (err) {
        console.warn('[SOS] Location error:', err);
        msg += `\n\n[Location could not be retrieved]`;
      }
    }

    // Upload media files
    if (mediaSelected.length > 0) {
      const publicUrls = [];
      let mediaUploadFailed = false;
      for (const uri of mediaSelected) {
        const ext = uri.split('.').pop().toLowerCase();
        const mime =
          ext === 'mp4' ? 'video/mp4' :
          ext === 'mov' ? 'video/quicktime' :
          ext === 'm4a' || ext === 'aac' ? 'audio/mp4' :
          ext === 'mp3' ? 'audio/mpeg' :
          ext === 'wav' ? 'audio/wav' :
          ext === 'ogg' ? 'audio/ogg' :
          ext === 'amr' ? 'audio/amr' :
          ext === '3gp' ? 'audio/3gpp' :
          ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
          ext === 'png' ? 'image/png' :
          'application/octet-stream';
        try {
          const url = await uploadMediaFromLocal(uri, mime);
          publicUrls.push(url);
        } catch (err) {
          console.warn('[SOS] Media upload failed:', err);
          mediaUploadFailed = true;
        }
      }
      if (mediaUploadFailed) {
        msg += `\n\n[One or more media files failed to upload]`;
      }
      finalMediaUrls = publicUrls;

      if (publicUrls.length > 0) {
        try {
          const response = await fetch('https://safenotes-sos-html.safenotes-sos.workers.dev/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ media: publicUrls }),
          });
          const data = await response.json();
          if (data.html_url) {
            msg += `\n\nMedia evidence: ${data.html_url}`;
          } else {
            msg += `\n\n[Media link could not be generated]`;
          }
        } catch (err) {
          console.warn('[SOS] HTML link generation failed:', err);
          msg += `\n\n[Media link could not be generated]`;
        }
      }
    }

    // Append audio URLs from audioSelected
    if (audioSelected.length > 0) {
      try {
        const audioUrls = audioSelected.map(a => a.public_url);
        finalAudioUrls = audioUrls;

        const response = await fetch('https://safenotes-sos-html.safenotes-sos.workers.dev/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ media: audioUrls }),
        });
        const data = await response.json();
        if (data.html_url) {
          msg += `\n\nAudio evidence: ${data.html_url}`;
        } else {
          msg += `\n\n[Audio link could not be generated]`;
        }
      } catch (err) {
        console.warn('[SOS] Audio HTML link generation failed:', err);
        msg += `\n\n[Audio link could not be generated]`;
      }
    }

    // Save to Supabase
    try {
      const { error } = await supabase.from('sos_logs').insert([{
        message: msg,
        contact_name: emergencyContact?.name || null,
        contact_number: emergencyContact?.number || null,
        latitude,
        longitude,
        media_urls: finalMediaUrls,
        audio_urls: finalAudioUrls,
      }]);
      if (error) {
        console.error('Supabase insert error:', error);
      } else {
        console.log('SOS log saved to Supabase');
      }
    } catch (dbErr) {
      console.error('Error saving to Supabase:', dbErr);
    }

    // Send SMS via device
    if (emergencyContact?.number) {
      Alert.alert(
        'Reminder',
        'After sending your SOS via SMS, please return to SafeNotes to confirm.',
        [
          {
            text: 'Continue',
            onPress: () => {
              Linking.openURL(`sms:${emergencyContact.number}?body=${encodeURIComponent(msg)}`);
              setTimeout(() => setShowDeleteReminder(true), 3000);
            },
          },
        ]
      );
    } else {
      Alert.alert('No Contact', 'Please add an emergency contact first.');
    }
  };

  const handleLocationToggle = async () => {
    if (!locationEnabled) {
      Alert.alert(
        'Location Services Disabled',
        'Turn on location tracking in Settings to enable sharing.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Turn On',
            onPress: async () => {
              await setLocationEnabled(true);
              setIncludeLocation(true);
            },
          },
        ]
      );
    } else {
      setIncludeLocation(!includeLocation);
    }
  };

  useEffect(() => {
    if (recipient === 'spf' && !includeLocation) {
      setRecipient(null);
    }
  }, [includeLocation]);

  useEffect(() => {
    if (recipient !== 'spf' && confirmSPF) {
      setConfirmSPF(false);
    }
  }, [recipient]);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        setEmergencyMessage(message);
        if (includeLocation && !locationEnabled) {
          setLocationEnabled(true);
        }
      };
    }, [message, includeLocation])
  );

  return (
    <SafeAreaView
      style={{
        flex: 1,
        paddingTop: Platform.OS === 'android' ? 10 : StatusBar.currentHeight,
        backgroundColor: COLORS.background,
      }}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.container}>
        {/* Header */}
      <View style={styles.header}>
  <View style={styles.leftColumn}>
    <BackButton
      color={'#fff'}
      size={28}
      style={{ position: 'absolute', top: -20, left: -10 }}
      onPress={async () => {
        await setEmergencyMessage(message);
        navigation.goBack();
      }}
    />
    <Text style={styles.title}>Custom SOS</Text>
  </View>
</View>


        {/* Message input */}
        <Text style={styles.sectionTitle}>Message</Text>
        <TextInput
          style={styles.textInput}
          multiline
          value={message}
          onChangeText={setMessage}
          placeholder="Type your SOS message…"
          placeholderTextColor="#000000"
        />

        {/* Location toggle */}
        <Text style={styles.sectionTitle}>Location</Text>
        <TouchableOpacity onPress={handleLocationToggle} style={styles.row}>
          {includeLocation ? (
            <Ionicons name="checkbox" size={20} color={COLORS.text} />
          ) : (
            <View style={styles.emptyBox} />
          )}
          <Text style={styles.rowText}>  Share my current location</Text>
        </TouchableOpacity>

{/* Share Media Section */}
<Text style={styles.sectionTitle}>Share Media</Text>
<TouchableOpacity onPress={() => setShowMediaPicker(true)} style={styles.selectBtn}>
  <Text style={[styles.rowText, { color: '#FFFFFF' }]}>
    Select media from Journal      {mediaSelected.length} selected
  </Text>
</TouchableOpacity>

{/* Share Audio Section */}
<Text style={styles.sectionTitle}>Share Audio</Text>
<TouchableOpacity onPress={() => setShowAudioPicker(true)} style={styles.selectBtn}>
  <Text style={[styles.rowText, { color: '#FFFFFF' }]}>
    Select audio recordings        {audioSelected.length} selected
  </Text>
</TouchableOpacity>


        {/* Choose Recipients */}
        <Text style={styles.sectionTitle}>Choose Recipients</Text>
        <Text style={styles.subText}>Disclaimer: This app is not affiliated with SPF.</Text>

        <TouchableOpacity onPress={() => setRecipient('emergency')} style={styles.row}>
          <Ionicons
            name={recipient === 'emergency' ? 'radio-button-on' : 'radio-button-off'}
            size={22}
            color={COLORS.text}
          />
          <Text style={styles.rowText}>
            {'  '}Emergency Contact ({emergencyContact?.name || 'Not Set'})
          </Text>
          <TouchableOpacity
            onPress={() => setShowContactModal(true)}
            style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6 }}
          >
            <Text style={styles.linkInline}>[Edit]</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (!includeLocation) {
              Alert.alert(
                'Location Required',
                'IMPORTANT: Location sharing MUST be on to comply with SPF regulations.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Share my location',
                    onPress: () => {
                      if (!locationEnabled) {
                        Alert.alert(
                          'Location Services Disabled',
                          'Location tracking is off in Settings. Enable it to share your current location.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Turn On',
                              onPress: async () => {
                                await setLocationEnabled(true);
                                setIncludeLocation(true);
                                setRecipient('spf');
                              },
                            },
                          ]
                        );
                      } else {
                        setIncludeLocation(true);
                        setRecipient('spf');
                      }
                    },
                  },
                ]
              );
            } else {
              setRecipient('spf');
            }
          }}
          style={styles.row}
        >
          <Ionicons
            name={recipient === 'spf' ? 'radio-button-on' : 'radio-button-off'}
            size={22}
            color={COLORS.text}
          />
          <Text style={styles.rowText}>
            {'  '} Police Force
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (recipient === 'spf') {
              setConfirmSPF(!confirmSPF);
            }
          }}
          style={[styles.row, styles.spfCheckboxRow]}
          activeOpacity={recipient === 'spf' ? 0.8 : 1}
        >
          <View style={styles.checkboxWrapper}>
            {confirmSPF ? (
              <Ionicons name="checkbox" size={18} color={COLORS.text} />
            ) : (
              <View style={[styles.emptyBoxSPF]} />
            )}
          </View>
          <Text style={styles.confirmText}>
            <Text style={{ fontWeight: 'bold' }}>
              I understand that this is for EMERGENCIES only,
            </Text>{' '}
            when calling it is unsafe or not possible.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sendBtn, { opacity: recipient ? 1 : 0.6 }]}
          onPress={handleSendSOS}
          disabled={!recipient}
        >
          <Text style={styles.sendText}>Send SOS</Text>
        </TouchableOpacity>

        <Text style={styles.subText}>
          Your SOS will be sent via SMS. Location and media are shared as links. The media link expires in about 24h.
        </Text>
        <TouchableOpacity onPress={() => setShowDeleteHelpModal(true)}>
          <Text style={styles.linkText}>How to delete an SMS message for yourself</Text>
        </TouchableOpacity>

        {/* Modals */}
        <EditContactModal
          visible={showContactModal}
          onClose={() => setShowContactModal(false)}
          currentContact={emergencyContact}
          onSave={(updatedContact) => {
            setEmergencyContact(updatedContact);
            setShowContactModal(false);
          }}
        />

        <Modal visible={showDeleteHelpModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <ScrollView style={{ maxHeight: 300 }}>
                <View>
                  <Text style={styles.modalText}>
                    To delete the SOS SMS (text message) from your phone to evade detection, follow these steps. This only removes the message from{' '}
                    <Text style={[styles.modalText, { fontWeight: 'bold' }]}>your device</Text>.
                  </Text>
                  {Platform.OS === 'android' ? (
                    <>
                      <Text style={styles.modalText}>{'\n'}1. Open the Messages app.</Text>
                      <Text style={styles.modalText}>2. Find and open the conversation.</Text>
                      <Text style={styles.modalText}>3. Press and hold the message you want to delete.</Text>
                      <Text style={styles.modalText}>4. Tap the trash can icon or "Delete" option.</Text>
                      <Text style={styles.modalText}>5. Confirm deletion if prompted.</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.modalText}>{'\n'}1. Open the Messages app.</Text>
                      <Text style={styles.modalText}>2. Open the conversation.</Text>
                      <Text style={styles.modalText}>3. Press and hold the message bubble.</Text>
                      <Text style={styles.modalText}>4. Tap "More…".</Text>
                      <Text style={styles.modalText}>5. Select the message(s) you want to delete.</Text>
                      <Text style={styles.modalText}>6. Tap the trash can icon and confirm.</Text>
                    </>
                  )}
                  <Text style={styles.modalText}>
                    {'\n\n'}SMS does <Text style={[styles.modalText, { fontWeight: 'bold' }]}>not</Text> support “unsend” or delete-for-everyone.
                  </Text>
                  <Text style={styles.modalText}>This only hides it from your phone. The other person will still see it unless they delete it too.</Text>
                </View>
              </ScrollView>
              <TouchableOpacity onPress={() => setShowDeleteHelpModal(false)}>
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <MediaPickerModal
          visible={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          onConfirm={(selected) => {
            setMediaSelected(selected);
            setShowMediaPicker(false);
          }}
        />

        <AudioPickerModal
          visible={showAudioPicker}
          onClose={() => setShowAudioPicker(false)}
          onConfirm={(selected) => {
            setAudioSelected(selected);
            setShowAudioPicker(false);
          }}
          selectedItems={audioSelected}
        />

        {/* Reminder to delete SMS */}
        <Modal visible={showDeleteReminder} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalText}>
                Reminder: You may want to delete the SOS from your Messages app for yourself.
              </Text>
              <TouchableOpacity onPress={() => {
                setShowDeleteReminder(false);
                setShowSentConfirmation(true);
              }}>
                <Text style={styles.buttonText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Confirmation and return */}
        <Modal visible={showSentConfirmation} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalText}>
                SOS sent. Help is on the way, and you are not alone.{"\n\n"}Returning to your Notes...
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowSentConfirmation(false);
                  setIsUnlocked(false);
                  setTimeout(() => {
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'NotesHome' }],
                    });
                  }, 100);
                }}
              >
                <Text style={styles.buttonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const cardShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 10,
    paddingBottom: 0,
    position: 'relative',
  },

  leftColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
    marginTop: 50,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  textInput: {
    backgroundColor: '#9c711bff',
    color: '#ffff',
    padding: 14,
    borderRadius: 14,
    marginTop: 6,
    marginBottom: 6,
    height: 100,
    textAlignVertical: 'top',
    borderWidth: 1.5,
    borderColor: COLORS.stroke,
    ...cardShadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  rowText: {
    color: COLORS.text,
    fontSize: 16,
  },
  selectBtn: {
    backgroundColor: '#9c711bff',
    
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginTop: 6,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: COLORS.stroke,
    ...cardShadow,
  },
  sendBtn: {
    backgroundColor: '#710000ff',
  

    marginTop: 22,
    marginBottom: 12,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor:'#710000ff',
    ...cardShadow,
  },
  sendText: {
      color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  subText: {
    textAlign: 'left',
    color: COLORS.text,
    opacity: 1, // keep text black by request
    fontSize: 13,
    marginBottom: 6,
  },
  linkText: {
    textAlign: 'left',
    color: "#3a81d3ff",
    fontSize: 13,
    marginTop: 6,
    textDecorationLine: 'underline',
  },
  linkInline: {
     color: "#1c74c6ff",
    fontSize: 16,
    textDecorationLine: 'underline',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 24,
    width: '84%',
    borderWidth: 1.5,
    borderColor: COLORS.stroke,
    ...cardShadow,
  },
  modalText: {
    color: COLORS.text,
    fontSize: 15,
    marginBottom: 12,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
  },
  emptyBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: COLORS.text,
    borderRadius: 5,
  },
  spfCheckboxRow: {
    alignItems: 'flex-start',
    marginLeft: 30,
  },
  emptyBoxSPF: {
    width: 17,
    height: 17,
    borderWidth: 2,
    borderColor: COLORS.text,
    borderRadius: 4,
    marginRight: 8,
    marginTop: 2,
  },
  confirmText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    color: COLORS.text,
  },
  checkboxWrapper: {
    width: 18,
    height: 18,
    marginRight: 8,
    marginTop: 2,
  },
});
