// Better Auth's core user columns, plus ours (docs/database.md §2). Step 3.2 adds
// session, account, verification and two_factor, and any plugin columns, in a new migration.
import { sql } from 'drizzle-orm';
import { boolean, check, pgTable, text } from 'drizzle-orm/pg-core';

import { createdAt, id, updatedAt } from './columns';

export const user = pgTable(
  'user',
  {
    id: id(),
    name: text('name').notNull(),
    // Stored lower case and trimmed.
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    role: text('role').notNull().default('customer'),
    // E.164, e.g. +923482799707.
    phone: text('phone'),
    banned: boolean('banned').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('user_email_lower_case', sql`${t.email} = lower(${t.email})`),
    check('user_role_known', sql`${t.role} IN ('customer', 'admin')`),
  ],
);
