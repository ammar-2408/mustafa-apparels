import { describe, expect, it } from 'vitest';

import { customerListInput, productFilters, searchInput, suggestInput } from './search';

describe('searchInput', () => {
  it('trims the query and collapses spaces', () => {
    expect(searchInput.parse({ q: '  black   dhanak ' })).toEqual({
      q: 'black dhanak',
      page: 1,
      filters: {},
    });
  });

  it.each([
    ['an empty query', ''],
    ['a one-character query', 'a'],
    ['a 61-character query', 'a'.repeat(61)],
    ['only spaces', '    '],
  ])('rejects %s', (_, q) => {
    expect(searchInput.safeParse({ q }).success).toBe(false);
  });

  it.each([
    ['60 characters', 'a'.repeat(60)],
    ['SQL-looking text, which is only ever a bound parameter', "' OR 1=1 --"],
    ['emoji', 'red 🌹 suit'],
    ['HTML tags, which React escapes', '<script>alert(1)</script>'],
  ])('accepts %s as plain text', (_, q) => {
    expect(searchInput.parse({ q }).q).toBe(q);
  });

  it('drops control characters', () => {
    expect(searchInput.parse({ q: 'dha\u0000nak' }).q).toBe('dhanak');
  });

  it('rejects unknown keys', () => {
    expect(searchInput.safeParse({ q: 'dhanak', limit: 1000 }).success).toBe(false);
  });
});

describe('productFilters', () => {
  it('takes several values per filter', () => {
    const filters = {
      pieces: ['two_piece'],
      dressCategories: ['Unstitched Suits'],
      fabric: ['Dhanak', 'Khaddar'],
      design: ['Floral Print'],
      season: ['winter'],
      outfitStyle: ['Traditional Suit'],
      colorFamily: ['Black', 'Maroon'],
      priceMin: 4000,
      priceMax: 6000,
    };
    expect(productFilters.parse(filters)).toEqual(filters);
  });

  it.each([
    ['an unknown fabric', { fabric: ['Velvet'] }],
    ['an unknown colour', { colorFamily: ['Sage'] }],
    ['a size', { size: ['M'] }],
    ['a minimum above the maximum', { priceMin: 8000, priceMax: 4000 }],
    ['a negative price', { priceMin: -1 }],
  ])('rejects %s', (_, filters) => {
    expect(productFilters.safeParse(filters).success).toBe(false);
  });
});

describe('suggestInput', () => {
  it('needs 2–60 characters', () => {
    expect(suggestInput.safeParse({ q: 'dh' }).success).toBe(true);
    expect(suggestInput.safeParse({ q: 'd' }).success).toBe(false);
  });
});

describe('customerListInput', () => {
  it('reads an optional search and a page from the URL', () => {
    expect(customerListInput.parse({})).toEqual({ page: 1 });
    expect(customerListInput.parse({ q: ' ayesha ', page: '2' })).toEqual({ q: 'ayesha', page: 2 });
    expect(customerListInput.safeParse({ role: 'admin' }).success).toBe(false);
  });
});
