import { product } from '@mustafa/db/schema';
import { createTestDb, resetTestDb, type TestDb } from '@mustafa/db/testing';
import { adminProductListInput } from '@mustafa/validators/product';
import { eq } from 'drizzle-orm';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { makeCategory, makeProduct } from '../test/factories';
import { ADMIN_PAGE_SIZE, adminList } from './admin-list';

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
});

afterEach(async () => {
  await resetTestDb(db);
});

const list = (input: Record<string, string> = {}) =>
  adminList(db, adminProductListInput.parse(input));
const names = async (input: Record<string, string> = {}) =>
  (await list(input)).items.map((item) => item.name).sort();

describe('products.adminList', () => {
  it('lists drafts and published suits, leaving out archived and deleted ones', async () => {
    await makeProduct(db, { name: 'Draft suit' });
    await makeProduct(db, { name: 'Live suit', published: true });
    await makeProduct(db, { name: 'Old suit', status: 'archived' });
    const gone = await makeProduct(db, { name: 'Gone suit' });
    await db.update(product).set({ deletedAt: new Date() }).where(eq(product.id, gone.id));
    expect(await names()).toEqual(['Draft suit', 'Live suit']);
    expect(await names({ status: 'archived' })).toEqual(['Old suit']);
    expect(await names({ status: 'published' })).toEqual(['Live suit']);
  });

  it('filters by collection and by "needs price"', async () => {
    const dhanak = await makeCategory(db, { name: 'Dhanak' });
    await makeProduct(db, { name: 'Dhanak no price', categoryId: dhanak.id, price: null });
    await makeProduct(db, { name: 'Dhanak priced', categoryId: dhanak.id, price: 4500 });
    await makeProduct(db, { name: 'Other no price', price: null });
    expect(await names({ collection: dhanak.id })).toEqual(['Dhanak no price', 'Dhanak priced']);
    expect(await names({ needsPrice: '1' })).toEqual(['Dhanak no price', 'Other no price']);
    expect(await names({ collection: dhanak.id, needsPrice: '1' })).toEqual(['Dhanak no price']);
  });

  it('finds a suit by name, part of a word, or its design code with or without the hyphen', async () => {
    await makeProduct(db, {
      name: 'Sage Green Printed Khaddar 3-Piece Suit',
      designCode: 'KDR-13',
    });
    await makeProduct(db, { name: 'Black Embroidered Dhanak 3-Piece Suit', designCode: 'DHN-01' });
    expect(await names({ q: 'sage green' })).toEqual(['Sage Green Printed Khaddar 3-Piece Suit']);
    expect(await names({ q: 'khad' })).toEqual(['Sage Green Printed Khaddar 3-Piece Suit']);
    expect(await names({ q: 'kdr13' })).toEqual(['Sage Green Printed Khaddar 3-Piece Suit']);
    expect(await names({ q: 'DHN-01' })).toEqual(['Black Embroidered Dhanak 3-Piece Suit']);
    expect(await names({ q: 'zzzz' })).toEqual([]);
  });

  it('shows each suit’s collection, main photo and open checks', async () => {
    const collection = await makeCategory(db, { name: 'Lajwanti' });
    const suit = await makeProduct(db, {
      categoryId: collection.id,
      published: true,
      attributes: { checks: ['Confirm the trouser fabric', 'Corner flowers: brand mark?'] },
    });
    const [item] = (await list()).items;
    expect(item).toMatchObject({ id: suit.id, collection: 'Lajwanti', openChecks: 2, price: 4500 });
    expect(item!.mainImage).toMatch(/^products\//);
  });

  it('counts a suit with checks that are not a list as having none', async () => {
    await makeProduct(db, { attributes: { checks: 'oops' } });
    expect((await list()).items[0]!.openChecks).toBe(0);
  });

  it('pages 24 at a time, newest change first', async () => {
    for (let i = 0; i < ADMIN_PAGE_SIZE + 2; i++) await makeProduct(db);
    const first = await list();
    const second = await list({ page: '2' });
    expect(first).toMatchObject({ total: ADMIN_PAGE_SIZE + 2, pageCount: 2 });
    expect(first.items).toHaveLength(ADMIN_PAGE_SIZE);
    expect(second.items).toHaveLength(2);
    expect(new Set([...first.items, ...second.items].map((i) => i.id)).size).toBe(
      ADMIN_PAGE_SIZE + 2,
    );
  });
});
