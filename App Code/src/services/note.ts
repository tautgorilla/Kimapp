import { desc, eq, isNull, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { notes, type Note } from '@/db/schema';
import { newId } from '@/lib/ids';
import { recordAudit } from './audit';

export interface CreateNoteInput {
  title?: string | null;
  body?: string | null;
  sourceUser?: 'patient' | 'caregiver';
}

export async function createNote(input: CreateNoteInput): Promise<Note> {
  const id = newId();
  const now = new Date();
  const title = (input.title ?? '').trim() || null;
  const body = (input.body ?? '').trim() || null;
  const row = {
    id,
    title,
    rawAudioPath: null,
    transcript: body,
    summary: null,
    durationMs: null,
    tags: null,
    createdAt: now,
    updatedAt: null,
    sourceUser: input.sourceUser ?? 'patient',
    verifiedByCaregiver: false,
    parserConfidence: null,
    needsReview: false,
    archivedAt: null,
  };
  await db.insert(notes).values(row);
  await recordAudit({
    entityType: 'note',
    entityId: id,
    action: 'create',
    after: { title, hasBody: !!body },
    actor: row.sourceUser,
  });
  return row as Note;
}

export interface UpdateNoteInput {
  title?: string | null;
  body?: string | null;
  actor?: 'patient' | 'caregiver';
}

export async function updateNote(id: string, input: UpdateNoteInput): Promise<void> {
  const before = await getNote(id);
  if (!before) return;
  const title = input.title === undefined ? before.title : ((input.title ?? '').trim() || null);
  const body =
    input.body === undefined ? before.transcript : ((input.body ?? '').trim() || null);
  await db
    .update(notes)
    .set({ title, transcript: body, updatedAt: new Date() })
    .where(eq(notes.id, id));
  await recordAudit({
    entityType: 'note',
    entityId: id,
    action: 'edit',
    before: { title: before.title, body: before.transcript },
    after: { title, body },
    actor: input.actor ?? 'patient',
  });
}

export async function listNotes(): Promise<Note[]> {
  return db
    .select()
    .from(notes)
    .where(isNull(notes.archivedAt))
    .orderBy(desc(notes.createdAt))
    .all();
}

export async function getNote(id: string): Promise<Note | undefined> {
  const rows = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
  return rows[0];
}

export async function flagForReview(id: string, actor: 'patient' | 'caregiver' = 'patient'): Promise<void> {
  const before = await getNote(id);
  if (!before) return;
  if (before.needsReview) return;
  await db.update(notes).set({ needsReview: true }).where(eq(notes.id, id));
  await recordAudit({
    entityType: 'note',
    entityId: id,
    action: 'edit',
    before: { needsReview: false },
    after: { needsReview: true },
    actor,
  });
}

export async function listNotesNeedingReview(): Promise<Note[]> {
  return db
    .select()
    .from(notes)
    .where(and(isNull(notes.archivedAt), eq(notes.needsReview, true)))
    .orderBy(desc(notes.createdAt))
    .all();
}
