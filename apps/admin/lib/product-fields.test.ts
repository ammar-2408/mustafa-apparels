import { PRODUCT_FORM_FIELDS, productCreateInput } from '@mustafa/validators/product';
import {
  COLOR_FAMILIES,
  DESIGNS,
  DRESS_CATEGORIES,
  FABRICS,
  OUTFIT_STYLES,
  PIECES,
  SEASONS,
} from '@mustafa/validators/taxonomy';
import { describe, expect, it } from 'vitest';

import { PRODUCT_FIELDS, readProductForm } from './product-fields';

const field = (name: string) => PRODUCT_FIELDS.find((f) => f.name === name);
const values = (name: string) => field(name)?.options?.map((o) => o.value);

describe('product field config', () => {
  it('has exactly one entry per form field, so the form and the schema can’t drift', () => {
    const names = PRODUCT_FIELDS.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
    expect([...names].sort()).toEqual([...PRODUCT_FORM_FIELDS].sort());
  });

  it('takes every choice from the taxonomy, and nothing else', () => {
    expect(values('pieces')).toEqual([...PIECES]);
    expect(values('fabric')).toEqual([...FABRICS]);
    expect(values('design')).toEqual([...DESIGNS]);
    expect(values('dressCategories')).toEqual([...DRESS_CATEGORIES]);
    expect(values('season')).toEqual([...SEASONS]);
    expect(values('outfitStyle')).toEqual([...OUTFIT_STYLES]);
    expect(values('colorFamily')).toEqual([...COLOR_FAMILIES]);
  });

  it('has no size field anywhere', () => {
    expect(PRODUCT_FIELDS.some((f) => /size/i.test(`${f.name} ${f.label}`))).toBe(false);
  });
});

const form = (entries: [string, string][]) => {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
};

describe('readProductForm', () => {
  const filled = form([
    ['name', ' Sage Green Printed Khaddar 3-Piece Suit '],
    ['slug', 'sage-green-printed-khaddar-3-piece-suit-kdr-13'],
    ['designCode', 'KDR-13'],
    ['categoryId', 'c1'],
    ['collectionType', ''],
    ['availability', 'in_stock'],
    ['featured', 'on'],
    ['price', '4,500'],
    ['compareAtPrice', ''],
    ['pieces', 'three_piece'],
    ['fabric', 'Khaddar'],
    ['design', 'Floral Print'],
    ['design', 'All-Over Print'],
    ['dressCategories', 'Unstitched Suits'],
    ['season', 'winter'],
    ['outfitStyle', ''],
    ['piece-shirt', 'on'],
    ['piece-shirt-fabric', 'Khaddar'],
    ['piece-shirt-finish', 'Printed'],
    ['piece-shirt-length', '3'],
    ['piece-trouser', 'on'],
    ['piece-dupatta-fabric', 'ignored when not ticked'],
    ['mainColor', 'Sage Green'],
    ['colorFamily', 'Green'],
    ['accentColors', 'cream, rust ,'],
    ['motifs', ''],
    ['relatedDesignCodes', 'KDR-14'],
    ['description', 'Printed khaddar for winter.'],
    ['careInstructions', ''],
    ['seoTitle', ''],
    ['seoDescription', ''],
  ]);

  it('reads every kind of field into the schema’s shape', () => {
    expect(readProductForm(filled)).toEqual({
      name: 'Sage Green Printed Khaddar 3-Piece Suit',
      slug: 'sage-green-printed-khaddar-3-piece-suit-kdr-13',
      designCode: 'KDR-13',
      categoryId: 'c1',
      collectionType: null,
      availability: 'in_stock',
      featured: true,
      price: 4500,
      compareAtPrice: null,
      pieces: 'three_piece',
      fabric: 'Khaddar',
      design: ['Floral Print', 'All-Over Print'],
      dressCategories: ['Unstitched Suits'],
      season: 'winter',
      outfitStyle: null,
      pieceDetails: [
        { piece: 'shirt', fabric: 'Khaddar', finish: 'Printed', length_m: 3 },
        { piece: 'trouser' },
      ],
      mainColor: 'Sage Green',
      colorFamily: 'Green',
      accentColors: ['cream', 'rust'],
      motifs: [],
      relatedDesignCodes: ['KDR-14'],
      description: 'Printed khaddar for winter.',
      careInstructions: '',
      seoTitle: null,
      seoDescription: null,
    });
  });

  it('gives values the create schema accepts', () => {
    expect(productCreateInput.safeParse(readProductForm(filled)).success).toBe(true);
  });

  it('turns a typed-in non-number price into something the schema refuses', () => {
    const bad = form([['price', 'four thousand']]);
    expect(Number.isNaN(readProductForm(bad).price)).toBe(true);
  });
});
