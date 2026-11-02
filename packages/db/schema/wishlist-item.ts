// A customer's saved suits (docs/database.md §2).
import { index, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';

import { createdAt } from './columns';
import { product } from './product';
import { user } from './user';

export const wishlistItem = pgTable(
  'wishlist_item',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.productId] }),
    index('wishlist_item_product_id_idx').on(t.productId),
  ],
);
