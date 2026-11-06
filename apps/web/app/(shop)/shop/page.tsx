import { ListPage } from '../../../components/list-page';
import { listSuits } from '../../../lib/catalog';
import { buildMetadata } from '../../../lib/seo';
import { SHOP_CRUMBS, SHOP_TITLE } from '../../../lib/shop';

export const metadata = buildMetadata({
  title: 'All unstitched suits',
  description:
    'Browse every unstitched 2-piece and 3-piece suit from Mustafa Apparels in Dhanak, Khaddar and Lajwanti. Order on WhatsApp with courier delivery across Pakistan.',
  path: '/shop',
});

// Cached (ADR-021); filters and sort arrive in the browser at step 6.4a (ADR-018).
export default async function ShopPage() {
  const list = await listSuits({ page: 1 });
  return (
    <ListPage
      title={SHOP_TITLE}
      intro="Unstitched 2-piece and 3-piece suits, newest first. Tap a suit to see every piece, then ask us about it on WhatsApp."
      crumbs={SHOP_CRUMBS}
      base="/shop"
      list={list}
    />
  );
}
