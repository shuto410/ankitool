/**
 * Display a single word item in the search results list
 * Shows word, meaning, add button, and chevron icon
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Word } from '../database';

interface WordItemProps {
  word: Word;
  onAddWord: (word: Word) => void;
}

export function WordItem({ word, onAddWord }: WordItemProps) {
  return (
    <View style={styles.wordContainer}>
      <TouchableOpacity
        style={styles.addWordButton}
        onPress={() => onAddWord(word)}
      >
        <Text style={styles.addWordButtonText}>+</Text>
      </TouchableOpacity>
      <View style={styles.wordTextContainer}>
        <Text numberOfLines={2} style={styles.wordText}>
          {word.word}
        </Text>
        <Text numberOfLines={2} style={styles.wordMeanText}>
          {word.mean}
        </Text>
      </View>
      <Text style={styles.chevronIcon}>›</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wordContainer: {
    paddingHorizontal: 5,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    gap: 10,
  },
  addWordButton: {
    width: 30,
    aspectRatio: 1,
    backgroundColor: '#90c090',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addWordButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  wordTextContainer: {
    flex: 1,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordText: {
    paddingRight: 10,
    fontSize: 18,
    fontWeight: 'bold',
  },
  wordMeanText: {
    flexShrink: 1,
  },
  chevronIcon: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#999',
    alignSelf: 'center',
  },
});
