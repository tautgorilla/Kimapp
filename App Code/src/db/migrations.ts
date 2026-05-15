import type * as SQLite from 'expo-sqlite';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT,
  raw_audio_path TEXT,
  transcript TEXT,
  summary TEXT,
  duration_ms INTEGER,
  tags TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  source_user TEXT NOT NULL DEFAULT 'patient',
  verified_by_caregiver INTEGER NOT NULL DEFAULT 0,
  parser_confidence INTEGER,
  needs_review INTEGER NOT NULL DEFAULT 0,
  archived_at INTEGER
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY NOT NULL,
  linked_note_id TEXT,
  title TEXT NOT NULL,
  reminder_time INTEGER NOT NULL,
  recurrence_rule TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  escalation_rule TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL DEFAULT 'patient',
  verified INTEGER NOT NULL DEFAULT 0,
  notification_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS medications (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  dose_text TEXT NOT NULL,
  schedule_rule TEXT NOT NULL,
  instructions TEXT,
  linked_reminder_id TEXT,
  caregiver_verified_at INTEGER,
  hide_on_lock_screen INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id TEXT PRIMARY KEY NOT NULL,
  text TEXT NOT NULL,
  morning_only INTEGER NOT NULL DEFAULT 1,
  recurrence_rule TEXT NOT NULL DEFAULT 'FREQ=DAILY',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS completion_logs (
  id TEXT PRIMARY KEY NOT NULL,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  occurrence_date TEXT NOT NULL,
  completed_at INTEGER,
  skipped_at INTEGER,
  snoozed_at INTEGER,
  need_help_at INTEGER,
  actor TEXT NOT NULL DEFAULT 'patient'
);

CREATE INDEX IF NOT EXISTS idx_completion_item ON completion_logs(item_type, item_id, occurrence_date);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  actor TEXT NOT NULL DEFAULT 'patient',
  timestamp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

const SEED_CHECKLIST = [
  { text: 'Check morning medication plan', sort_order: 0 },
  { text: 'Eat breakfast', sort_order: 1 },
  { text: 'Drink a glass of water', sort_order: 2 },
  { text: 'Get dressed', sort_order: 3 },
  { text: 'Bring hearing aids and glasses', sort_order: 4 },
];

export async function runInitialMigration(sqlite: SQLite.SQLiteDatabase): Promise<void> {
  sqlite.execSync(SCHEMA_SQL);

  const noteCols = sqlite.getAllSync<{ name: string }>('PRAGMA table_info(notes);');
  const hasTitle = noteCols.some((c) => c.name === 'title');
  const hasUpdatedAt = noteCols.some((c) => c.name === 'updated_at');
  if (!hasTitle) sqlite.execSync('ALTER TABLE notes ADD COLUMN title TEXT;');
  if (!hasUpdatedAt) sqlite.execSync('ALTER TABLE notes ADD COLUMN updated_at INTEGER;');

  const row = sqlite.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM checklist_items'
  );
  if (row && row.count === 0) {
    const now = Date.now();
    const stmt = sqlite.prepareSync(
      `INSERT INTO checklist_items (id, text, morning_only, recurrence_rule, sort_order, active, created_at)
       VALUES ($id, $text, 1, 'FREQ=DAILY', $sort_order, 1, $created_at)`
    );
    try {
      for (const item of SEED_CHECKLIST) {
        stmt.executeSync({
          $id: cryptoRandomId(),
          $text: item.text,
          $sort_order: item.sort_order,
          $created_at: now,
        });
      }
    } finally {
      stmt.finalizeSync();
    }
  }
}

function cryptoRandomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < 16; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
