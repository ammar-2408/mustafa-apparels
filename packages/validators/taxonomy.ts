// The only allowed filter values (docs/catalog.md §4). Adding a value means updating that
// table and this file in the same commit; taxonomy.test.ts compares the two.
// Pieces and season are stored as enum values and shown as labels; the rest are stored as shown.

export const PIECES = ['two_piece', 'three_piece'] as const;
export type Pieces = (typeof PIECES)[number];
export const PIECE_LABELS: Record<Pieces, string> = {
  two_piece: '2 Piece',
  three_piece: '3 Piece',
};

export const DRESS_CATEGORIES = [
  'Unstitched Suits',
  'Casual Wear',
  'Daily Wear',
  'Semi-Formal Wear',
  'Formal Wear',
  'Festive Wear',
] as const;

export const FABRICS = [
  'Dhanak',
  'Lawn',
  'Cotton',
  'Linen',
  'Khaddar',
  'Cambric',
  'Marina',
  'Chiffon',
  'Silk',
  'Organza',
  'Jacquard',
] as const;

export const DESIGNS = [
  'All-Over Print',
  'Digital Print',
  'Floral Print',
  'Geometric Print',
  'Block Print',
  'Embroidered',
  'Plain',
  'Woven / Jacquard',
  'Embellished',
] as const;

export const SEASONS = ['summer', 'winter', 'all_season'] as const;
export type Season = (typeof SEASONS)[number];
export const SEASON_LABELS: Record<Season, string> = {
  summer: 'Summer',
  winter: 'Winter',
  all_season: 'All-Season',
};

export const OUTFIT_STYLES = [
  'Straight Suit',
  'A-Line Suit',
  'Kurta Set',
  'Frock Style',
  'Traditional Suit',
] as const;

export const COLOR_FAMILIES = [
  'Black',
  'Grey',
  'White',
  'Beige',
  'Brown',
  'Red',
  'Maroon',
  'Pink',
  'Purple',
  'Blue',
  'Teal',
  'Green',
  'Yellow',
  'Orange',
] as const;

// Whole PKR. `min` is included and `max` is not, so 6,000 is in "6,000–8,000".
export const PRICE_BANDS = [
  { id: 'under-4000', label: 'Under 4,000', min: 0, max: 4000 },
  { id: '4000-6000', label: '4,000–6,000', min: 4000, max: 6000 },
  { id: '6000-8000', label: '6,000–8,000', min: 6000, max: 8000 },
  { id: '8000-10000', label: '8,000–10,000', min: 8000, max: 10000 },
  { id: 'over-10000', label: 'Over 10,000', min: 10000, max: null },
] as const;

export type PriceBand = (typeof PRICE_BANDS)[number];

export function priceBandOf(price: number | null): PriceBand | null {
  if (price === null) return null;
  return PRICE_BANDS.find((band) => price >= band.min && (band.max === null || price < band.max))!;
}
