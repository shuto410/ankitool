/**
 * Search bar component with text input and hamburger menu button
 * Fixed at the bottom of the screen with safe area padding
 */
import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface SearchBarProps {
  searchText: string;
  onSearchTextChange: (text: string) => void;
  onMenuPress: () => void;
  bottomPadding: number;
}

export function SearchBar({
  searchText,
  onSearchTextChange,
  onMenuPress,
  bottomPadding,
}: SearchBarProps) {
  return (
    <View style={[styles.searchBarContainer, { paddingBottom: bottomPadding }]}>
      <TextInput
        style={styles.searchBar}
        onChangeText={onSearchTextChange}
        value={searchText}
        placeholder="単語を検索..."
      />
      <TouchableOpacity style={styles.menuBurger} onPress={onMenuPress}>
        <Text style={styles.menuBurgerIcon}>☰</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
