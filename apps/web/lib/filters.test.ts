import { describe, expect, it } from 'vitest';

import {
  applyFilters,
  type Facets,
  type FilterSuit,
  isActive,
  parseFilters,
  quickChips,
  toggle,
  toQuery,
  visibleGroups,
} from './filters';

const facets: Facets = {
  pieces: ['two_piece', 'three_piece'],
  dressCategories: ['Unstitched Suits'],
  fabric: ['Dhanak', 'Khaddar'],
  design: ['Embroidered', 'Floral Print'],
  season: ['winter'],
  outfitStyle: [],
  colorFamily: ['Black', 'Red'],
  priceBands: ['4000-6000'],
  collections: [
    { slug: 'dhanak', name: 'Dhanak' },
    { slug: 'khaddar', name: 'Khaddar' },
  ],
};

const suit = (id: string, over: Partial<FilterSuit>): FilterSuit =>
  ({
    id,
    slug: id,
    name: id,
    price: 4999,
    pieces: 'three_piece',
    fabric: 'Dhanak',
    design: ['Embroidered'],
    dressCategories: ['Unstitched Suits'],
    season: 'winter',
    outfitStyle: null,
    colorFamily: 'Black',
    category: { slug: 'dhanak', name: 'Dhanak' },
    ...over,
  }) as FilterSuit;

const suits = [
  suit('a', {}),
  suit('b', { fabric: 'Khaddar', category: { slug: 'khaddar', name: 'Khaddar' }, price: 5500 }),
  suit('c', { pieces: 'two_piece', design: ['Floral Print'], colorFamily: 'Red', price: 4200 }),
];

const state = (query: string) => parseFilters(new URLSearchParams(query), facets);

describe('which filters show', () => {
  it('hides a filter with one value or none', () => {
    expect(visibleGroups(facets).map((g) => g.label)).toEqual([
      'Collection',
      'Pieces',
      'Fabric',
      'Design',
      'Colour',
    ]);
  });

  it('offers one-tap chips for pieces and design', () => {
    expect(quickChips(facets).map((c) => `${c.key}=${c.value}`)).toEqual([
      'pieces=two-piece',
      'pieces=three-piece',
      'design=embroidered',
      'design=floral-print',
    ]);
    expect(quickChips({ ...facets, pieces: ['three_piece'], design: ['Embroidered'] })).toEqual([]);
  });
});

describe('the URL', () => {
  it('reads filters, sort and page, ignoring what it does not know', () => {
    expect(state('fabric=khaddar,silk&design=floral-print&sort=price_desc&page=2&utm=x')).toEqual({
      selected: { fabric: ['khaddar'], design: ['floral-print'] },
      sort: 'price_desc',
      page: 2,
    });
    expect(state('season=winter&sort=cheapest&page=-3')).toEqual({
      selected: {},
      sort: 'newest',
      page: 1,
    });
  });

  it('writes the same state back, and nothing for the plain page', () => {
    expect(toQuery(state('design=floral-print&fabric=dhanak&sort=price_asc'))).toBe(
      'fabric=dhanak&design=floral-print&sort=price_asc',
    );
    expect(toQuery(state(''))).toBe('');
    expect(isActive(state(''))).toBe(false);
    expect(isActive(state('sort=price_asc'))).toBe(true);
  });
});

describe('applyFilters', () => {
  it('matches any value within a filter and every filter that is set', () => {
    expect(applyFilters(suits, state('fabric=dhanak,khaddar')).map((s) => s.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(applyFilters(suits, state('fabric=dhanak&colour=red')).map((s) => s.id)).toEqual(['c']);
    expect(applyFilters(suits, state('collection=khaddar')).map((s) => s.id)).toEqual(['b']);
  });

  it('sorts by price both ways and keeps newest as sent', () => {
    expect(applyFilters(suits, state('sort=price_asc')).map((s) => s.id)).toEqual(['c', 'a', 'b']);
    expect(applyFilters(suits, state('sort=price_desc')).map((s) => s.id)).toEqual(['b', 'a', 'c']);
    expect(applyFilters(suits, state('')).map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('toggles a value on and off, back to page 1', () => {
    const on = toggle(state('page=3'), 'design', 'embroidered');
    expect(on).toMatchObject({ selected: { design: ['embroidered'] }, page: 1 });
    expect(toggle(on, 'design', 'embroidered').selected).toEqual({});
  });
});
