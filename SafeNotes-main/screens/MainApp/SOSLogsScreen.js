import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Modal,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { supabase } from '../../services/supabaseClient';
import { theme } from '../../constants/colors';
import BackButton from '../../components/UI/BackButton';

export default function SOSLogsScreen() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const isFocused = useIsFocused();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.8)).current;

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sos_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching SOS logs:', error);
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  const deleteLog = async (id) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this SOS log?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('sos_logs').delete().eq('id', id);
            if (error) {
              console.error('Error deleting log:', error);
            } else {
              setSelectedLog(null);
              fetchLogs();
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (isFocused) {
      fetchLogs();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [isFocused]);

  useEffect(() => {
    if (selectedLog) {
      Animated.spring(modalScale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    } else {
      modalScale.setValue(0.8);
    }
  }, [selectedLog]);

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <BackButton color="#ffffffff" size={32} style={styles.backButton} />

      {/* Header */}
      <Text style={styles.header}>          SOS History</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
      ) : logs.length === 0 ? (
        <Text style={styles.noLogs}>No SOS logs found</Text>
      ) : (
        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {logs.map((log, index) => (
              <Animated.View
                key={log.id}
                style={{
                  transform: [
                    {
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20 * (index + 1), 0],
                      }),
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  style={styles.logCard}
                  onPress={() => setSelectedLog(log)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.timestamp}>
                    🕒 {new Date(log.created_at).toLocaleString()}
                  </Text>
                  <Text style={styles.message} numberOfLines={1}>
                    {log.message}
                  </Text>
                  {log.contact_name && (
                    <Text style={styles.details}>👤 {log.contact_name}</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* Details Modal */}
      <Modal
        visible={!!selectedLog}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedLog(null)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalBox, { transform: [{ scale: modalScale }] }]}>
            {selectedLog && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>SOS Details</Text>
                <Text style={styles.modalText}>
                  🕒 {new Date(selectedLog.created_at).toLocaleString()}
                </Text>
                <Text style={styles.modalText}>💬 {selectedLog.message}</Text>
                {selectedLog.contact_name || selectedLog.contact_number ? (
                  <Text style={styles.modalText}>
                    👤 {selectedLog.contact_name || 'Unknown'} —{' '}
                    {selectedLog.contact_number || 'No Number'}
                  </Text>
                ) : null}

                {selectedLog.latitude && selectedLog.longitude && (
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(
                        `https://maps.google.com/?q=${selectedLog.latitude},${selectedLog.longitude}`
                      )
                    }
                  >
                    <Text style={styles.link}>📍 View Location</Text>
                  </TouchableOpacity>
                )}

                {selectedLog.media_urls?.length > 0 && (
                  <View style={styles.mediaSection}>
                    <Text style={styles.sectionTitle}>📷 Media</Text>
                    {selectedLog.media_urls.map((url, i) => (
                      <TouchableOpacity key={i} onPress={() => Linking.openURL(url)}>
                        <Text style={styles.link}>Media {i + 1}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {selectedLog.audio_urls?.length > 0 && (
                  <View style={styles.mediaSection}>
                    <Text style={styles.sectionTitle}>🎙 Audio</Text>
                    {selectedLog.audio_urls.map((url, i) => (
                      <TouchableOpacity key={i} onPress={() => Linking.openURL(url)}>
                        <Text style={styles.link}>Audio {i + 1}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Delete Single Entry */}
                <TouchableOpacity
                  style={[styles.deleteButton, { marginTop: 20 }]}
                  onPress={() => deleteLog(selectedLog.id)}
                >
                  <Text style={styles.deleteButtonText}>🗑 Delete This Entry</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setSelectedLog(null)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 16,
    zIndex: 2,
    marginTop: 40,
    
  },
  header: {
    fontSize: 38,
    fontWeight: '800',
    color: '#111',
    marginBottom: 18,
    marginTop: 115,
    letterSpacing: -0.5,
  },
  noLogs: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
  },
  logCard: {
    backgroundColor: '#9c711bff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  message: {
    color: '#ffffffff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  details: {
    color: '#ffffffff',
    fontSize: 14,
  },
  timestamp: {
    fontSize: 12,
    color: '#ffffffff',
    marginBottom: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
    marginBottom: 10,
  },
  modalText: {
    color: '#111',
    fontSize: 15,
    marginBottom: 8,
  },
  link: {
    color: '#007AFF',
    textDecorationLine: 'underline',
    marginBottom: 5,
  },
  mediaSection: {
    marginTop: 6,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 4,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
