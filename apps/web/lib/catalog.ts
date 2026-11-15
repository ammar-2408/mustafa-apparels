// The storefront's cached reads (ADR-021). Each is wrapped in unstable_cache with the tags the
// admin sends after a save (`@mustafa/validators/revalidate`), so a save refreshes the pages that
// show it; the 1-hour revalidate is the safety net (docs/architecture.md §4).
// Pages call only these, never core directly, so public pages do no per-request work.
// unstable_cache stores JSON: results carry no Date values, so what a page gets matches its type.
import 'server-only';

import { getEnv } from '@mustafa/config/env';
import * as categories from '@mustafa/core/categories';
import { CoreError } from '@mustafa/core/errors';
import * as products from '@mustafa/core/products';
import * as settings from '@mustafa/core/settings';
import { getDb } from '@mustafa/db/client';
import { categoryTag, TAGS } from '@mustafa/validators/revalidate';
import { unstable_cache } from 'next/cache';

import type { FilterSuit } from './filters';
import type { Collection, Suit, SuitCard } from './types';

/** Seconds before a cached read is refreshed even with no tag from the admin. */
export const REVALIDATE_SECONDS = 3600;

// Which database a cached entry came from: the dev server and local E2E share the .next cache
// but use different Neon branches. The host and database name only, never the password.
function databaseKey() {
  try {
    const url = new URL(getEnv('web').DATABASE_URL ?? '');
    return `${url.hostname}${url.pathname}`;
  } catch {
    return 'no-database';
  }
}

function cached<Args extends unknown[], Result>(
  name: string,
  read: (...args: Args) => Promise<Result>,
  tags: (...args: Args) => string[],
) {
  return (...args: Args) =>
    unstable_cache(() => read(...args), [name, databaseKey(), JSON.stringify(args)], {
      tags: tags(...args),
      revalidate: REVALIDATE_SECONDS,
    })();
}

const toCollection = (row: categories.Category): Collection => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description,
  seoTitle: row.seoTitle,
  seoDescription: row.seoDescription,
  imageUrl: row.imageUrl,
});

// Cards leave out publishedAt: no page shows it, and a Date would come back from the cache as text.
const toSuitCard = (card: products.Card): SuitCard => {
  const { publishedAt, ...rest } = card;
  void publishedAt;
  return rest;
};

export const getSiteSettings = cached(
  'settings',
  () => settings.get(getDb()),
  () => [TAGS.settings],
);

/** Visible collections in shop order, for the menu, footer and home page. */
export const listCollections = cached(
  'collections',
  async () => (await categories.list(getDb())).map(toCollection),
  () => [TAGS.categories],
);

/** A visible collection by its current slug, or null. */
export const getCollection = cached(
  'collection',
  async (slug: string) => {
    const row = await categories.getBySlug(getDb(), slug);
    return row ? toCollection(row) : null;
  },
  (slug) => [TAGS.categories, categoryTag(slug)],
);

/** The current slug for a collection's old one, or null (docs/design.md §8.6). */
export const collectionRedirect = cached(
  'collection-redirect',
  (oldSlug: string) => categories.resolveRedirect(getDb(), oldSlug),
  () => [TAGS.categories],
);

/**
 * A list page of published suits, newest first: all suits, or one collection's. Null for a
 * collection that doesn't exist or is hidden, so the page can 404.
 */
export const listSuits = cached(
  'suits',
  async ({ categorySlug, page }: { categorySlug?: string; page: number }) => {
    try {
      const list = await products.list(getDb(), {
        categorySlug,
        page,
        sort: 'newest',
        filters: {},
      });
      return { ...list, items: list.items.map(toSuitCard) };
    } catch (error) {
      if (error instanceof CoreError && error.code === 'NOT_FOUND') return null;
      throw error;
    }
  },
  // A collection that's hidden, renamed or new changes these lists too.
  ({ categorySlug }) => [
    TAGS.products,
    TAGS.categories,
    ...(categorySlug ? [categoryTag(categorySlug)] : []),
  ],
);

/**
 * A published suit with its photos and videos, its other colours and more from its collection,
 * or null. Every suit save refreshes it (the products tag), since its rows show other suits.
 */
export const getSuit = cached(
  'suit',
  async (slug: string): Promise<Suit | null> => {
    const db = getDb();
    const row = await products.getBySlug(db, slug);
    if (!row) return null;
    const alsoInDesign = (await products.alsoInDesign(db, row.relatedDesignCodes, row.id)).map(
      toSuitCard,
    );
    const related = (
      await products.related(db, row, { exclude: alsoInDesign.map((card) => card.id) })
    ).map(toSuitCard);
    const primary = row.media.find((m) => m.isPrimary) ?? row.media[0];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      designCode: row.designCode,
      price: row.price,
      compareAtPrice: row.compareAtPrice,
      pieces: row.pieces,
      pieceDetails: row.pieceDetails,
      collectionType: row.collectionType,
      fabric: row.fabric,
      mainColor: row.mainColor,
      colorFamily: row.colorFamily,
      availability: row.availability,
      category: row.category,
      description: row.description,
      design: row.design,
      season: row.season,
      outfitStyle: row.outfitStyle,
      accentColors: row.accentColors,
      motifs: row.motifs,
      careInstructions: row.careInstructions,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
      // The main photo first, then the rest in the owner's order (docs/design.md §5.2).
      media: [...(primary ? [primary] : []), ...row.media.filter((m) => m !== primary)].map(
        (m) => ({
          id: m.id,
          kind: m.kind,
          url: m.url,
          publicId: m.publicId,
          alt: m.alt,
          width: m.width,
          height: m.height,
          durationSeconds: m.durationSeconds === null ? null : Number(m.durationSeconds),
          posterPublicId: m.posterPublicId,
        }),
      ),
      alsoInDesign,
      related,
    };
  },
  // Tags are fixed before the read, so the id is unknown here: the products tag covers it.
  () => [TAGS.products, TAGS.categories],
);

/** The current slug for a suit's old one, if that suit is public (docs/design.md §8.6). */
export const suitRedirect = cached(
  'suit-redirect',
  (oldSlug: string) => products.resolveRedirect(getDb(), oldSlug),
  () => [TAGS.products],
);

/** Every public suit with its filter fields, newest first: the body of /api/suits (ADR-018). */
export const listForFilters = cached(
  'filter-list',
  async (): Promise<FilterSuit[]> =>
    (await products.filterList(getDb())).map((row) => {
      const { publishedAt, ...rest } = row;
      void publishedAt;
      return rest;
    }),
  () => [TAGS.products, TAGS.categories],
);
