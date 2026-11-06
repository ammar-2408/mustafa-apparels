// Shapes the cached reads (lib/catalog.ts) hand to pages and client components: plain JSON, with
// no Date values, because cached results are stored as JSON.
import type { Card } from '@mustafa/core/products';

/** A suit as a grid card shows it. */
export type SuitCard = Omit<Card, 'publishedAt'>;

export type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  imageUrl: string | null;
};
