/**
 * Database initialization and version management
 * Handles copying the bundled dictionary to the app's storage
 */

import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

// Database configuration
export const DB_NAME = 'ejdict.sqlite3';
export const BUNDLE_VERSION = 5; // Increment this when bundled DB is updated
// const BUNDLE_PATH = Platform.select<
//   'android/app/src/main/assets/ejdict.sqlite3' | 'ejdict.sqlite3'
// >({
//   android: 'android/app/src/main/assets/ejdict.sqlite3',
//   ios: 'ejdict.sqlite3',
// })!;
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

// Version tracking key
const VERSION_KEY = '@dictionary/installed_version';

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
    const isValid = header.startsWith('SQLite format 3');
    console.log('SQLite header check:', isValid ? 'VALID' : 'INVALID');
    if (!isValid) {
      console.log('Header content:', header);
    }
    return isValid;
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
    console.log('initializationPromise already exists');
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      // Create destination directory if needed
      if (!(await RNFS.exists(DEST_DIR))) {
        console.log('DEST_DIR does not exist, creating...');
        await RNFS.mkdir(DEST_DIR);
      }

      console.log('DEST_DIR:', DEST_DIR);
      console.log('DEST_PATH:', DEST_PATH);

      // Check if we need to copy
      if (await shouldCopyDictionary()) {
        console.log('shouldCopyDictionary is true, copying...');

        // Delete existing file if it exists (to ensure clean copy)
        if (await RNFS.exists(DEST_PATH)) {
          console.log('Deleting existing DB file...');
          await RNFS.unlink(DEST_PATH);
        }

        // Copy bundled dictionary
        if (Platform.OS === 'android') {
          console.log(
            'copying bundled dictionary to DEST_PATH android',
            'from:',
            BUNDLE_PATH,
            'to:',
            DEST_PATH,
          );

          // Check if source exists in assets
          try {
            const assetsExists = await RNFS.existsAssets(BUNDLE_PATH);
            console.log('Asset file exists:', assetsExists);
          } catch (e) {
            console.log('Could not check asset existence:', e);
          }

          await RNFS.copyFileAssets(BUNDLE_PATH, DEST_PATH);
          console.log('copyFileAssets completed');

          // Immediately verify the copied file
          const copiedExists = await RNFS.exists(DEST_PATH);
          console.log('Destination file exists after copy:', copiedExists);
        } else {
          console.log('copying bundled dictionary to DEST_PATH ios');
          const mainBundlePath = RNFS.MainBundlePath;
          console.log(
            'from:',
            `${mainBundlePath}/${BUNDLE_PATH}`,
            'to:',
            DEST_PATH,
          );
          await RNFS.copyFile(`${mainBundlePath}/${BUNDLE_PATH}`, DEST_PATH);
          console.log('copied bundled dictionary to DEST_PATH');
        }

        // Verify the copy was successful
        const destStats = await RNFS.stat(DEST_PATH);
        const fileSizeMB = (destStats.size / (1024 * 1024)).toFixed(2);
        console.log(
          'Copied file size:',
          destStats.size,
          'bytes',
          `(${fileSizeMB} MB)`,
        );

        if (!destStats || destStats.size === 0) {
          throw new Error('Database file copy failed: file is empty');
        }

        // Additional verification: check if file size is reasonable (at least 1MB for ejdict)
        if (destStats.size < 1024 * 1024) {
          throw new Error(
            `Database file copy may be incomplete: size is only ${destStats.size} bytes (${fileSizeMB} MB), expected ~6.7MB`,
          );
        }

        // Verify SQLite file format
        const isValidSQLite = await verifySQLiteFile(DEST_PATH);
        if (!isValidSQLite) {
          throw new Error('Copied file is not a valid SQLite database');
        }

        // Read sample bytes at different positions to verify actual content
        const header = await RNFS.read(DEST_PATH, 100, 0, 'base64');
        const middle = await RNFS.read(
          DEST_PATH,
          100,
          Math.floor(destStats.size / 2),
          'base64',
        );
        const end = await RNFS.read(
          DEST_PATH,
          100,
          destStats.size - 100,
          'base64',
        );
        console.log(
          'Sample bytes - header length:',
          header.length,
          'middle:',
          middle.length,
          'end:',
          end.length,
        );

        // Update version after successful copy
        await saveInstalledVersion(BUNDLE_VERSION);
        console.log('saved installed version');
      } else {
        console.log('dictionary is ready');
        // Log current file size for debugging
        const stats = await RNFS.stat(DEST_PATH);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(
          'Existing DB file size:',
          stats.size,
          'bytes',
          `(${fileSizeMB} MB)`,
        );

        // Verify existing file is valid SQLite
        const isValidSQLite = await verifySQLiteFile(DEST_PATH);
        if (!isValidSQLite) {
          console.log('Existing file is not valid SQLite, will force re-copy');
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
      console.log('initializationPromise cleared');
    }
  })();

  return initializationPromise;
}
