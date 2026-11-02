import { productMedia } from '@mustafa/db/schema';
import { createTestDb, resetTestDb, type TestDb } from '@mustafa/db/testing';
import { eq } from 'drizzle-orm';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { makeCategory, makeMedia, makeProduct, makeUser } from './factories';

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
});

afterEach(async () => {
  await resetTestDb(db);
});

describe('factories', () => {
  it('makeCategory makes a visible collection with a unique slug', async () => {
    const [a, b] = [await makeCategory(db), await makeCategory(db)];
    expect(a.isActive).toBe(true);
    expect(a.slug).not.toBe(b.slug);
  });

  it('makeCategory takes overrides', async () => {
    expect(await makeCategory(db, { name: 'Lajwanti', slug: 'lajwanti' })).toMatchObject({
      name: 'Lajwanti',
      slug: 'lajwanti',
    });
  });

  it('makeUser makes a customer by default and an admin on request', async () => {
    expect((await makeUser(db)).role).toBe('customer');
    expect((await makeUser(db, { role: 'admin' })).role).toBe('admin');
  });

  it('makeProduct makes a draft with no price and its own collection', async () => {
    const suit = await makeProduct(db);
    expect(suit).toMatchObject({ status: 'draft', price: null, publishedAt: null });
    expect(suit.categoryId).toBeTruthy();
  });

  it('makeProduct({ published: true }) makes a suit that meets every publish rule', async () => {
    const suit = await makeProduct(db, { published: true });
    expect(suit).toMatchObject({ status: 'published' });
    expect(suit.price).toBeGreaterThan(0);
    expect(suit.mainColor && suit.colorFamily).toBeTruthy();
    expect(suit.publishedAt).toBeInstanceOf(Date);
    const media = await db.select().from(productMedia).where(eq(productMedia.productId, suit.id));
    expect(media).toEqual([expect.objectContaining({ kind: 'image', isPrimary: true })]);
    expect(media[0]!.alt.length).toBeGreaterThan(2);
  });

  it('makeProduct reuses a given collection and never repeats slugs or design codes', async () => {
    const dhanak = await makeCategory(db);
    const [a, b] = [
      await makeProduct(db, { categoryId: dhanak.id }),
      await makeProduct(db, { categoryId: dhanak.id }),
    ];
    expect([a.categoryId, b.categoryId]).toEqual([dhanak.id, dhanak.id]);
    expect(a.slug).not.toBe(b.slug);
    expect(a.designCode).not.toBe(b.designCode);
  });

  it('makeMedia makes a photo, or a video with a length', async () => {
    const suit = await makeProduct(db);
    expect(await makeMedia(db, { productId: suit.id })).toMatchObject({ kind: 'image' });
    const video = await makeMedia(db, { productId: suit.id, kind: 'video' });
    expect(video.kind).toBe('video');
    expect(Number(video.durationSeconds)).toBeLessThanOrEqual(60);
  });
});
