/**
 * Database initialization and version management
 * Handles copying the bundled dictionary to the app's storage
 */

import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

// Database configuration
export const DB_NAME = 'ejdict.sqlite3';
export const BUNDLE_VERSION = 8; // Increment this when bundled DB is updated
const BUNDLE_PATH = 'ejdict.sqlite3' as const;

// Storage paths
// Note: react-native-nitro-sqlite uses relative paths from a base directory
// Android: /data/data/<package>/files (base) + 'databases' (location)
// iOS: DocumentDirectory (base) + 'databases' (location)
export const DEST_DIR = Platform.select({
  ios: `${RNFS.DocumentDirectoryPath}/databases`,
  // Android: use files/databases directory
  android: '/data/data/com.ankitool/files/databases',
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
      console.log('Database file does not exist - need to copy');
      return true;
    }

    // Check version
    const installedVersion = await getInstalledVersion();
    console.log(
      'Installed version:',
      installedVersion,
      'Bundle version:',
      BUNDLE_VERSION,
    );
    if (installedVersion < BUNDLE_VERSION) {
      console.log('Version outdated - need to copy');
      return true;
    }

    // Check file integrity
    const stats = await RNFS.stat(DEST_PATH);
    if (!stats || stats.size === 0) {
      console.log('File is empty - need to copy');
      return true;
    }

    // Check if file size is too small (less than 1MB means corrupted)
    if (stats.size < 1024 * 1024) {
      console.log('File too small - need to copy');
      return true;
    }

    return false;
  } catch (error) {
    // If any check fails, assume we need to copy
    console.log('Error in shouldCopyDictionary:', error);
    return true;
  }
}

/**
 * Verify if the file is a valid SQLite database by checking file size
 * (SQLite library itself will validate the format when opening)
 */
async function verifySQLiteFile(filePath: string): Promise<boolean> {
  try {
    // Check if file exists and has reasonable size
    const stats = await RNFS.stat(filePath);
    if (!stats || stats.size < 1024) {
      console.log('File too small or does not exist');
      return false;
    }

    // File size check is sufficient - let SQLite library validate format
    console.log(
      `SQLite file verified: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`,
    );
    return true;
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
        console.log('Creating destination directory:', DEST_DIR);
        await RNFS.mkdir(DEST_DIR);
      }

      // Check if we need to copy
      if (await shouldCopyDictionary()) {
        console.log('Copying dictionary database...');
        console.log('Source path will be determined by platform');
        console.log('Destination path:', DEST_PATH);

        // Delete existing file if it exists (to ensure clean copy)
        if (await RNFS.exists(DEST_PATH)) {
          console.log('Removing old database file');
          await RNFS.unlink(DEST_PATH);
        }

        // Copy bundled dictionary
        if (Platform.OS === 'android') {
          console.log('Copying from assets:', BUNDLE_PATH);
          await RNFS.copyFileAssets(BUNDLE_PATH, DEST_PATH);
        } else {
          const mainBundlePath = RNFS.MainBundlePath;
          const sourcePath = `${mainBundlePath}/${BUNDLE_PATH}`;
          console.log('iOS MainBundlePath:', mainBundlePath);
          console.log('Full source path:', sourcePath);
          console.log('Destination path:', DEST_PATH);

          // Check if source file exists
          const sourceExists = await RNFS.exists(sourcePath);
          console.log('Source file exists:', sourceExists);

          if (!sourceExists) {
            throw new Error(`Source database file not found at: ${sourcePath}`);
          }

          await RNFS.copyFile(sourcePath, DEST_PATH);
        }

        // Verify the copy was successful
        const destStats = await RNFS.stat(DEST_PATH);
        console.log(
          'Copied file size:',
          (destStats.size / (1024 * 1024)).toFixed(2),
          'MB',
        );

        if (!destStats || destStats.size === 0) {
          throw new Error('Database file copy failed: file is empty');
        }

        // Read first 16 bytes to verify SQLite header
        try {
          const header = await RNFS.read(DEST_PATH, 16, 0, 'utf8');
          console.log('File header (first 16 bytes):', header);
          console.log(
            'Header starts with "SQLite format 3":',
            header.startsWith('SQLite format 3'),
          );
        } catch (headerError) {
          console.error('Error reading file header:', headerError);
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
          throw new Error('Copied file validation failed');
        }

        // Update version after successful copy
        await saveInstalledVersion(BUNDLE_VERSION);
        console.log('Dictionary database copied successfully');
      } else {
        console.log('Dictionary database already up to date');
        console.log('Database path:', DEST_PATH);

        // Verify existing file is valid SQLite
        const isValidSQLite = await verifySQLiteFile(DEST_PATH);
        if (!isValidSQLite) {
          console.log('Existing database file invalid, will retry copy');
          await RNFS.unlink(DEST_PATH);
          // Retry the function
          initializationPromise = null;
          return ensureDictionaryReady();
        }

        console.log('Existing database file is valid');
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
