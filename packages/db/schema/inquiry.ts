// Questions sent from the site (docs/database.md §2). Kept when the customer or suit goes;
// deleting an account anonymises its inquiries in core (§7).
import { sql } from 'drizzle-orm';
import { check, index, pgEnum, pgTable, text } from 'drizzle-orm/pg-core';

import { createdAt, id, updatedAt } from './columns';
import { product } from './product';
import { user } from './user';

export const inquiryStatus = pgEnum('inquiry_status', ['new', 'contacted', 'closed']);

export const inquiry = pgTable(
  'inquiry',
  {
    id: id(),
    productId: text('product_id').references(() => product.id, { onDelete: 'set null' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    // At least one of email and phone is required; checked in packages/validators.
    email: text('email'),
    phone: text('phone'),
    message: text('message').notNull(),
    status: inquiryStatus('status').notNull().default('new'),
    // sha256 of IP + salt, for abuse checks. Never the raw IP.
    ipHash: text('ip_hash'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('inquiry_message_max_2000', sql`char_length(${t.message}) <= 2000`),
    index('inquiry_status_created_at_idx').on(t.status, t.createdAt.desc()),
    index('inquiry_product_id_idx').on(t.productId),
    index('inquiry_user_id_idx').on(t.userId),
  ],
);
