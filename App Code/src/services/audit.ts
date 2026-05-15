import { db } from '@/db/client';
import { auditEvents } from '@/db/schema';
import { newId } from '@/lib/ids';

export type AuditAction =
  | 'create'
  | 'edit'
  | 'archive'
  | 'complete'
  | 'skip'
  | 'snooze'
  | 'need_help'
  | 'verify'
  | 'reminder_fired';

export type AuditActor = 'patient' | 'caregiver' | 'system';

export async function recordAudit(args: {
  entityType: string;
  entityId: string;
  action: AuditAction;
  before?: unknown;
  after?: unknown;
  actor?: AuditActor;
}): Promise<void> {
  await db.insert(auditEvents).values({
    id: newId(),
    entityType: args.entityType,
    entityId: args.entityId,
    action: args.action,
    beforeJson: args.before === undefined ? null : JSON.stringify(args.before),
    afterJson: args.after === undefined ? null : JSON.stringify(args.after),
    actor: args.actor ?? 'patient',
    timestamp: new Date(),
  });
}
