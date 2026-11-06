// The storefront's cached reads (ADR-021). Each is wrapped in unstable_cache with the tags the
// admin sends after a save (`@mustafa/validators/revalidate`), so a save refreshes the pages that
// show it; the 1-hour revalidate is the safety net (docs/architecture.md §4).
// Pages call only these, never core directly, so public pages do no per-request work.
// unstable_cache stores JSON: results carry no Date values, so what a page gets matches its type.
import 'server-only';

import * as categories from '@mustafa/core/categories';
import { CoreError } from '@mustafa/core/errors';
import * as products from '@mustafa/core/products';
import * as settings from '@mustafa/core/settings';
import { getDb } from '@mustafa/db/client';
import { categoryTag, TAGS } from '@mustafa/validators/revalidate';
import { unstable_cache } from 'next/cache';

import type { Collection, SuitCard } from './types';

/** Seconds before a cached read is refreshed even with no tag from the admin. */
export const REVALIDATE_SECONDS = 3600;

function cached<Args extends unknown[], Result>(
  name: string,
  read: (...args: Args) => Promise<Result>,
  tags: (...args: Args) => string[],
) {
  return (...args: Args) =>
    unstable_cache(() => read(...args), [name, JSON.stringify(args)], {
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
