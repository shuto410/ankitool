/**
 * Display scrollable list of search results with error message support
 * Shows error message if present, otherwise renders WordItem components for each word
 */
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Word } from '../database';
import { ErrorMessage } from './ErrorMessage';
import { WordItem } from './WordItem';

interface WordListProps {
  words: Word[];
  onAddWord: (word: Word) => void;
  errorMessage: string | null;
}

export function WordList({ words, onAddWord, errorMessage }: WordListProps) {
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollViewContent}
      keyboardShouldPersistTaps="handled"
    >
      <ErrorMessage errorMessage={errorMessage} />
      {words.map(word => (
        <WordItem key={word.item_id} word={word} onAddWord={onAddWord} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 10,
  },
});
