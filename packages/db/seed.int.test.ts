import { findBannedTerm } from '@mustafa/validators/banned-terms';
import { productRuleErrors } from '@mustafa/validators/product';
import { settingValue } from '@mustafa/validators/settings';
import { eq } from 'drizzle-orm';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { category, product, productMedia, siteSetting, slugRedirect } from './schema';
import { seed } from './seed';
import { createTestDb, resetTestDb, type TestDb } from './testing';

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
});

afterEach(async () => {
  await resetTestDb(db);
});

const snapshot = async () => ({
  categories: await db.select().from(category),
  settings: await db.select().from(siteSetting),
  products: await db.select().from(product),
  media: await db.select().from(productMedia),
  redirects: await db.select().from(slugRedirect),
});

describe('seed', () => {
  it('creates the three collections in order', async () => {
    await seed(db, { appEnv: 'development' });
    const rows = await db.select().from(category).orderBy(category.sortOrder);
    expect(rows.map((c) => [c.name, c.slug, c.isActive])).toEqual([
      ['Dhanak', 'dhanak', true],
      ['Khaddar', 'khaddar', true],
      ['Lajwanti', 'lajwanti', true],
    ]);
  });

  it('sets the shop details from docs/database.md §6, each valid for its key', async () => {
    await seed(db, { appEnv: 'development' });
    const rows = Object.fromEntries(
      (await db.select().from(siteSetting)).map((s) => [s.key, s.value]),
    );
    expect(rows).toEqual({
      shop_name: 'Mustafa Apparels',
      whatsapp: '+923482799707',
      phone: '+923069558717',
      service_area: 'Pakistan',
      email: 'ammarofficial321@gmail.com',
    });
    for (const [key, value] of Object.entries(rows)) {
      expect(settingValue[key as keyof typeof settingValue].parse(value)).toEqual(value);
    }
  });

  it('changes nothing when run twice', async () => {
    await seed(db, { appEnv: 'test', e2e: true });
    const first = await snapshot();
    const summary = await seed(db, { appEnv: 'test', e2e: true });
    expect(await snapshot()).toEqual(first);
    expect(summary).toEqual({ categories: 0, settings: 0, admins: 0, demoSuits: 0 });
  });

  it('keeps the owner’s changes: edited settings, renamed or removed collections', async () => {
    await seed(db, { appEnv: 'development' });
    await db
      .update(siteSetting)
      .set({ value: '+923001234567' })
      .where(eq(siteSetting.key, 'phone'));
    await db.update(category).set({ slug: 'dhanak-suits' }).where(eq(category.slug, 'dhanak'));
    await db.delete(category).where(eq(category.slug, 'lajwanti'));
    await seed(db, { appEnv: 'development' });
    const [phone] = await db.select().from(siteSetting).where(eq(siteSetting.key, 'phone'));
    expect(phone!.value).toBe('+923001234567');
    expect((await db.select().from(category)).map((c) => c.slug).sort()).toEqual([
      'dhanak-suits',
      'khaddar',
    ]);
  });

  it('adds a setting that is still missing', async () => {
    await seed(db, { appEnv: 'development' });
    await db.delete(siteSetting).where(eq(siteSetting.key, 'email'));
    expect(await seed(db, { appEnv: 'development' })).toMatchObject({ settings: 1 });
  });

  it('adds no demo suits without --e2e', async () => {
    await seed(db, { appEnv: 'development' });
    expect(await db.select().from(product)).toEqual([]);
  });
});

describe('seed --e2e', () => {
  it('adds 12 demo suits: 10 published, 1 draft, 1 archived', async () => {
    expect(await seed(db, { appEnv: 'test', e2e: true })).toEqual({
      categories: 3,
      settings: 5,
      admins: 0,
      demoSuits: 12,
    });
    const rows = await db.select().from(product);
    const byStatus = (status: string) => rows.filter((p) => p.status === status).length;
    expect([rows.length, byStatus('published'), byStatus('draft'), byStatus('archived')]).toEqual([
      12, 10, 1, 1,
    ]);
    expect(rows.every((p) => p.designCode?.startsWith('E2E-'))).toBe(true);
  });

  it('spreads the demo suits over every collection, both piece counts and every price band', async () => {
    await seed(db, { appEnv: 'test', e2e: true });
    const rows = await db
      .select({ slug: category.slug, pieces: product.pieces, price: product.price })
      .from(product)
      .innerJoin(category, eq(product.categoryId, category.id));
    expect(new Set(rows.map((r) => r.slug))).toEqual(new Set(['dhanak', 'khaddar', 'lajwanti']));
    expect(new Set(rows.map((r) => r.pieces))).toEqual(new Set(['two_piece', 'three_piece']));
    const prices = rows.map((r) => r.price).filter((p): p is number => p !== null);
    expect(prices.some((p) => p < 4000)).toBe(true);
    expect(prices.some((p) => p >= 4000 && p < 6000)).toBe(true);
    expect(prices.some((p) => p >= 6000 && p < 8000)).toBe(true);
    expect(prices.some((p) => p >= 8000 && p < 10000)).toBe(true);
    expect(prices.some((p) => p >= 10000)).toBe(true);
  });

  it('makes every published demo suit meet the publish rules', async () => {
    await seed(db, { appEnv: 'test', e2e: true });
    const published = await db.select().from(product).where(eq(product.status, 'published'));
    for (const suit of published) {
      expect(productRuleErrors(suit)).toEqual({});
      expect(findBannedTerm(`${suit.name} ${suit.slug} ${suit.description}`)).toBeNull();
      const media = await db.select().from(productMedia).where(eq(productMedia.productId, suit.id));
      expect(media.filter((m) => m.isPrimary && m.kind === 'image')).toHaveLength(1);
      expect(media.every((m) => m.alt.length >= 3 && m.publicId.startsWith('products/e2e/'))).toBe(
        true,
      );
    }
  });

  it('includes a suit with a video and an old slug that redirects', async () => {
    await seed(db, { appEnv: 'test', e2e: true });
    expect(await db.select().from(productMedia).where(eq(productMedia.kind, 'video'))).toHaveLength(
      1,
    );
    const [redirect] = await db.select().from(slugRedirect);
    const [target] = await db.select().from(product).where(eq(product.id, redirect!.targetId));
    expect(redirect).toMatchObject({ entity: 'product' });
    expect(target!.slug).not.toBe(redirect!.oldSlug);
  });

  it.each(['preview', 'production'])('refuses to add demo suits on %s', async (appEnv) => {
    await expect(seed(db, { appEnv, e2e: true })).rejects.toThrow(
      `--e2e adds demo suits and never runs on ${appEnv}`,
    );
    expect(await db.select().from(category)).toEqual([]);
  });
});
