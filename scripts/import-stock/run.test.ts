import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createMockStore, type MediaConfig } from '@mustafa/core/integrations/media';
import * as media from '@mustafa/core/media';
import * as products from '@mustafa/core/products';
import { makeCategory, makeUser } from '@mustafa/core/test/factories';
import { auditLog, product, productMedia } from '@mustafa/db/schema';
import { createTestDb, resetTestDb, type TestDb } from '@mustafa/db/testing';
import { asc, eq } from 'drizzle-orm';
import sharp from 'sharp';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { targetDatabase } from '../import-stock';
import { loadCatalog } from './catalog';
import { COLLECTION, suitText } from './fixtures';
import { fakeMp4 } from './mp4';
import { importActor, importStock } from './run';
import { mockUploader } from './uploader';

let db: TestDb;
let root: string;
let catalogDir: string;
let stockDir: string;
let storeDir: string;
let actor: { actorId: string };
const mediaConfig: MediaConfig = {
  mode: 'mock',
  appEnv: 'test',
  cloudName: undefined,
  apiKey: undefined,
  apiSecret: undefined,
};

beforeAll(async () => {
  db = await createTestDb();
});

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), 'import-'));
  catalogDir = join(root, 'catalog');
  stockDir = join(root, 'Stock');
  storeDir = join(root, 'store');
  mkdirSync(join(catalogDir, 'dhanak'), { recursive: true });
  mkdirSync(join(stockDir, 'Dhanak'), { recursive: true });
  writeFileSync(join(catalogDir, 'dhanak', '_collection.md'), COLLECTION);
  for (const id of ['DHN-01', 'DHN-02']) {
    writeFileSync(join(catalogDir, 'dhanak', `${id.toLowerCase()}.md`), suitText(id));
    const photo = await sharp({
      create: { width: 60, height: 80, channels: 3, background: '#0a7' },
    })
      .jpeg()
      .toBuffer();
    writeFileSync(join(stockDir, 'Dhanak', `${id.toLowerCase()}.jpeg`), photo);
    writeFileSync(join(stockDir, 'Dhanak', `${id.toLowerCase()}.mp4`), fakeMp4(10));
  }
  await makeCategory(db, { name: 'Dhanak', slug: 'dhanak' });
  const owner = await makeUser(db, { role: 'admin', email: 'owner@example.com' });
  actor = { actorId: owner.id };
});

afterEach(async () => {
  await resetTestDb(db);
  rmSync(root, { recursive: true, force: true });
});

const run = (options: { maxCredits?: number } = {}) =>
  importStock({
    db,
    suits: loadCatalog(catalogDir).suits,
    stockDir,
    uploader: mockUploader(storeDir),
    mediaConfig,
    actor,
    maxCredits: options.maxCredits ?? 3,
  });

const suitRow = async (code: string) =>
  (await db.select().from(product).where(eq(product.importKey, code)))[0]!;
const mediaOf = async (productId: string) =>
  db
    .select()
    .from(productMedia)
    .where(eq(productMedia.productId, productId))
    .orderBy(asc(productMedia.sortOrder));

describe('importStock', () => {
  it('creates drafts with no price, the photo as main image, in stock, and an import audit row', async () => {
    const report = await run();
    expect(report.suits.map((s) => s.outcome)).toEqual(['created', 'created']);
    expect([report.uploaded, report.reused]).toEqual([4, 0]);
    const suit = await suitRow('DHN-01');
    expect(suit).toMatchObject({
      status: 'draft',
      price: null,
      availability: 'in_stock',
      designCode: 'DHN-01',
      slug: 'teal-embroidered-dhanak-3-piece-dhn-01',
      season: 'winter',
      pieces: 'three_piece',
    });
    const items = await mediaOf(suit.id);
    expect(items.map((m) => [m.kind, m.isPrimary])).toEqual([
      ['image', true],
      ['video', false],
    ]);
    expect(items[0]!.publicId).toMatch(/^products\/imported\/DHN-01\/dhn-01-[0-9a-f]{8}$/);
    expect(items[1]!.durationSeconds).toBe('10');
    const audits = await db.select().from(auditLog).where(eq(auditLog.entityId, suit.id));
    expect(audits.map((a) => a.action).sort()).toEqual(['product.create', 'product.import']);
  });

  it('re-runs with no duplicates, no uploads and no changes', async () => {
    await run();
    const again = await run();
    expect(again.suits.map((s) => s.outcome)).toEqual(['unchanged', 'unchanged']);
    expect([again.uploaded, again.reused]).toEqual([0, 0]);
    expect(await db.select().from(product)).toHaveLength(2);
    expect(await db.select().from(productMedia)).toHaveLength(4);
  });

  it('reuses files Cloudinary already has, as the production import will', async () => {
    await run();
    await resetTestDb(db);
    await makeCategory(db, { name: 'Dhanak', slug: 'dhanak' });
    actor = { actorId: (await makeUser(db, { role: 'admin' })).id };
    const second = await run();
    expect([second.uploaded, second.reused]).toEqual([0, 4]);
    expect(second.suits.map((s) => s.outcome)).toEqual(['created', 'created']);
  });

  it('keeps a price, a name and alt text set in admin while updating untouched fields', async () => {
    await run();
    const suit = await suitRow('DHN-01');
    await products.update(db, { id: suit.id, price: 5500, name: 'My Own Name' }, actor);
    const [photo] = await mediaOf(suit.id);
    await db
      .update(productMedia)
      .set({ alt: 'My own alt text' })
      .where(eq(productMedia.id, photo!.id));

    writeFileSync(
      join(catalogDir, 'dhanak', 'dhn-01.md'),
      suitText('DHN-01')
        .replace('motifs: [small flower sprigs]', 'motifs: [small flower sprigs, lace hem]')
        .replace(
          'name: Teal Embroidered Dhanak 3-Piece Suit DHN-01',
          'name: Teal Floral Dhanak 3-Piece Suit DHN-01',
        )
        .replace(
          'alt: "Model wearing a teal 3-piece Dhanak suit"',
          'alt: "Model in a teal 3-piece Dhanak suit"',
        ),
    );
    const report = await run();
    const result = report.suits.find((s) => s.designId === 'DHN-01')!;
    expect(result.outcome).toBe('updated');
    expect(result.changed).toEqual(['motifs']);
    expect(result.keptEdits).toEqual(['name', 'alt text of Dhanak/dhn-01.jpeg']);
    const after = await suitRow('DHN-01');
    expect(after).toMatchObject({ price: 5500, name: 'My Own Name', status: 'draft' });
    expect(after.motifs).toEqual(['small flower sprigs', 'lace hem']);
    expect((await mediaOf(suit.id))[0]!.alt).toBe('My own alt text');
  });

  it('adds a new catalog check but never brings back one the owner cleared', async () => {
    writeFileSync(
      join(catalogDir, 'dhanak', 'dhn-01.md'),
      suitText('DHN-01').replace('check: []', 'check:\n  - "Confirm the crop"'),
    );
    await run();
    const suit = await suitRow('DHN-01');
    expect(suit.attributes.checks).toEqual(['Confirm the crop']);
    await products.clearCheck(db, { id: suit.id, check: 'Confirm the crop' }, actor);

    writeFileSync(
      join(catalogDir, 'dhanak', 'dhn-01.md'),
      suitText('DHN-01').replace(
        'check: []',
        'check:\n  - "Confirm the crop"\n  - "Check sharpness once imported"',
      ),
    );
    const report = await run();
    expect((await suitRow('DHN-01')).attributes.checks).toEqual(['Check sharpness once imported']);
    expect(report.suits[0]!.openChecks).toEqual(['Check sharpness once imported']);
  });

  it('swaps a re-cropped photo into the same place as main image, and lists the old file', async () => {
    await run();
    const suit = await suitRow('DHN-01');
    const [oldPhoto] = await mediaOf(suit.id);
    writeFileSync(
      join(catalogDir, 'dhanak', 'dhn-01.md'),
      suitText('DHN-01').replace(
        'alt: "Model wearing a teal 3-piece Dhanak suit"',
        'alt: "Model wearing a teal 3-piece Dhanak suit"\n    crop: { x: 0, y: 0, width: 60, height: 70 }',
      ),
    );
    const report = await run();
    const items = await mediaOf(suit.id);
    expect(items.map((m) => [m.kind, m.isPrimary])).toEqual([
      ['image', true],
      ['video', false],
    ]);
    expect(items[0]!.publicId).not.toBe(oldPhoto!.publicId);
    expect(items[0]!.height).toBe(70);
    expect(report.uploaded).toBe(1);
    expect(report.unused).toEqual([oldPhoto!.publicId]);
    // The old file stays in Cloudinary: production may use it.
    expect(createMockStore(storeDir).get(oldPhoto!.publicId)).not.toBeNull();
  });

  it('never brings back a photo or video the owner removed in admin', async () => {
    await run();
    const suit = await suitRow('DHN-01');
    const [, video] = await mediaOf(suit.id);
    await media.remove(db, { mediaId: video!.id }, actor);
    const report = await run();
    const result = report.suits.find((s) => s.designId === 'DHN-01')!;
    expect(result).toMatchObject({ outcome: 'unchanged', uploaded: 0, reused: 0 });
    expect(result.keptEdits).toEqual(['removed Dhanak/dhn-01.mp4']);
    expect((await mediaOf(suit.id)).map((m) => m.kind)).toEqual(['image']);
  });

  it('refuses before writing anything when the uploads would pass --max-credits', async () => {
    await expect(run({ maxCredits: 0 })).rejects.toThrow(/over the --max-credits limit of 0/);
    expect(await db.select().from(product)).toHaveLength(0);
    expect(readdirSync(root)).not.toContain('store');
  });

  it('never imports a suit again once it was deleted in admin', async () => {
    await run();
    await db.update(product).set({ deletedAt: new Date() }).where(eq(product.importKey, 'DHN-02'));
    const report = await run();
    expect(report.suits[1]).toMatchObject({ outcome: 'skipped' });
    expect(await db.select().from(product)).toHaveLength(2);
  });

  it('refuses a collection the database does not have', async () => {
    await resetTestDb(db);
    actor = { actorId: (await makeUser(db, { role: 'admin' })).id };
    await expect(run()).rejects.toThrow(/no "dhanak" collection/);
  });

  it('leaves the stock folder untouched', async () => {
    const stamp = () =>
      readdirSync(join(stockDir, 'Dhanak')).map((f) => [
        f,
        statSync(join(stockDir, 'Dhanak', f)).mtimeMs,
      ]);
    const before = stamp();
    await run();
    expect(stamp()).toEqual(before);
  });
});

describe('importActor', () => {
  it('records changes as the seeded owner, else the first admin, and fails with none', async () => {
    const other = await makeUser(db, { role: 'admin', email: 'zz@example.com' });
    expect(await importActor(db, 'OWNER@example.com')).toEqual(actor);
    expect(await importActor(db, 'nobody@example.com')).toEqual(actor);
    expect(other.id).not.toBe(actor.actorId);
    await resetTestDb(db);
    await expect(importActor(db)).rejects.toThrow(/No admin account/);
  });
});

describe('targetDatabase', () => {
  const local = { DATABASE_URL: 'postgres://dev', DATABASE_URL_UNPOOLED: 'postgres://dev-direct' };

  it('uses the local direct URL by default', () => {
    expect(targetDatabase(local, false).url).toBe('postgres://dev-direct');
  });

  it('needs --production and IMPORT_DATABASE_URL together', () => {
    const prod = { ...local, IMPORT_DATABASE_URL: 'postgres://prod' };
    expect(() => targetDatabase(prod, false)).toThrow(/add --production/);
    expect(() => targetDatabase(local, true)).toThrow(/needs IMPORT_DATABASE_URL/);
    expect(targetDatabase(prod, true).url).toBe('postgres://prod');
  });

  it('refuses a local run that says it is production', () => {
    expect(() => targetDatabase({ ...local, APP_ENV: 'production' }, false)).toThrow(/production/);
  });
});
