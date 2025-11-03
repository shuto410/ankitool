import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { database, Word } from './database';
import { useEffect, useState } from 'react';
import { SearchBar } from './components/SearchBar';
import { WordList } from './components/WordList';

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

  const [foundWords, setFoundWords] = useState<Word[]>([]);
  const [searchText, setSearchText] = useState('');
  const [storedAnkiWords, setStoredAnkiWords] = useState<Word[]>([]);
  const [dbInitError, setDbInitError] = useState<string | null>(null);

  const handleAddWordClick = (word: Word) => {
    setStoredAnkiWords([...storedAnkiWords, word]);
  };

  const handleMenuPress = () => {
    // TODO: Open bottom sheet menu
    console.log('Menu pressed');
  };

  useEffect(() => {
    const initDB = async () => {
      try {
        await database.init();
        console.log('Database initialized successfully');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error('Error initializing dictionary:', errorMessage);
        setDbInitError(errorMessage);
      }
    };
    initDB();
  }, []);

  useEffect(() => {
    const searchWords = async () => {
      const wordsList = await database.searchWord(searchText, 20);
      setFoundWords(wordsList);
    };
    searchWords();
  }, [searchText]);

  return (
    <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      <WordList
        words={searchText.length > 0 ? foundWords : []}
        onAddWord={handleAddWordClick}
        errorMessage={dbInitError}
      />
      <SearchBar
        searchText={searchText}
        onSearchTextChange={setSearchText}
        onMenuPress={handleMenuPress}
        bottomPadding={safeAreaInsets.bottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
