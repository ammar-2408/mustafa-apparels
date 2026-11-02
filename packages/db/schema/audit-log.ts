// Who changed what in admin (docs/database.md §2). Insert-only: a trigger in migration
// 0005 refuses updates and deletes, except clearing actor_id when that account is deleted.
import { index, jsonb, pgTable, text } from 'drizzle-orm/pg-core';

import { createdAt, id } from './columns';
import { user } from './user';

export const auditLog = pgTable(
  'audit_log',
  {
    id: id(),
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
    // e.g. product.update
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    entityId: text('entity_id'),
    // Before and after, never secrets.
    changes: jsonb('changes').$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [
    index('audit_log_actor_id_idx').on(t.actorId),
    index('audit_log_entity_idx').on(t.entity, t.entityId),
    index('audit_log_created_at_idx').on(t.createdAt.desc()),
  ],
);
