// Search, suggestion and list filters (docs/api.md §2). Every filter takes a list of values:
// a suit matches any value within one filter, and every filter that is set.
import './zod-config';

import { z } from 'zod';

import {
  COLOR_FAMILIES,
  DESIGNS,
  DRESS_CATEGORIES,
  FABRICS,
  OUTFIT_STYLES,
  PIECES,
  SEASONS,
} from './taxonomy';

const price = z.number().int().min(0).max(10_000_000);

export const productFilters = z
  .object({
    pieces: z.array(z.enum(PIECES)).max(PIECES.length),
    dressCategories: z.array(z.enum(DRESS_CATEGORIES)).max(DRESS_CATEGORIES.length),
    fabric: z.array(z.enum(FABRICS)).max(FABRICS.length),
    design: z.array(z.enum(DESIGNS)).max(DESIGNS.length),
    season: z.array(z.enum(SEASONS)).max(SEASONS.length),
    outfitStyle: z.array(z.enum(OUTFIT_STYLES)).max(OUTFIT_STYLES.length),
    colorFamily: z.array(z.enum(COLOR_FAMILIES)).max(COLOR_FAMILIES.length),
    priceMin: price,
    priceMax: price,
  })
  .partial()
  .strict()
  .refine((f) => f.priceMin === undefined || f.priceMax === undefined || f.priceMin <= f.priceMax, {
    path: ['priceMax'],
    message: 'Must be at least the minimum price',
  });

export type ProductFilters = z.infer<typeof productFilters>;

export const SORTS = ['newest', 'price_asc', 'price_desc'] as const;

// Page numbers from a route param or query string.
export const page = z.coerce.number().int().min(1).max(1000);

// Strip control characters and collapse spaces. Any other text, including quotes and tags,
// is only ever a bound SQL parameter and is escaped by React.
const query = z
  .string()
  .transform((q) =>
    q
      .replace(/\p{Cc}/gu, '')
      .replace(/\s+/g, ' ')
      .trim(),
  )
  .pipe(z.string().min(2, 'Type at least 2 characters').max(60, 'Use 60 characters or fewer'));

export const searchInput = z
  .object({ q: query, page: page.default(1), filters: productFilters.default({}) })
  .strict();

export const suggestInput = z.object({ q: query }).strict();

export type SearchInput = z.output<typeof searchInput>;
export type SuggestInput = z.output<typeof suggestInput>;
