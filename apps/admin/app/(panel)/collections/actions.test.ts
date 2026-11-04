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

import { createCategory, reorderCategories, setCategoryActive, updateCategory } from './actions';

let db: TestDb;

// PGlite start-up can take a while on a busy machine (docs/debugging.md).
beforeAll(async () => {
  db = await createTestDb();
  state.db = db;
}, 60_000);

beforeEach(async () => {
  state.adminId = (await makeUser(db, { role: 'admin' })).id;
  revalidateStorefront.mockClear();
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
