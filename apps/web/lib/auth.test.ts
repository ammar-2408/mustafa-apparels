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
vi.mock('@mustafa/core/integrations/email', () => ({
  createMailer: (options: unknown) => ({ options }),
}));
vi.mock('@mustafa/core/integrations/rate-limit', () => ({
  createLimiter: (options: unknown) => ({ options }),
}));
vi.mock('@mustafa/core/integrations/breached-passwords', () => ({
  createBreachCheck: (options: unknown) => ({ options }),
}));
const readHeaders = vi.hoisted(() =>
  vi.fn(async () => new Headers({ cookie: 'ma.session_token=x' })),
);
vi.mock('next/headers', () => ({ headers: readHeaders }));
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('next/server', () => ({ after: vi.fn() }));

const withDatabase = {
  INTEGRATIONS_MODE: 'mock',
  APP_ENV: 'test',
  EMAIL_FROM: 'Shop <a@example.com>',
  DATABASE_URL: 'postgresql://localhost/shop',
  BETTER_AUTH_SECRET: 's'.repeat(40),
  NEXT_PUBLIC_SITE_URL: 'https://mustafaapparels.com',
};

const load = () => import('./auth');

beforeEach(() => {
  vi.resetModules();
  createAuth.mockReset().mockReturnValue({ api: { getSession } });
  getSession.mockReset();
});

describe('getAuth', () => {
  it('is null in mock mode with no database', async () => {
    env.value = { INTEGRATIONS_MODE: 'mock' };
    const { getAuth, getSession: session } = await load();
    expect(getAuth()).toBeNull();
    expect(await session()).toBeNull();
    expect(createAuth).not.toHaveBeenCalled();
  });

  it('builds the web instance once, at the site URL', async () => {
    env.value = withDatabase;
    const { getAuth } = await load();
    expect(getAuth()).toBe(getAuth());
    expect(createAuth).toHaveBeenCalledTimes(1);
    expect(createAuth.mock.calls[0]![0]).toMatchObject({
      app: 'web',
      db: 'db',
      baseURL: 'https://mustafaapparels.com',
      secret: 's'.repeat(40),
      sendEmail: { options: { mode: 'mock', appEnv: 'test', from: 'Shop <a@example.com>' } },
      limiter: { options: { mode: 'mock', appEnv: 'test', secret: 's'.repeat(40) } },
      isBreached: { options: { mode: 'mock' } },
    });
  });
});

describe('session helpers', () => {
  const signedIn = { user: { id: 'u1', banned: false }, session: { app: 'web' } };

  it('requireUser returns the session, or throws UNAUTHENTICATED', async () => {
    env.value = withDatabase;
    getSession.mockResolvedValueOnce(signedIn);
    const { requireUser } = await load();
    expect(await requireUser()).toBe(signedIn);

    vi.resetModules();
    getSession.mockResolvedValueOnce(null);
    const again = await load();
    await expect(again.requireUser()).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('passes the request cookies to Better Auth', async () => {
    env.value = withDatabase;
    getSession.mockResolvedValueOnce(signedIn);
    await (await load()).getSession();
    expect(getSession.mock.calls[0]![0].headers.get('cookie')).toBe('ma.session_token=x');
  });

  it('requireUserPage sends a signed-out or banned visitor to /login', async () => {
    env.value = withDatabase;
    getSession.mockResolvedValueOnce(null);
    await expect((await load()).requireUserPage()).rejects.toThrow('redirect:/login');

    vi.resetModules();
    getSession.mockResolvedValueOnce({ ...signedIn, user: { id: 'u1', banned: true } });
    await expect((await load()).requireUserPage()).rejects.toThrow('redirect:/login');

    vi.resetModules();
    getSession.mockResolvedValueOnce({ ...signedIn, session: { app: 'admin' } });
    await expect((await load()).requireUserPage()).rejects.toThrow('redirect:/login');

    vi.resetModules();
    getSession.mockResolvedValueOnce(signedIn);
    expect(await (await load()).requireUserPage()).toBe(signedIn);
  });

  it('currentCustomer gives the same answer as the guard, as null instead of an error', async () => {
    env.value = withDatabase;
    for (const refused of [
      null,
      { ...signedIn, user: { id: 'u1', banned: true } },
      { ...signedIn, user: { id: 'u1', role: 'admin' } },
      { ...signedIn, session: { app: 'admin' } },
    ]) {
      vi.resetModules();
      getSession.mockResolvedValueOnce(refused);
      expect(await (await load()).currentCustomer()).toBeNull();
    }
    vi.resetModules();
    getSession.mockResolvedValueOnce(signedIn);
    expect(await (await load()).currentCustomer()).toBe(signedIn);
  });
});

it('reads the request even when auth is off, so the page stays per-request', async () => {
  env.value = { INTEGRATIONS_MODE: 'mock' };
  readHeaders.mockClear();
  vi.resetModules();
  expect(await (await import('./auth')).getSession()).toBeNull();
  expect(readHeaders).toHaveBeenCalledTimes(1);
});
