import { auditLog, product, productMedia } from '@mustafa/db/schema';
import { createTestDb, resetTestDb, type TestDb } from '@mustafa/db/testing';
import { asc, eq } from 'drizzle-orm';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { CoreError } from '../errors';
import { makeProduct, makeUser } from '../test/factories';
import * as media from './index';

let db: TestDb;
let actor: { actorId: string };
let productId: string;
let n = 0;

beforeAll(async () => {
  db = await createTestDb();
});

beforeEach(async () => {
  actor = { actorId: (await makeUser(db, { role: 'admin' })).id };
  productId = (await makeProduct(db)).id;
});

afterEach(async () => {
  await resetTestDb(db);
});

const asset = (kind: 'image' | 'video', extra: Partial<media.StoredAsset> = {}) => {
  n += 1;
  return {
    publicId: `products/${productId}/m${n}`,
    url: `https://res.cloudinary.com/demo/${kind}/upload/products/${productId}/m${n}.jpg`,
    format: kind === 'image' ? 'jpg' : 'mp4',
    bytes: 1000,
    width: 1200,
    height: 1600,
    durationSeconds: kind === 'video' ? 20 : null,
    ...extra,
  };
};

const add = (kind: 'image' | 'video', extra: Partial<media.StoredAsset> = {}) =>
  media.add(
    db,
    { productId, kind, alt: 'Black suit, front view', asset: asset(kind, extra) },
    actor,
  );

const rows = () =>
  db
    .select()
    .from(productMedia)
    .where(eq(productMedia.productId, productId))
    .orderBy(asc(productMedia.sortOrder));

const codeOf = (promise: Promise<unknown>) =>
  promise.then(
    () => 'ok',
    (error: unknown) => (error instanceof CoreError ? error.code : 'other'),
  );

describe('media.add', () => {
  it('saves Cloudinary’s figures, makes the first photo main and puts each new item last', async () => {
    const video = await add('video');
    const first = await add('image');
    const second = await add('image');
    expect(video).toMatchObject({ isPrimary: false, sortOrder: 0, durationSeconds: '20' });
    expect(first).toMatchObject({ isPrimary: true, sortOrder: 1, width: 1200, bytes: 1000 });
    expect(second).toMatchObject({ isPrimary: false, sortOrder: 2 });
  });

  it('refuses the same upload twice, and a suit that is gone', async () => {
    const same = asset('image');
    await media.add(db, { productId, kind: 'image', alt: 'Front view', asset: same }, actor);
    expect(
      await codeOf(media.add(db, { productId, kind: 'image', alt: 'Again', asset: same }, actor)),
    ).toBe('CONFLICT');
    await db.update(product).set({ deletedAt: new Date() }).where(eq(product.id, productId));
    expect(await codeOf(add('image'))).toBe('NOT_FOUND');
  });

  it('writes an audit row on the suit', async () => {
    await add('image');
    const [row] = await db.select().from(auditLog);
    expect(row).toMatchObject({
      action: 'product.media.add',
      entity: 'product',
      entityId: productId,
    });
  });
});

describe('media.reorder', () => {
  it('saves the new order and makes its first photo the main image', async () => {
    const a = await add('image');
    const v = await add('video');
    const b = await add('image');
    expect(await media.reorder(db, { productId, mediaIds: [v.id, b.id, a.id] }, actor)).toEqual({
      mainId: b.id,
    });
    expect((await rows()).map((r) => [r.id, r.isPrimary])).toEqual([
      [v.id, false],
      [b.id, true],
      [a.id, false],
    ]);
  });

  it('needs every item exactly once', async () => {
    const a = await add('image');
    await add('image');
    expect(await codeOf(media.reorder(db, { productId, mediaIds: [a.id] }, actor))).toBe(
      'VALIDATION',
    );
    expect(
      await codeOf(media.reorder(db, { productId, mediaIds: [a.id, 'someone-else'] }, actor)),
    ).toBe('VALIDATION');
  });
});

describe('media.setPrimary', () => {
  it('moves the chosen photo to the front as the main image', async () => {
    const a = await add('image');
    const b = await add('image');
    await media.setPrimary(db, { productId, mediaId: b.id }, actor);
    expect((await rows()).map((r) => [r.id, r.isPrimary])).toEqual([
      [b.id, true],
      [a.id, false],
    ]);
  });

  it('refuses a video, and an item of another suit', async () => {
    const v = await add('video');
    expect(await codeOf(media.setPrimary(db, { productId, mediaId: v.id }, actor))).toBe(
      'VALIDATION',
    );
    const other = (await makeProduct(db)).id;
    const photo = await add('image');
    expect(await codeOf(media.setPrimary(db, { productId: other, mediaId: photo.id }, actor))).toBe(
      'NOT_FOUND',
    );
  });
});

describe('media.setPoster, updateAlt and remove', () => {
  it('sets and clears a video’s poster, returning the one it replaced', async () => {
    const v = await add('video');
    const poster = `products/${productId}/poster-1`;
    expect(await media.setPoster(db, { mediaId: v.id, posterPublicId: poster }, actor)).toEqual({
      productId,
      previous: null,
    });
    expect(await media.setPoster(db, { mediaId: v.id, posterPublicId: null }, actor)).toEqual({
      productId,
      previous: poster,
    });
    const photo = await add('image');
    expect(
      await codeOf(media.setPoster(db, { mediaId: photo.id, posterPublicId: poster }, actor)),
    ).toBe('VALIDATION');
  });

  it('changes alt text, and writes nothing when it is the same', async () => {
    const photo = await add('image');
    await media.updateAlt(db, { mediaId: photo.id, alt: 'Black suit, back view' }, actor);
    await media.updateAlt(db, { mediaId: photo.id, alt: 'Black suit, back view' }, actor);
    expect((await rows())[0]!.alt).toBe('Black suit, back view');
    const alts = (await db.select().from(auditLog)).filter((r) => r.action === 'product.media.alt');
    expect(alts).toHaveLength(1);
  });

  it('removes an item and hands the main image to the next photo', async () => {
    const a = await add('image');
    const v = await add('video');
    const b = await add('image');
    expect((await media.remove(db, { mediaId: a.id }, actor)).publicId).toBe(a.publicId);
    expect((await rows()).map((r) => [r.id, r.isPrimary, r.sortOrder])).toEqual([
      [v.id, false, 0],
      [b.id, true, 1],
    ]);
    expect(await codeOf(media.remove(db, { mediaId: a.id }, actor))).toBe('NOT_FOUND');
  });
});

describe('media.remove on a published suit', () => {
  const publishedWith = async () => {
    const suit = await makeProduct(db, { published: true });
    productId = suit.id;
    return suit;
  };

  it('refuses to remove the last photo while the suit is live, keeping the row', async () => {
    await publishedWith();
    const [only] = await rows();
    expect(await codeOf(media.remove(db, { mediaId: only!.id }, actor))).toBe('VALIDATION');
    expect(await rows()).toHaveLength(1);
  });

  it('allows it when another photo takes over as main', async () => {
    await publishedWith();
    const [first] = await rows();
    const second = await add('image');
    await media.remove(db, { mediaId: first!.id }, actor);
    expect((await rows()).map((r) => [r.id, r.isPrimary])).toEqual([[second.id, true]]);
  });

  it('allows removing a draft suit’s last photo', async () => {
    const photo = await add('image');
    await media.remove(db, { mediaId: photo.id }, actor);
    expect(await rows()).toHaveLength(0);
  });
});

describe('media.isReferenced', () => {
  it('finds an id used as a photo, a poster or a collection image, and nothing else', async () => {
    const photo = await add('image');
    const video = await add('video');
    await media.setPoster(
      db,
      { mediaId: video.id, posterPublicId: `products/${productId}/poster-1` },
      actor,
    );
    const { makeCategory } = await import('../test/factories');
    await makeCategory(db, { imagePublicId: 'categories/c1/img' });
    expect(await media.isReferenced(db, photo.publicId)).toBe(true);
    expect(await media.isReferenced(db, `products/${productId}/poster-1`)).toBe(true);
    expect(await media.isReferenced(db, 'categories/c1/img')).toBe(true);
    expect(await media.isReferenced(db, `products/${productId}/unused`)).toBe(false);
  });
});
