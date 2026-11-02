// Better Auth's core user columns, plus ours (docs/database.md §2). The other auth tables: ./auth.ts.
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
    // Set by the twoFactor plugin once an admin confirms their first code.
    twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('user_email_lower_case', sql`${t.email} = lower(${t.email})`),
    check('user_role_known', sql`${t.role} IN ('customer', 'admin')`),
  ],
);
