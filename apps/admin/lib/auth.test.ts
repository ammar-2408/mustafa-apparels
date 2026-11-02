// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
const createAuth = vi.hoisted(() => vi.fn());
const getSession = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn((to: string) => {
    throw new Error(`redirect:${to}`);
  }),
);

vi.mock('server-only', () => ({}));
vi.mock('@mustafa/config/env', () => ({ getEnv: () => env.value }));
vi.mock('@mustafa/db/client', () => ({ getDb: () => 'db' }));
vi.mock('@mustafa/auth', () => ({ createAuth }));
vi.mock('@mustafa/core/integrations/email', () => ({ createMailer: () => 'mailer' }));
vi.mock('@mustafa/core/integrations/rate-limit', () => ({ createLimiter: () => 'limiter' }));
vi.mock('@mustafa/core/integrations/breached-passwords', () => ({
  createBreachCheck: () => 'breach-check',
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('next/server', () => ({ after: vi.fn() }));

const withDatabase = {
  INTEGRATIONS_MODE: 'mock',
  APP_ENV: 'test',
  DATABASE_URL: 'postgresql://localhost/shop',
  BETTER_AUTH_SECRET: 's'.repeat(40),
  ADMIN_URL: 'https://admin.mustafaapparels.com',
};

const session = (user: Record<string, unknown> = {}, app = 'admin') => ({
  user: { id: 'a1', role: 'admin', banned: false, twoFactorEnabled: true, ...user },
  session: { app },
});

const load = async (current: unknown = null) => {
  vi.resetModules();
  getSession.mockResolvedValueOnce(current);
  return import('./auth');
};

beforeEach(() => {
  env.value = withDatabase;
  createAuth.mockReset().mockReturnValue({ api: { getSession } });
  getSession.mockReset();
});

describe('getAuth', () => {
  it('is null in mock mode with no database', async () => {
    env.value = { INTEGRATIONS_MODE: 'mock', ADMIN_URL: 'http://localhost:3001' };
    const { getAuth, getSession: read } = await load();
    expect(getAuth()).toBeNull();
    expect(await read()).toBeNull();
  });

  it('builds the admin instance once, at ADMIN_URL', async () => {
    const { getAuth } = await load();
    expect(getAuth()).toBe(getAuth());
    expect(createAuth).toHaveBeenCalledTimes(1);
    expect(createAuth.mock.calls[0]![0]).toMatchObject({
      app: 'admin',
      baseURL: 'https://admin.mustafaapparels.com',
      sendEmail: 'mailer',
      limiter: 'limiter',
      isBreached: 'breach-check',
    });
  });
});

describe('requireAdmin', () => {
  it('returns an admin session with 2FA', async () => {
    const current = session();
    expect(await (await load(current)).requireAdmin()).toBe(current);
  });

  it.each([
    ['signed out', null, 'UNAUTHENTICATED'],
    ['a customer', session({ role: 'customer' }), 'FORBIDDEN'],
    ['a storefront session', session({}, 'web'), 'FORBIDDEN'],
    ['an admin without 2FA', session({ twoFactorEnabled: false }), 'FORBIDDEN'],
  ])('refuses %s', async (_name, current, code) => {
    await expect((await load(current)).requireAdmin()).rejects.toMatchObject({ code });
  });
});

describe('requireAdminPage', () => {
  it.each([
    ['signed out', null, '/login'],
    ['a customer', session({ role: 'customer' }), '/login'],
    ['an admin without 2FA', session({ twoFactorEnabled: false }), '/setup-2fa'],
  ])('sends %s to %s', async (_name, current, to) => {
    await expect((await load(current)).requireAdminPage()).rejects.toThrow(`redirect:${to}`);
  });

  it('lets an admin with 2FA in', async () => {
    const current = session();
    expect(await (await load(current)).requireAdminPage()).toBe(current);
  });
});
