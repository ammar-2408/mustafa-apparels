import { createLimiter, type Limiter } from '@mustafa/core/integrations/rate-limit';
import { account, user } from '@mustafa/db/schema';
import { createTestDb, resetTestDb, type TestDb } from '@mustafa/db/testing';
import { AUTH_MESSAGES } from '@mustafa/validators/auth';
import { hashPassword } from 'better-auth/crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createAuth } from './index';
import { failModeFor } from './limits';
import { outbox, sendEmail } from './test/outbox';

const SECRET = 'test-secret-for-integration-tests-only-0123456789';
const BASE = 'http://localhost:3000';
const PASSWORD = 'correct horse battery staple';
const BREACHED = 'a breached passphrase 1';

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
});
afterEach(async () => {
  outbox.length = 0;
  await resetTestDb(db);
});
afterAll(() => db.$client.close());

const isBreached = async (password: string) => password === BREACHED;
const mockLimiter = () => createLimiter({ mode: 'mock', appEnv: 'test', secret: SECRET });
// Upstash at an address nothing listens on: every call fails quickly.
const downLimiter = (log = vi.fn()) =>
  createLimiter({
    mode: 'live',
    appEnv: 'test',
    secret: SECRET,
    url: 'http://127.0.0.1:9',
    token: 'token',
    timeoutMs: 200,
    log,
  });

const authWith = (limiter: Limiter) =>
  createAuth({ app: 'web', db, baseURL: BASE, secret: SECRET, sendEmail, limiter, isBreached });

const post = (auth: ReturnType<typeof authWith>, path: string, body: unknown, ip = '203.0.113.7') =>
  auth.handler(
    new Request(`${BASE}/api/auth${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: BASE,
        'x-nf-client-connection-ip': ip,
      },
      body: JSON.stringify(body),
    }),
  );

const customer = async (email = 'ayesha@example.com') => {
  const [row] = await db
    .insert(user)
    .values({ name: 'Ayesha', email, emailVerified: true })
    .returning();
  await db.insert(account).values({
    userId: row!.id,
    accountId: row!.id,
    providerId: 'credential',
    password: await hashPassword(PASSWORD),
  });
  return email;
};

describe('failed logins', () => {
  it('refuses the 6th wrong password in 15 minutes for one IP and email, even with the right one', async () => {
    const auth = authWith(mockLimiter());
    const email = await customer();
    for (let i = 0; i < 5; i++) {
      expect(
        (await post(auth, '/sign-in/email', { email, password: 'wrong password' })).status,
      ).toBe(401);
    }
    const blocked = await post(auth, '/sign-in/email', { email, password: PASSWORD });
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toMatchObject({ message: AUTH_MESSAGES.tooManyAttempts });
  });

  it('keeps other emails and other IPs unaffected', async () => {
    const auth = authWith(mockLimiter());
    const email = await customer();
    const other = await customer('zara@example.com');
    for (let i = 0; i < 5; i++)
      await post(auth, '/sign-in/email', { email, password: 'wrong password' });

    expect((await post(auth, '/sign-in/email', { email: other, password: PASSWORD })).status).toBe(
      200,
    );
    expect(
      (await post(auth, '/sign-in/email', { email, password: PASSWORD }, '198.51.100.9')).status,
    ).toBe(200);
  });

  it('never counts successful logins', async () => {
    const auth = authWith(mockLimiter());
    const email = await customer();
    for (let i = 0; i < 7; i++) {
      expect((await post(auth, '/sign-in/email', { email, password: PASSWORD })).status).toBe(200);
    }
  });
});

describe('per-IP limits', () => {
  it('limits sign-up to 5 per 10 minutes per IP', async () => {
    const auth = authWith(mockLimiter());
    const statuses = [];
    for (let i = 0; i < 6; i++) {
      const body = { name: 'Ayesha', email: `a${i}@example.com`, password: PASSWORD };
      statuses.push((await post(auth, '/sign-up/email', body)).status);
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });

  it('limits reset requests to 3 per 15 minutes per IP', async () => {
    const auth = authWith(mockLimiter());
    const statuses = [];
    for (let i = 0; i < 4; i++) {
      const body = { email: `a${i}@example.com`, redirectTo: '/reset-password' };
      statuses.push((await post(auth, '/request-password-reset', body)).status);
    }
    expect(statuses).toEqual([200, 200, 200, 429]);
  });
});

describe('when Upstash is unavailable', () => {
  it('refuses login and reset, lets sign-up through, and logs it', async () => {
    const log = vi.fn();
    const auth = authWith(downLimiter(log));
    const email = await customer();

    expect((await post(auth, '/sign-in/email', { email, password: PASSWORD })).status).toBe(429);
    expect(
      (await post(auth, '/request-password-reset', { email, redirectTo: '/reset-password' }))
        .status,
    ).toBe(429);
    const signUp = await post(auth, '/sign-up/email', {
      name: 'Zara',
      email: 'zara@example.com',
      password: PASSWORD,
    });
    expect(signUp.status).toBe(200);
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/failing closed/));
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/failing open/));
  });

  it('decides the fail mode by path', () => {
    for (const path of [
      '/sign-in/email',
      '/two-factor/verify-totp',
      '/request-password-reset',
      '/reset-password/abc',
    ]) {
      expect(failModeFor(`1.2.3.4|${path}`)).toBe('closed');
    }
    for (const path of ['/sign-up/email', '/sign-out', '/verify-email', '/ok']) {
      expect(failModeFor(`1.2.3.4|${path}`)).toBe('open');
    }
  });
});

describe('breached passwords', () => {
  it('refuses a breached password at sign-up, with no account made', async () => {
    const response = await post(authWith(mockLimiter()), '/sign-up/email', {
      name: 'Ayesha',
      email: 'ayesha@example.com',
      password: BREACHED,
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'PASSWORD_COMPROMISED' });
    expect(await db.select().from(user)).toHaveLength(0);
  });

  it('refuses a breached password as the new one on reset', async () => {
    const response = await post(authWith(mockLimiter()), '/reset-password', {
      token: 'any',
      newPassword: BREACHED,
    });
    expect(await response.json()).toMatchObject({ code: 'PASSWORD_COMPROMISED' });
  });
});
