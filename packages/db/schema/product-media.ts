// Photos and videos of a suit, stored on Cloudinary (docs/database.md §2, ADR-011).
// Width, height, bytes, format and duration come from Cloudinary, never the client.
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { id } from './columns';
import { product } from './product';

export const mediaKind = pgEnum('media_kind', ['image', 'video']);

export const productMedia = pgTable(
  'product_media',
  {
    id: id(),
    productId: text('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    kind: mediaKind('kind').notNull(),
    url: text('url').notNull(),
    publicId: text('public_id').notNull().unique(),
    alt: text('alt').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    bytes: integer('bytes').notNull(),
    format: text('format').notNull(),
    durationSeconds: numeric('duration_seconds'),
    // Videos only; null means the first frame.
    posterPublicId: text('poster_public_id'),
    sortOrder: integer('sort_order').notNull().default(0),
    isPrimary: boolean('is_primary').notNull().default(false),
  },
  (t) => [
    // The main item feeds LCP, the share image and JSON-LD, so it is always a photo.
    check('product_media_primary_is_image', sql`${t.isPrimary} = false OR ${t.kind} = 'image'`),
    check(
      'product_media_video_max_60s',
      sql`${t.kind} = 'image' OR (${t.durationSeconds} IS NOT NULL AND ${t.durationSeconds} <= 60)`,
    ),
    uniqueIndex('product_media_one_primary_key')
      .on(t.productId)
      .where(sql`${t.isPrimary}`),
    index('product_media_product_sort_idx').on(t.productId, t.sortOrder),
  ],
);
