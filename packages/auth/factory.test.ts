// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createAuth = vi.hoisted(() => vi.fn(() => 'auth'));
const createMailer = vi.hoisted(() => vi.fn(() => 'mailer'));
const createLimiter = vi.hoisted(() => vi.fn(() => 'limiter'));

vi.mock('server-only', () => ({}));
vi.mock('./index', () => ({ createAuth }));
vi.mock('@mustafa/core/integrations/email', () => ({ createMailer }));
vi.mock('@mustafa/core/integrations/rate-limit', () => ({ createLimiter }));
vi.mock('@mustafa/core/integrations/breached-passwords', () => ({
  createBreachCheck: () => 'breach-check',
}));

const { authFromEnv } = await import('./factory');

const base = {
  INTEGRATIONS_MODE: 'mock' as const,
  APP_ENV: 'test',
  DATABASE_URL: 'postgresql://localhost/shop',
  BETTER_AUTH_SECRET: 's'.repeat(40),
  NEXT_PUBLIC_SITE_URL: 'https://mustafaapparels.com',
  ADMIN_URL: 'https://admin.mustafaapparels.com',
  EMAIL_FROM: 'Mustafa Apparels <hello@updates.mustafaapparels.com>',
};

const db = vi.fn(() => 'db' as never);

beforeEach(() => {
  createAuth.mockClear();
  createMailer.mockClear();
  createLimiter.mockClear();
  db.mockClear();
});

describe('authFromEnv', () => {
  it.each(['DATABASE_URL', 'BETTER_AUTH_SECRET'] as const)(
    'is null without %s, and never opens the database',
    (name) => {
      expect(authFromEnv('web', { ...base, [name]: undefined }, { db })).toBeNull();
      expect(db).not.toHaveBeenCalled();
      expect(createAuth).not.toHaveBeenCalled();
    },
  );

  it('needs the base URL of its own app', () => {
    expect(authFromEnv('admin', { ...base, ADMIN_URL: undefined }, { db })).toBeNull();
    expect(authFromEnv('web', { ...base, NEXT_PUBLIC_SITE_URL: undefined }, { db })).toBeNull();
  });

  it('builds the storefront on the site URL and the admin on ADMIN_URL', () => {
    authFromEnv('web', base, { db });
    authFromEnv('admin', base, { db });
    expect(createAuth.mock.calls.map((c) => (c as unknown[])[0])).toMatchObject([
      { app: 'web', baseURL: 'https://mustafaapparels.com' },
      { app: 'admin', baseURL: 'https://admin.mustafaapparels.com' },
    ]);
  });

  it('wires the mailer, limiter, breach check and background runner from the env', () => {
    const background = vi.fn();
    expect(authFromEnv('admin', base, { db, background })).toBe('auth');
    expect(createAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        db: 'db',
        secret: base.BETTER_AUTH_SECRET,
        sendEmail: 'mailer',
        limiter: 'limiter',
        isBreached: 'breach-check',
        background,
      }),
    );
    expect(createMailer).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'mock', appEnv: 'test', from: base.EMAIL_FROM }),
    );
    expect(createLimiter).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'mock', secret: base.BETTER_AUTH_SECRET }),
    );
  });
});
