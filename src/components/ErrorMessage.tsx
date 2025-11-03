/**
 * Display database initialization error message
 * Shows error text in a red-bordered container when an error occurs
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ErrorMessageProps {
  errorMessage: string | null;
}

export function ErrorMessage({ errorMessage }: ErrorMessageProps) {
  if (!errorMessage) {
    return null;
  }

  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>データベース初期化エラー:</Text>
      <Text style={styles.errorMessage}>{errorMessage}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    margin: 10,
    padding: 15,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef5350',
  },
  errorText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#c62828',
    marginBottom: 5,
  },
  errorMessage: {
    fontSize: 14,
    color: '#d32f2f',
  },
});
