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

export type SuitMedia = {
  id: string;
  kind: 'image' | 'video';
  url: string;
  publicId: string;
  alt: string;
  width: number;
  height: number;
  durationSeconds: number | null;
  posterPublicId: string | null;
};

/** Everything a suit's own page shows. Dates are ISO text (see above). */
export type Suit = Omit<SuitCard, 'image' | 'status' | 'featured'> & {
  description: string | null;
  design: string[];
  season: 'summer' | 'winter' | 'all_season' | null;
  outfitStyle: string | null;
  accentColors: string[];
  motifs: string[];
  careInstructions: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  updatedAt: string;
  media: SuitMedia[];
  alsoInDesign: SuitCard[];
  related: SuitCard[];
};
