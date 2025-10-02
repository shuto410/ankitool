import { NitroSQLiteConnection, open } from 'react-native-nitro-sqlite';
import { ensureDictionaryReady, DB_NAME } from './src/database/init';

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
      return this.db;
    }

    // Ensure dictionary is copied and ready
    await ensureDictionaryReady();

    this.db = open({
      name: DB_NAME,
    });

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
}

export const database = new Database();
