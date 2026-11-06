import type { SuitCard } from '../../lib/types';
import { ProductCard } from './product-card';

// 2 columns on phones, 3 from md, 4 from xl, 5 from 3xl (docs/design.md §2, §9.2).
export function ProductGrid({ suits, eager = 4 }: { suits: SuitCard[]; eager?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-grid gap-y-12 md:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5">
      {suits.map((suit, i) => (
        <li key={suit.id}>
          <ProductCard suit={suit} priority={i < eager} />
        </li>
      ))}
    </ul>
  );
}
