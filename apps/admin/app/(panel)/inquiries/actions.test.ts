// @vitest-environment node
import { makeUser } from '@mustafa/core/test/factories';
import { auditLog, inquiry } from '@mustafa/db/schema';
import { createTestDb, resetTestDb, type TestDb } from '@mustafa/db/testing';
import { eq } from 'drizzle-orm';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ db: null as unknown, adminId: 'a1' }));
const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath }));
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

import { setInquiryStatus } from './actions';

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
  state.db = db;
}, 60_000);

beforeEach(async () => {
  state.adminId = (await makeUser(db, { role: 'admin' })).id;
  revalidatePath.mockClear();
});

afterEach(async () => {
  await resetTestDb(db);
});

describe('setInquiryStatus', () => {
  it('moves an inquiry, records who did it, and refreshes the inbox and dashboard', async () => {
    const [row] = await db
      .insert(inquiry)
      .values({ name: 'Ayesha', phone: '+923001234567', message: 'Available?' })
      .returning();
    expect(await setInquiryStatus({ id: row!.id, status: 'contacted' })).toEqual({
      ok: true,
      data: { id: row!.id, status: 'contacted' },
    });
    expect((await db.select().from(inquiry).where(eq(inquiry.id, row!.id)))[0]?.status).toBe(
      'contacted',
    );
    expect((await db.select().from(auditLog))[0]).toMatchObject({ actorId: state.adminId });
    expect(revalidatePath).toHaveBeenCalledWith('/inquiries');
  });

  it('refuses an unknown status, extra fields and a missing inquiry', async () => {
    expect(await setInquiryStatus({ id: 'x', status: 'spam' })).toMatchObject({
      error: { code: 'VALIDATION' },
    });
    expect(await setInquiryStatus({ id: 'x', status: 'closed', name: 'y' })).toMatchObject({
      error: { code: 'VALIDATION' },
    });
    expect(await setInquiryStatus({ id: 'missing', status: 'closed' })).toMatchObject({
      error: { code: 'NOT_FOUND' },
    });
  });
});
