import { createTestDb, resetTestDb, type TestDb } from '@mustafa/db/testing';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { makeCategory, makeMedia, makeProduct } from '../test/factories';
import * as products from './index';

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
});

afterEach(async () => {
  await resetTestDb(db);
});

describe('alsoInDesign', () => {
  it('returns the other colours that are published, in the order the codes were given', async () => {
    const dhanak = await makeCategory(db, { slug: 'dhanak' });
    const self = await makeProduct(db, {
      published: true,
      designCode: 'DHN-01',
      categoryId: dhanak.id,
    });
    const red = await makeProduct(db, {
      published: true,
      designCode: 'DHN-02',
      categoryId: dhanak.id,
    });
    const blue = await makeProduct(db, {
      published: true,
      designCode: 'DHN-03',
      categoryId: dhanak.id,
    });
    await makeProduct(db, { designCode: 'DHN-04', categoryId: dhanak.id }); // a draft
    await makeProduct(db, {
      published: true,
      designCode: 'DHN-05',
      categoryId: dhanak.id,
      deletedAt: new Date(),
    });

    const cards = await products.alsoInDesign(
      db,
      ['dhn-03', 'DHN-02', 'DHN-04', 'DHN-05', 'DHN-01', ' '],
      self.id,
    );
    expect(cards.map((c) => c.id)).toEqual([blue.id, red.id]);
    expect(cards[0]!.image?.alt).toBeTruthy();
  });

  it('is empty with no codes, and hides suits in a hidden collection', async () => {
    expect(await products.alsoInDesign(db, [])).toEqual([]);
    const hidden = await makeCategory(db, { isActive: false });
    await makeProduct(db, { published: true, designCode: 'KDR-01', categoryId: hidden.id });
    expect(await products.alsoInDesign(db, ['KDR-01'])).toEqual([]);
  });
});

describe('related', () => {
  it('gives newer suits from the same collection first, without the suit or excluded ones', async () => {
    const dhanak = await makeCategory(db);
    const other = await makeCategory(db);
    const at = (day: number) => new Date(`2026-11-0${day}T00:00:00Z`);
    const self = await makeProduct(db, {
      published: true,
      categoryId: dhanak.id,
      publishedAt: at(5),
    });
    const older = await makeProduct(db, {
      published: true,
      categoryId: dhanak.id,
      publishedAt: at(1),
    });
    const newer = await makeProduct(db, {
      published: true,
      categoryId: dhanak.id,
      publishedAt: at(4),
    });
    const shownAbove = await makeProduct(db, {
      published: true,
      categoryId: dhanak.id,
      publishedAt: at(3),
    });
    await makeProduct(db, { published: true, categoryId: other.id });
    await makeProduct(db, { categoryId: dhanak.id }); // a draft

    const cards = await products.related(db, self, { exclude: [shownAbove.id] });
    expect(cards.map((c) => c.id)).toEqual([newer.id, older.id]);
    expect(await products.related(db, self, { limit: 1 })).toHaveLength(1);
  });
});

describe('featuredSlug', () => {
  it('picks the newest suit marked featured, else the newest published suit with a video', async () => {
    const dhanak = await makeCategory(db);
    const at = (day: number) => new Date(`2026-11-0${day}T00:00:00Z`);
    expect(await products.featuredSlug(db)).toBeNull();

    const older = await makeProduct(db, {
      published: true,
      categoryId: dhanak.id,
      publishedAt: at(1),
    });
    await makeMedia(db, { productId: older.id, kind: 'video', durationSeconds: '12' });
    const newer = await makeProduct(db, {
      published: true,
      categoryId: dhanak.id,
      publishedAt: at(3),
    });
    await makeMedia(db, { productId: newer.id, kind: 'video', durationSeconds: '12' });
    const draft = await makeProduct(db, { categoryId: dhanak.id });
    await makeMedia(db, { productId: draft.id, kind: 'video', durationSeconds: '12' });
    expect(await products.featuredSlug(db)).toBe(newer.slug);

    const marked = await makeProduct(db, {
      published: true,
      categoryId: dhanak.id,
      publishedAt: at(2),
      featured: true,
    });
    expect(await products.featuredSlug(db)).toBe(marked.slug);
  });
});
