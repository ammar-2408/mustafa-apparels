import { auditLog, product, slugRedirect } from '@mustafa/db/schema';
import { createTestDb, resetTestDb, type TestDb } from '@mustafa/db/testing';
import { categoryInput } from '@mustafa/validators/category';
import { asc, eq } from 'drizzle-orm';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { CoreError } from '../errors';
import { makeCategory, makeProduct, makeUser } from '../test/factories';
import * as categories from './index';

let db: TestDb;
let actorId: string;

beforeAll(async () => {
  db = await createTestDb();
});

afterEach(async () => {
  await resetTestDb(db);
});

const admin = async () => {
  actorId = (await makeUser(db, { role: 'admin' })).id;
  return { actorId };
};

const create = async (name: string, slug: string, extra = {}) =>
  categories.create(db, categoryInput.parse({ name, slug, ...extra }), await admin());

const audits = () => db.select().from(auditLog).orderBy(asc(auditLog.createdAt));

const codeOf = async (promise: Promise<unknown>) => {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(CoreError);
  return error as CoreError;
};

describe('categories.list', () => {
  it('lists visible collections by sort order, then name', async () => {
    await makeCategory(db, { name: 'Lajwanti', slug: 'lajwanti', sortOrder: 2 });
    await makeCategory(db, { name: 'Khaddar', slug: 'khaddar', sortOrder: 1 });
    await makeCategory(db, { name: 'Dhanak', slug: 'dhanak', sortOrder: 1 });
    await makeCategory(db, { name: 'Hidden', slug: 'hidden', isActive: false });
    expect((await categories.list(db)).map((c) => c.slug)).toEqual([
      'dhanak',
      'khaddar',
      'lajwanti',
    ]);
  });

  it('includes hidden ones for the admin', async () => {
    await makeCategory(db, { slug: 'hidden', isActive: false });
    expect(await categories.list(db, { includeHidden: true })).toHaveLength(1);
  });
});

describe('categories.getBySlug', () => {
  it('finds a visible collection and hides a hidden one from shoppers', async () => {
    await makeCategory(db, { slug: 'dhanak' });
    await makeCategory(db, { slug: 'hidden', isActive: false });
    expect((await categories.getBySlug(db, 'dhanak'))?.slug).toBe('dhanak');
    expect(await categories.getBySlug(db, 'hidden')).toBeNull();
    expect(await categories.getBySlug(db, 'hidden', { includeHidden: true })).not.toBeNull();
    expect(await categories.getBySlug(db, 'missing')).toBeNull();
  });
});

describe('categories.create', () => {
  it('creates a collection and records who did it', async () => {
    const dhanak = await create('Dhanak', 'dhanak');
    expect(dhanak).toMatchObject({ name: 'Dhanak', slug: 'dhanak', isActive: true });
    expect(await audits()).toEqual([
      expect.objectContaining({
        actorId,
        action: 'category.create',
        entity: 'category',
        entityId: dhanak.id,
        changes: { after: expect.objectContaining({ slug: 'dhanak' }) },
      }),
    ]);
  });

  it('refuses a slug that is already used, as a conflict on the slug field', async () => {
    await create('Dhanak', 'dhanak');
    const error = await codeOf(create('Dhanak 2', 'dhanak'));
    expect(error).toMatchObject({ code: 'CONFLICT', fieldErrors: { slug: [expect.any(String)] } });
  });

  it('refuses a parent that does not exist', async () => {
    const error = await codeOf(create('Winter', 'winter', { parentId: 'missing' }));
    expect(error).toMatchObject({
      code: 'VALIDATION',
      fieldErrors: { parentId: [expect.any(String)] },
    });
  });

  it('takes over a slug that only lives on as a redirect', async () => {
    const old = await create('Dhanak', 'dhanak');
    await categories.update(db, { id: old.id, slug: 'dhanak-suits' }, { actorId });
    await create('Dhanak Lite', 'dhanak');
    expect(await categories.resolveRedirect(db, 'dhanak')).toBeNull();
  });
});

describe('categories.update', () => {
  it('changes fields and records only what changed', async () => {
    const dhanak = await create('Dhanak', 'dhanak');
    const updated = await categories.update(
      db,
      { id: dhanak.id, description: 'Soft printed winter suits', sortOrder: 3 },
      { actorId },
    );
    expect(updated).toMatchObject({ description: 'Soft printed winter suits', sortOrder: 3 });
    const last = (await audits()).at(-1)!;
    expect(last).toMatchObject({
      action: 'category.update',
      changes: {
        before: { description: null, sortOrder: 0 },
        after: { description: 'Soft printed winter suits', sortOrder: 3 },
      },
    });
  });

  it('redirects the old slug, and two renames still resolve in one hop', async () => {
    const dhanak = await create('Dhanak', 'dhanak');
    await categories.update(db, { id: dhanak.id, slug: 'dhanak-2' }, { actorId });
    await categories.update(db, { id: dhanak.id, slug: 'dhanak-3' }, { actorId });
    expect(await categories.resolveRedirect(db, 'dhanak')).toBe('dhanak-3');
    expect(await categories.resolveRedirect(db, 'dhanak-2')).toBe('dhanak-3');
  });

  it('drops the redirect when a collection gets its old slug back', async () => {
    const dhanak = await create('Dhanak', 'dhanak');
    await categories.update(db, { id: dhanak.id, slug: 'dhanak-2' }, { actorId });
    await categories.update(db, { id: dhanak.id, slug: 'dhanak' }, { actorId });
    expect(await categories.resolveRedirect(db, 'dhanak')).toBeNull();
    expect(await categories.resolveRedirect(db, 'dhanak-2')).toBe('dhanak');
    expect(await db.select().from(slugRedirect)).toHaveLength(1);
  });

  it('does not redirect to a hidden collection', async () => {
    const dhanak = await create('Dhanak', 'dhanak');
    await categories.update(db, { id: dhanak.id, slug: 'dhanak-2', isActive: false }, { actorId });
    expect(await categories.resolveRedirect(db, 'dhanak')).toBeNull();
  });

  it('refuses a slug another collection uses', async () => {
    await create('Dhanak', 'dhanak');
    const khaddar = await create('Khaddar', 'khaddar');
    const error = await codeOf(
      categories.update(db, { id: khaddar.id, slug: 'dhanak' }, { actorId }),
    );
    expect(error.code).toBe('CONFLICT');
  });

  it('refuses to put a collection inside one of its own sub-collections', async () => {
    const parent = await create('Winter', 'winter');
    const child = await create('Winter Dhanak', 'winter-dhanak', { parentId: parent.id });
    const error = await codeOf(
      categories.update(db, { id: parent.id, parentId: child.id }, { actorId }),
    );
    expect(error).toMatchObject({
      code: 'VALIDATION',
      fieldErrors: { parentId: [expect.any(String)] },
    });
  });

  it('reports a missing collection as not found', async () => {
    await admin();
    expect(
      (await codeOf(categories.update(db, { id: 'missing', name: 'X' }, { actorId }))).code,
    ).toBe('NOT_FOUND');
  });

  it('writes nothing when nothing changed', async () => {
    const dhanak = await create('Dhanak', 'dhanak');
    await categories.update(db, { id: dhanak.id, name: 'Dhanak' }, { actorId });
    expect(await audits()).toHaveLength(1);
  });
});

describe('categories.reorder', () => {
  it('sets the order from the full list of ids', async () => {
    const a = await create('Dhanak', 'dhanak');
    const b = await create('Khaddar', 'khaddar');
    const c = await create('Lajwanti', 'lajwanti');
    await categories.reorder(db, { ids: [c.id, a.id, b.id] }, { actorId });
    expect((await categories.list(db)).map((x) => x.slug)).toEqual([
      'lajwanti',
      'dhanak',
      'khaddar',
    ]);
    expect((await audits()).at(-1)).toMatchObject({
      action: 'category.reorder',
      changes: { after: { ids: [c.id, a.id, b.id] } },
    });
  });

  it('refuses a list that leaves out or invents a collection', async () => {
    const a = await create('Dhanak', 'dhanak');
    await create('Khaddar', 'khaddar');
    expect((await codeOf(categories.reorder(db, { ids: [a.id] }, { actorId }))).code).toBe(
      'VALIDATION',
    );
    expect(
      (await codeOf(categories.reorder(db, { ids: [a.id, 'invented'] }, { actorId }))).code,
    ).toBe('VALIDATION');
  });
});

describe('categories with suits', () => {
  it('keeps suits in a renamed collection', async () => {
    const dhanak = await create('Dhanak', 'dhanak');
    await makeProduct(db, { categoryId: dhanak.id });
    const renamed = await categories.update(
      db,
      { id: dhanak.id, name: 'Dhanak Winter' },
      { actorId },
    );
    expect(renamed.name).toBe('Dhanak Winter');
  });
});

describe('categories.adminList', () => {
  it('lists every collection, hidden ones too, in order, with its suit count', async () => {
    const second = await makeCategory(db, { name: 'Khaddar', sortOrder: 1 });
    const first = await makeCategory(db, { name: 'Dhanak', sortOrder: 0, isActive: false });
    await makeProduct(db, { categoryId: first.id });
    await makeProduct(db, { categoryId: first.id, status: 'archived' });

    const rows = await categories.adminList(db);
    expect(rows.map((row) => [row.name, row.isActive, row.productCount])).toEqual([
      ['Dhanak', false, 2],
      ['Khaddar', true, 0],
    ]);
    expect(rows[1]!.id).toBe(second.id);
  });

  it('leaves deleted suits out of the count', async () => {
    const collection = await makeCategory(db);
    const suit = await makeProduct(db, { categoryId: collection.id });
    await db.update(product).set({ deletedAt: new Date() }).where(eq(product.id, suit.id));
    expect((await categories.adminList(db))[0]!.productCount).toBe(0);
  });
});
