import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from '../testing';
import { category } from './category';
import { inquiry } from './inquiry';
import { product } from './product';
import { user } from './user';
import { wishlistItem } from './wishlist-item';

let db: TestDb;
let categoryId: string;
let n = 0;

beforeAll(async () => {
  db = await createTestDb();
  const [row] = await db.insert(category).values({ name: 'Dhanak', slug: 'dhanak' }).returning();
  categoryId = row!.id;
});

const makeUser = async () => {
  n += 1;
  const [row] = await db
    .insert(user)
    .values({ name: `Person ${n}`, email: `person${n}@example.com` })
    .returning();
  return row!.id;
};

const makeSuit = async () => {
  n += 1;
  const [row] = await db
    .insert(product)
    .values({
      name: `Suit ${n}`,
      slug: `suit-${n}`,
      categoryId,
      pieces: 'two_piece',
      fabric: 'Dhanak',
    })
    .returning();
  return row!.id;
};

const ask = async (overrides: Partial<typeof inquiry.$inferInsert> = {}) => {
  const [row] = await db
    .insert(inquiry)
    .values({ name: 'Ayesha', phone: '+923001234567', message: 'Is this in stock?', ...overrides })
    .returning();
  return row!;
};

describe('inquiry table', () => {
  it('saves a guest question about no suit as new', async () => {
    expect(await ask()).toMatchObject({
      status: 'new',
      productId: null,
      userId: null,
      email: null,
      ipHash: null,
    });
  });

  it('accepts a 2,000-character message and rejects 2,001', async () => {
    expect((await ask({ message: 'a'.repeat(2000) })).message).toHaveLength(2000);
    await expect(ask({ message: 'a'.repeat(2001) })).rejects.toThrow();
  });

  it('keeps the inquiry, without the link, when the customer deletes their account', async () => {
    const customer = await makeUser();
    const row = await ask({ userId: customer });
    await db.delete(user).where(eq(user.id, customer));
    const [after] = await db.select().from(inquiry).where(eq(inquiry.id, row.id));
    expect(after).toMatchObject({ userId: null, message: 'Is this in stock?' });
  });

  it('keeps the inquiry, without the link, when the suit is deleted', async () => {
    const suit = await makeSuit();
    const row = await ask({ productId: suit });
    await db.delete(product).where(eq(product.id, suit));
    const [after] = await db.select().from(inquiry).where(eq(inquiry.id, row.id));
    expect(after!.productId).toBeNull();
  });
});

describe('wishlist_item table', () => {
  it('saves a suit once per customer', async () => {
    const customer = await makeUser();
    const suit = await makeSuit();
    await db.insert(wishlistItem).values({ userId: customer, productId: suit });
    await expect(
      db.insert(wishlistItem).values({ userId: customer, productId: suit }),
    ).rejects.toThrow();
  });

  it('removes the saved suits when the customer deletes their account', async () => {
    const customer = await makeUser();
    await db.insert(wishlistItem).values([
      { userId: customer, productId: await makeSuit() },
      { userId: customer, productId: await makeSuit() },
    ]);
    await db.delete(user).where(eq(user.id, customer));
    expect(await db.select().from(wishlistItem).where(eq(wishlistItem.userId, customer))).toEqual(
      [],
    );
  });

  it('removes a saved suit when the suit is deleted', async () => {
    const customer = await makeUser();
    const suit = await makeSuit();
    await db.insert(wishlistItem).values({ userId: customer, productId: suit });
    await db.delete(product).where(eq(product.id, suit));
    expect(await db.select().from(wishlistItem).where(eq(wishlistItem.productId, suit))).toEqual(
      [],
    );
  });
});
