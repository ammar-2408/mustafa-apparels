import type { Metadata } from 'next';

import { ListPage } from '../../../../components/list-page';
import { listCollections } from '../../../../lib/catalog';
import {
  collectionCrumbs,
  collectionDescription,
  loadCollectionPage,
} from '../../../../lib/collection-page';
import { buildMetadata } from '../../../../lib/seo';

type Props = { params: Promise<{ slug: string }> };

// Every visible collection is prerendered; a new one renders on its first request.
export async function generateStaticParams() {
  return (await listCollections()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { collection } = await loadCollectionPage((await params).slug, 1);
  return buildMetadata({
    title: collection.seoTitle ?? `${collection.name} unstitched suits`,
    description: collectionDescription(collection),
    path: `/collections/${collection.slug}`,
  });
}

export default async function CollectionPage({ params }: Props) {
  const { collection, list } = await loadCollectionPage((await params).slug, 1);
  return (
    <ListPage
      title={collection.name}
      intro={collection.description ?? undefined}
      crumbs={collectionCrumbs(collection)}
      base={`/collections/${collection.slug}`}
      list={list}
    />
  );
}
