// Product JSON-LD (docs/design.md §8.3): no brand (ADR-014), Mustafa Apparels is the seller.
import { shapedImageUrl } from '@mustafa/core/media-url';

import { canonicalUrl } from './seo';
import { SELLER } from './structured-data';
import type { Suit } from './types';

const AVAILABILITY = {
  in_stock: 'https://schema.org/InStock',
  low_stock: 'https://schema.org/LimitedAvailability',
  out_of_stock: 'https://schema.org/OutOfStock',
} as const;

export function productJsonLd(suit: Suit, description: string) {
  const url = canonicalUrl(`/products/${suit.slug}`);
  const images = suit.media
    .filter((m) => m.kind === 'image')
    .map((m) => shapedImageUrl(m.url, 'whole'));
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: suit.name,
    description,
    url,
    image: images,
    ...(suit.designCode ? { sku: suit.designCode } : {}),
    ...(suit.mainColor ? { color: suit.mainColor } : {}),
    material: suit.fabric,
    category: suit.category.name,
    ...(suit.price !== null
      ? {
          offers: {
            '@type': 'Offer',
            price: suit.price,
            priceCurrency: 'PKR',
            availability: AVAILABILITY[suit.availability],
            url,
            seller: SELLER,
          },
        }
      : {}),
  };
}
