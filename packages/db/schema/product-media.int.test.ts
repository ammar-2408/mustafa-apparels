import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from '../testing';
import { category } from './category';
import { product } from './product';
import { productMedia } from './product-media';

let db: TestDb;
let categoryId: string;
let n = 0;

beforeAll(async () => {
  db = await createTestDb();
  const [row] = await db.insert(category).values({ name: 'Dhanak', slug: 'dhanak' }).returning();
  categoryId = row!.id;
});

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

const media = (productId: string, overrides: Partial<typeof productMedia.$inferInsert> = {}) => {
  n += 1;
  return {
    productId,
    kind: 'image' as const,
    url: `https://res.cloudinary.com/demo/image/upload/products/m${n}.jpg`,
    publicId: `products/m${n}`,
    alt: 'Model wearing a black 3-piece Dhanak suit',
    width: 1200,
    height: 2000,
    bytes: 250_000,
    format: 'jpg',
    ...overrides,
  };
};

describe('product_media table', () => {
  it('saves a photo with the defaults', async () => {
    const [row] = await db
      .insert(productMedia)
      .values(media(await makeSuit()))
      .returning();
    expect(row).toMatchObject({
      sortOrder: 0,
      isPrimary: false,
      durationSeconds: null,
      posterPublicId: null,
    });
  });

  it('allows one main photo per suit', async () => {
    const suit = await makeSuit();
    await db.insert(productMedia).values(media(suit, { isPrimary: true }));
    await expect(
      db.insert(productMedia).values(media(suit, { isPrimary: true })),
    ).rejects.toThrow();
    await db.insert(productMedia).values(media(await makeSuit(), { isPrimary: true }));
  });

  it('refuses a video as the main item', async () => {
    await expect(
      db
        .insert(productMedia)
        .values(media(await makeSuit(), { kind: 'video', durationSeconds: '12', isPrimary: true })),
    ).rejects.toThrow();
  });

  it('requires a video length of at most 60 seconds', async () => {
    const suit = await makeSuit();
    await expect(db.insert(productMedia).values(media(suit, { kind: 'video' }))).rejects.toThrow();
    await expect(
      db.insert(productMedia).values(media(suit, { kind: 'video', durationSeconds: '60.5' })),
    ).rejects.toThrow();
    const [row] = await db
      .insert(productMedia)
      .values(media(suit, { kind: 'video', durationSeconds: '60' }))
      .returning();
    expect(Number(row!.durationSeconds)).toBe(60);
  });

  it('rejects the same Cloudinary asset twice', async () => {
    const suit = await makeSuit();
    await db.insert(productMedia).values(media(suit, { publicId: 'products/same' }));
    await expect(
      db.insert(productMedia).values(media(suit, { publicId: 'products/same' })),
    ).rejects.toThrow();
  });

  it('deletes a suit’s media with the suit', async () => {
    const suit = await makeSuit();
    await db.insert(productMedia).values([media(suit), media(suit)]);
    await db.delete(product).where(eq(product.id, suit));
    expect(await db.select().from(productMedia).where(eq(productMedia.productId, suit))).toEqual(
      [],
    );
  });
});
