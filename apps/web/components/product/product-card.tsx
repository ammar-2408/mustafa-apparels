import { shapedImageUrl } from '@mustafa/core/media-url';
import Image from 'next/image';
import Link from 'next/link';

import {
  availabilityLabel,
  cardLine,
  formatPrice,
  piecesLabel,
  showCompareAt,
} from '../../lib/format';
import type { SuitCard } from '../../lib/types';
import { WishlistButton } from './wishlist-button';

// Widths per grid (docs/design.md §2): 2 columns on phones, 3 from md, 4 from xl, 5 from 3xl.
export const GRID_SIZES =
  '(min-width: 120rem) 20vw, (min-width: 80rem) 25vw, (min-width: 48rem) 33vw, 50vw';

type Props = { suit: SuitCard; sizes?: string; priority?: boolean };

// A suit in a grid (docs/design.md §9.2): photo, finish and fabric, name, pieces, price, heart.
// Never a video (Cloudinary bandwidth, §5.2). The whole card opens the suit's page.
export function ProductCard({ suit, sizes = GRID_SIZES, priority = false }: Props) {
  const stock = availabilityLabel(suit.availability);
  return (
    <article className="@container relative flex flex-col">
      <Link href={`/products/${suit.slug}`} className="group flex flex-col gap-3">
        <div className="relative aspect-3/4 overflow-hidden bg-primary">
          {suit.image ? (
            <Image
              src={shapedImageUrl(suit.image.url, 'card')}
              alt={suit.image.alt}
              fill
              sizes={sizes}
              priority={priority}
              className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center caps-tight bg-primary text-primary-fg">
              Photo coming soon
            </span>
          )}
          {stock && (
            <span className="absolute bottom-3 left-3 caps-tight rounded-sm bg-accent px-2 py-1 text-accent-fg">
              {stock}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1 pr-12">
          <p className="caps-tight text-muted">{cardLine(suit)}</p>
          <h3 className="text-body @[14rem]:text-body-lg">{suit.name}</h3>
          <p className="text-small text-muted">{piecesLabel(suit.pieces)}</p>
          {suit.price !== null && (
            <p className="text-body">
              <span className="sr-only">Price </span>
              {formatPrice(suit.price)}
              {showCompareAt(suit.price, suit.compareAtPrice) && (
                <s className="ml-2 text-small text-muted">
                  <span className="sr-only">was </span>
                  {formatPrice(suit.compareAtPrice!)}
                </s>
              )}
            </p>
          )}
        </div>
      </Link>
      <div className="absolute top-3 right-3">
        <WishlistButton name={suit.name} />
      </div>
    </article>
  );
}
