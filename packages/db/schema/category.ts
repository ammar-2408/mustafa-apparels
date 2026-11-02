// Shown to customers as "collections" (docs/database.md §2).
import { type AnyPgColumn, boolean, index, integer, pgTable, text } from 'drizzle-orm/pg-core';

import { createdAt, id, updatedAt } from './columns';

export const category = pgTable(
  'category',
  {
    id: id(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    imageUrl: text('image_url'),
    imagePublicId: text('image_public_id'),
    parentId: text('parent_id').references((): AnyPgColumn => category.id, {
      onDelete: 'set null',
    }),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('category_parent_id_idx').on(t.parentId)],
);
