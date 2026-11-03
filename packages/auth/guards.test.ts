import { CoreError } from '@mustafa/core/errors';
import { describe, expect, it } from 'vitest';

import { adminAccess, assertOwner, requireAdmin, requireUser } from './guards';

const session = (user: Record<string, unknown> = {}) => ({
  user: { id: 'u1', role: 'customer', banned: false, ...user },
  session: { app: 'web' },
});

const codeOf = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(CoreError);
    return (error as CoreError).code;
  }
  throw new Error('expected a throw');
};

describe('requireUser', () => {
  it('returns the session of a signed-in user', () => {
    const current = session();
    expect(requireUser(current)).toBe(current);
  });

  it('throws UNAUTHENTICATED with no session', () => {
    expect(codeOf(() => requireUser(null))).toBe('UNAUTHENTICATED');
  });

  it('accepts only storefront sessions of customer accounts', () => {
    const adminSession = { ...session(), session: { app: 'admin' } };
    expect(codeOf(() => requireUser(adminSession))).toBe('UNAUTHENTICATED');
    expect(codeOf(() => requireUser(session({ role: 'admin' })))).toBe('UNAUTHENTICATED');
  });

  it('treats a banned user as signed out', () => {
    expect(codeOf(() => requireUser(session({ banned: true })))).toBe('UNAUTHENTICATED');
  });
});

describe('assertOwner', () => {
  it('passes for the owner', () => {
    expect(() => assertOwner('u1', 'u1')).not.toThrow();
  });

  it('throws FORBIDDEN for anyone else, including a missing owner', () => {
    expect(codeOf(() => assertOwner('u1', 'u2'))).toBe('FORBIDDEN');
    expect(codeOf(() => assertOwner('u1', null))).toBe('FORBIDDEN');
  });
});

describe('adminAccess and requireAdmin', () => {
  const admin = (user: Record<string, unknown> = {}, app = 'admin') => ({
    user: { id: 'a1', role: 'admin', banned: false, twoFactorEnabled: true, ...user },
    session: { app },
  });

  it('lets a signed-in admin with 2FA through', () => {
    const current = admin();
    expect(adminAccess(current)).toBe('ok');
    expect(requireAdmin(current)).toBe(current);
  });

  it('treats no session as signed out', () => {
    expect(adminAccess(null)).toBe('signed-out');
    expect(codeOf(() => requireAdmin(null))).toBe('UNAUTHENTICATED');
  });

  it.each([
    ['a customer', admin({ role: 'customer' })],
    ['a banned admin', admin({ banned: true })],
    ['a storefront session, even for an admin', admin({}, 'web')],
    ['a session with no app recorded', admin({}, '')],
  ])('refuses %s with FORBIDDEN', (_name, current) => {
    expect(adminAccess(current)).toBe('forbidden');
    expect(codeOf(() => requireAdmin(current))).toBe('FORBIDDEN');
  });

  it('sends an admin without 2FA to set it up, and refuses everything else', () => {
    const current = admin({ twoFactorEnabled: false });
    expect(adminAccess(current)).toBe('needs-2fa');
    expect(codeOf(() => requireAdmin(current))).toBe('FORBIDDEN');
  });
});
