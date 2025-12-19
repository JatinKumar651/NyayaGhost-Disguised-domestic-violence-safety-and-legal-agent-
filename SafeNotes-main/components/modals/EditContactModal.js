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
import { supabase } from '../../services/supabaseClient'; // Adjust path if needed

export default function EditContactModal({
  visible,
  onClose,
  onSave,
}) {
  const [loading, setLoading] = useState(false);
  const [contactId, setContactId] = useState(null);  // to store existing id if any
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [relationship, setRelationship] = useState('');
  const [email, setEmail] = useState('');

  // Fetch from supabase when modal opens
  useEffect(() => {
    if (visible) {
      fetchEmergencyContact();
    }
  }, [visible]);

  async function fetchEmergencyContact() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .order('created_at', { ascending: false }) // latest entry first
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no rows found - ignore
        console.error('Error fetching emergency contact:', error);
        Alert.alert('Error', 'Failed to load emergency contact from server.');
      }

      if (data) {
        setContactId(data.id);  // set the id here
        setName(data.name);
        setNumber(data.number);
        setRelationship(data.relationship);
        setEmail(data.email);
      } else {
        // No data, clear form and id
        setContactId(null);
        setName('');
        setNumber('');
        setRelationship('');
        setEmail('');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Unexpected error fetching emergency contact.');
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedNumber = number.trim().replace(/^(\+91|\s)*/, ''); // remove +91 if present
    const trimmedRelationship = relationship.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedNumber) {
      Alert.alert(
        'Fields Missing',
        'You are saving an empty emergency contact. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save Anyway',
            onPress: () => saveContact({
              name: trimmedName,
              number: '',
              relationship: trimmedRelationship,
              email: trimmedEmail,
              message: 'No SOS message set',
            }),
          },
        ]
      );
      return;
    }

    if (!/^[6-9]\d{9}$/.test(trimmedNumber)) {
      Alert.alert(
        'Invalid Number',
        'Please enter a valid 10-digit Indian number starting with 6, 7, 8, or 9.'
      );
      return;
    }

    if (trimmedEmail && !/^[\w.-]+@gmail\.com$/.test(trimmedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid @gmail.com email address.');
      return;
    }

    await saveContact({
      name: trimmedName,
      number: trimmedNumber,
      relationship: trimmedRelationship,
      email: trimmedEmail,
      message: 'No SOS message set',  // message required by supabase schema
    });
  };

  async function saveContact(contact) {
    try {
      setLoading(true);

      // Save locally
      await SecureStore.setItemAsync('emergencyContact', JSON.stringify(contact));

      if (contactId) {
        // Update existing contact by id
        const { error } = await supabase
          .from('emergency_contacts')
          .update({
            name: contact.name,
            number: contact.number,
            relationship: contact.relationship,
            email: contact.email,
            message: contact.message,
          })
          .eq('id', contactId);

        if (error) {
          console.error('Failed to update contact to supabase:', error);
          Alert.alert('Error', 'Could not update contact to server. Saved locally only.');
        } else {
          Alert.alert('Saved', 'Emergency contact updated successfully.');
        }
      } else {
        // Insert new contact (no id)
        const { error } = await supabase
          .from('emergency_contacts')
          .insert([
            {
              name: contact.name,
              number: contact.number,
              relationship: contact.relationship,
              email: contact.email,
              message: contact.message,
            },
          ]);

        if (error) {
          console.error('Failed to insert contact to supabase:', error);
          Alert.alert('Error', 'Could not save contact to server. Saved locally only.');
        } else {
          Alert.alert('Saved', 'Emergency contact saved successfully.');
        }
      }

      onSave(contact);
      onClose();
    } catch (e) {
      console.error('Failed to save contact:', e);
      Alert.alert('Error', 'Could not save contact. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Edit Emergency Contact</Text>

          {loading ? (
            <ActivityIndicator size="large" color={theme.accent} style={{ marginVertical: 20 }} />
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Contact name"
                placeholderTextColor={theme.muted}
                value={name}
                onChangeText={setName}
              />

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{
                  backgroundColor: theme.input,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 8,
                  marginRight: 8,
                }}>
                  <Text style={{ color: theme.text, fontSize: 14, fontFamily: 'Inter' }}>+91</Text>
                </View>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="10-digit number"
                  placeholderTextColor={theme.muted}
                  keyboardType="number-pad"
                  maxLength={10}
                  value={number}
                  onChangeText={setNumber}
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder="Relationship (e.g. Mum, Cousin)"
                placeholderTextColor={theme.muted}
                value={relationship}
                onChangeText={setRelationship}
              />

              <TextInput
                style={styles.input}
                placeholder="Emergency Email (@gmail.com)"
                placeholderTextColor={theme.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
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
    marginBottom: 12,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  cancelBtn: {
    marginRight: 16,
  },
  cancelText: {
    color: theme.muted,
    fontFamily: 'Inter',
    paddingTop: 8,
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
