import { describe, expect, it } from 'vitest';

import {
  productInput,
  productListInput,
  productRuleErrors,
  productStatusInput,
  productUpdateInput,
} from './product';

// A complete draft, as the admin form sends it.
const draft = {
  name: 'Black Embroidered Dhanak 3-Piece Suit',
  slug: 'black-embroidered-dhanak-3-piece-dhn-01',
  designCode: 'DHN-01',
  description: 'A black unstitched 3-piece Dhanak suit for winter.',
  price: null,
  compareAtPrice: null,
  categoryId: 'cat_1',
  pieces: 'three_piece',
  pieceDetails: [
    { piece: 'shirt', fabric: 'Dhanak', finish: 'Embroidered' },
    { piece: 'dupatta', fabric: 'Dhanak', finish: 'Printed' },
    { piece: 'trouser', finish: 'Plain dyed' },
  ],
  collectionType: 'Premium',
  dressCategories: ['Unstitched Suits'],
  fabric: 'Dhanak',
  design: ['Embroidered', 'Geometric Print'],
  season: 'winter',
  outfitStyle: 'Traditional Suit',
  mainColor: 'Black',
  colorFamily: 'Black',
  accentColors: ['Beige'],
  motifs: ['diamond neckline panel'],
  relatedDesignCodes: [],
  careInstructions: '',
  availability: 'in_stock',
  status: 'draft',
  featured: false,
};

const published = { ...draft, status: 'published' as const, price: 4500 };

const errorsOf = (input: unknown) => {
  const result = productInput.safeParse(input);
  return result.success ? {} : result.error.flatten().fieldErrors;
};

describe('productInput', () => {
  it('accepts a complete draft with no price, and fills the defaults', () => {
    const result = productInput.parse(draft);
    expect(result).toMatchObject({ price: null, attributes: {} });
  });

  it('accepts a published suit with a price and colour', () => {
    expect(productInput.safeParse(published).success).toBe(true);
  });

  it('refuses to publish without a price', () => {
    expect(errorsOf({ ...published, price: null })).toEqual({
      price: ['Add a price before publishing'],
    });
  });

  it('refuses to publish without a colour', () => {
    expect(errorsOf({ ...published, colorFamily: null }).colorFamily).toEqual([
      'Add a colour before publishing',
    ]);
    expect(errorsOf({ ...published, mainColor: null }).colorFamily).toBeDefined();
  });

  it('needs a compare-at price higher than the price', () => {
    expect(errorsOf({ ...published, compareAtPrice: 4500 }).compareAtPrice).toEqual([
      'Must be higher than price',
    ]);
    expect(errorsOf({ ...draft, compareAtPrice: 5000 }).compareAtPrice).toBeDefined();
    expect(productInput.safeParse({ ...published, compareAtPrice: 5000 }).success).toBe(true);
  });

  it.each([
    ['a negative price', { price: -1 }],
    ['a price with paisa', { price: 4500.5 }],
    ['an unknown fabric', { fabric: 'Velvet' }],
    ['an unknown design', { design: ['Printed'] }],
    ['an unknown dress category', { dressCategories: ['Party Wear'] }],
    ['an unknown outfit style', { outfitStyle: 'Gown' }],
    ['an unknown colour family', { colorFamily: 'Sage' }],
    ['an unknown season', { season: 'autumn' }],
    ['a slug with capitals', { slug: 'Black-Suit' }],
    ['a slug with a double hyphen', { slug: 'black--suit' }],
    ['a design code with spaces', { designCode: 'DHN 01' }],
    ['a piece length of 0 m', { pieceDetails: [{ piece: 'shirt', length_m: 0 }] }],
    ['a negative piece length', { pieceDetails: [{ piece: 'shirt', length_m: -1 }] }],
    ['a piece length over 10 m', { pieceDetails: [{ piece: 'shirt', length_m: 10.5 }] }],
    ['an unknown piece', { pieceDetails: [{ piece: 'scarf' }] }],
    ['the same piece twice', { pieceDetails: [{ piece: 'shirt' }, { piece: 'shirt' }] }],
    [
      'three pieces on a 2-piece suit',
      {
        pieces: 'two_piece',
        pieceDetails: [{ piece: 'shirt' }, { piece: 'dupatta' }, { piece: 'trouser' }],
      },
    ],
    ['an unknown key, such as role', { role: 'admin' }],
    ['a size', { size: 'M' }],
  ])('rejects %s', (_, change) => {
    expect(productInput.safeParse({ ...draft, ...change }).success).toBe(false);
  });

  it.each([
    ['name', { name: 'Khaadi Black Suit' }],
    ['slug', { slug: 'black-khaadi-suit' }],
    ['description', { description: 'Like the Maria.B design' }],
    ['careInstructions', { careInstructions: 'Dry clean, as Nishat advises' }],
    ['motifs', { motifs: ['Elaf border'] }],
    ['mainColor', { mainColor: 'Baroque gold' }],
    ['accentColors', { accentColors: ['Sobia Waseem pink'] }],
    ['collectionType', { collectionType: 'So Kamal' }],
    ['seoTitle', { seoTitle: 'HS Fashion suit' }],
    ['seoDescription', { seoDescription: 'Better than Khaadi' }],
  ])('rejects a banned brand name in %s', (field, change) => {
    const errors = errorsOf({ ...draft, ...change });
    expect(Object.keys(errors)).toEqual([field]);
  });

  it('accepts a piece length within 0–10 m', () => {
    const pieceDetails = [{ piece: 'shirt', fabric: 'Dhanak', length_m: 2.5 }];
    expect(productInput.parse({ ...draft, pieceDetails }).pieceDetails).toEqual(pieceDetails);
  });
});

describe('productUpdateInput', () => {
  it('takes an id and only the fields that change', () => {
    expect(productUpdateInput.parse({ id: 'p1', price: 5200 })).toEqual({ id: 'p1', price: 5200 });
  });

  it('still checks each field and rejects unknown keys', () => {
    expect(productUpdateInput.safeParse({ id: 'p1', fabric: 'Velvet' }).success).toBe(false);
    expect(productUpdateInput.safeParse({ id: 'p1', publishedAt: '2026-01-01' }).success).toBe(
      false,
    );
    expect(productUpdateInput.safeParse({ price: 5200 }).success).toBe(false);
  });
});

describe('productRuleErrors', () => {
  it('lists every cross-field problem, for core to re-check the merged row', () => {
    expect(
      productRuleErrors({
        status: 'published',
        price: null,
        compareAtPrice: 3000,
        mainColor: null,
        colorFamily: null,
      }),
    ).toEqual({
      price: ['Add a price before publishing'],
      colorFamily: ['Add a colour before publishing'],
      compareAtPrice: ['Must be higher than price'],
    });
  });

  it('is empty for a valid suit', () => {
    expect(productRuleErrors({ ...published, compareAtPrice: null })).toEqual({});
  });
});

describe('productStatusInput', () => {
  it('accepts the three statuses only', () => {
    expect(productStatusInput.safeParse({ id: 'p1', status: 'archived' }).success).toBe(true);
    expect(productStatusInput.safeParse({ id: 'p1', status: 'deleted' }).success).toBe(false);
  });
});

describe('productListInput', () => {
  it('defaults to page 1, newest first, no filters', () => {
    expect(productListInput.parse({})).toEqual({ page: 1, sort: 'newest', filters: {} });
  });

  it('reads a page number from a route param', () => {
    expect(productListInput.parse({ page: '2' }).page).toBe(2);
  });

  it.each([['0'], ['-1'], ['abc'], ['1.5'], ['1001']])('rejects page %s', (page) => {
    expect(productListInput.safeParse({ page }).success).toBe(false);
  });

  it('rejects an unknown sort', () => {
    expect(productListInput.safeParse({ sort: 'popular' }).success).toBe(false);
  });
});
