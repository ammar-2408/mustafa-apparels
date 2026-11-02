import { auditLog, product, productMedia } from '@mustafa/db/schema';
import { createTestDb, resetTestDb, type TestDb } from '@mustafa/db/testing';
import { productInput, productListInput } from '@mustafa/validators/product';
import { asc, eq } from 'drizzle-orm';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { CoreError } from '../errors';
import { makeCategory, makeMedia, makeProduct, makeUser } from '../test/factories';
import * as products from './index';

let db: TestDb;
let actor: { actorId: string };

beforeAll(async () => {
  db = await createTestDb();
});

beforeEach(async () => {
  actor = { actorId: (await makeUser(db, { role: 'admin' })).id };
});

afterEach(async () => {
  await resetTestDb(db);
});

const error = async (promise: Promise<unknown>) => {
  const e = await promise.catch((caught: unknown) => caught);
  expect(e).toBeInstanceOf(CoreError);
  return e as CoreError;
};

const list = (input: Record<string, unknown> = {}, scope?: 'admin') =>
  products.list(db, productListInput.parse(input), scope ? { scope } : {});

const slugsOf = (result: { items: { slug: string }[] }) => result.items.map((item) => item.slug);

const formInput = (categoryId: string, overrides: Record<string, unknown> = {}) =>
  productInput.parse({
    name: 'Maroon Printed Khaddar 3-Piece Suit',
    slug: 'maroon-printed-khaddar-3-piece-kdr-01',
    designCode: 'KDR-01',
    description: 'A maroon unstitched suit for winter.',
    price: null,
    compareAtPrice: null,
    categoryId,
    pieces: 'three_piece',
    pieceDetails: [{ piece: 'shirt', fabric: 'Khaddar', finish: 'Printed' }],
    collectionType: 'Premium',
    dressCategories: ['Unstitched Suits'],
    fabric: 'Khaddar',
    design: ['Floral Print'],
    season: 'winter',
    outfitStyle: null,
    mainColor: 'Maroon',
    colorFamily: 'Maroon',
    accentColors: [],
    motifs: ['paisley'],
    relatedDesignCodes: [],
    careInstructions: '',
    availability: 'in_stock',
    status: 'draft',
    featured: false,
    ...overrides,
  });

const media = (n: number, overrides = {}) => ({
  kind: 'image' as const,
  publicId: `products/kdr-01/${n}`,
  url: `https://res.cloudinary.com/x/image/upload/products/kdr-01/${n}.jpg`,
  alt: 'Model wearing a maroon Khaddar suit',
  posterPublicId: null,
  sortOrder: n,
  isPrimary: n === 0,
  width: 1200,
  height: 2000,
  bytes: 300_000,
  format: 'jpg',
  durationSeconds: null,
  ...overrides,
});

describe('products.list (public)', () => {
  it('shows only published suits that are not deleted, in visible collections', async () => {
    const visible = await makeProduct(db, { published: true });
    await makeProduct(db);
    await makeProduct(db, { published: true, status: 'archived' });
    await makeProduct(db, { published: true, deletedAt: new Date() });
    const hidden = await makeCategory(db, { isActive: false });
    await makeProduct(db, { published: true, categoryId: hidden.id });
    expect(slugsOf(await list())).toEqual([visible.slug]);
  });

  it('returns card data with the collection and main photo', async () => {
    const suit = await makeProduct(db, { published: true });
    const [item] = (await list()).items;
    expect(item).toMatchObject({
      id: suit.id,
      name: suit.name,
      price: 4500,
      category: { slug: expect.any(String), name: expect.any(String) },
      image: { url: expect.stringContaining('res.cloudinary.com'), alt: expect.any(String) },
    });
  });

  it('limits to one collection by slug', async () => {
    const dhanak = await makeCategory(db, { slug: 'dhanak' });
    const inDhanak = await makeProduct(db, { published: true, categoryId: dhanak.id });
    await makeProduct(db, { published: true });
    expect(slugsOf(await list({ categorySlug: 'dhanak' }))).toEqual([inDhanak.slug]);
  });

  it('reports an unknown or hidden collection as not found', async () => {
    await makeCategory(db, { slug: 'hidden', isActive: false });
    expect((await error(list({ categorySlug: 'missing' }))).code).toBe('NOT_FOUND');
    expect((await error(list({ categorySlug: 'hidden' }))).code).toBe('NOT_FOUND');
  });

  describe('filters', () => {
    let a: { slug: string };
    let b: { slug: string };
    let c: { slug: string };

    beforeEach(async () => {
      a = await makeProduct(db, {
        published: true,
        pieces: 'two_piece',
        fabric: 'Dhanak',
        design: ['All-Over Print', 'Floral Print'],
        season: 'winter',
        colorFamily: 'Blue',
        price: 3999,
      });
      b = await makeProduct(db, {
        published: true,
        fabric: 'Khaddar',
        design: ['Embroidered'],
        dressCategories: ['Unstitched Suits', 'Formal Wear'],
        outfitStyle: 'Traditional Suit',
        colorFamily: 'Maroon',
        price: 4000,
      });
      c = await makeProduct(db, {
        published: true,
        fabric: 'Dhanak',
        design: ['Embroidered'],
        season: 'all_season',
        colorFamily: 'Black',
        price: 6000,
      });
    });

    const only = async (filters: Record<string, unknown>) =>
      slugsOf(await list({ filters })).sort();

    it.each([
      ['pieces', { pieces: ['two_piece'] }, () => [a]],
      ['fabric', { fabric: ['Dhanak'] }, () => [a, c]],
      ['several fabrics', { fabric: ['Dhanak', 'Khaddar'] }, () => [a, b, c]],
      ['design, matching any listed', { design: ['Floral Print'] }, () => [a]],
      ['dress category', { dressCategories: ['Formal Wear'] }, () => [b]],
      ['season', { season: ['all_season'] }, () => [c]],
      ['outfit style', { outfitStyle: ['Traditional Suit'] }, () => [b]],
      ['colour', { colorFamily: ['Maroon', 'Black'] }, () => [b, c]],
      ['price from 4,000', { priceMin: 4000 }, () => [b, c]],
      ['price up to 3,999', { priceMax: 3999 }, () => [a]],
      ['the 4,000–6,000 band', { priceMin: 4000, priceMax: 5999 }, () => [b]],
      ['two filters together', { fabric: ['Dhanak'], design: ['Embroidered'] }, () => [c]],
    ])('by %s', async (_, filters, expected) => {
      expect(await only(filters)).toEqual(
        expected()
          .map((s) => s.slug)
          .sort(),
      );
    });

    it('lists the values published suits have, so empty options stay hidden', async () => {
      await makeProduct(db, { fabric: 'Silk', colorFamily: 'Pink', price: 20000 });
      const { facets } = await list();
      expect(facets.fabric).toEqual(['Dhanak', 'Khaddar']);
      expect(facets.colorFamily.sort()).toEqual(['Black', 'Blue', 'Maroon']);
      expect(facets.pieces.sort()).toEqual(['three_piece', 'two_piece']);
      expect(facets.season.sort()).toEqual(['all_season', 'winter']);
      expect(facets.outfitStyle).toEqual(['Traditional Suit']);
      expect(facets.design.sort()).toEqual(['All-Over Print', 'Embroidered', 'Floral Print']);
      expect(facets.dressCategories.sort()).toEqual(['Formal Wear', 'Unstitched Suits']);
      expect(facets.priceBands).toEqual(['under-4000', '4000-6000', '6000-8000']);
    });
  });

  it('sorts newest first, and by price both ways', async () => {
    const old = await makeProduct(db, {
      published: true,
      price: 5000,
      publishedAt: new Date('2026-01-01'),
    });
    const mid = await makeProduct(db, {
      published: true,
      price: 3000,
      publishedAt: new Date('2026-02-01'),
    });
    const recent = await makeProduct(db, {
      published: true,
      price: 9000,
      publishedAt: new Date('2026-03-01'),
    });
    expect(slugsOf(await list())).toEqual([recent.slug, mid.slug, old.slug]);
    expect(slugsOf(await list({ sort: 'price_asc' }))).toEqual([mid.slug, old.slug, recent.slug]);
    expect(slugsOf(await list({ sort: 'price_desc' }))).toEqual([recent.slug, old.slug, mid.slug]);
  });

  it('pages 24 at a time', async () => {
    for (let i = 0; i < 25; i += 1) {
      await makeProduct(db, { published: true, publishedAt: new Date(2026, 0, 1, 0, i) });
    }
    const first = await list();
    const second = await list({ page: 2 });
    expect([first.items.length, first.total, first.pageCount]).toEqual([24, 25, 2]);
    expect(second.items).toHaveLength(1);
    expect(first.items.map((i) => i.id)).not.toContain(second.items[0]!.id);
    expect((await list({ page: 3 })).items).toEqual([]);
  });

  it('has one page even when empty', async () => {
    expect(await list()).toMatchObject({ items: [], total: 0, pageCount: 1 });
  });
});

describe('products.list (admin)', () => {
  it('shows drafts and archived suits too, but never deleted ones', async () => {
    await makeProduct(db);
    await makeProduct(db, { published: true, status: 'archived' });
    await makeProduct(db, { deletedAt: new Date() });
    expect((await list({}, 'admin')).total).toBe(2);
  });
});

describe('products.getBySlug', () => {
  it('returns a published suit with its collection and media in order', async () => {
    const suit = await makeProduct(db, { published: true });
    await makeMedia(db, { productId: suit.id, kind: 'video', sortOrder: 2 });
    await makeMedia(db, { productId: suit.id, sortOrder: 1 });
    const found = await products.getBySlug(db, suit.slug);
    expect(found?.category.slug).toBeTruthy();
    expect(found?.media.map((m) => [m.kind, m.sortOrder, m.isPrimary])).toEqual([
      ['image', 0, true],
      ['image', 1, false],
      ['video', 2, false],
    ]);
  });

  it('hides drafts, archived, deleted and unknown suits', async () => {
    const draft = await makeProduct(db);
    const archived = await makeProduct(db, { published: true, status: 'archived' });
    const deleted = await makeProduct(db, { published: true, deletedAt: new Date() });
    for (const slug of [draft.slug, archived.slug, deleted.slug, 'missing']) {
      expect(await products.getBySlug(db, slug)).toBeNull();
    }
  });
});

describe('products.create', () => {
  it('creates a draft with its media and records it', async () => {
    const dhanak = await makeCategory(db);
    const suit = await products.create(
      db,
      { ...formInput(dhanak.id), media: [media(0), media(1)] },
      actor,
    );
    expect(suit).toMatchObject({ status: 'draft', price: null, publishedAt: null });
    expect((await products.getById(db, suit.id))?.media).toHaveLength(2);
    const [entry] = await db.select().from(auditLog).where(eq(auditLog.entity, 'product'));
    expect(entry).toMatchObject({ action: 'product.create', entityId: suit.id });
  });

  it('only creates drafts, so publishing always goes through the publish rules', async () => {
    const dhanak = await makeCategory(db);
    const input = formInput(dhanak.id, { status: 'published', price: 4500 });
    expect((await error(products.create(db, input, actor))).fieldErrors).toEqual({
      status: ['Save as a draft first, then publish'],
    });
  });

  it.each([
    ['slug', { designCode: 'KDR-02' }],
    ['designCode', { slug: 'other-slug' }],
  ])('refuses a %s another suit uses, on that field', async (field, change) => {
    const dhanak = await makeCategory(db);
    await products.create(db, formInput(dhanak.id), actor);
    const e = await error(products.create(db, formInput(dhanak.id, change), actor));
    expect(e).toMatchObject({ code: 'CONFLICT' });
    expect(Object.keys(e.fieldErrors!)).toEqual([field]);
  });

  it('refuses an unknown collection', async () => {
    const e = await error(products.create(db, formInput('missing'), actor));
    expect(e.fieldErrors).toEqual({ categoryId: ['Choose an existing collection'] });
  });

  it('saves nothing when a media row fails', async () => {
    const dhanak = await makeCategory(db);
    const input = {
      ...formInput(dhanak.id),
      media: [media(0), media(1, { publicId: 'products/kdr-01/0' })],
    };
    await expect(products.create(db, input, actor)).rejects.toThrow();
    expect(await db.select().from(product)).toEqual([]);
    expect(await db.select().from(auditLog).where(eq(auditLog.entity, 'product'))).toEqual([]);
  });
});

describe('products.update', () => {
  it('changes fields and records only what changed', async () => {
    const suit = await makeProduct(db, { published: true });
    const updated = await products.update(db, { id: suit.id, price: 5200 }, actor);
    expect(updated.price).toBe(5200);
    const [entry] = await db.select().from(auditLog).where(eq(auditLog.action, 'product.update'));
    expect(entry!.changes).toEqual({ before: { price: 4500 }, after: { price: 5200 } });
  });

  it('re-checks the rules on the merged suit', async () => {
    const suit = await makeProduct(db, { published: true });
    expect(
      (await error(products.update(db, { id: suit.id, price: null }, actor))).fieldErrors,
    ).toEqual({
      price: ['Add a price before publishing'],
    });
    expect(
      (await error(products.update(db, { id: suit.id, compareAtPrice: 4000 }, actor))).fieldErrors,
    ).toEqual({ compareAtPrice: ['Must be higher than price'] });
  });

  it('leaves status to setStatus', async () => {
    const suit = await makeProduct(db);
    expect(
      (await error(products.update(db, { id: suit.id, status: 'published' }, actor))).code,
    ).toBe('VALIDATION');
  });

  it('redirects old slugs to the current one in one hop, for published suits only', async () => {
    const suit = await makeProduct(db, { published: true, slug: 'first' });
    await products.update(db, { id: suit.id, slug: 'second' }, actor);
    await products.update(db, { id: suit.id, slug: 'third' }, actor);
    expect(await products.resolveRedirect(db, 'first')).toBe('third');
    expect(await products.resolveRedirect(db, 'second')).toBe('third');
    await db.update(product).set({ status: 'archived' }).where(eq(product.id, suit.id));
    expect(await products.resolveRedirect(db, 'first')).toBeNull();
  });

  it('reports a missing or deleted suit as not found', async () => {
    const deleted = await makeProduct(db, { deletedAt: new Date() });
    for (const id of ['missing', deleted.id]) {
      expect((await error(products.update(db, { id, price: 1 }, actor))).code).toBe('NOT_FOUND');
    }
  });
});

describe('products.duplicate', () => {
  it('copies the fields to a new draft without codes, media or publish date', async () => {
    const suit = await makeProduct(db, {
      published: true,
      importKey: 'DHN-01',
      featured: true,
      motifs: ['paisley'],
    });
    const copy = await products.duplicate(db, suit.id, actor);
    const again = await products.duplicate(db, suit.id, actor);
    expect(copy).toMatchObject({
      name: `${suit.name} (copy)`,
      slug: `${suit.slug}-copy`,
      status: 'draft',
      designCode: null,
      importKey: null,
      featured: false,
      publishedAt: null,
      price: 4500,
      motifs: ['paisley'],
      categoryId: suit.categoryId,
    });
    expect(again.slug).toBe(`${suit.slug}-copy-2`);
    expect(await db.select().from(productMedia).where(eq(productMedia.productId, copy.id))).toEqual(
      [],
    );
    const actions = await db
      .select({ a: auditLog.action })
      .from(auditLog)
      .orderBy(asc(auditLog.createdAt));
    expect(actions.map((r) => r.a)).toEqual(['product.duplicate', 'product.duplicate']);
  });
});

describe('products.archive and restore', () => {
  it('archives a suit off the site and restores it as a draft', async () => {
    const suit = await makeProduct(db, { published: true });
    expect((await products.archive(db, suit.id, actor)).status).toBe('archived');
    expect(await products.getBySlug(db, suit.slug)).toBeNull();
    expect((await products.restore(db, suit.id, actor)).status).toBe('draft');
    const actions = await db
      .select({ a: auditLog.action })
      .from(auditLog)
      .orderBy(asc(auditLog.createdAt));
    expect(actions.map((r) => r.a)).toEqual(['product.archive', 'product.restore']);
  });

  it('reports a missing suit as not found', async () => {
    expect((await error(products.archive(db, 'missing', actor))).code).toBe('NOT_FOUND');
  });
});
