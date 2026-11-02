// The admin's change history (docs/database.md §2 audit_log). Every admin mutation records
// one row inside its own transaction, so a failed change leaves no audit row.
import type { Database } from '@mustafa/db/client';
import { auditLog } from '@mustafa/db/schema';

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
