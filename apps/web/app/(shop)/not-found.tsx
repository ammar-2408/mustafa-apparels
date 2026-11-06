import type { Metadata } from 'next';

import { NotFoundContent } from '../../components/not-found-content';

export const metadata: Metadata = { title: 'Page not found | Mustafa Apparels' };

// notFound() from a shop page (an unknown suit, collection or page number): the (shop) layout
// already gives the <main>.
export default function ShopNotFound() {
  return <NotFoundContent />;
}
