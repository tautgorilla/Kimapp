import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  title: text('title'),
  rawAudioPath: text('raw_audio_path'),
  transcript: text('transcript'),
  summary: text('summary'),
  durationMs: integer('duration_ms'),
  tags: text('tags'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
  sourceUser: text('source_user').notNull().default('patient'),
  verifiedByCaregiver: integer('verified_by_caregiver', { mode: 'boolean' }).notNull().default(false),
  parserConfidence: integer('parser_confidence'),
  needsReview: integer('needs_review', { mode: 'boolean' }).notNull().default(false),
  archivedAt: integer('archived_at', { mode: 'timestamp_ms' }),
});

export const reminders = sqliteTable('reminders', {
  id: text('id').primaryKey(),
  linkedNoteId: text('linked_note_id'),
  title: text('title').notNull(),
  reminderTime: integer('reminder_time', { mode: 'timestamp_ms' }).notNull(),
  recurrenceRule: text('recurrence_rule'),
  category: text('category').notNull().default('general'),
  escalationRule: text('escalation_rule'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdBy: text('created_by').notNull().default('patient'),
  verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
  notificationId: text('notification_id'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const medications = sqliteTable('medications', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  doseText: text('dose_text').notNull(),
  scheduleRule: text('schedule_rule').notNull(),
  instructions: text('instructions'),
  linkedReminderId: text('linked_reminder_id'),
  caregiverVerifiedAt: integer('caregiver_verified_at', { mode: 'timestamp_ms' }),
  hideOnLockScreen: integer('hide_on_lock_screen', { mode: 'boolean' }).notNull().default(false),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const checklistItems = sqliteTable('checklist_items', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  morningOnly: integer('morning_only', { mode: 'boolean' }).notNull().default(true),
  recurrenceRule: text('recurrence_rule').notNull().default('FREQ=DAILY'),
  sortOrder: integer('sort_order').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const completionLogs = sqliteTable('completion_logs', {
  id: text('id').primaryKey(),
  itemType: text('item_type').notNull(),
  itemId: text('item_id').notNull(),
  occurrenceDate: text('occurrence_date').notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  skippedAt: integer('skipped_at', { mode: 'timestamp_ms' }),
  snoozedAt: integer('snoozed_at', { mode: 'timestamp_ms' }),
  needHelpAt: integer('need_help_at', { mode: 'timestamp_ms' }),
  actor: text('actor').notNull().default('patient'),
});

export const auditEvents = sqliteTable('audit_events', {
  id: text('id').primaryKey(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(),
  beforeJson: text('before_json'),
  afterJson: text('after_json'),
  actor: text('actor').notNull().default('patient'),
  timestamp: integer('timestamp', { mode: 'timestamp_ms' }).notNull(),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const routineCards = sqliteTable('routine_cards', {
  id: text('id').primaryKey().notNull(),
  title: text('title').notNull(),
  instruction: text('instruction').notNull(),
  context: text('context'),
  safetyNote: text('safety_note'),
  readAloudText: text('read_aloud_text'),
  section: text('section'),
  customSectionLabel: text('custom_section_label'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
});

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type Reminder = typeof reminders.$inferSelect;
export type NewReminder = typeof reminders.$inferInsert;
export type Medication = typeof medications.$inferSelect;
export type NewMedication = typeof medications.$inferInsert;
export type ChecklistItem = typeof checklistItems.$inferSelect;
export type NewChecklistItem = typeof checklistItems.$inferInsert;
export type CompletionLog = typeof completionLogs.$inferSelect;
export type NewCompletionLog = typeof completionLogs.$inferInsert;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type NewAuditEvent = typeof auditEvents.$inferInsert;
export type RoutineCard = typeof routineCards.$inferSelect;
export type NewRoutineCard = typeof routineCards.$inferInsert;
