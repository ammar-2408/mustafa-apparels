// docs/testing-qa.md §3, Auth: passwords never appear in responses, logs or the database.
// (The database half is in create-auth.int.test.ts.)
import { account } from '@mustafa/db/schema';
import { createTestDb, resetTestDb, type TestDb } from '@mustafa/db/testing';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';

import { createAuth } from './index';
import { sendEmail } from './test/outbox';

const SECRET = 'test-secret-for-integration-tests-only-0123456789';
const PASSWORD = 'a very private passphrase 42';
const BREACHED = 'a breached private passphrase';

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
});
afterEach(async () => {
  vi.restoreAllMocks();
  await resetTestDb(db);
});
afterAll(() => db.$client.close());

const instance = (app: 'web' | 'admin') =>
  createAuth({
    app,
    db,
    baseURL: app === 'web' ? 'http://localhost:3000' : 'http://localhost:3001',
    secret: SECRET,
    sendEmail,
    isBreached: async (password) => password === BREACHED,
  });

const call = (app: 'web' | 'admin', path: string, body?: unknown, cookie = '') => {
  const auth = instance(app);
  return auth.handler(
    new Request(`${auth.options.baseURL}/api/auth${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json', origin: auth.options.baseURL!, cookie },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    }),
  );
};

it('keeps passwords and their hashes out of every response and every log line', async () => {
  const logs: unknown[] = [];
  for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    vi.spyOn(console, level).mockImplementation((...args) => {
      logs.push(args);
    });
  }
  const email = 'ayesha@example.com';
  const bodies: string[] = [];
  const keep = async (response: Response) => {
    bodies.push(await response.clone().text());
    return response;
  };

  await keep(await call('web', '/sign-up/email', { name: 'Ayesha', email, password: PASSWORD }));
  await keep(
    await call('web', '/sign-up/email', {
      name: 'Zara',
      email: 'z@example.com',
      password: BREACHED,
    }),
  );
  await db.execute(`UPDATE "user" SET email_verified = true`);
  await keep(await call('web', '/sign-in/email', { email, password: 'the wrong passphrase' }));
  const signedIn = await keep(await call('web', '/sign-in/email', { email, password: PASSWORD }));
  const cookie = signedIn.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
  await keep(await call('web', '/get-session', undefined, cookie));
  await keep(await call('web', '/reset-password', { token: 'not-a-token', newPassword: PASSWORD }));
  await keep(await call('admin', '/sign-in/email', { email, password: PASSWORD }));

  const [credential] = await db.select().from(account);
  const hash = credential!.password!;
  const [salt, key] = hash.split(':');
  const everything = JSON.stringify([bodies, logs]);
  for (const secret of [PASSWORD, BREACHED, hash, salt!, key!]) {
    expect(everything).not.toContain(secret);
  }
  // The flows did run: sign-in worked and the admin refused a customer.
  expect(bodies.some((body) => body.includes('"token"'))).toBe(true);
  expect(bodies.at(-1)).toContain('INVALID_EMAIL_OR_PASSWORD');
});
