import { NitroSQLiteConnection, open } from 'react-native-nitro-sqlite';
import { ensureDictionaryReady, DB_NAME, DEST_PATH, DEST_DIR } from './init';

export interface User {
  id?: number;
  name: string;
  email: string;
  created_at?: string;
}

export interface Word {
  item_id: number;
  word: string;
  mean: string;
  level: number;
}

class Database {
  private db: NitroSQLiteConnection | null = null;

  constructor() {
    this.db = null;
  }

  async init() {
    if (this.db) {
      console.log('Database already initialized');
      return this.db;
    }

    // Ensure dictionary is copied and ready
    await ensureDictionaryReady();

    console.log('Opening database:', DB_NAME);
    console.log('Database directory:', DEST_DIR);
    console.log('Full database path:', DEST_PATH);

    // Use relative location 'databases' for both platforms
    console.log('Opening with location: databases');
    this.db = open({
      name: DB_NAME,
      location: 'databases',
    });

    console.log('Database opened successfully');

    // Debug: Check database file path
    try {
      const pragmaResult = this.db.execute('PRAGMA database_list;');
      console.log('PRAGMA database_list result:', pragmaResult);
      if (pragmaResult?.rows) {
        for (let i = 0; i < pragmaResult.rows.length; i++) {
          const dbInfo = pragmaResult.rows.item(i);
          console.log('Database info:', dbInfo);
        }
      }
    } catch (pragmaError) {
      console.error('Error getting database path:', pragmaError);
    }

    // Debug: Check tables in the database
    try {
      const tablesResult = this.db.execute(
        "SELECT name FROM sqlite_master WHERE type='table';",
      );
      console.log('Tables query result:', tablesResult);
      if (tablesResult?.rows) {
        const tableNames = [];
        console.log('Number of rows:', tablesResult.rows.length);
        for (let i = 0; i < tablesResult.rows.length; i++) {
          const tableInfo = tablesResult.rows.item(i);
          console.log('Table info:', tableInfo);
          tableNames.push(tableInfo);
        }
        console.log('Table names array:', tableNames);

        // If database is empty, it's corrupted - need to re-copy
        if (tableNames.length === 0) {
          console.error('Database has no tables! Will force re-copy.');
          this.db = null;
          throw new Error('Database is empty - forcing re-initialization');
        }
      }
    } catch (error) {
      console.error('Error checking tables:', error);
      throw error;
    }

    return this.db;
  }

  async getAllWords(): Promise<Word[]> {
    if (!this.db) {
      return [];
    }
    try {
      const result = this.db.execute('SELECT * FROM items LIMIT 10;');
      const words: Word[] = [];
      if (result?.rows) {
        for (let i = 0; i < result.rows.length; i++) {
          words.push(result.rows.item(i) as unknown as Word);
        }
      }
      return words;
    } catch (error) {
      console.error('Error getting words:', error);
      return [];
    }
  }

  async searchWord(word: string, limit: number = 10): Promise<Word[]> {
    if (!this.db) {
      console.log('Database not initialized');
      return Promise.resolve([]);
    }

    try {
      console.log(`Searching for: "${word}", limit: ${limit}`);
      const query = `SELECT * FROM items WHERE word LIKE '${word}%' LIMIT ${limit};`;
      console.log('Executing query:', query);

      const result = this.db.execute(query);
      console.log('Query result:', result);

      const words: Word[] = [];
      if (result?.rows) {
        console.log('Number of rows:', result.rows.length);
        for (let i = 0; i < result.rows.length; i++) {
          words.push(result.rows.item(i) as unknown as Word);
        }
      } else {
        console.log('No rows in result');
      }

      console.log('Found words:', words.length);
      return words;
    } catch (error) {
      console.error('Error searching words:', error);
      return [];
    }
  }
}

export const database = new Database();
