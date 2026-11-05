// @vitest-environment node
// The suit form actions on a real (PGlite) database, signed in as an admin with 2FA.
import { makeCategory, makeUser } from '@mustafa/core/test/factories';
import { auditLog, product, slugRedirect } from '@mustafa/db/schema';
import { createTestDb, resetTestDb, type TestDb } from '@mustafa/db/testing';
import { eq } from 'drizzle-orm';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ db: null as unknown, adminId: 'a1' }));
const revalidateStorefront = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
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

import { createProduct, updateProduct } from './actions';

let db: TestDb;
let categoryId: string;

// PGlite start-up can take a while on a busy machine (docs/debugging.md).
beforeAll(async () => {
  db = await createTestDb();
  state.db = db;
}, 60_000);

beforeEach(async () => {
  state.adminId = (await makeUser(db, { role: 'admin' })).id;
  categoryId = (await makeCategory(db, { name: 'Dhanak', slug: 'dhanak' })).id;
  revalidateStorefront.mockClear();
});

afterEach(async () => {
  await resetTestDb(db);
});

const suit = (extra: Record<string, unknown> = {}) => ({
  name: 'Black Embroidered Dhanak 3-Piece Suit',
  slug: 'black-embroidered-dhanak-3-piece-suit-dhn-01',
  designCode: 'DHN-01',
  price: null,
  compareAtPrice: null,
  categoryId,
  pieces: 'three_piece',
  pieceDetails: [{ piece: 'shirt', fabric: 'Dhanak', finish: 'Embroidered' }],
  collectionType: null,
  dressCategories: ['Unstitched Suits'],
  fabric: 'Dhanak',
  design: ['Embroidered'],
  season: 'winter',
  outfitStyle: null,
  mainColor: null,
  colorFamily: null,
  accentColors: [],
  motifs: [],
  relatedDesignCodes: [],
  availability: 'in_stock',
  featured: false,
  description: 'Embroidered dhanak for winter.',
  careInstructions: '',
  ...extra,
});

const created = async (extra: Record<string, unknown> = {}) => {
  const result = await createProduct(suit(extra));
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.data.id;
};

describe('createProduct', () => {
  it('saves a draft with no price, records who did it, and refreshes the storefront', async () => {
    const id = await created();
    const [row] = await db.select().from(product).where(eq(product.id, id));
    expect(row).toMatchObject({
      status: 'draft',
      price: null,
      designCode: 'DHN-01',
      attributes: {},
    });
    const [audit] = await db.select().from(auditLog);
    expect(audit).toMatchObject({ action: 'product.create', actorId: state.adminId });
    expect(revalidateStorefront).toHaveBeenCalledWith([
      'products',
      `product:${id}`,
      'category:dhanak',
    ]);
  });

  it.each([
    ['name', { name: 'Maria B Dhanak Suit' }],
    ['description', { description: 'Like Khaadi, but for winter.' }],
    ['care', { careInstructions: 'Wash as Sobia Waseem suggests.' }],
    ['main colour', { mainColor: 'Elaf Black' }],
    ['motifs', { motifs: ['Baroque border'] }],
    ['accent colours', { accentColors: ['Nishat blue'] }],
    ['search title', { seoTitle: 'So Kamal style suit' }],
    ['web address', { slug: 'hs-fashion-suit' }],
  ])('refuses another brand name in the %s', async (_field, extra) => {
    expect(await createProduct(suit(extra))).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION' },
    });
    expect(await db.select().from(product)).toHaveLength(0);
  });

  it.each([
    ['publishing straight away', { status: 'published' }],
    ['setting check items', { attributes: { checks: [] } }],
    ['choosing the id', { id: 'mine' }],
    ['a size', { size: 'M' }],
  ])('refuses %s from the form', async (_name, extra) => {
    expect(await createProduct(suit(extra))).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION' },
    });
  });

  it('refuses a taken web address or design code on the right field', async () => {
    await created();
    expect(await createProduct(suit({ designCode: 'DHN-02' }))).toMatchObject({
      ok: false,
      error: { code: 'CONFLICT', fieldErrors: { slug: expect.any(Array) } },
    });
    expect(
      await createProduct(suit({ slug: 'black-embroidered-dhanak-3-piece-suit-dhn-01b' })),
    ).toMatchObject({
      ok: false,
      error: { code: 'CONFLICT', fieldErrors: { designCode: expect.any(Array) } },
    });
  });

  it('refuses a was-price that is not above the price', async () => {
    expect(await createProduct(suit({ price: 5000, compareAtPrice: 4000 }))).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION', fieldErrors: { compareAtPrice: ['Must be higher than price'] } },
    });
  });
});

describe('updateProduct', () => {
  it('changes only the fields sent, keeps the old address as a redirect, and refreshes', async () => {
    const id = await created();
    revalidateStorefront.mockClear();
    expect(
      await updateProduct({ id, price: 4500, slug: 'black-embroidered-dhanak-suit-dhn-01' }),
    ).toEqual({ ok: true, data: { id, slug: 'black-embroidered-dhanak-suit-dhn-01' } });
    const [row] = await db.select().from(product).where(eq(product.id, id));
    expect(row).toMatchObject({
      price: 4500,
      status: 'draft',
      name: 'Black Embroidered Dhanak 3-Piece Suit',
    });
    const [redirect] = await db.select().from(slugRedirect);
    expect(redirect).toMatchObject({
      oldSlug: 'black-embroidered-dhanak-3-piece-suit-dhn-01',
      targetId: id,
    });
    expect(revalidateStorefront).toHaveBeenCalledWith([
      'products',
      `product:${id}`,
      'category:dhanak',
    ]);
  });

  it('refuses a status change and an unknown suit', async () => {
    const id = await created();
    expect(await updateProduct({ id, status: 'published' })).toMatchObject({
      error: { code: 'VALIDATION' },
    });
    expect(await updateProduct({ id: 'missing', price: 1 })).toMatchObject({
      error: { code: 'NOT_FOUND' },
    });
  });
});
