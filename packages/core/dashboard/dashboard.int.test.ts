import { inquiry, product } from '@mustafa/db/schema';
import { createTestDb, resetTestDb, type TestDb } from '@mustafa/db/testing';
import { eq } from 'drizzle-orm';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { makeCategory, makeProduct, makeUser } from '../test/factories';
import { counts } from './index';

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
});

afterEach(async () => {
  await resetTestDb(db);
});

const addInquiry = (status: 'new' | 'contacted' | 'closed') =>
  db.insert(inquiry).values({ name: 'Ayesha', phone: '+923001234567', message: 'Hi', status });

describe('dashboard counts', () => {
  it('is all zeros on an empty shop', async () => {
    expect(await counts(db)).toEqual({
      published: 0,
      drafts: 0,
      needsPrice: 0,
      archived: 0,
      newInquiries: 0,
      customers: 0,
      collections: 0,
      hiddenCollections: 0,
    });
  });

  it('counts suits by status, drafts with no price, and leaves out deleted suits', async () => {
    await makeProduct(db, { published: true });
    await makeProduct(db, { published: true });
    await makeProduct(db, { price: null });
    await makeProduct(db, { price: 4500 });
    await makeProduct(db, { status: 'archived', price: null });
    const gone = await makeProduct(db, { price: null });
    await db.update(product).set({ deletedAt: new Date() }).where(eq(product.id, gone.id));

    expect(await counts(db)).toMatchObject({
      published: 2,
      drafts: 2,
      // Only unpriced suits that aren't archived: the ones the owner must price to publish.
      needsPrice: 1,
      archived: 1,
    });
  });

  it('counts new inquiries only, customers only, and visible and hidden collections', async () => {
    await addInquiry('new');
    await addInquiry('new');
    await addInquiry('contacted');
    await addInquiry('closed');
    await makeUser(db);
    await makeUser(db);
    await makeUser(db, { role: 'admin' });
    await makeCategory(db);
    await makeCategory(db, { isActive: false });

    expect(await counts(db)).toMatchObject({
      newInquiries: 2,
      customers: 2,
      collections: 1,
      hiddenCollections: 1,
    });
  });
});
