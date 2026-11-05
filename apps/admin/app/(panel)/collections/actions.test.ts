// @vitest-environment node
// The collection actions on a real (PGlite) database, signed in as an admin with 2FA.
import { makeUser } from '@mustafa/core/test/factories';
import { auditLog, category } from '@mustafa/db/schema';
import { createTestDb, resetTestDb, type TestDb } from '@mustafa/db/testing';
import { eq } from 'drizzle-orm';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ db: null as unknown, adminId: 'a1' }));
const revalidateStorefront = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('server-only', () => ({}));
vi.mock('@mustafa/db/client', () => ({ getDb: () => state.db }));
vi.mock('../../../lib/auth', () => ({
  requireAdmin: async () => ({
    user: { id: state.adminId, role: 'admin', twoFactorEnabled: true },
    session: { app: 'admin' },
  }),
}));
vi.mock('../../../lib/limits', () => ({
  ADMIN_LIMITS: { adminWrite: {} },
  enforceLimit: async () => {},
}));
vi.mock('../../../lib/revalidate', () => ({ revalidateStorefront }));
const cloud = vi.hoisted(() => ({ verifyAsset: vi.fn(), deleteAsset: vi.fn() }));
vi.mock('../../../lib/media', () => ({
  mediaConfig: () => ({
    mode: 'live',
    appEnv: 'test',
    cloudName: 'mustafa',
    apiKey: 'k',
    apiSecret: 's',
  }),
}));
vi.mock('@mustafa/core/integrations/media', async (original) => ({
  ...(await original<typeof import('@mustafa/core/integrations/media')>()),
  verifyAsset: cloud.verifyAsset,
  deleteAsset: cloud.deleteAsset,
}));

import { AssetRejected } from '@mustafa/core/integrations/media';

import {
  createCategory,
  reorderCategories,
  setCategoryActive,
  setCategoryImage,
  updateCategory,
} from './actions';

let db: TestDb;

// PGlite start-up can take a while on a busy machine (docs/debugging.md).
beforeAll(async () => {
  db = await createTestDb();
  state.db = db;
}, 60_000);

beforeEach(async () => {
  state.adminId = (await makeUser(db, { role: 'admin' })).id;
  revalidateStorefront.mockClear();
  cloud.deleteAsset.mockReset().mockResolvedValue(true);
  cloud.verifyAsset.mockReset().mockImplementation(async (_config, publicId: string) => ({
    publicId,
    kind: 'image',
    format: 'jpg',
    bytes: 1000,
    width: 1200,
    height: 1600,
    durationSeconds: null,
    createdAt: Math.floor(Date.now() / 1000),
  }));
});

afterEach(async () => {
  await resetTestDb(db);
});

const created = async (name: string, slug: string) => {
  const result = await createCategory({ name, slug });
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.data.id;
};

describe('collection actions', () => {
  it('creates a collection, records who did it, and refreshes the storefront', async () => {
    const id = await created('Dhanak', 'dhanak');
    const [row] = await db.select().from(category).where(eq(category.id, id));
    expect(row).toMatchObject({ name: 'Dhanak', isActive: true });
    const [audit] = await db.select().from(auditLog);
    expect(audit).toMatchObject({ action: 'category.create', actorId: state.adminId });
    expect(revalidateStorefront).toHaveBeenCalledWith([
      'categories',
      'products',
      'category:dhanak',
    ]);
  });

  it('refuses a duplicate slug on the slug field', async () => {
    await created('Dhanak', 'dhanak');
    expect(await createCategory({ name: 'Dhanak 2', slug: 'dhanak' })).toMatchObject({
      ok: false,
      error: { code: 'CONFLICT', fieldErrors: { slug: expect.any(Array) } },
    });
  });

  it.each([
    ['name', { name: 'Maria B Lawn', slug: 'lawn' }],
    ['description', { name: 'Lawn', slug: 'lawn', description: 'Cut like Nishat suits' }],
    ['SEO title', { name: 'Lawn', slug: 'lawn', seoTitle: 'Khaadi style lawn' }],
  ])('refuses another brand name in the %s', async (_field, input) => {
    expect(await createCategory(input)).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
    expect(await db.select().from(category)).toHaveLength(0);
  });

  it.each([
    ['an image id', { imagePublicId: 'products/p1/x' }],
    ['an image URL', { imageUrl: 'https://res.cloudinary.com/elsewhere/image/upload/x.jpg' }],
  ])(
    'refuses %s on create and update: only setCategoryImage writes the image',
    async (_n, extra) => {
      expect(await createCategory({ name: 'Lawn', slug: 'lawn', ...extra })).toMatchObject({
        error: { code: 'VALIDATION' },
      });
      const id = await created('Dhanak', 'dhanak');
      expect(await updateCategory({ id, ...extra })).toMatchObject({
        error: { code: 'VALIDATION' },
      });
      const [row] = await db.select().from(category).where(eq(category.id, id));
      expect(row).toMatchObject({ imageUrl: null, imagePublicId: null });
    },
  );

  it('refuses fields the form never sends', async () => {
    expect(await createCategory({ name: 'Lawn', slug: 'lawn', id: 'mine' })).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION' },
    });
  });

  it('renames a collection and refreshes both the old and the new slug', async () => {
    const id = await created('Dhanak', 'dhanak');
    revalidateStorefront.mockClear();
    expect(await updateCategory({ id, name: 'Dhanak Winter', slug: 'dhanak-winter' })).toEqual({
      ok: true,
      data: { id, slug: 'dhanak-winter' },
    });
    expect(revalidateStorefront).toHaveBeenCalledWith([
      'categories',
      'products',
      'category:dhanak',
      'category:dhanak-winter',
    ]);
  });

  it('answers NOT_FOUND for a collection that does not exist', async () => {
    expect(await updateCategory({ id: 'missing', name: 'X Y' })).toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
    expect(revalidateStorefront).not.toHaveBeenCalled();
  });

  it('reorders every collection', async () => {
    const a = await created('Dhanak', 'dhanak');
    const b = await created('Khaddar', 'khaddar');
    expect(await reorderCategories({ ids: [b, a] })).toEqual({ ok: true, data: { count: 2 } });
    const rows = await db.select().from(category);
    expect(Object.fromEntries(rows.map((r) => [r.slug, r.sortOrder]))).toEqual({
      khaddar: 0,
      dhanak: 1,
    });
    expect(await reorderCategories({ ids: [a] })).toMatchObject({ error: { code: 'VALIDATION' } });
  });

  it('hides and shows a collection, with an audit row each time', async () => {
    const id = await created('Lajwanti', 'lajwanti');
    expect(await setCategoryActive({ id, isActive: false })).toEqual({
      ok: true,
      data: { id, isActive: false },
    });
    await setCategoryActive({ id, isActive: true });
    const updates = (await db.select().from(auditLog)).filter(
      (row) => row.action === 'category.update',
    );
    expect(updates).toHaveLength(2);
    expect(revalidateStorefront).toHaveBeenLastCalledWith([
      'categories',
      'products',
      'category:lajwanti',
    ]);
  });
});

describe('setCategoryImage', () => {
  it('checks the upload against this collection, saves it, and deletes the photo it replaces', async () => {
    const id = await created('Dhanak', 'dhanak');
    expect(await setCategoryImage({ id, publicId: `categories/${id}/one` })).toMatchObject({
      ok: true,
    });
    expect(cloud.verifyAsset).toHaveBeenCalledWith(
      expect.anything(),
      `categories/${id}/one`,
      expect.objectContaining({ kind: 'image', prefix: `categories/${id}/` }),
    );
    await setCategoryImage({ id, publicId: `categories/${id}/two` });
    const [row] = await db.select().from(category).where(eq(category.id, id));
    expect(row).toMatchObject({
      imagePublicId: `categories/${id}/two`,
      imageUrl: `https://res.cloudinary.com/mustafa/image/upload/categories/${id}/two.jpg`,
    });
    expect(cloud.deleteAsset).toHaveBeenCalledWith(
      expect.anything(),
      `categories/${id}/one`,
      'image',
    );
  });

  it('keeps the current image when its own id is sent again', async () => {
    const id = await created('Dhanak', 'dhanak');
    await setCategoryImage({ id, publicId: `categories/${id}/one` });
    cloud.verifyAsset.mockClear();
    await setCategoryImage({ id, publicId: `categories/${id}/one` });
    const [row] = await db.select().from(category).where(eq(category.id, id));
    expect(row?.imagePublicId).toBe(`categories/${id}/one`);
    expect(cloud.verifyAsset).not.toHaveBeenCalled();
    expect(cloud.deleteAsset).not.toHaveBeenCalled();
  });

  it('refuses another collection’s image, without deleting it', async () => {
    const a = await created('Dhanak', 'dhanak');
    const b = await created('Khaddar', 'khaddar');
    await setCategoryImage({ id: a, publicId: `categories/${a}/one` });
    expect(await setCategoryImage({ id: b, publicId: `categories/${a}/one` })).toMatchObject({
      error: { code: 'VALIDATION' },
    });
    expect(cloud.deleteAsset).not.toHaveBeenCalled();
  });

  it('removes the photo with null', async () => {
    const id = await created('Dhanak', 'dhanak');
    await setCategoryImage({ id, publicId: `categories/${id}/one` });
    expect(await setCategoryImage({ id, publicId: null })).toEqual({
      ok: true,
      data: { id, imagePublicId: null },
    });
    expect(cloud.deleteAsset).toHaveBeenCalledTimes(1);
  });

  it('refuses an upload Cloudinary says breaks a limit, and a suit photo', async () => {
    const id = await created('Dhanak', 'dhanak');
    cloud.verifyAsset.mockRejectedValue(new AssetRejected(['The file is over 10 MB.']));
    expect(await setCategoryImage({ id, publicId: `categories/${id}/big` })).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION', fieldErrors: { file: ['The file is over 10 MB.'] } },
    });
    expect(await setCategoryImage({ id, publicId: 'products/p1/x' })).toMatchObject({
      error: { code: 'VALIDATION' },
    });
  });
});

describe('setCategoryImage when Cloudinary is down', () => {
  it('answers with the general error and keeps the current image', async () => {
    const id = await created('Dhanak', 'dhanak');
    await setCategoryImage({ id, publicId: `categories/${id}/one` });
    cloud.verifyAsset.mockRejectedValue(new Error('Cloudinary answered 503'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await setCategoryImage({ id, publicId: `categories/${id}/two` })).toMatchObject({
      error: { code: 'INTERNAL' },
    });
    const [row] = await db.select().from(category).where(eq(category.id, id));
    expect(row?.imagePublicId).toBe(`categories/${id}/one`);
    expect(cloud.deleteAsset).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
