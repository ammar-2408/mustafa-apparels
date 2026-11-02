// Shop contact details and policies the owner edits in admin (docs/database.md §2).
// Each key's value is validated in packages/validators, not here.
import { index, jsonb, pgTable, text } from 'drizzle-orm/pg-core';

import { updatedAt } from './columns';
import { user } from './user';

export const siteSetting = pgTable(
  'site_setting',
  {
    key: text('key').primaryKey(),
    value: jsonb('value').$type<unknown>().notNull(),
    updatedAt: updatedAt(),
    updatedBy: text('updated_by').references(() => user.id, { onDelete: 'set null' }),
  },
  (t) => [index('site_setting_updated_by_idx').on(t.updatedBy)],
);
