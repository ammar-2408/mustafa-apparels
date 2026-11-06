import { makeCategory, makeMedia, makeProduct, makeUser } from '@mustafa/core/test/factories';
import { product } from '@mustafa/db/schema';
import { createTestDb, resetTestDb, type TestDb } from '@mustafa/db/testing';
import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { devTarget, PLACEHOLDER_PRICE, publishPreview } from './preview-publish';

const DEV = 'postgresql://u:p@ep-dev-1-pooler.c-2.neon.tech/neondb';
const HOST = 'ep-dev-1.c-2.neon.tech';
const env = (extra: Record<string, string> = {}) => ({
  APP_ENV: 'development',
  DATABASE_URL: DEV,
  ...extra,
});

describe('devTarget', () => {
  it('accepts the dev database when its host is typed back', () => {
    expect(devTarget(env(), [`--confirm-host=${HOST}`])).toEqual({ url: DEV, host: HOST });
    expect(devTarget(env(), ['--confirm-host=ep-dev-1-pooler.c-2.neon.tech']).host).toBe(HOST);
  });

  it('needs the host confirmed', () => {
    expect(() => devTarget(env(), [])).toThrow(`--confirm-host=${HOST}`);
    expect(() => devTarget(env(), ['--confirm-host=ep-other.neon.tech'])).toThrow(/confirm-host/);
  });

  it('refuses production and anything but development', () => {
    expect(() => devTarget(env(), ['--production', `--confirm-host=${HOST}`])).toThrow(
      /never runs on production/,
    );
    for (const APP_ENV of ['production', 'preview', 'test']) {
      expect(() => devTarget(env({ APP_ENV }), [`--confirm-host=${HOST}`])).toThrow(/APP_ENV/);
    }
    expect(() => devTarget({ DATABASE_URL: DEV }, [`--confirm-host=${HOST}`])).toThrow(/unset/);
  });

  it('refuses when DATABASE_URL is the import (production) or E2E database', () => {
    const same = 'postgresql://x:y@ep-dev-1.c-2.neon.tech/neondb';
    for (const name of ['IMPORT_DATABASE_URL', 'E2E_DATABASE_URL']) {
      expect(() => devTarget(env({ [name]: same }), [`--confirm-host=${HOST}`])).toThrow(name);
    }
  });

  it('needs a database URL', () => {
    expect(() => devTarget({ APP_ENV: 'development' }, [])).toThrow(/DATABASE_URL/);
  });
});

describe('publishPreview', () => {
  let db: TestDb;
  let actor: { actorId: string };

  beforeAll(async () => {
    db = await createTestDb();
  });

  beforeEach(async () => {
    await resetTestDb(db);
    actor = { actorId: (await makeUser(db, { role: 'admin' })).id };
  });

  async function importedDraft(overrides: Parameters<typeof makeProduct>[1] = {}) {
    const row = await makeProduct(db, {
      importKey: `key-${Math.random()}`,
      mainColor: 'Black',
      colorFamily: 'Black',
      attributes: { checks: ['Confirm the crop'] },
      ...overrides,
    });
    await makeMedia(db, { productId: row.id, isPrimary: true });
    return row;
  }

  it('prices, clears checks and publishes imported drafts', async () => {
    const draft = await importedDraft();
    const report = await publishPreview(db, actor);
    const [row] = await db.select().from(product).where(eq(product.id, draft.id));
    expect(report.published).toEqual([draft.designCode]);
    expect(row).toMatchObject({ status: 'published', price: PLACEHOLDER_PRICE });
    expect(row!.attributes.checks).toEqual([]);
  });

  it('keeps a price already set and leaves other suits alone', async () => {
    const priced = await importedDraft({ price: 6500 });
    const handMade = await makeProduct(db, { categoryId: (await makeCategory(db)).id });
    const live = await importedDraft({ status: 'published', price: 5000, publishedAt: new Date() });
    const report = await publishPreview(db, actor);

    const [p] = await db.select().from(product).where(eq(product.id, priced.id));
    const [h] = await db.select().from(product).where(eq(product.id, handMade.id));
    expect(p).toMatchObject({ status: 'published', price: 6500 });
    expect(h!.status).toBe('draft');
    expect(report.skipped).toEqual([{ code: live.designCode, reason: 'already published' }]);
  });

  it('reports a suit the publish rules refuse, and goes on', async () => {
    const noColour = await importedDraft({ mainColor: null, colorFamily: null });
    const fine = await importedDraft();
    const report = await publishPreview(db, actor);
    expect(report.published).toEqual([fine.designCode]);
    expect(report.skipped.map((s) => s.code)).toEqual([noColour.designCode]);
  });
});
