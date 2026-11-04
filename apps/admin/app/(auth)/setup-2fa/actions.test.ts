// @vitest-environment node
import { APIError } from 'better-auth/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSession = vi.hoisted(() => vi.fn());
const enableTwoFactor = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
const auth = vi.hoisted(() => ({ on: true }));
vi.mock('../../../lib/auth', () => ({
  getSession,
  getAuth: () => (auth.on ? { api: { enableTwoFactor } } : null),
}));

const enforceLimit = vi.hoisted(() => vi.fn());
vi.mock('../../../lib/limits', () => ({
  ADMIN_LIMITS: { twoFactorSetup: { name: 'admin-2fa-setup' } },
  enforceLimit,
}));

import { CoreError } from '@mustafa/core/errors';

import { startTwoFactorSetup } from './actions';

const session = (user: Record<string, unknown> = {}, app = 'admin') => ({
  user: { id: 'a1', role: 'admin', banned: false, twoFactorEnabled: false, ...user },
  session: { app },
});

const URI = 'otpauth://totp/Mustafa%20Apparels%20Admin:owner?secret=JBSWY3DPEHPK3PXP&issuer=x';

beforeEach(() => {
  auth.on = true;
  enforceLimit.mockReset().mockResolvedValue(undefined);
  getSession.mockReset();
  enableTwoFactor.mockReset();
});

describe('startTwoFactorSetup', () => {
  it.each([
    ['signed out', null, 'UNAUTHENTICATED'],
    ['a customer', session({ role: 'customer' }), 'FORBIDDEN'],
    ['a storefront session', session({}, 'web'), 'FORBIDDEN'],
    ['an admin who already has 2FA', session({ twoFactorEnabled: true }), 'CONFLICT'],
  ])('refuses %s before touching the password', async (_name, current, code) => {
    getSession.mockResolvedValue(current);
    const result = await startTwoFactorSetup({ password: 'x' });
    expect(result).toMatchObject({ ok: false, error: { code } });
    expect(enableTwoFactor).not.toHaveBeenCalled();
  });

  it('refuses a missing password or an extra field', async () => {
    getSession.mockResolvedValue(session());
    for (const input of [{}, { password: '' }, { password: 'x', skipVerification: true }]) {
      expect(await startTwoFactorSetup(input)).toMatchObject({
        ok: false,
        error: { code: 'VALIDATION' },
      });
    }
  });

  it('returns a server-drawn QR code, the key and the backup codes', async () => {
    getSession.mockResolvedValue(session());
    enableTwoFactor.mockResolvedValue({ method: 'totp', totpURI: URI, backupCodes: ['a', 'b'] });
    const result = await startTwoFactorSetup({ password: 'correct horse battery' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.qr).toMatch(/^data:image\/png;base64,/);
    expect(result.data.secret).toBe('JBSWY3DPEHPK3PXP');
    expect(result.data.backupCodes).toEqual(['a', 'b']);
    expect(enableTwoFactor.mock.calls[0]![0].body).toEqual({ password: 'correct horse battery' });
  });

  it('says the password is wrong, on the password field', async () => {
    getSession.mockResolvedValue(session());
    enableTwoFactor.mockRejectedValue(
      new APIError('BAD_REQUEST', { code: 'INVALID_PASSWORD', message: 'Invalid password' }),
    );
    expect(await startTwoFactorSetup({ password: 'wrong' })).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION', fieldErrors: { password: ['That password is incorrect'] } },
    });
  });

  it('hides any other failure behind a generic message', async () => {
    getSession.mockResolvedValue(session());
    enableTwoFactor.mockRejectedValue(new Error('connection to db.internal refused'));
    expect(await startTwoFactorSetup({ password: 'x' })).toEqual({
      ok: false,
      error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' },
    });
  });

  it('counts each attempt against the admin and stops before the password check when over', async () => {
    getSession.mockResolvedValue(session());
    enforceLimit.mockRejectedValue(new CoreError('RATE_LIMITED', 'Too many attempts.'));
    expect(await startTwoFactorSetup({ password: 'x' })).toMatchObject({
      ok: false,
      error: { code: 'RATE_LIMITED' },
    });
    expect(enforceLimit).toHaveBeenCalledWith({ name: 'admin-2fa-setup' }, 'a1');
    expect(enableTwoFactor).not.toHaveBeenCalled();
  });

  it('answers UNAVAILABLE when sign-in is not configured', async () => {
    getSession.mockResolvedValue(session());
    auth.on = false;
    expect(await startTwoFactorSetup({ password: 'x' })).toMatchObject({
      ok: false,
      error: { code: 'UNAVAILABLE' },
    });
  });

  it('refuses an unexpected answer from Better Auth', async () => {
    getSession.mockResolvedValue(session());
    enableTwoFactor.mockResolvedValue({ method: 'otp' });
    expect(await startTwoFactorSetup({ password: 'x' })).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL' },
    });
  });
});
