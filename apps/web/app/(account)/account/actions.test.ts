// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ value: null as unknown }));
const allowed = vi.hoisted(() => ({ value: true }));
const verifyPassword = vi.hoisted(() => vi.fn(async () => ({ status: true })));
const jar = vi.hoisted(() => ({
  names: ['ma.session_token', '__Secure-ma.session_data', 'other'],
  deleted: [] as string[],
}));
const account = vi.hoisted(() => ({
  setSaved: vi.fn(async (_db: unknown, _id: string, input: { saved: boolean }) => ({
    saved: input.saved,
  })),
  updateProfile: vi.fn(async () => ({ id: 'u1', name: 'Ayesha K', phone: null })),
  deleteAccount: vi.fn(async () => {}),
}));

vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
  cookies: async () => ({
    getAll: () => jar.names.map((name) => ({ name })),
    delete: (name: string) => jar.deleted.push(name),
  }),
}));
vi.mock('@mustafa/db/client', () => ({ getDb: () => 'db' }));
vi.mock('@mustafa/core/account', () => account);
// The real guard, over a session the test chooses.
vi.mock('../../../lib/auth', async () => {
  const { requireUser } = await import('@mustafa/auth/guards');
  return {
    currentCustomer: async () => {
      try {
        return requireUser(session.value as never);
      } catch {
        return null;
      }
    },
    getAuth: () => ({ api: { verifyPassword } }),
  };
});
vi.mock('../../../lib/services', () => ({ withinLimit: async () => allowed.value }));

import { deleteAccount, toggleWishlist, updateProfile } from './actions';

const signedIn = (createdAgoMs = 60_000, user: Record<string, unknown> = {}, app = 'web') => ({
  user: { id: 'u1', emailVerified: true, role: 'customer', banned: false, ...user },
  session: { createdAt: new Date(Date.now() - createdAgoMs), app },
});

beforeEach(() => {
  session.value = signedIn();
  allowed.value = true;
  jar.deleted = [];
  verifyPassword.mockClear();
  Object.values(account).forEach((fn) => fn.mockClear());
});

describe('toggleWishlist', () => {
  it('saves for the signed-in customer, by the session’s id only', async () => {
    expect(await toggleWishlist({ productId: 'p1', saved: true })).toEqual({
      ok: true,
      data: { saved: true },
    });
    expect(account.setSaved).toHaveBeenCalledWith('db', 'u1', { productId: 'p1', saved: true });
  });

  it('refuses a guest, a user id in the input, and too many taps', async () => {
    session.value = null;
    expect(await toggleWishlist({ productId: 'p1', saved: true })).toMatchObject({
      ok: false,
      error: { code: 'UNAUTHENTICATED' },
    });
    session.value = signedIn();
    expect(await toggleWishlist({ productId: 'p1', saved: true, userId: 'u2' })).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION' },
    });
    allowed.value = false;
    expect(await toggleWishlist({ productId: 'p1', saved: true })).toMatchObject({
      ok: false,
      error: { code: 'RATE_LIMITED' },
    });
    expect(account.setSaved).not.toHaveBeenCalled();
  });
});

describe('who may use them (the full guard, ADR-020)', () => {
  it.each([
    ['a banned customer', signedIn(60_000, { banned: true })],
    ['an admin account', signedIn(60_000, { role: 'admin' })],
    ['an admin-app session', signedIn(60_000, {}, 'admin')],
  ])('refuses %s as signed out', async (_name, value) => {
    session.value = value;
    for (const result of [
      await toggleWishlist({ productId: 'p1', saved: true }),
      await updateProfile({ name: 'Ayesha', phone: '' }),
      await deleteAccount({ confirm: 'DELETE', password: 'pw' }),
    ]) {
      expect(result).toMatchObject({ ok: false, error: { code: 'UNAUTHENTICATED' } });
    }
    expect(account.setSaved).not.toHaveBeenCalled();
    expect(account.deleteAccount).not.toHaveBeenCalled();
  });
});

describe('updateProfile', () => {
  it('saves a name and a blank phone as none', async () => {
    expect(await updateProfile({ name: 'Ayesha K', phone: '' })).toMatchObject({ ok: true });
    expect(account.updateProfile).toHaveBeenCalledWith('db', 'u1', {
      name: 'Ayesha K',
      phone: null,
    });
  });
});

describe('deleteAccount', () => {
  it('checks the password, deletes, and clears only the shop’s session cookies', async () => {
    expect(await deleteAccount({ confirm: 'DELETE', password: 'pw' })).toEqual({
      ok: true,
      data: { deleted: true },
    });
    expect(verifyPassword).toHaveBeenCalledWith(
      expect.objectContaining({ body: { password: 'pw' } }),
    );
    expect(account.deleteAccount).toHaveBeenCalledWith('db', 'u1');
    expect(jar.deleted).toEqual(['ma.session_token', '__Secure-ma.session_data']);
  });

  it('refuses a wrong password, a missing DELETE, and a session older than a day', async () => {
    verifyPassword.mockRejectedValueOnce(new Error('INVALID_PASSWORD'));
    expect(await deleteAccount({ confirm: 'DELETE', password: 'wrong' })).toMatchObject({
      ok: false,
      error: { fieldErrors: { password: ['That password is not right'] } },
    });
    expect(await deleteAccount({ confirm: 'delete', password: 'pw' })).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION' },
    });
    session.value = signedIn(25 * 60 * 60 * 1000);
    expect(await deleteAccount({ confirm: 'DELETE', password: 'pw' })).toMatchObject({
      ok: false,
      error: { code: 'FORBIDDEN' },
    });
    expect(account.deleteAccount).not.toHaveBeenCalled();
  });

  it('hides unexpected errors behind INTERNAL', async () => {
    account.deleteAccount.mockRejectedValueOnce(new Error('relation "user" does not exist'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await deleteAccount({ confirm: 'DELETE', password: 'pw' });
    expect(result).toMatchObject({ ok: false, error: { code: 'INTERNAL' } });
    error.mockRestore();
  });
});
