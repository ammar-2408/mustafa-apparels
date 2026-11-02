import { eq, sql } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from '../testing';
import { category } from './category';
import { product } from './product';

let db: TestDb;
let categoryId: string;
let n = 0;

beforeAll(async () => {
  db = await createTestDb();
  const [row] = await db.insert(category).values({ name: 'Dhanak', slug: 'dhanak' }).returning();
  categoryId = row!.id;
});

const draft = (overrides: Partial<typeof product.$inferInsert> = {}) => {
  n += 1;
  return {
    name: `Black Embroidered Dhanak 3-Piece Suit ${n}`,
    slug: `black-embroidered-dhanak-3-piece-${n}`,
    categoryId,
    pieces: 'three_piece' as const,
    fabric: 'Dhanak',
    ...overrides,
  };
};

const insert = async (overrides: Partial<typeof product.$inferInsert> = {}) => {
  const [row] = await db.insert(product).values(draft(overrides)).returning();
  return row!;
};

const vectorOf = async (id: string) => {
  const { rows } = await db.execute<{ v: string }>(
    sql`select search_vector::text as v from product where id = ${id}`,
  );
  return rows[0]!.v;
};

// A word's positions, e.g. 'khaddar':3A,6B, include one with this weight.
const weighted = (word: string, weight: 'A' | 'B' | 'C') =>
  new RegExp(`'${word}':[\\d,ABC]*\\d${weight}(,|\\s|$)`);

describe('product table', () => {
  it('saves a draft with no price and fills the defaults', async () => {
    const row = await insert();
    expect(row).toMatchObject({
      price: null,
      currency: 'PKR',
      status: 'draft',
      availability: 'in_stock',
      featured: false,
      pieceDetails: [],
      dressCategories: [],
      design: [],
      accentColors: [],
      motifs: [],
      relatedDesignCodes: [],
      attributes: {},
      publishedAt: null,
      deletedAt: null,
    });
  });

  it('stores piece details as JSON', async () => {
    const pieceDetails = [
      { piece: 'shirt' as const, fabric: 'Dhanak', finish: 'Embroidered', length_m: 3 },
      { piece: 'trouser' as const, finish: 'Plain dyed' },
    ];
    const row = await insert({ pieceDetails });
    expect(row.pieceDetails).toEqual(pieceDetails);
  });

  it('rejects a published suit with no price', async () => {
    await expect(insert({ status: 'published' })).rejects.toThrow();
  });

  it('accepts a published suit with a price, including zero', async () => {
    expect((await insert({ status: 'published', price: 0 })).status).toBe('published');
  });

  it('rejects a negative price', async () => {
    await expect(insert({ price: -1 })).rejects.toThrow();
  });

  it('rejects a compare-at price that is not higher than the price', async () => {
    await expect(insert({ price: 5000, compareAtPrice: 5000 })).rejects.toThrow();
    await expect(insert({ compareAtPrice: 6000 })).rejects.toThrow();
    expect((await insert({ price: 5000, compareAtPrice: 6000 })).compareAtPrice).toBe(6000);
  });

  it('rejects a second suit with the same slug', async () => {
    await insert({ slug: 'same-slug' });
    await expect(insert({ slug: 'same-slug' })).rejects.toThrow();
  });

  it('keeps design codes and import keys unique when set, and allows many blanks', async () => {
    await insert({ designCode: 'DHN-01', importKey: 'DHN-01' });
    await expect(insert({ designCode: 'DHN-01' })).rejects.toThrow();
    await expect(insert({ importKey: 'DHN-01' })).rejects.toThrow();
    await insert();
    await insert();
  });

  it('refuses to delete a collection that still has suits', async () => {
    const [other] = await db
      .insert(category)
      .values({ name: 'Khaddar', slug: 'khaddar' })
      .returning();
    await insert({ categoryId: other!.id });
    await expect(db.delete(category).where(eq(category.id, other!.id))).rejects.toThrow();
  });

  it('builds the search vector with the name first, then facts, then description', async () => {
    const row = await insert({
      name: 'Sage Printed Khaddar Suit',
      designCode: 'KDR-13',
      fabric: 'Khaddar',
      mainColor: 'Sage green',
      colorFamily: 'Green',
      accentColors: ['Ivory'],
      design: ['Floral Print'],
      motifs: ['paisley'],
      description: 'Soft winter shawl',
    });
    const v = await vectorOf(row.id);
    expect(v).toMatch(weighted('sage', 'A'));
    // The simple parser splits KDR-13 into 'kdr' and '-13'; exact codes match on design_code.
    for (const word of ['khaddar', 'kdr', 'green', 'ivory', 'floral']) {
      expect(v).toMatch(weighted(word, 'B'));
    }
    for (const word of ['paisley', 'winter']) {
      expect(v).toMatch(weighted(word, 'C'));
    }
  });

  it('updates the search vector when a column changes', async () => {
    const row = await insert();
    await db
      .update(product)
      .set({ motifs: ['peacock'] })
      .where(eq(product.id, row.id));
    expect(await vectorOf(row.id)).toMatch(/'peacock':\d+C/);
  });

  it('has no size column, because the suits are unstitched', () => {
    expect(Object.keys(product).some((key) => /size/i.test(key))).toBe(false);
  });
});
