// The admin's change history (docs/database.md §2 audit_log). Every admin mutation records
// one row inside its own transaction, so a failed change leaves no audit row.
import type { Database } from '@mustafa/db/client';
import { auditLog, user } from '@mustafa/db/schema';
import { and, count, desc, eq, isNotNull } from 'drizzle-orm';

export type Actor = { actorId: string };

type Row = Record<string, unknown>;

// Never stored: generated, bookkeeping or secret-bearing columns.
const SKIP = new Set(['searchVector', 'createdAt', 'updatedAt']);

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// Only the fields that changed, as { before, after }. Empty when nothing changed.
export function diff(before: Row, after: Row) {
  const changed = Object.keys(after).filter(
    (key) => !SKIP.has(key) && !same(before[key], after[key]),
  );
  return {
    before: Object.fromEntries(changed.map((key) => [key, before[key]])),
    after: Object.fromEntries(changed.map((key) => [key, after[key]])),
  };
}

export const snapshot = (row: Row) =>
  Object.fromEntries(Object.entries(row).filter(([key]) => !SKIP.has(key)));

type Entry = {
  action: string;
  entity: string;
  entityId: string | null;
  changes: Record<string, unknown>;
};

export async function record(db: Database, { actorId }: Actor, entry: Entry) {
  await db.insert(auditLog).values({ actorId, ...entry });
}

export const AUDIT_PAGE_SIZE = 50;

type ListInput = {
  entity?: string;
  entityId?: string;
  actorId?: string;
  // Leave out rows whose actor account is gone (actor_id set to null on delete).
  hideRemoved?: boolean;
  page?: number;
};

// For the admin audit page: newest first, with the actor's name (null once their account goes).
export async function list(
  db: Database,
  { entity, entityId, actorId, hideRemoved = false, page = 1 }: ListInput,
) {
  const where = and(
    entity === undefined ? undefined : eq(auditLog.entity, entity),
    entityId === undefined ? undefined : eq(auditLog.entityId, entityId),
    actorId === undefined ? undefined : eq(auditLog.actorId, actorId),
    hideRemoved ? isNotNull(auditLog.actorId) : undefined,
  );
  const [rows, [{ total } = { total: 0 }]] = await Promise.all([
    db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        entity: auditLog.entity,
        entityId: auditLog.entityId,
        changes: auditLog.changes,
        createdAt: auditLog.createdAt,
        actorId: user.id,
        actorName: user.name,
      })
      .from(auditLog)
      .leftJoin(user, eq(auditLog.actorId, user.id))
      .where(where)
      // Rows from one transaction share created_at; ids are time-ordered UUID v7.
      .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
      .limit(AUDIT_PAGE_SIZE)
      .offset((page - 1) * AUDIT_PAGE_SIZE),
    db.select({ total: count() }).from(auditLog).where(where),
  ]);
  return {
    items: rows.map(({ actorId: id, actorName: name, ...row }) => ({
      ...row,
      actor: id === null ? null : { id, name: name! },
    })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)),
  };
}

// Everyone who appears in the log, for the audit page's "who" filter.
export async function actors(db: Database) {
  return db
    .selectDistinct({ id: user.id, name: user.name })
    .from(auditLog)
    .innerJoin(user, eq(auditLog.actorId, user.id))
    .orderBy(user.name);
}
