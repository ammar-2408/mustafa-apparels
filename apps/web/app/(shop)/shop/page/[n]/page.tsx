import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ListPage } from '../../../../../components/list-page';
import { listSuits } from '../../../../../lib/catalog';
import { laterPageParams, parsePageParam } from '../../../../../lib/paging';
import { buildMetadata } from '../../../../../lib/seo';
import { SHOP_CRUMBS, SHOP_TITLE } from '../../../../../lib/shop';

type Props = { params: Promise<{ n: string }> };

// Every later page is prerendered; one that appears after the build is made on first request.
export async function generateStaticParams() {
  const { pageCount } = await listSuits({ page: 1 });
  return laterPageParams(pageCount);
}

// Page 2 and up, or a 404 for anything else (ADR-017). Page 1 is /shop (next.config 301).
async function load(params: Props['params']) {
  const page = parsePageParam((await params).n);
  if (page === null) notFound();
  const list = await listSuits({ page });
  if (page > list.pageCount) notFound();
  return list;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const list = await load(params);
  return buildMetadata({
    title: `All unstitched suits, page ${list.page}`,
    description: `Page ${list.page} of every unstitched 2-piece and 3-piece suit from Mustafa Apparels in Dhanak, Khaddar and Lajwanti, ordered on WhatsApp with delivery across Pakistan.`,
    path: `/shop/page/${list.page}`,
  });
}

export default async function ShopLaterPage({ params }: Props) {
  const list = await load(params);
  return (
    <ListPage
      title={SHOP_TITLE}
      crumbs={[...SHOP_CRUMBS, { name: `Page ${list.page}`, path: `/shop/page/${list.page}` }]}
      base="/shop"
      list={list}
    />
  );
}
