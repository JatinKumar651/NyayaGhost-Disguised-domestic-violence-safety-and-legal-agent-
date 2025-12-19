import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../constants/colors';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../../services/supabaseClient';

export default function EditMessageModal({
  visible,
  onClose,
  currentMessage,
  onSave,
}) {
  const [message, setMessage] = useState(currentMessage || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) setMessage(currentMessage || ''); // Reset on open
  }, [visible, currentMessage]);

  const handleSave = async () => {
    if (!message.trim()) {
      Alert.alert('Validation', 'Message cannot be empty.');
      return;
    }

    setLoading(true);
    try {
      // Save locally
      await SecureStore.setItemAsync('emergencyMessage', message);

      // Fetch latest full emergency contact
      const { data: latestContact, error: fetchError } = await supabase
        .from('emergency_contacts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Failed to fetch latest contact:', fetchError);
        Alert.alert('Error', 'Failed to update message on server.');
      } else if (latestContact) {
        // Update only the message field for this contact ID
        const { error: updateError } = await supabase
          .from('emergency_contacts')
          .update({ message: message })
          .eq('id', latestContact.id);

        if (updateError) {
          console.error('Failed to update message:', updateError);
          Alert.alert('Error', 'Failed to update message on server.');
        }
      }

      onSave(message);
      Alert.alert('Saved', 'Emergency message updated.');
      onClose();
    } catch (e) {
      console.error('Failed to save message:', e);
      Alert.alert('Error', 'Could not save message. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Edit Emergency Message</Text>

          {loading ? (
            <ActivityIndicator size="large" color={theme.accent} style={{ marginVertical: 20 }} />
          ) : (
            <>
              <TextInput
                style={styles.input}
                multiline
                value={message}
                onChangeText={setMessage}
                placeholder="Enter your message..."
                placeholderTextColor={theme.muted}
                textAlignVertical="top"
              />

              <View style={styles.buttons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 20,
    color: theme.text,
    fontFamily: 'Inter',
    fontWeight: 'bold',
    marginBottom: 12,
    marginLeft: 4,
  },
  input: {
    backgroundColor: theme.input,
    color: theme.text,
    fontFamily: 'Inter',
    fontSize: 15,
    padding: 12,
    borderRadius: 8,
    height: 100,
    marginBottom: 12,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    marginRight: 16,
    paddingTop: 8,
  },
  cancelText: {
    color: theme.muted,
    fontFamily: 'Inter',
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: theme.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'Inter',
    fontSize: 16,
  },
});
