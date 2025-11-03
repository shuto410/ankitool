import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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

  const [foundWords, setFoundWords] = useState<Word[]>([]);
  const [searchText, setSearchText] = useState('');
  const [storedAnkiWords, setStoredAnkiWords] = useState<Word[]>([]);
  const [dbInitError, setDbInitError] = useState<string | null>(null);

  const handleAddWordClick = (word: Word) => {
    setStoredAnkiWords([...storedAnkiWords, word]);
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled"
      >
        {dbInitError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>データベース初期化エラー:</Text>
            <Text style={styles.errorMessage}>{dbInitError}</Text>
          </View>
        )}
        {searchText.length > 0 &&
          foundWords.map(word => (
            <View key={word.item_id} style={styles.wordContainer}>
              <TouchableOpacity
                style={styles.addWordButton}
                onPress={() => handleAddWordClick(word)}
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
          ))}
      </ScrollView>
      <View
        style={[
          styles.searchBarContainer,
          { paddingBottom: safeAreaInsets.bottom },
        ]}
      >
        <TextInput
          style={styles.searchBar}
          onChangeText={setSearchText}
          value={searchText}
          placeholder="単語を検索..."
        />
        <TouchableOpacity style={styles.menuBurger}>
          <Text style={styles.menuBurgerIcon}>☰</Text>
        </TouchableOpacity>
        {/* //create modal, check cursor history log */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 10,
  },
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
  searchBarContainer: {
    borderTopWidth: 2,
    borderTopColor: '#ccc',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchBar: {
    flex: 1,
    height: 40,
    margin: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 10,
  },
  menuBurger: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 10,
  },
  menuBurgerIcon: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#999',
  },
});

export default App;
