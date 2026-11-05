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
  setVideoPoster,
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
      expect.objectContaining({ kind: 'image', prefix: `products/${productId}/` }),
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

describe('setVideoPoster', () => {
  it('saves a poster photo uploaded for this suit, and deletes the one it replaces', async () => {
    const v = await upload('video');
    const first = `products/${productId}/poster-one`;
    expect(await setVideoPoster({ mediaId: v, posterPublicId: first })).toEqual({
      ok: true,
      data: { id: v, posterPublicId: first },
    });
    expect(cloud.verifyAsset).toHaveBeenLastCalledWith(
      expect.anything(),
      first,
      expect.objectContaining({ kind: 'image', prefix: `products/${productId}/poster-` }),
    );
    await setVideoPoster({ mediaId: v, posterPublicId: `products/${productId}/poster-two` });
    expect(cloud.deleteAsset).toHaveBeenCalledWith(expect.anything(), first, 'image');
    expect((await rows())[0]!.posterPublicId).toBe(`products/${productId}/poster-two`);
  });

  it('goes back to the first frame with null, deleting the old poster', async () => {
    const v = await upload('video');
    await setVideoPoster({ mediaId: v, posterPublicId: `products/${productId}/poster-one` });
    expect(await setVideoPoster({ mediaId: v, posterPublicId: null })).toMatchObject({ ok: true });
    expect((await rows())[0]!.posterPublicId).toBeNull();
    expect(cloud.deleteAsset).toHaveBeenCalledTimes(1);
  });

  it('refuses a poster Cloudinary rejects, a photo row, and a missing video', async () => {
    const v = await upload('video');
    cloud.verifyAsset.mockRejectedValueOnce(
      new AssetRejected(['This file was uploaded for something else.']),
    );
    expect(
      await setVideoPoster({ mediaId: v, posterPublicId: `products/${productId}/poster-x` }),
    ).toMatchObject({
      ok: false,
      error: {
        code: 'VALIDATION',
        fieldErrors: { file: ['This file was uploaded for something else.'] },
      },
    });
    const photo = await upload('image');
    expect(await setVideoPoster({ mediaId: photo, posterPublicId: null })).toMatchObject({
      error: { code: 'VALIDATION' },
    });
    expect(await setVideoPoster({ mediaId: 'missing', posterPublicId: null })).toMatchObject({
      error: { code: 'NOT_FOUND' },
    });
  });
});

describe('files already in use', () => {
  it('refuses to attach a saved photo again, without asking Cloudinary', async () => {
    await upload();
    const savedId = `products/${productId}/u${n}`;
    cloud.verifyAsset.mockClear();
    expect(
      await addProductMedia({
        productId,
        kind: 'image',
        publicId: savedId,
        alt: 'Front view again',
      }),
    ).toMatchObject({
      ok: false,
      error: { code: 'CONFLICT', fieldErrors: { file: expect.any(Array) } },
    });
    expect(cloud.verifyAsset).not.toHaveBeenCalled();
    expect(cloud.deleteAsset).not.toHaveBeenCalled();
  });

  it('refuses a poster another video already uses', async () => {
    const first = await upload('video');
    const second = await upload('video');
    const poster = `products/${productId}/poster-shared`;
    await setVideoPoster({ mediaId: first, posterPublicId: poster });
    expect(await setVideoPoster({ mediaId: second, posterPublicId: poster })).toMatchObject({
      error: { code: 'CONFLICT' },
    });
    // The same video keeping its own poster is fine.
    expect(await setVideoPoster({ mediaId: first, posterPublicId: poster })).toMatchObject({
      ok: true,
    });
  });
});

describe('when Cloudinary is down at save time', () => {
  it('answers with the general error, saves nothing, deletes nothing and logs no details', async () => {
    cloud.verifyAsset.mockRejectedValue(new Error('Cloudinary answered 503 at api.cloudinary.com'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(
      await addProductMedia({
        productId,
        kind: 'image',
        publicId: `products/${productId}/down`,
        alt: 'Front view',
      }),
    ).toEqual({
      ok: false,
      error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' },
    });
    expect(await rows()).toHaveLength(0);
    expect(cloud.deleteAsset).not.toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toContain('cloudinary.com');
    log.mockRestore();
  });

  it('leaves a video poster unchanged', async () => {
    const v = await upload('video');
    cloud.verifyAsset.mockRejectedValue(new Error('timeout'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(
      await setVideoPoster({ mediaId: v, posterPublicId: `products/${productId}/poster-x` }),
    ).toMatchObject({
      error: { code: 'INTERNAL' },
    });
    expect((await rows())[0]!.posterPublicId).toBeNull();
    log.mockRestore();
  });
});
