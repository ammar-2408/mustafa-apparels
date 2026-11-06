// The storefront's cached reads (ADR-021). Each one is a `'use cache'` function tagged with the
// tags the admin sends after a save (`@mustafa/validators/revalidate`), so a save refreshes the
// pages that show it, and the 1-hour expiry is the safety net (docs/architecture.md §4).
// Pages call only these, never core directly, so nothing public runs per request.
import 'server-only';

import * as categories from '@mustafa/core/categories';
import * as products from '@mustafa/core/products';
import * as settings from '@mustafa/core/settings';
import { getDb } from '@mustafa/db/client';
import { categoryTag, TAGS } from '@mustafa/validators/revalidate';
import { cacheLife, cacheTag } from 'next/cache';

// Fresh until a tag clears it; regenerated at most an hour after the last refresh anyway.
export const CACHE_PROFILE = { stale: 300, revalidate: 3600, expire: 86_400 } as const;

export async function getSiteSettings() {
  'use cache';
  cacheLife(CACHE_PROFILE);
  cacheTag(TAGS.settings);
  return settings.get(getDb());
}

// Visible collections in shop order, for the menu, footer and home page.
export async function listCollections() {
  'use cache';
  cacheLife(CACHE_PROFILE);
  cacheTag(TAGS.categories);
  const rows = await categories.list(getDb());
  cacheTag(...rows.map((row) => categoryTag(row.slug)));
  return rows;
}

/** A list page of published suits, newest first: all suits, or one collection's. */
export async function listSuits({ categorySlug, page }: { categorySlug?: string; page: number }) {
  'use cache';
  cacheLife(CACHE_PROFILE);
  // A collection that's hidden, renamed or new changes these lists too.
  cacheTag(TAGS.products, TAGS.categories, ...(categorySlug ? [categoryTag(categorySlug)] : []));
  return products.list(getDb(), { categorySlug, page, sort: 'newest', filters: {} });
}
