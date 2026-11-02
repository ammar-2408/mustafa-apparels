import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  COLOR_FAMILIES,
  DESIGNS,
  DRESS_CATEGORIES,
  FABRICS,
  OUTFIT_STYLES,
  PIECE_LABELS,
  PIECES,
  PRICE_BANDS,
  priceBandOf,
  SEASON_LABELS,
  SEASONS,
} from './taxonomy';

// The allowed values column of each row in the docs/catalog.md §4 table, so code and doc can't drift.
const docValues = (() => {
  const doc = readFileSync(new URL('../../docs/catalog.md', import.meta.url), 'utf8');
  const section = doc.slice(doc.indexOf('## 4. Filter taxonomy'), doc.indexOf('## 5.'));
  const rows = new Map<string, string[]>();
  for (const line of section.split(/\r?\n/)) {
    const cells = line.split('|').map((cell) => cell.trim());
    if (cells.length < 5 || !cells[2]?.startsWith('`')) continue;
    rows.set(cells[1]!, cells[3]!.split(', '));
  }
  return rows;
})();

describe('taxonomy matches docs/catalog.md §4', () => {
  it.each([
    ['Dress category', DRESS_CATEGORIES],
    ['Fabric', FABRICS],
    ['Design', DESIGNS],
    ['Outfit style', OUTFIT_STYLES],
    ['Colour', COLOR_FAMILIES],
  ])('%s', (filter, values) => {
    expect([...values]).toEqual(docValues.get(filter));
  });

  it('Volume style, shown as labels and stored as enum values', () => {
    expect(PIECES.map((p) => PIECE_LABELS[p])).toEqual(docValues.get('Volume style'));
  });

  it('Season, shown as labels and stored as enum values', () => {
    expect(SEASONS.map((s) => SEASON_LABELS[s])).toEqual(docValues.get('Season'));
  });

  it('has no size anywhere, because the suits are unstitched', () => {
    expect([...docValues.keys()].some((filter) => /size/i.test(filter))).toBe(false);
  });
});

describe('PRICE_BANDS', () => {
  it('has the five bands from the doc, in order', () => {
    expect(PRICE_BANDS.map((band) => band.label)).toEqual([
      'Under 4,000',
      '4,000–6,000',
      '6,000–8,000',
      '8,000–10,000',
      'Over 10,000',
    ]);
  });

  it.each([
    [0, 'under-4000'],
    [3999, 'under-4000'],
    [4000, '4000-6000'],
    [5999, '4000-6000'],
    [6000, '6000-8000'],
    [8000, '8000-10000'],
    [9999, '8000-10000'],
    [10000, 'over-10000'],
    [250000, 'over-10000'],
  ])('puts %i PKR in %s, each lower bound in its own band', (price, id) => {
    expect(priceBandOf(price)?.id).toBe(id);
  });

  it('puts a suit with no price in no band', () => {
    expect(priceBandOf(null)).toBeNull();
  });
});
