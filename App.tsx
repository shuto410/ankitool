import {
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

import { database, Word } from './database';
import { useEffect, useState } from 'react';

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

  useEffect(() => {
    const loadWords = async () => {
      await database.init();

      const wordsList = await database.getAllWords();
      setWords(wordsList);
    };
    loadWords();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={{ paddingTop: safeAreaInsets.top }}>Anki Words</Text>
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
