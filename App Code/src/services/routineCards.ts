import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { routineCards, completionLogs, type RoutineCard } from '@/db/schema';
import { newId } from '@/lib/ids';
import { recordAudit } from './audit';

export type RoutineStatus = 'pending' | 'done';

export interface RoutineCardEntry {
  card: RoutineCard;
  status: RoutineStatus;
  completedAt: Date | null;
}

export function todayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function listTodaysRoutineCards(date: Date = new Date()): Promise<RoutineCardEntry[]> {
  const cards = await db
    .select()
    .from(routineCards)
    .where(eq(routineCards.isActive, true))
    .orderBy(asc(routineCards.sortOrder))
    .all();

  const occurrence = todayKey(date);
  const entries: RoutineCardEntry[] = [];
  for (const card of cards) {
    const log = await db
      .select()
      .from(completionLogs)
      .where(
        and(
          eq(completionLogs.itemType, 'routine_card'),
          eq(completionLogs.itemId, card.id),
          eq(completionLogs.occurrenceDate, occurrence)
        )
      )
      .limit(1);
    const row = log[0];
    entries.push({
      card,
      status: row?.completedAt ? 'done' : 'pending',
      completedAt: row?.completedAt ?? null,
    });
  }
  return entries;
}

export async function getRoutineCard(id: string): Promise<RoutineCard | null> {
  const rows = await db
    .select()
    .from(routineCards)
    .where(eq(routineCards.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function markRoutineCardDone(cardId: string, date: Date = new Date()): Promise<void> {
  const occurrence = todayKey(date);
  const existing = await db
    .select()
    .from(completionLogs)
    .where(
      and(
        eq(completionLogs.itemType, 'routine_card'),
        eq(completionLogs.itemId, cardId),
        eq(completionLogs.occurrenceDate, occurrence)
      )
    )
    .limit(1);

  const now = new Date();
  if (existing[0]) {
    await db
      .update(completionLogs)
      .set({ completedAt: now, skippedAt: null })
      .where(eq(completionLogs.id, existing[0].id));
  } else {
    await db.insert(completionLogs).values({
      id: newId(),
      itemType: 'routine_card',
      itemId: cardId,
      occurrenceDate: occurrence,
      completedAt: now,
      skippedAt: null,
      snoozedAt: null,
      needHelpAt: null,
      actor: 'patient',
    });
  }
  await recordAudit({ entityType: 'routine_card', entityId: cardId, action: 'complete' });
}

export async function undoRoutineCardDone(cardId: string, date: Date = new Date()): Promise<void> {
  const occurrence = todayKey(date);
  const existing = await db
    .select()
    .from(completionLogs)
    .where(
      and(
        eq(completionLogs.itemType, 'routine_card'),
        eq(completionLogs.itemId, cardId),
        eq(completionLogs.occurrenceDate, occurrence)
      )
    )
    .limit(1);

  if (existing[0]) {
    await db.delete(completionLogs).where(eq(completionLogs.id, existing[0].id));
    await recordAudit({
      entityType: 'routine_card',
      entityId: cardId,
      action: 'edit',
      before: existing[0],
      after: null,
    });
  }
}

export async function createRoutineCard(input: {
  title: string;
  instruction: string;
  context?: string;
  safetyNote?: string;
  readAloudText?: string;
  section?: string;
  customSectionLabel?: string;
  sortOrder?: number;
}): Promise<RoutineCard> {
  const id = newId();
  const now = new Date();
  const card = {
    id,
    title: input.title,
    instruction: input.instruction,
    context: input.context ?? null,
    safetyNote: input.safetyNote ?? null,
    readAloudText: input.readAloudText ?? null,
    section: input.section ?? null,
    customSectionLabel: input.customSectionLabel ?? null,
    sortOrder: input.sortOrder ?? 999,
    isActive: true,
    createdAt: now,
    updatedAt: null,
  };
  await db.insert(routineCards).values(card);
  await recordAudit({ entityType: 'routine_card', entityId: id, action: 'create', after: input });
  return card as RoutineCard;
}

export async function updateRoutineCard(
  id: string,
  input: Partial<{
    title: string;
    instruction: string;
    context: string | null;
    safetyNote: string | null;
    readAloudText: string | null;
    section: string | null;
    customSectionLabel: string | null;
    sortOrder: number;
    isActive: boolean;
  }>
): Promise<void> {
  await db
    .update(routineCards)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(routineCards.id, id));
  await recordAudit({ entityType: 'routine_card', entityId: id, action: 'edit', after: input });
}

export async function deactivateRoutineCard(id: string): Promise<void> {
  await db
    .update(routineCards)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(routineCards.id, id));
  await recordAudit({ entityType: 'routine_card', entityId: id, action: 'archive' });
}

export async function reorderRoutineCards(orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(routineCards)
      .set({ sortOrder: i, updatedAt: new Date() })
      .where(eq(routineCards.id, orderedIds[i]));
  }
}
