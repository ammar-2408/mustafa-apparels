// Columns every table shares (docs/database.md §2 conventions).
import { text, timestamp } from 'drizzle-orm/pg-core';

import { uuidv7 } from '../id';

export const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => uuidv7());

export const createdAt = () =>
  timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
