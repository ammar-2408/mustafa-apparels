// Test accounts written straight to the test database, one set per test, and removed after it.
// CI uses its throwaway Postgres; locally the Neon `e2e` branch (E2E_DATABASE_URL), never `dev`
// or production. Each test also gets its own client IP, so parallel projects never share a
// rate-limit bucket (Better Auth reads x-nf-client-connection-ip, as on Netlify).
import { randomInt, randomUUID } from 'node:crypto';

import { loadEnvFiles } from '@mustafa/config/env';
import { createDb, type Database } from '@mustafa/db/client';
import { account, user } from '@mustafa/db/schema';
import { test as base } from '@playwright/test';
import { hashPassword } from 'better-auth/crypto';
import { inArray } from 'drizzle-orm';

import { e2eDatabaseUrl } from '../../scripts/e2e/database-url';

export const PASSWORD = 'e2e correct horse battery';

export type TestUser = { id: string; name: string; email: string; password: string };

type UserOptions = { role?: 'customer' | 'admin'; verified?: boolean; password?: string };

export type Users = {
  create(options?: UserOptions): Promise<TestUser>;
  // A fresh address no account uses yet; whatever the test creates with it is removed after.
  freshEmail(): string;
};

export const uniqueEmail = () => `e2e+${randomUUID()}@example.com`;

export const randomIp = () => `198.51.${randomInt(0, 256)}.${randomInt(1, 255)}`;

export const test = base.extend<{ users: Users }, { db: Database }>({
  db: [
    // Playwright reads a fixture's dependencies from an object pattern, so this one must be empty.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      loadEnvFiles();
      const db = createDb(e2eDatabaseUrl());
      await use(db);
      await db.$client.end();
    },
    { scope: 'worker' },
  ],

  // A hydration mismatch is the Next dev overlay's "Issue" badge; in a build React stays silent
  // about attribute mismatches, so this bites on local dev-mode runs. Any one fails the test.
  page: async ({ page }, use) => {
    const problems: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && /hydrat|didn.t match/i.test(message.text())) {
        problems.push(message.text().slice(0, 500));
      }
    });
    await use(page);
    base.expect(problems, 'hydration warnings in the console').toEqual([]);
  },

  context: async ({ context }, use) => {
    await context.setExtraHTTPHeaders({ 'x-nf-client-connection-ip': randomIp() });
    await use(context);
  },

  users: async ({ db }, use) => {
    const emails: string[] = [];
    await use({
      freshEmail() {
        const email = uniqueEmail();
        emails.push(email);
        return email;
      },
      async create({ role = 'customer', verified = true, password = PASSWORD } = {}) {
        const email = uniqueEmail();
        emails.push(email);
        const name = role === 'admin' ? 'E2E Admin' : 'E2E Customer';
        const [row] = await db
          .insert(user)
          .values({ name, email, role, emailVerified: verified })
          .returning();
        await db.insert(account).values({
          userId: row!.id,
          accountId: row!.id,
          providerId: 'credential',
          password: await hashPassword(password),
        });
        return { id: row!.id, name, email, password };
      },
    });
    // Sessions, accounts and 2FA rows go with the user (on delete cascade).
    if (emails.length > 0) await db.delete(user).where(inArray(user.email, emails));
  },
});

export { expect } from '@playwright/test';

// After a sign-in click: a password hash, a session write and, on the local dev server, a route
// compile. Under parallel workers that can pass the 5 s default (docs/debugging.md).
export const AFTER_SIGN_IN = { timeout: 15_000 };
