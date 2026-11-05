// @vitest-environment node
import { makeUser } from '@mustafa/core/test/factories';
import { auditLog, siteSetting } from '@mustafa/db/schema';
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

import { updateSiteSettings } from './actions';

let db: TestDb;

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

const stored = async (key: string) =>
  (await db.select().from(siteSetting).where(eq(siteSetting.key, key)))[0]?.value;

describe('updateSiteSettings', () => {
  it('saves WhatsApp as E.164 and refreshes every storefront page', async () => {
    expect(await updateSiteSettings({ key: 'whatsapp', value: '0300 1234567' })).toEqual({
      ok: true,
      data: { key: 'whatsapp' },
    });
    expect(await stored('whatsapp')).toBe('+923001234567');
    expect(revalidateStorefront).toHaveBeenCalledWith(['settings']);
  });

  it('writes no audit row when the value is the same', async () => {
    await updateSiteSettings({ key: 'email', value: 'Shop@Example.com' });
    await updateSiteSettings({ key: 'email', value: 'shop@example.com' });
    expect(await stored('email')).toBe('shop@example.com');
    expect(await db.select().from(auditLog)).toHaveLength(1);
  });

  it.each([
    ['a landline as WhatsApp', { key: 'whatsapp', value: '042 1234567' }],
    ['a bad email', { key: 'email', value: 'not-an-email' }],
    [
      'a brand name in the delivery text',
      { key: 'delivery_info', value: 'Delivered like Khaadi orders' },
    ],
    ['an http social link', { key: 'socials', value: { instagram: 'http://instagram.com/x' } }],
    ['an unknown key', { key: 'address', value: 'Lahore' }],
    ['an empty reply note', { key: 'reply_note', value: '' }],
  ])('refuses %s', async (_name, input) => {
    expect(await updateSiteSettings(input)).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION' },
    });
    expect(await db.select().from(siteSetting)).toHaveLength(0);
  });
});
