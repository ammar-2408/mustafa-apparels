// @vitest-environment node
// The media actions on a real (PGlite) database; Cloudinary is stubbed at the integration.
import { makeProduct, makeUser } from '@mustafa/core/test/factories';
import { auditLog, productMedia } from '@mustafa/db/schema';
import { createTestDb, resetTestDb, type TestDb } from '@mustafa/db/testing';
import { asc, eq } from 'drizzle-orm';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ db: null as unknown, adminId: 'a1' }));
const cloud = vi.hoisted(() => ({ verifyAsset: vi.fn(), deleteAsset: vi.fn() }));
const revalidateStorefront = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('server-only', () => ({}));
vi.mock('@mustafa/db/client', () => ({ getDb: () => state.db }));
vi.mock('../../../../lib/auth', () => ({
  requireAdmin: async () => ({
    user: { id: state.adminId, role: 'admin', twoFactorEnabled: true },
    session: { app: 'admin' },
  }),
}));
vi.mock('../../../../lib/limits', () => ({
  ADMIN_LIMITS: { adminWrite: {} },
  enforceLimit: async () => {},
}));
vi.mock('../../../../lib/revalidate', () => ({ revalidateStorefront }));
const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock('next/cache', () => ({ revalidatePath }));
vi.mock('../../../../lib/media', () => ({
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
  addProductMedia,
  deleteProductMedia,
  reorderProductMedia,
  setPrimaryProductImage,
  updateMediaAlt,
} from './actions';

let db: TestDb;
let productId: string;

// PGlite start-up can take a while on a busy machine (docs/debugging.md).
beforeAll(async () => {
  db = await createTestDb();
  state.db = db;
}, 60_000);

beforeEach(async () => {
  state.adminId = (await makeUser(db, { role: 'admin' })).id;
  productId = (await makeProduct(db)).id;
  revalidateStorefront.mockClear();
  cloud.deleteAsset.mockReset().mockResolvedValue(true);
  cloud.verifyAsset.mockReset().mockImplementation(async (_config, publicId: string, expected) => ({
    publicId,
    kind: expected.kind,
    format: expected.kind === 'image' ? 'jpg' : 'mp4',
    bytes: 2048,
    width: 1200,
    height: 1600,
    durationSeconds: expected.kind === 'video' ? 18 : null,
    createdAt: Math.floor(Date.now() / 1000),
  }));
});

afterEach(async () => {
  await resetTestDb(db);
});

let n = 0;
const upload = async (kind: 'image' | 'video' = 'image', alt = 'Black suit, front view') => {
  n += 1;
  const result = await addProductMedia({
    productId,
    kind,
    publicId: `products/${productId}/u${n}`,
    alt,
  });
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.data.id;
};

const rows = () =>
  db
    .select()
    .from(productMedia)
    .where(eq(productMedia.productId, productId))
    .orderBy(asc(productMedia.sortOrder));

describe('addProductMedia', () => {
  it('checks the upload against this suit’s folder and saves Cloudinary’s figures', async () => {
    await upload();
    expect(cloud.verifyAsset).toHaveBeenCalledWith(
      expect.anything(),
      `products/${productId}/u${n}`,
      {
        kind: 'image',
        prefix: `products/${productId}/`,
      },
    );
    const [row] = await rows();
    expect(row).toMatchObject({
      isPrimary: true,
      bytes: 2048,
      width: 1200,
      url: `https://res.cloudinary.com/mustafa/image/upload/products/${productId}/u${n}.jpg`,
    });
    expect(revalidateStorefront).toHaveBeenCalledWith(['products', `product:${productId}`]);
    expect(revalidatePath).toHaveBeenCalledWith(`/suits/${productId}`);
  });

  it('turns a refused upload into field errors and saves nothing', async () => {
    cloud.verifyAsset.mockRejectedValue(new AssetRejected(['The file is over 10 MB.']));
    expect(
      await addProductMedia({
        productId,
        kind: 'image',
        publicId: `products/${productId}/big`,
        alt: 'Front',
      }),
    ).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION', fieldErrors: { file: ['The file is over 10 MB.'] } },
    });
    expect(await rows()).toHaveLength(0);
  });

  it.each([
    ['no alt text', { alt: '' }],
    ['a brand name in the alt text', { alt: 'Khaadi style black suit' }],
    ['a public id that is not ours', { publicId: 'elsewhere/x/y' }],
    ['a size from the browser', { bytes: 10 }],
  ])('refuses %s before reading Cloudinary', async (_name, change) => {
    expect(
      await addProductMedia({
        productId,
        kind: 'image',
        publicId: `products/${productId}/x`,
        alt: 'Front view',
        ...change,
      }),
    ).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
    expect(cloud.verifyAsset).not.toHaveBeenCalled();
  });
});

describe('ordering, main image, alt text', () => {
  it('reorders, makes a photo main, and edits alt text, each with an audit row', async () => {
    const a = await upload();
    const b = await upload();
    expect(await reorderProductMedia({ productId, mediaIds: [b, a] })).toEqual({
      ok: true,
      data: { mainId: b },
    });
    expect(await setPrimaryProductImage({ productId, mediaId: a })).toEqual({
      ok: true,
      data: { mainId: a },
    });
    expect(await updateMediaAlt({ mediaId: a, alt: 'Black suit, back view' })).toMatchObject({
      ok: true,
    });
    expect((await rows()).map((r) => [r.id, r.isPrimary, r.alt])).toEqual([
      [a, true, 'Black suit, back view'],
      [b, false, 'Black suit, front view'],
    ]);
    const actions = (await db.select().from(auditLog)).map((r) => r.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        'product.media.reorder',
        'product.media.primary',
        'product.media.alt',
      ]),
    );
  });

  it('refuses a video as the main image', async () => {
    const v = await upload('video');
    expect(await setPrimaryProductImage({ productId, mediaId: v })).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION' },
    });
  });
});

describe('deleteProductMedia', () => {
  it('removes the row, then the file from Cloudinary', async () => {
    const a = await upload();
    expect(await deleteProductMedia({ mediaId: a })).toEqual({ ok: true, data: { id: a } });
    expect(await rows()).toHaveLength(0);
    expect(cloud.deleteAsset).toHaveBeenCalledWith(
      expect.anything(),
      `products/${productId}/u${n}`,
      'image',
    );
  });

  it('still succeeds when Cloudinary fails, and logs without details', async () => {
    const a = await upload();
    cloud.deleteAsset.mockRejectedValue(new Error('network down at api.cloudinary.com'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await deleteProductMedia({ mediaId: a })).toMatchObject({ ok: true });
    expect(JSON.stringify(log.mock.calls)).not.toContain('api.cloudinary.com');
    log.mockRestore();
  });
});
