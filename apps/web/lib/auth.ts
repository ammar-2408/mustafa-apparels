// The storefront's Better Auth instance and session helpers (docs/auth-security.md §1).
// Only dynamic pages and route handlers call these: cached pages never read cookies.
import 'server-only';

import { type AppAuth, authFromEnv } from '@mustafa/auth/factory';
import { requireUser as guardUser } from '@mustafa/auth/guards';
import { getEnv } from '@mustafa/config/env';
import { getDb } from '@mustafa/db/client';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { cache } from 'react';

let instance: AppAuth | null | undefined;

// Built on first use, never at build time. Null in mock mode with no database (a fresh
// preview), where sign-in can't work yet.
export function getAuth() {
  if (instance === undefined) {
    instance = authFromEnv('web', getEnv('web'), {
      db: getDb,
      background: (task) => after(task),
    });
  }
  return instance;
}

// One lookup per request, however many components ask.
export const getSession = cache(async () => {
  // The request comes first, even with auth off: it keeps the page per-request, so a page
  // behind proxy.ts's nonce is never prerendered, and the instance is never built at build time.
  const requestHeaders = await headers();
  const auth = getAuth();
  if (!auth) return null;
  return auth.api.getSession({ headers: requestHeaders });
});

// The signed-in customer, or null: a banned user, an admin account or an admin-app session counts
// as signed out (ADR-020). For checks that mustn't throw, such as linking an inquiry.
export async function currentCustomer() {
  try {
    return guardUser(await getSession());
  } catch {
    return null;
  }
}

// For server actions and route handlers: throws UNAUTHENTICATED.
export async function requireUser() {
  return guardUser(await getSession());
}

// For pages: sends a signed-out visitor to the login page instead.
export async function requireUserPage() {
  const current = await getSession();
  try {
    return guardUser(current);
  } catch {
    redirect('/login');
  }
}
