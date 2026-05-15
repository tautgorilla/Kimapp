import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { checklistItems, completionLogs, type ChecklistItem } from '@/db/schema';
import { newId } from '@/lib/ids';
import { recordAudit } from './audit';

export type ChecklistStatus = 'pending' | 'done' | 'skipped';

export interface ChecklistEntry {
  item: ChecklistItem;
  status: ChecklistStatus;
  completedAt: Date | null;
}

export function todayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function listTodaysChecklist(date: Date = new Date()): Promise<ChecklistEntry[]> {
  const items = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.active, true))
    .orderBy(asc(checklistItems.sortOrder))
    .all();

  const occurrence = todayKey(date);
  const entries: ChecklistEntry[] = [];
  for (const item of items) {
    const log = await db
      .select()
      .from(completionLogs)
      .where(
        and(
          eq(completionLogs.itemType, 'checklist'),
          eq(completionLogs.itemId, item.id),
          eq(completionLogs.occurrenceDate, occurrence)
        )
      )
      .limit(1);
    const row = log[0];
    let status: ChecklistStatus = 'pending';
    let completedAt: Date | null = null;
    if (row?.completedAt) {
      status = 'done';
      completedAt = row.completedAt;
    } else if (row?.skippedAt) {
      status = 'skipped';
    }
    entries.push({ item, status, completedAt });
  }
  return entries;
}

export async function markChecklistItem(
  itemId: string,
  action: 'complete' | 'skip' | 'undo',
  date: Date = new Date()
): Promise<void> {
  const occurrence = todayKey(date);
  const existing = await db
    .select()
    .from(completionLogs)
    .where(
      and(
        eq(completionLogs.itemType, 'checklist'),
        eq(completionLogs.itemId, itemId),
        eq(completionLogs.occurrenceDate, occurrence)
      )
    )
    .limit(1);

  if (action === 'undo') {
    if (existing[0]) {
      await db.delete(completionLogs).where(eq(completionLogs.id, existing[0].id));
      await recordAudit({
        entityType: 'checklist',
        entityId: itemId,
        action: 'edit',
        before: existing[0],
        after: null,
      });
    }
    return;
  }

  const now = new Date();
  const patch =
    action === 'complete'
      ? { completedAt: now, skippedAt: null }
      : { skippedAt: now, completedAt: null };

  if (existing[0]) {
    await db.update(completionLogs).set(patch).where(eq(completionLogs.id, existing[0].id));
  } else {
    await db.insert(completionLogs).values({
      id: newId(),
      itemType: 'checklist',
      itemId,
      occurrenceDate: occurrence,
      completedAt: patch.completedAt ?? null,
      skippedAt: patch.skippedAt ?? null,
      snoozedAt: null,
      needHelpAt: null,
      actor: 'patient',
    });
  }

  await recordAudit({
    entityType: 'checklist',
    entityId: itemId,
    action: action === 'complete' ? 'complete' : 'skip',
  });
}

export async function addChecklistItem(text: string, sortOrder = 999): Promise<void> {
  const id = newId();
  await db.insert(checklistItems).values({
    id,
    text,
    morningOnly: true,
    recurrenceRule: 'FREQ=DAILY',
    sortOrder,
    active: true,
    createdAt: new Date(),
  });
  await recordAudit({
    entityType: 'checklist',
    entityId: id,
    action: 'create',
    after: { text },
    actor: 'caregiver',
  });
}
