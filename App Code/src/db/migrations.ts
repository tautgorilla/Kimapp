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

CREATE TABLE IF NOT EXISTS routine_cards (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  instruction TEXT NOT NULL,
  context TEXT,
  safety_note TEXT,
  read_aloud_text TEXT,
  section TEXT,
  custom_section_label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);
`;

const SEED_CHECKLIST = [
  { text: 'Check morning medication plan', sort_order: 0 },
  { text: 'Eat breakfast', sort_order: 1 },
  { text: 'Drink a glass of water', sort_order: 2 },
  { text: 'Get dressed', sort_order: 3 },
  { text: 'Bring hearing aids and glasses', sort_order: 4 },
];

type RichCard = {
  id: string;
  title: string;
  instruction: string;
  context?: string;
  safetyNote?: string;
  section: string;
  sortOrder: number;
};

function getRichRoutineCard(text: string): Omit<RichCard, 'sortOrder'> | null {
  const t = text.trim().toLowerCase();
  if (t.includes('medication') || t.includes('medication plan')) {
    return {
      id: 'routine_medication_plan',
      title: 'Check morning medication plan',
      instruction: 'Check the morning medication plan in your pill organizer.',
      context: 'The pill organizer is next to the coffee maker.',
      safetyNote: 'If anything looks wrong, call the person you trust. Kimapp does not decide doses.',
      section: 'morning',
    };
  }
  if (t.includes('water')) {
    return {
      id: 'routine_morning_water',
      title: 'Morning water',
      instruction: 'Drink one glass of water.',
      context: 'Your cup is next to the sink.',
      safetyNote: 'If the cup is missing, use the blue cup in the cabinet.',
      section: 'morning',
    };
  }
  if (t === 'get dressed') {
    return {
      id: 'routine_get_dressed',
      title: 'Get dressed',
      instruction: "Put on today's clothes.",
      context: 'Your outfit is on the chair near the closet.',
      section: 'morning',
    };
  }
  if (t.includes('breakfast')) {
    return {
      id: 'routine_eat_breakfast',
      title: 'Eat breakfast',
      instruction: 'Have your morning meal.',
      section: 'morning',
    };
  }
  if (t.includes('hearing') || t.includes('hearing aids')) {
    return {
      id: 'routine_hearing_aids',
      title: 'Bring hearing aids and glasses',
      instruction: 'Put on your hearing aids and glasses.',
      section: 'morning',
    };
  }
  return null;
}

// Added alongside converted checklist items when they are missing from checklist
const EXTRA_DEFAULT_CARDS: RichCard[] = [
  {
    id: 'routine_leaving_home',
    title: 'Before leaving home',
    instruction: 'Check keys, wallet, phone, and glasses.',
    context: 'Your keys are usually in the bowl by the door.',
    section: 'leaving_home',
    sortOrder: 10,
  },
  {
    id: 'routine_evening_wind_down',
    title: 'Evening wind-down',
    instruction: 'Turn off the stove area, lock the door, and put your phone on the charger.',
    context: 'The charger is on the bedside table.',
    section: 'evening',
    sortOrder: 11,
  },
];

// Used when no checklist items exist at all
const DEFAULT_ROUTINE_CARDS: RichCard[] = [
  {
    id: 'routine_morning_water',
    title: 'Morning water',
    instruction: 'Drink one glass of water.',
    context: 'Your cup is next to the sink.',
    safetyNote: 'If the cup is missing, use the blue cup in the cabinet.',
    section: 'morning',
    sortOrder: 0,
  },
  {
    id: 'routine_get_dressed',
    title: 'Get dressed',
    instruction: "Put on today's clothes.",
    context: 'Your outfit is on the chair near the closet.',
    section: 'morning',
    sortOrder: 1,
  },
  {
    id: 'routine_medication_plan',
    title: 'Check morning medication plan',
    instruction: 'Check the morning medication plan in your pill organizer.',
    context: 'The pill organizer is next to the coffee maker.',
    safetyNote: 'If anything looks wrong, call the person you trust. Kimapp does not decide doses.',
    section: 'morning',
    sortOrder: 2,
  },
  {
    id: 'routine_leaving_home',
    title: 'Before leaving home',
    instruction: 'Check keys, wallet, phone, and glasses.',
    context: 'Your keys are usually in the bowl by the door.',
    section: 'leaving_home',
    sortOrder: 3,
  },
  {
    id: 'routine_evening_wind_down',
    title: 'Evening wind-down',
    instruction: 'Turn off the stove area, lock the door, and put your phone on the charger.',
    context: 'The charger is on the bedside table.',
    section: 'evening',
    sortOrder: 4,
  },
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

  // Seed routine cards if none exist yet
  const routineRow = sqlite.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM routine_cards'
  );
  if (routineRow && routineRow.count === 0) {
    const existingItems = sqlite.getAllSync<{
      id: string;
      text: string;
      sort_order: number;
    }>('SELECT id, text, sort_order FROM checklist_items WHERE active = 1 ORDER BY sort_order');

    const now = Date.now();
    const stmt = sqlite.prepareSync(
      `INSERT INTO routine_cards (id, title, instruction, context, safety_note, section, sort_order, is_active, created_at)
       VALUES ($id, $title, $instruction, $context, $safety_note, $section, $sort_order, 1, $created_at)`
    );

    try {
      if (existingItems.length > 0) {
        let maxSort = 0;
        const insertedStableIds = new Set<string>();

        for (const item of existingItems) {
          if (item.sort_order > maxSort) maxSort = item.sort_order;
          const rich = getRichRoutineCard(item.text);
          stmt.executeSync({
            $id: rich?.id ?? cryptoRandomId(),
            $title: rich?.title ?? item.text,
            $instruction: rich?.instruction ?? item.text,
            $context: rich?.context ?? null,
            $safety_note: rich?.safetyNote ?? null,
            $section: rich?.section ?? 'morning',
            $sort_order: item.sort_order,
            $created_at: now,
          });
          if (rich?.id) insertedStableIds.add(rich.id);
        }

        // Add leaving_home and evening_wind_down if not converted from checklist
        let extraSort = maxSort + 1;
        for (const def of EXTRA_DEFAULT_CARDS) {
          if (!insertedStableIds.has(def.id)) {
            stmt.executeSync({
              $id: def.id,
              $title: def.title,
              $instruction: def.instruction,
              $context: def.context ?? null,
              $safety_note: def.safetyNote ?? null,
              $section: def.section,
              $sort_order: extraSort++,
              $created_at: now,
            });
          }
        }
      } else {
        // No checklist items — seed all 5 defaults
        for (const def of DEFAULT_ROUTINE_CARDS) {
          stmt.executeSync({
            $id: def.id,
            $title: def.title,
            $instruction: def.instruction,
            $context: def.context ?? null,
            $safety_note: def.safetyNote ?? null,
            $section: def.section,
            $sort_order: def.sortOrder,
            $created_at: now,
          });
        }
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
