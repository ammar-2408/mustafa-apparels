// Filters and sort in the browser (ADR-018, docs/design.md §3, §9.2). Pure, so it is unit-tested
// and shared by the filter bar. The URL holds the state (`?fabric=dhanak&sort=price_asc`), so a
// link restores it and Back works; the server never reads it, so pages stay cached.
import {
  PIECE_LABELS,
  type Pieces,
  PRICE_BANDS,
  priceBandOf,
  type Season,
  SEASON_LABELS,
} from '@mustafa/validators/taxonomy';

import type { SuitCard } from './types';

/** A suit as /api/suits sends it: a card plus the fields the filters read. */
export type FilterSuit = SuitCard & {
  dressCategories: string[];
  design: string[];
  season: Season | null;
  outfitStyle: string | null;
};

/** What the server knows each page's suits have (core's facets), to draw the bar before fetching. */
export type Facets = {
  pieces: string[];
  dressCategories: string[];
  fabric: string[];
  design: string[];
  season: string[];
  outfitStyle: string[];
  colorFamily: string[];
  priceBands: string[];
  collections?: { slug: string; name: string }[];
};

type Group = {
  /** The URL parameter. */
  key: string;
  label: string;
  /** Values a suit has for this filter. */
  values: (suit: FilterSuit) => string[];
  /** The values that exist, from the facets. */
  options: (facets: Facets) => { value: string; label: string }[];
};

export const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const plain = (values: string[]) => values.map((v) => ({ value: v, label: v }));

// Order is the order of the filter panel (docs/design.md §3). The dress category shows as
// "Category". Collection is on /shop only.
export const GROUPS: Group[] = [
  {
    key: 'collection',
    label: 'Collection',
    values: (s) => [s.category.slug],
    options: (f) => (f.collections ?? []).map((c) => ({ value: c.slug, label: c.name })),
  },
  {
    key: 'pieces',
    label: 'Pieces',
    values: (s) => [s.pieces],
    options: (f) => f.pieces.map((p) => ({ value: p, label: PIECE_LABELS[p as Pieces] ?? p })),
  },
  {
    key: 'category',
    label: 'Category',
    values: (s) => s.dressCategories,
    options: (f) => plain(f.dressCategories),
  },
  { key: 'fabric', label: 'Fabric', values: (s) => [s.fabric], options: (f) => plain(f.fabric) },
  { key: 'design', label: 'Design', values: (s) => s.design, options: (f) => plain(f.design) },
  {
    key: 'season',
    label: 'Season',
    values: (s) => (s.season ? [s.season] : []),
    options: (f) => f.season.map((v) => ({ value: v, label: SEASON_LABELS[v as Season] ?? v })),
  },
  {
    key: 'style',
    label: 'Style',
    values: (s) => (s.outfitStyle ? [s.outfitStyle] : []),
    options: (f) => plain(f.outfitStyle),
  },
  {
    key: 'colour',
    label: 'Colour',
    values: (s) => (s.colorFamily ? [s.colorFamily] : []),
    options: (f) => plain(f.colorFamily),
  },
  {
    key: 'price',
    label: 'Price (PKR)',
    values: (s) => {
      const band = priceBandOf(s.price);
      return band ? [band.id] : [];
    },
    options: (f) =>
      PRICE_BANDS.filter((b) => f.priceBands.includes(b.id)).map((b) => ({
        value: b.id,
        label: b.label,
      })),
  },
];

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
] as const;
export type Sort = (typeof SORT_OPTIONS)[number]['value'];

export const CLIENT_PAGE_SIZE = 24;

/** The groups worth showing: a filter with one value or none narrows nothing, so it's hidden. */
export function visibleGroups(facets: Facets) {
  return GROUPS.map((g) => ({ ...g, choices: g.options(facets) })).filter(
    (g) => g.choices.length > 1,
  );
}

/** One-tap chips above the grid: pieces and design values, when they would narrow the list. */
export function quickChips(facets: Facets) {
  return visibleGroups(facets)
    .filter((g) => g.key === 'pieces' || g.key === 'design')
    .flatMap((g) => g.choices.map((c) => ({ key: g.key, value: toSlug(c.value), label: c.label })));
}

export type FilterState = {
  /** URL key → chosen value slugs. */
  selected: Record<string, string[]>;
  sort: Sort;
  page: number;
};

/** Reads the URL. Unknown keys and values are ignored, never an error. */
export function parseFilters(params: URLSearchParams, facets: Facets): FilterState {
  const selected: Record<string, string[]> = {};
  for (const group of visibleGroups(facets)) {
    const known = new Set(group.choices.map((c) => toSlug(c.value)));
    const chosen = (params.get(group.key) ?? '').split(',').filter((v) => known.has(v));
    if (chosen.length > 0) selected[group.key] = [...new Set(chosen)];
  }
  const sortParam = params.get('sort');
  const sort = SORT_OPTIONS.some((o) => o.value === sortParam) ? (sortParam as Sort) : 'newest';
  const page = Number(params.get('page'));
  return { selected, sort, page: Number.isInteger(page) && page > 1 ? page : 1 };
}

/** The URL query for a state; empty when nothing is chosen (the cached, unfiltered page). */
export function toQuery({ selected, sort, page }: FilterState) {
  const params = new URLSearchParams();
  for (const group of GROUPS) {
    const values = selected[group.key];
    if (values?.length) params.set(group.key, values.join(','));
  }
  if (sort !== 'newest') params.set('sort', sort);
  if (page > 1) params.set('page', String(page));
  return params.toString();
}

export const isActive = (state: FilterState) =>
  Object.keys(state.selected).length > 0 || state.sort !== 'newest';

/** Any value within one filter matches; every filter that is set must match (docs/api.md). */
export function applyFilters(suits: FilterSuit[], state: FilterState) {
  const chosen = GROUPS.filter((g) => state.selected[g.key]?.length);
  const matching = suits.filter((suit) =>
    chosen.every((g) => {
      const wanted = new Set(state.selected[g.key]);
      return g.values(suit).some((v) => wanted.has(toSlug(v)));
    }),
  );
  if (state.sort === 'newest') return matching; // /api/suits is newest first already
  const direction = state.sort === 'price_asc' ? 1 : -1;
  return [...matching].sort((a, b) => {
    if (a.price === null) return 1;
    if (b.price === null) return -1;
    return (a.price - b.price) * direction;
  });
}

/** Turns one value on or off, back to page 1. */
export function toggle(state: FilterState, key: string, value: string): FilterState {
  const current = new Set(state.selected[key] ?? []);
  if (current.has(value)) current.delete(value);
  else current.add(value);
  const selected = { ...state.selected, [key]: [...current] };
  if (current.size === 0) delete selected[key];
  return { ...state, selected, page: 1 };
}
