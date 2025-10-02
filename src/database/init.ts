/**
 * Database initialization and version management
 * Handles copying the bundled dictionary to the app's storage
 */

import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

// Database configuration
export const DB_NAME = 'ejdict.sqlite3';
export const BUNDLE_VERSION = 5; // Increment this when bundled DB is updated
const BUNDLE_PATH = 'ejdict.sqlite3' as const;

// Storage paths
// Note: react-native-nitro-sqlite uses /data/data/<package>/files as default on Android
// We need to use this location instead of RNFS.DocumentDirectoryPath
export const DEST_DIR = Platform.select({
  ios: `${RNFS.LibraryDirectoryPath}/LocalDatabase`,
  // Use the same directory that react-native-nitro-sqlite uses by default
  android: '/data/data/com.ankitool/files',
})!;

export const DEST_PATH = `${DEST_DIR}/${DB_NAME}` as const;

// Global initialization lock
let initializationPromise: Promise<void> | null = null;

/**
 * Get the installed dictionary version from persistent storage
 * @returns Promise<number> Version number, 0 if not installed
 */
async function getInstalledVersion(): Promise<number> {
  try {
    const version = await RNFS.readFile(`${DEST_DIR}/.version`);
    return parseInt(version, 10) || 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Save the current dictionary version to persistent storage
 */
async function saveInstalledVersion(version: number): Promise<void> {
  await RNFS.writeFile(`${DEST_DIR}/.version`, version.toString());
}

/**
 * Check if the dictionary file needs to be copied/replaced
 */
async function shouldCopyDictionary(): Promise<boolean> {
  try {
    // Check if destination exists
    const exists = await RNFS.exists(DEST_PATH);
    if (!exists) {
      return true;
    }

    // Check version
    const installedVersion = await getInstalledVersion();
    if (installedVersion < BUNDLE_VERSION) {
      return true;
    }

    // Check file integrity
    const stats = await RNFS.stat(DEST_PATH);
    if (!stats || stats.size === 0) {
      return true;
    }

    return false;
  } catch (error) {
    // If any check fails, assume we need to copy
    return true;
  }
}

/**
 * Verify if the file is a valid SQLite database
 */
async function verifySQLiteFile(filePath: string): Promise<boolean> {
  try {
    // Read first 16 bytes to check SQLite magic number
    const header = await RNFS.read(filePath, 16, 0, 'ascii');
    return header.startsWith('SQLite format 3');
  } catch (error) {
    console.error('Error verifying SQLite file:', error);
    return false;
  }
}

/**
 * Ensure the dictionary database is ready for use
 * This function is idempotent and thread-safe
 */
export async function ensureDictionaryReady(): Promise<void> {
  // Use global promise to prevent concurrent initialization
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      // Create destination directory if needed
      if (!(await RNFS.exists(DEST_DIR))) {
        await RNFS.mkdir(DEST_DIR);
      }

      // Check if we need to copy
      if (await shouldCopyDictionary()) {
        // Delete existing file if it exists (to ensure clean copy)
        if (await RNFS.exists(DEST_PATH)) {
          await RNFS.unlink(DEST_PATH);
        }

        // Copy bundled dictionary
        if (Platform.OS === 'android') {
          await RNFS.copyFileAssets(BUNDLE_PATH, DEST_PATH);
        } else {
          const mainBundlePath = RNFS.MainBundlePath;
          await RNFS.copyFile(`${mainBundlePath}/${BUNDLE_PATH}`, DEST_PATH);
        }

        // Verify the copy was successful
        const destStats = await RNFS.stat(DEST_PATH);
        if (!destStats || destStats.size === 0) {
          throw new Error('Database file copy failed: file is empty');
        }

        // Additional verification: check if file size is reasonable (at least 1MB for ejdict)
        if (destStats.size < 1024 * 1024) {
          const fileSizeMB = (destStats.size / (1024 * 1024)).toFixed(2);
          throw new Error(
            `Database file copy may be incomplete: size is only ${fileSizeMB} MB, expected ~6.7MB`,
          );
        }

        // Verify SQLite file format
        const isValidSQLite = await verifySQLiteFile(DEST_PATH);
        if (!isValidSQLite) {
          throw new Error('Copied file is not a valid SQLite database');
        }

        // Update version after successful copy
        await saveInstalledVersion(BUNDLE_VERSION);
      } else {
        // Verify existing file is valid SQLite
        const isValidSQLite = await verifySQLiteFile(DEST_PATH);
        if (!isValidSQLite) {
          await RNFS.unlink(DEST_PATH);
          // Retry the function
          initializationPromise = null;
          return ensureDictionaryReady();
        }
      }
    } catch (error) {
      console.error('Error initializing dictionary:', error);
      // Clear the failed file to retry on next launch
      try {
        if (await RNFS.exists(DEST_PATH)) {
          await RNFS.unlink(DEST_PATH);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up failed copy:', cleanupError);
      }
      throw error;
    } finally {
      // Clear the promise to allow retrying on next call if needed
      initializationPromise = null;
    }
  })();

  return initializationPromise;
}
