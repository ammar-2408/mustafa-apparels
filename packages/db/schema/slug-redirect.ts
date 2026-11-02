// Old slugs of suits and collections, so their URLs permanently redirect (docs/database.md §2).
// target_id points at product or category depending on entity, so it has no foreign key;
// core removes a redirect when its slug comes back into use.
import { index, pgEnum, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { createdAt, id } from './columns';

export const redirectEntity = pgEnum('redirect_entity', ['product', 'category']);

export const slugRedirect = pgTable(
  'slug_redirect',
  {
    id: id(),
    entity: redirectEntity('entity').notNull(),
    oldSlug: text('old_slug').notNull(),
    targetId: text('target_id').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('slug_redirect_entity_old_slug_key').on(t.entity, t.oldSlug),
    index('slug_redirect_target_id_idx').on(t.targetId),
  ],
);
