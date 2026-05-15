import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';
import { runInitialMigration } from './migrations';

const DB_NAME = 'kimapp.db';

const sqlite = SQLite.openDatabaseSync(DB_NAME);
sqlite.execSync('PRAGMA journal_mode = WAL;');
sqlite.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });
export const rawDb = sqlite;

let initialized = false;
export async function initDb(): Promise<void> {
  if (initialized) return;
  await runInitialMigration(sqlite);
  initialized = true;
}
