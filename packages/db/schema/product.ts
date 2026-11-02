// A suit (docs/database.md §2). Unstitched, so there is no size column.
// Filter values (fabric, design, colour family...) are checked in packages/validators, not here,
// so a new value needs no migration.
import { type SQL, sql } from 'drizzle-orm';
import {
  boolean,
  char,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { category } from './category';
import { createdAt, id, updatedAt } from './columns';

export const productPieces = pgEnum('product_pieces', ['two_piece', 'three_piece']);
export const productSeason = pgEnum('product_season', ['winter', 'summer', 'all_season']);
export const productAvailability = pgEnum('product_availability', [
  'in_stock',
  'low_stock',
  'out_of_stock',
]);
export const productStatus = pgEnum('product_status', ['draft', 'published', 'archived']);

const tsvector = customType<{ data: string }>({ dataType: () => 'tsvector' });

export type PieceDetail = {
  piece: 'shirt' | 'dupatta' | 'trouser';
  fabric?: string;
  finish?: string;
  // Fabric length in metres; only the owner can supply it.
  length_m?: number;
};

const textArray = (name: string) =>
  text(name)
    .array()
    .notNull()
    .default(sql`'{}'`);

export const product = pgTable(
  'product',
  {
    id: id(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    designCode: text('design_code'),
    importKey: text('import_key'),
    description: text('description'),
    // Whole PKR. Null only on drafts.
    price: integer('price'),
    compareAtPrice: integer('compare_at_price'),
    currency: char('currency', { length: 3 }).notNull().default('PKR'),
    categoryId: text('category_id')
      .notNull()
      .references(() => category.id, { onDelete: 'restrict' }),
    pieces: productPieces('pieces').notNull(),
    pieceDetails: jsonb('piece_details').$type<PieceDetail[]>().notNull().default([]),
    collectionType: text('collection_type'),
    dressCategories: textArray('dress_categories'),
    fabric: text('fabric').notNull(),
    design: textArray('design'),
    season: productSeason('season'),
    outfitStyle: text('outfit_style'),
    mainColor: text('main_color'),
    colorFamily: text('color_family'),
    accentColors: textArray('accent_colors'),
    motifs: textArray('motifs'),
    relatedDesignCodes: textArray('related_design_codes'),
    careInstructions: text('care_instructions'),
    availability: productAvailability('availability').notNull().default('in_stock'),
    status: productStatus('status').notNull().default('draft'),
    featured: boolean('featured').notNull().default(false),
    attributes: jsonb('attributes').$type<Record<string, unknown>>().notNull().default({}),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    // Collection name is matched with a join, so renaming one needs no backfill (§4).
    searchVector: tsvector('search_vector').generatedAlwaysAs(
      (): SQL => sql`
        setweight(to_tsvector('simple', coalesce(${product.name}, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(${product.fabric}, '') || ' ' ||
                  coalesce(${product.designCode}, '') || ' ' ||
                  coalesce(${product.mainColor}, '') || ' ' ||
                  coalesce(${product.colorFamily}, '') || ' ' ||
                  immutable_array_to_string(${product.accentColors}, ' ') || ' ' ||
                  immutable_array_to_string(${product.design}, ' ')), 'B') ||
        setweight(to_tsvector('simple', coalesce(${product.description}, '') || ' ' ||
                  immutable_array_to_string(${product.motifs}, ' ')), 'C')`,
    ),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    check('product_price_not_negative', sql`${t.price} >= 0`),
    check('product_published_has_price', sql`${t.status} <> 'published' OR ${t.price} IS NOT NULL`),
    check(
      'product_compare_at_above_price',
      sql`${t.compareAtPrice} IS NULL OR (${t.price} IS NOT NULL AND ${t.compareAtPrice} > ${t.price})`,
    ),
    uniqueIndex('product_design_code_key')
      .on(t.designCode)
      .where(sql`${t.designCode} IS NOT NULL`),
    uniqueIndex('product_import_key_key')
      .on(t.importKey)
      .where(sql`${t.importKey} IS NOT NULL`),
    index('product_category_id_idx').on(t.categoryId),
    index('product_status_category_published_idx').on(t.status, t.categoryId, t.publishedAt.desc()),
    index('product_status_featured_idx').on(t.status, t.featured),
    index('product_status_price_idx').on(t.status, t.price),
    index('product_status_pieces_idx').on(t.status, t.pieces),
    index('product_status_fabric_idx').on(t.status, t.fabric),
    index('product_status_season_idx').on(t.status, t.season),
    index('product_status_outfit_style_idx').on(t.status, t.outfitStyle),
    index('product_status_color_family_idx').on(t.status, t.colorFamily),
    index('product_search_vector_idx').using('gin', t.searchVector),
    index('product_name_trgm_idx').using('gin', t.name.op('gin_trgm_ops')),
    index('product_design_idx').using('gin', t.design),
    index('product_dress_categories_idx').using('gin', t.dressCategories),
  ],
);
