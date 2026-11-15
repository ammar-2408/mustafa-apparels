import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ListPage } from '../../../../../../components/list-page';
import { getCollection, listCollections, listSuits } from '../../../../../../lib/catalog';
import { collectionCrumbs, loadCollectionPage } from '../../../../../../lib/collection-page';
import { laterPageParams, parsePageParam } from '../../../../../../lib/paging';
import { buildMetadata } from '../../../../../../lib/seo';

type Props = { params: Promise<{ slug: string; n: string }> };

export async function generateStaticParams() {
  const collections = await listCollections();
  const params = await Promise.all(
    collections.map(async ({ slug }) => {
      const list = await listSuits({ categorySlug: slug, page: 1 });
      return laterPageParams(list?.pageCount ?? 1).map(({ n }) => ({ slug, n }));
    }),
  );
  return params.flat();
}

async function load(params: Props['params']) {
  const { slug, n } = await params;
  const page = parsePageParam(n);
  if (page === null) notFound();
  return loadCollectionPage(slug, page);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Never notFound() or redirect here: the page does that. Thrown from both, a redirect can reach
  // the browser with its Location header twice (seen in CI), which sends it to a broken address.
  const { slug, n } = await params;
  const page = parsePageParam(n);
  const collection = await getCollection(slug);
  const list =
    page === null || !collection ? null : await listSuits({ categorySlug: collection.slug, page });
  if (page === null || !collection || !list || page > list.pageCount) return {};
  return buildMetadata({
    title: `${collection.name} unstitched suits, page ${list.page}`,
    description: `Page ${list.page} of the ${collection.name} collection: unstitched 2-piece and 3-piece suits from Mustafa Apparels, ordered on WhatsApp with courier delivery across Pakistan.`,
    path: `/collections/${collection.slug}/page/${list.page}`,
  });
}

export default async function CollectionLaterPage({ params }: Props) {
  const { collection, list } = await load(params);
  const base = `/collections/${collection.slug}`;
  return (
    <ListPage
      title={collection.name}
      crumbs={[
        ...collectionCrumbs(collection),
        { name: `Page ${list.page}`, path: `${base}/page/${list.page}` },
      ]}
      base={base}
      list={list}
      collectionSlug={collection.slug}
    />
  );
}
