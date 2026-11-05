import { describe, expect, it } from 'vitest';

import { collectionFile, suitFile, toProductInput } from './catalog';

const suit = (overrides: Record<string, unknown> = {}) => ({
  design_id: 'DHN-05',
  collection: 'dhanak',
  status: 'draft',
  price: null,
  name: 'Charcoal Embroidered Dhanak 3-Piece Suit',
  slug: 'charcoal-embroidered-dhanak-3-piece-dhn-05',
  volume_style: '3 Piece',
  dress_categories: ['Unstitched Suits'],
  collection_type: 'Premium',
  fabric: 'Dhanak',
  piece_details: [
    { piece: 'shirt', fabric: 'Dhanak', finish: 'Embroidered' },
    { piece: 'dupatta', fabric: 'Dhanak', finish: 'Printed' },
    { piece: 'trouser', finish: 'Plain dyed' },
  ],
  design: ['Embroidered', 'Floral Print'],
  season: 'Winter',
  outfit_style: 'Traditional Suit',
  main_color: 'Charcoal',
  color_family: 'Grey',
  accent_colors: ['Pink', 'Orange'],
  motifs: ['pink and orange flowers'],
  photos: [
    {
      file: 'Dhanak/dhnk5.jpeg',
      alt: 'Model wearing a charcoal 3-piece Dhanak suit',
      crop: { x: 0, y: 10, width: 800, height: 1200 },
    },
  ],
  videos: [{ file: 'Dhanak/dhnk5-VID.mp4', alt: 'Short video of the charcoal suit, muted' }],
  also_in_this_design: ['DHN-10'],
  check: [],
  body: 'A charcoal unstitched 3-piece Dhanak suit for winter.',
  ...overrides,
});

const issues = (input: unknown) => {
  const result = suitFile.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('suitFile', () => {
  it('accepts a complete suit file, with empty optional lists defaulted', () => {
    const rest: Record<string, unknown> = suit();
    for (const key of ['videos', 'also_in_this_design', 'check']) delete rest[key];
    expect(issues(rest)).toEqual([]);
    expect(suitFile.parse(rest)).toMatchObject({
      videos: [],
      also_in_this_design: [],
      notes: [],
      check: [],
    });
  });

  it('refuses a price, a status other than draft and an unknown field', () => {
    expect(issues(suit({ price: 4500 }))).toEqual([expect.stringMatching(/^price:/)]);
    expect(issues(suit({ status: 'published' }))).toEqual([expect.stringMatching(/^status:/)]);
    expect(issues(suit({ size: 'M' }))).toEqual([expect.stringMatching(/Unrecognized key/)]);
  });

  it('refuses values outside the taxonomy, including "Printed" as a design', () => {
    expect(issues(suit({ design: ['Printed'] }))).toEqual([expect.stringMatching(/^design\.0:/)]);
    expect(issues(suit({ fabric: 'Velvet' }))).toEqual([expect.stringMatching(/^fabric:/)]);
    expect(issues(suit({ color_family: 'Wine' }))).toEqual([
      expect.stringMatching(/^color_family:/),
    ]);
    expect(issues(suit({ season: 'winter' }))).toEqual([expect.stringMatching(/^season:/)]);
    expect(issues(suit({ volume_style: '4 Piece' }))).toEqual([
      expect.stringMatching(/^volume_style:/),
    ]);
  });

  it('checks the design ID, and that the slug ends with it', () => {
    expect(issues(suit({ design_id: 'DHN-5' }))).toContainEqual(
      expect.stringMatching(/^design_id:/),
    );
    expect(issues(suit({ slug: 'charcoal-embroidered-dhanak-3-piece-dhn-06' }))).toEqual([
      expect.stringMatching(/^slug: .*dhn-05/),
    ]);
  });

  it('needs at least one photo, real alt text and whole-pixel crops', () => {
    expect(issues(suit({ photos: [] }))).toEqual([expect.stringMatching(/^photos:/)]);
    expect(issues(suit({ photos: [{ file: 'Dhanak/a.jpeg', alt: 'ab' }] }))).toEqual([
      expect.stringMatching(/^photos\.0\.alt:/),
    ]);
    const crop = { x: 0, y: 0, width: 10.5, height: 0 };
    expect(issues(suit({ photos: [{ file: 'Dhanak/a.jpeg', alt: 'A suit', crop }] }))).toEqual([
      expect.stringMatching(/^photos\.0\.crop\.width:/),
      expect.stringMatching(/^photos\.0\.crop\.height:/),
    ]);
  });

  it('only takes relative paths inside the stock folder, of the right type', () => {
    for (const file of ['../secret.jpeg', '/etc/a.jpeg', 'Dhanak/../../a.jpeg', 'C:\\a.jpeg']) {
      expect(issues(suit({ photos: [{ file, alt: 'A suit' }] }))).toEqual([
        expect.stringMatching(/^photos\.0\.file:/),
      ]);
    }
    expect(issues(suit({ photos: [{ file: 'Dhanak/a.gif', alt: 'A suit' }] }))).toEqual([
      expect.stringMatching(/^photos\.0\.file:/),
    ]);
    expect(issues(suit({ videos: [{ file: 'Dhanak/a.jpeg', alt: 'A video' }] }))).toEqual([
      expect.stringMatching(/^videos\.0\.file:/),
    ]);
  });

  it('refuses another brand anywhere, including checks, notes and the body', () => {
    for (const field of ['name', 'body']) {
      expect(issues(suit({ [field]: 'A suit like Khaadi' }))).toEqual([
        expect.stringMatching(new RegExp(`^${field}: Remove the brand name`)),
      ]);
    }
    expect(issues(suit({ check: ['Ends on a Nishat card'] }))).toEqual([
      expect.stringMatching(/^check\.0: Remove the brand name/),
    ]);
    expect(issues(suit({ notes: ['From Baroque'] }))).toEqual([
      expect.stringMatching(/^notes\.0: Remove the brand name/),
    ]);
    expect(
      issues(suit({ photos: [{ file: 'Dhanak/a.jpeg', alt: 'Wearing Maria B print' }] })),
    ).toEqual([expect.stringMatching(/^photos\.0\.alt: Remove the brand name/)]);
  });

  it('fits the pieces to the volume style', () => {
    expect(issues(suit({ volume_style: '2 Piece' }))).toEqual([
      expect.stringMatching(/^piece_details:/),
    ]);
  });

  it('refuses a link to itself', () => {
    expect(issues(suit({ also_in_this_design: ['DHN-05'] }))).toEqual([
      expect.stringMatching(/^also_in_this_design:/),
    ]);
  });
});

describe('toProductInput', () => {
  it('maps a suit file to a draft with no price and its checks in attributes', () => {
    const parsed = suitFile.parse(suit({ check: ['Confirm the crop'] }));
    expect(toProductInput(parsed, 'cat-1')).toEqual({
      name: 'Charcoal Embroidered Dhanak 3-Piece Suit',
      slug: 'charcoal-embroidered-dhanak-3-piece-dhn-05',
      designCode: 'DHN-05',
      description: 'A charcoal unstitched 3-piece Dhanak suit for winter.',
      price: null,
      compareAtPrice: null,
      categoryId: 'cat-1',
      pieces: 'three_piece',
      pieceDetails: [
        { piece: 'shirt', fabric: 'Dhanak', finish: 'Embroidered' },
        { piece: 'dupatta', fabric: 'Dhanak', finish: 'Printed' },
        { piece: 'trouser', finish: 'Plain dyed' },
      ],
      collectionType: 'Premium',
      dressCategories: ['Unstitched Suits'],
      fabric: 'Dhanak',
      design: ['Embroidered', 'Floral Print'],
      season: 'winter',
      outfitStyle: 'Traditional Suit',
      mainColor: 'Charcoal',
      colorFamily: 'Grey',
      accentColors: ['Pink', 'Orange'],
      motifs: ['pink and orange flowers'],
      relatedDesignCodes: ['DHN-10'],
      careInstructions: '',
      availability: 'in_stock',
      status: 'draft',
      featured: false,
      attributes: { checks: ['Confirm the crop'] },
    });
  });

  it('maps an empty outfit style and All-Season', () => {
    const parsed = suitFile.parse(suit({ outfit_style: null, season: 'All-Season' }));
    expect(toProductInput(parsed, 'c')).toMatchObject({ outfitStyle: null, season: 'all_season' });
  });
});

describe('collectionFile', () => {
  const collection = {
    collection: 'dhanak',
    title: 'Dhanak',
    prefix: 'DHN',
    source_file: 'Dhanak/dhanakdetails.md',
    volume_style: '3 Piece',
    collection_type: 'Premium',
    dress_categories: ['Unstitched Suits'],
    fabric: 'Dhanak',
    piece_details: [{ piece: 'shirt', fabric: 'Dhanak', finish: 'Embroidered' }],
    design: ['Embroidered', 'Printed'],
    season: 'Winter',
    outfit_style: null,
    body: '# Dhanak collection',
  };

  it('keeps the source wording ("Printed") and checks the prefix', () => {
    expect(collectionFile.safeParse(collection).success).toBe(true);
    expect(collectionFile.safeParse({ ...collection, prefix: 'DH' }).success).toBe(false);
  });

  it('refuses another brand in the notes', () => {
    expect(
      collectionFile.safeParse({ ...collection, body: 'Left out: ends on an Elaf card' }).success,
    ).toBe(false);
  });
});
