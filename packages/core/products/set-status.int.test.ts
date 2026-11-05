import { auditLog, product, productMedia } from '@mustafa/db/schema';
import { createTestDb, resetTestDb, type TestDb } from '@mustafa/db/testing';
import { eq } from 'drizzle-orm';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { CoreError } from '../errors';
import { makeMedia, makeProduct, makeUser } from '../test/factories';
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

// A draft that meets every publish rule.
const ready = async (overrides = {}) => {
  const suit = await makeProduct(db, {
    price: 4500,
    mainColor: 'Black',
    colorFamily: 'Black',
    ...overrides,
  });
  await makeMedia(db, { productId: suit.id, isPrimary: true });
  return suit;
};

const publish = (id: string) => products.setStatus(db, { id, status: 'published' }, actor);

const fieldErrors = async (promise: Promise<unknown>) => {
  const e = await promise.catch((caught: unknown) => caught);
  expect(e).toBeInstanceOf(CoreError);
  expect((e as CoreError).code).toBe('VALIDATION');
  return (e as CoreError).fieldErrors;
};

const actions = async () =>
  (await db.select({ a: auditLog.action }).from(auditLog)).map((r) => r.a);

describe('publishing', () => {
  it('publishes a ready draft, stamps the first publish date and records it', async () => {
    const suit = await ready();
    const published = await publish(suit.id);
    expect(published.status).toBe('published');
    expect(published.publishedAt).toBeInstanceOf(Date);
    expect(await products.getBySlug(db, suit.slug)).not.toBeNull();
    expect(await actions()).toEqual(['product.publish']);
  });

  it('keeps the first publish date when a suit is published again', async () => {
    const suit = await ready();
    const first = (await publish(suit.id)).publishedAt;
    await products.setStatus(db, { id: suit.id, status: 'draft' }, actor);
    expect((await publish(suit.id)).publishedAt).toEqual(first);
  });

  it.each([
    ['no price', { price: null }, { price: ['Add a price before publishing'] }],
    [
      'no colour family',
      { colorFamily: null },
      { colorFamily: ['Add a colour before publishing'] },
    ],
    ['no main colour', { mainColor: null }, { colorFamily: ['Add a colour before publishing'] }],
  ])('refuses a suit with %s', async (_, change, errors) => {
    const suit = await ready(change);
    expect(await fieldErrors(publish(suit.id))).toEqual(errors);
  });

  it('refuses a suit with no main photo', async () => {
    const suit = await makeProduct(db, { price: 4500, mainColor: 'Black', colorFamily: 'Black' });
    await makeMedia(db, { productId: suit.id });
    expect(await fieldErrors(publish(suit.id))).toEqual({ media: ['Choose a main photo'] });
  });

  it('refuses a suit with a photo or video missing its alt text', async () => {
    const suit = await ready();
    await makeMedia(db, { productId: suit.id, kind: 'video', alt: ' ' });
    expect(await fieldErrors(publish(suit.id))).toEqual({
      media: ['Add alt text to every photo and video'],
    });
  });

  it.each([
    ['name', { name: 'Khaadi Style Black Suit' }],
    ['description', { description: 'As seen at Elaf' }],
    ['careInstructions', { careInstructions: 'Wash like Nishat' }],
    ['motifs', { motifs: ['So Kamal border'] }],
    ['seoTitle', { seoTitle: 'Maria B black suit' }],
  ])(
    'refuses a banned brand name in %s, even one saved before the check',
    async (field, change) => {
      const suit = await ready(change);
      expect(Object.keys((await fieldErrors(publish(suit.id)))!)).toEqual([field]);
    },
  );

  it('refuses a banned brand name in media alt text', async () => {
    const suit = await ready();
    await makeMedia(db, { productId: suit.id, alt: 'Baroque model in black' });
    expect(await fieldErrors(publish(suit.id))).toEqual({
      media: ['Remove the brand name “Baroque”'],
    });
  });

  it('lists every problem at once', async () => {
    const suit = await makeProduct(db, { price: null, mainColor: null, colorFamily: null });
    expect(Object.keys((await fieldErrors(publish(suit.id)))!).sort()).toEqual([
      'colorFamily',
      'media',
      'price',
    ]);
  });

  it('changes and records nothing when refused', async () => {
    const suit = await ready({ price: null });
    await publish(suit.id).catch(() => undefined);
    const [row] = await db.select().from(product).where(eq(product.id, suit.id));
    expect(row!.status).toBe('draft');
    expect(await actions()).toEqual([]);
  });

  it('asks for a restore before an archived suit is published', async () => {
    const suit = await ready({ status: 'archived' });
    expect(await fieldErrors(publish(suit.id))).toEqual({
      status: ['Restore the suit, then publish it'],
    });
  });
});

describe('other status changes', () => {
  it('unpublishes to a draft, off the site', async () => {
    const suit = await ready();
    await publish(suit.id);
    expect((await products.setStatus(db, { id: suit.id, status: 'draft' }, actor)).status).toBe(
      'draft',
    );
    expect(await products.getBySlug(db, suit.slug)).toBeNull();
    expect(await actions()).toEqual(['product.publish', 'product.unpublish']);
  });

  it('archives and restores through setStatus too', async () => {
    const suit = await ready();
    await products.setStatus(db, { id: suit.id, status: 'archived' }, actor);
    await products.setStatus(db, { id: suit.id, status: 'draft' }, actor);
    expect(await actions()).toEqual(['product.archive', 'product.restore']);
  });

  it('does nothing when the status is already set', async () => {
    const suit = await ready();
    expect((await products.setStatus(db, { id: suit.id, status: 'draft' }, actor)).status).toBe(
      'draft',
    );
    expect(await actions()).toEqual([]);
  });

  it('reports a missing suit as not found', async () => {
    const e = await products
      .setStatus(db, { id: 'missing', status: 'published' }, actor)
      .catch((x) => x);
    expect(e).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('keeps media rows when unpublishing', async () => {
    const suit = await ready();
    await publish(suit.id);
    await products.setStatus(db, { id: suit.id, status: 'draft' }, actor);
    expect(
      await db.select().from(productMedia).where(eq(productMedia.productId, suit.id)),
    ).toHaveLength(1);
  });
});

describe('check: items', () => {
  const ready = (checks: unknown) =>
    makeProduct(db, {
      published: true,
      status: 'draft',
      publishedAt: null,
      attributes: { checks },
    });

  const publishError = (id: string) =>
    products.setStatus(db, { id, status: 'published' }, actor).then(
      () => null,
      (error: unknown) => (error instanceof CoreError ? error.fieldErrors : error),
    );

  it('blocks publishing while any check is open, saying how many', async () => {
    const suit = await ready(['Confirm the trouser fabric', 'Corner flowers: a brand mark?']);
    expect(await publishError(suit.id)).toMatchObject({
      checks: ['Clear the 2 open checks first'],
    });
  });

  it('clears checks one at a time with an audit row, then lets the suit publish', async () => {
    const suit = await ready(['Confirm the trouser fabric', 'Corner flowers: a brand mark?']);
    await products.clearCheck(db, { id: suit.id, check: 'Confirm the trouser fabric' }, actor);
    expect(await publishError(suit.id)).toMatchObject({ checks: ['Clear the open check first'] });
    const row = await products.clearCheck(
      db,
      { id: suit.id, check: 'Corner flowers: a brand mark?' },
      actor,
    );
    expect(row.attributes).toEqual({ checks: [] });
    expect(await publishError(suit.id)).toBeNull();
    const clears = (await db.select().from(auditLog)).filter(
      (r) => r.action === 'product.check.clear',
    );
    expect(clears).toHaveLength(2);
    expect(clears[0]!.changes).toMatchObject({ before: { check: 'Confirm the trouser fabric' } });
  });

  it('answers NOT_FOUND for a check the suit does not have', async () => {
    const suit = await ready(['Confirm the trouser fabric']);
    await expect(
      products.clearCheck(db, { id: suit.id, check: 'Something else' }, actor),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('treats checks that are not a list of text as none', async () => {
    expect(products.openChecks({ checks: 'oops' })).toEqual([]);
    expect(products.openChecks({ checks: ['a', 3, null] })).toEqual(['a']);
    expect(products.openChecks({})).toEqual([]);
  });
});

describe('brand names in piece details', () => {
  it('blocks publishing when an imported piece row names another brand', async () => {
    const suit = await makeProduct(db, {
      published: true,
      status: 'draft',
      publishedAt: null,
      pieceDetails: [{ piece: 'shirt', fabric: 'Khaddar', finish: 'Sobia Waseem embroidery' }],
    });
    await expect(
      products.setStatus(db, { id: suit.id, status: 'published' }, actor),
    ).rejects.toMatchObject({
      fieldErrors: { pieceDetails: ['Remove the brand name “Sobia Waseem”'] },
    });
  });
});
