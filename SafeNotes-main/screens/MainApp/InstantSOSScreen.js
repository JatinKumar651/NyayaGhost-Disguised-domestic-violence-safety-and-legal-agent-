import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function InstantSOSScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Instant SOS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d32f2f',
  },
});
