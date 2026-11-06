// The body of the admin → storefront revalidate call (docs/api.md §4).
import { z } from 'zod';

// The only cache tags the storefront accepts. Ids and slugs are word characters and hyphens.
export const REVALIDATE_TAG = /^(products|categories|settings|product:[\w-]+|category:[\w-]+)$/;

export const revalidateTag = z.string().max(160).regex(REVALIDATE_TAG, 'Unknown cache tag');

export const revalidateBody = z.object({ tags: z.array(revalidateTag).min(1).max(20) }).strict();

export type RevalidateBody = z.infer<typeof revalidateBody>;

// The cache tags, built in one place for both apps (docs/api.md §4). The storefront tags its
// cached reads with these and the admin sends the same ones, so a save always refreshes the
// pages that show it. Tags carry a suit's id (never its slug) and a collection's slug.
export const TAGS = {
  products: 'products',
  categories: 'categories',
  settings: 'settings',
} as const;
export const productTag = (id: string) => `product:${id}`;
export const categoryTag = (slug: string) => `category:${slug}`;

const unique = (slugs: (string | null | undefined)[]) => [
  ...new Set(slugs.filter((slug): slug is string => Boolean(slug))),
];

// A suit change: every list shows its card, its own page, and its collection pages (old and new).
export const suitTags = (productId: string, ...collectionSlugs: (string | null | undefined)[]) => [
  TAGS.products,
  productTag(productId),
  ...unique(collectionSlugs).map(categoryTag),
];

// A collection change: menus and collection lists, every suit card (it names the collection),
// and the collection's own pages under each slug it had.
export const collectionTags = (...slugs: (string | null | undefined)[]) => [
  TAGS.categories,
  TAGS.products,
  ...unique(slugs).map(categoryTag),
];
