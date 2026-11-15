// Shared by /collections/[slug] and its /page/[n] routes (docs/design.md §8.2, §8.6).
import 'server-only';

import { notFound, permanentRedirect } from 'next/navigation';

import { collectionRedirect, getCollection, listSuits } from './catalog';

/**
 * The collection and one page of its suits, or the right answer instead: an old slug moves
 * permanently to the current one (308, same page number), anything else is a 404.
 */
export async function loadCollectionPage(slug: string, page: number) {
  // One address per collection: capitals move permanently to the lowercase one.
  if (slug !== slug.toLowerCase()) {
    permanentRedirect(`/collections/${slug.toLowerCase()}${page > 1 ? `/page/${page}` : ''}`);
  }
  const collection = await getCollection(slug);
  if (!collection) {
    const current = await collectionRedirect(slug);
    if (current) {
      permanentRedirect(`/collections/${current}${page > 1 ? `/page/${page}` : ''}`);
    }
    notFound();
  }
  const list = await listSuits({ categorySlug: collection.slug, page });
  if (!list || page > list.pageCount) notFound();
  return { collection, list };
}

export const collectionCrumbs = (collection: { name: string; slug: string }) => [
  { name: 'Home', path: '/' },
  { name: 'All suits', path: '/shop' },
  { name: collection.name, path: `/collections/${collection.slug}` },
];

/** Search-result text: the owner's own, else the collection text, else a plain default. */
export const collectionDescription = (collection: {
  name: string;
  description: string | null;
  seoDescription: string | null;
}) =>
  collection.seoDescription ??
  collection.description ??
  `Unstitched ${collection.name} suits from Mustafa Apparels, 2-piece and 3-piece, ordered on WhatsApp with courier delivery across Pakistan.`;
