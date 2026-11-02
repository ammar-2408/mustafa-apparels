import { createTestDb, type TestDb } from '@mustafa/db/testing';
import { searchInput, suggestInput } from '@mustafa/validators/search';
import { beforeAll, describe, expect, it } from 'vitest';

import { makeCategory, makeProduct } from '../test/factories';
import * as search from './index';

let db: TestDb;

// Shaped like the real catalog/: Lajwanti suits are Dhanak fabric.
beforeAll(async () => {
  db = await createTestDb();
  const dhanak = await makeCategory(db, { name: 'Dhanak', slug: 'dhanak' });
  const khaddar = await makeCategory(db, { name: 'Khaddar', slug: 'khaddar' });
  const lajwanti = await makeCategory(db, { name: 'Lajwanti', slug: 'lajwanti' });
  const suit = (designCode: string, categoryId: string, fields: Record<string, unknown>) =>
    makeProduct(db, {
      published: true,
      designCode,
      slug: designCode.toLowerCase(),
      categoryId,
      publishedAt: new Date('2026-11-01'),
      ...fields,
    });
  await suit('DHN-01', dhanak.id, {
    name: 'Black Embroidered Dhanak 3-Piece Suit',
    fabric: 'Dhanak',
    design: ['Embroidered', 'Geometric Print'],
    mainColor: 'Black',
    colorFamily: 'Black',
    accentColors: ['Beige'],
    motifs: ['diamond neckline panel'],
  });
  await suit('DHN-10', dhanak.id, {
    name: 'Mustard Embroidered Dhanak 3-Piece Suit',
    fabric: 'Dhanak',
    design: ['Embroidered'],
    mainColor: 'Mustard',
    colorFamily: 'Yellow',
  });
  await suit('KDR-13', khaddar.id, {
    name: 'Sage Green Printed Khaddar 3-Piece Suit',
    fabric: 'Khaddar',
    design: ['Floral Print'],
    mainColor: 'Sage green',
    colorFamily: 'Green',
    motifs: ['paisley'],
  });
  await suit('KDR-07', khaddar.id, {
    name: 'Maroon Embroidered Khaddar 3-Piece Suit',
    fabric: 'Khaddar',
    design: ['Embroidered'],
    mainColor: 'Maroon',
    colorFamily: 'Maroon',
    publishedAt: new Date('2026-11-02'),
  });
  await suit('LAJ-02', lajwanti.id, {
    name: 'Purple Printed Dhanak 2-Piece Suit',
    pieces: 'two_piece',
    fabric: 'Dhanak',
    design: ['All-Over Print', 'Floral Print'],
    mainColor: 'Purple',
    colorFamily: 'Purple',
    motifs: ['small white flowers'],
  });
  await makeProduct(db, {
    designCode: 'DHN-02',
    name: 'Black Printed Dhanak 3-Piece Suit',
    categoryId: dhanak.id,
  });
});

const codes = async (q: string, extra: Record<string, unknown> = {}) =>
  (await search.search(db, searchInput.parse({ q, ...extra }))).items.map((i) => i.designCode);

describe('search', () => {
  it('finds a suit by its exact name', async () => {
    expect(await codes('Sage Green Printed Khaddar 3-Piece Suit')).toEqual(['KDR-13']);
  });

  it('finds a partial word', async () => {
    expect((await codes('khad')).sort()).toEqual(['KDR-07', 'KDR-13']);
  });

  it.each([
    ['khadar', ['KDR-07', 'KDR-13']],
    ['dhanuk', ['DHN-01', 'DHN-10', 'LAJ-02']],
    ['maroom', ['KDR-07']],
  ])('tolerates the typo "%s"', async (q, expected) => {
    expect((await codes(q)).sort()).toEqual(expected);
  });

  it.each([['DHN-01'], ['dhn-01'], ['dhn01']])('puts the design code %s first', async (q) => {
    expect((await codes(q))[0]).toBe('DHN-01');
  });

  it('finds kdr-13 by code, ahead of anything else', async () => {
    expect((await codes('kdr-13'))[0]).toBe('KDR-13');
  });

  it.each([
    ['a colour', 'maroon', ['KDR-07']],
    ['a main colour name', 'sage', ['KDR-13']],
    ['an accent colour', 'beige', ['DHN-01']],
    ['a fabric', 'khaddar', ['KDR-07', 'KDR-13']],
    ['a design', 'floral', ['KDR-13', 'LAJ-02']],
    ['a motif', 'paisley', ['KDR-13']],
    ['a collection name', 'lajwanti', ['LAJ-02']],
    ['a collection name with a typo', 'lajwanty', ['LAJ-02']],
  ])('finds %s', async (_, q, expected) => {
    expect((await codes(q)).sort()).toEqual(expected);
  });

  it('finds Lajwanti suits for "dhanak", because their fabric is Dhanak', async () => {
    expect((await codes('dhanak')).sort()).toEqual(['DHN-01', 'DHN-10', 'LAJ-02']);
  });

  it('ranks a name match above a description-only match', async () => {
    expect((await codes('embroidered black'))[0]).toBe('DHN-01');
  });

  it('never returns drafts', async () => {
    expect(await codes('DHN-02')).toEqual([]);
    expect(await codes('black')).toEqual(['DHN-01']);
  });

  it('applies filters on top of the query', async () => {
    expect(await codes('dhanak', { filters: { pieces: ['two_piece'] } })).toEqual(['LAJ-02']);
    expect(await codes('embroidered', { filters: { fabric: ['Khaddar'] } })).toEqual(['KDR-07']);
  });

  it.each([["' OR 1=1 --"], ['🌹🌹'], ['<b>bold</b>'], ['%_%'], ['dhanak & | ! :*']])(
    'treats %s as plain text',
    async (q) => {
      const result = await search.search(db, searchInput.parse({ q }));
      expect(result.items.every((item) => item.status === 'published')).toBe(true);
    },
  );

  it('returns cards with a page count', async () => {
    const result = await search.search(db, searchInput.parse({ q: 'suit' }));
    expect(result).toMatchObject({ total: 5, page: 1, pageCount: 1 });
    expect(result.items[0]).toMatchObject({
      image: { url: expect.any(String) },
      category: { slug: expect.any(String) },
    });
  });

  it('pages past the end to nothing', async () => {
    expect((await search.search(db, searchInput.parse({ q: 'suit', page: 2 }))).items).toEqual([]);
  });
});

describe('suggest', () => {
  it('suggests collections first, then suits, six at most', async () => {
    const result = await search.suggest(db, suggestInput.parse({ q: 'dhanak' }));
    expect(result.collections.map((c) => c.slug)).toEqual(['dhanak']);
    expect(result.products.map((p) => p.designCode).sort()).toEqual(['DHN-01', 'DHN-10', 'LAJ-02']);
    expect(result.collections.length + result.products.length).toBeLessThanOrEqual(6);
  });

  it('caps the total at six', async () => {
    const result = await search.suggest(db, suggestInput.parse({ q: 'suit' }));
    expect(result.collections.length + result.products.length).toBe(5);
    const many = await search.suggest(db, suggestInput.parse({ q: 'piece' }));
    expect(many.collections.length + many.products.length).toBeLessThanOrEqual(6);
  });

  it('returns only names, slugs and codes', async () => {
    const [first] = (await search.suggest(db, suggestInput.parse({ q: 'maroon' }))).products;
    expect(Object.keys(first!).sort()).toEqual(['designCode', 'name', 'slug']);
  });
});
