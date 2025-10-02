/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import {
  Button,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { database, User, Word } from './database';
import { useEffect, useState } from 'react';
// database.init();

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();

  const [words, setWords] = useState<Word[]>([]);
  const [tables, setTables] = useState<string[]>([]);

  useEffect(() => {
    console.log('useEffect');
    const loadWords = async () => {
      console.log('loadWords');
      await database.init();
      console.log('database.init');

      // Get all tables first
      const allTables = database.getAllTables();
      setTables(allTables);
      console.log('All tables:', allTables);

      const words = await database.getAllWords();
      if (words.length !== 0) {
        console.log('words', words);
        setWords(words);
      } else {
        console.log('no words');
      }
    };
    loadWords();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={{ paddingTop: safeAreaInsets.top }}>Anki Words</Text>
      <Text>Tables in database: {tables.join(', ')}</Text>
      {words.map(word => (
        <Text key={word.item_id}>
          {word.word} - {word.mean}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
