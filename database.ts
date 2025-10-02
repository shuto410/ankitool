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
    console.log('init');
    if (this.db) {
      console.log('db already exists');
      return this.db;
    }

    // Ensure dictionary is copied and ready
    await ensureDictionaryReady();
    console.log('ensureDictionaryReady');

    try {
      // Open with file name only (use default location)
      console.log(
        'Opening database - name:',
        DB_NAME,
        '(using default location)',
      );
      this.db = open({
        name: DB_NAME,
      });
      console.log('Database opened successfully');

      // Check which file is actually opened
      try {
        const dbListResult = this.db.execute<{
          seq: number;
          name: string;
          file: string;
        }>('PRAGMA database_list;');
        console.log(
          'PRAGMA database_list result:',
          JSON.stringify(dbListResult, null, 2),
        );
        if (dbListResult?.rows?._array) {
          dbListResult.rows._array.forEach(row => {
            console.log('Database:', row.name, 'File:', row.file);
          });
        }
      } catch (pragmaError) {
        console.error('Error getting database list:', pragmaError);
      }

      // Verify database has tables
      const tables = this.getAllTables();
      console.log('Tables found:', tables.length, '-', tables.join(', '));

      if (tables.length === 0) {
        console.warn(
          'WARNING: Database opened but contains no tables. This may indicate the wrong file is being opened.',
        );
      }
    } catch (error) {
      console.error('Error opening database:', error);
      throw error;
    }

    return this.db;
  }

  createTables() {
    this.db?.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  getDatabase() {
    if (!this.db) {
      this.init();
    }
    return this.db;
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Get all table names in the database
   */
  getAllTables(): string[] {
    if (!this.db) {
      console.log('no db');
      return [];
    }
    try {
      console.log('Executing query: SELECT name FROM sqlite_master...');
      const result = this.db.execute<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;",
      );
      console.log('Query result:', JSON.stringify(result, null, 2));
      console.log('result.rows:', result?.rows);
      console.log('result.rows?.length:', result?.rows?.length);
      console.log('result.rows?._array:', result?.rows?._array);
      console.log('result.rowsAffected:', result?.rowsAffected);

      const tables: string[] = [];
      if (result?.rows) {
        console.log('Processing', result.rows.length, 'rows');
        for (let i = 0; i < result.rows.length; i++) {
          const row = result.rows.item(i);
          console.log(`Row ${i}:`, JSON.stringify(row));
          if (row?.name) {
            tables.push(row.name);
            console.log(`Table ${i + 1}: ${row.name}`);
          }
        }
      } else {
        console.log('result.rows is null/undefined');
      }
      return tables;
    } catch (error) {
      console.error('error getting tables', error);
      return [];
    }
  }

  async getAllWords(): Promise<Word[]> {
    console.log('getAllWords');
    if (!this.db) {
      console.log('no db');
      return [];
    }
    try {
      const result = this.db?.execute('SELECT * FROM items LIMIT 10;');
      console.log('result length:', result?.rows?.length);
      const words: Word[] = [];
      if (result?.rows) {
        for (let i = 0; i < result.rows.length; i++) {
          words.push(result.rows.item(i) as unknown as Word);
        }
      }
      return words;
    } catch (error) {
      console.log('error executing query', error);
      return [];
    }
  }
}

export const database = new Database();
