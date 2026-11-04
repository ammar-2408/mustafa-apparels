// The admin's Better Auth instance and guards (docs/auth-security.md §1, "Admins").
// Every admin page and action checks on the server; proxy.ts is only a first filter.
import 'server-only';

import { type AppAuth, authFromEnv } from '@mustafa/auth/factory';
import { adminAccess, requireAdmin as guardAdmin } from '@mustafa/auth/guards';
import { getEnv } from '@mustafa/config/env';
import { getDb } from '@mustafa/db/client';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { cache } from 'react';

let instance: AppAuth | null | undefined;

// Built on first use, never at build time. Null in mock mode with no database.
export function getAuth() {
  if (instance === undefined) {
    instance = authFromEnv('admin', getEnv('admin'), {
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

// First line of every admin action and route handler: throws UNAUTHENTICATED or FORBIDDEN.
export async function requireAdmin() {
  return guardAdmin(await getSession());
}

// For admin pages: the login page when signed out or refused, 2FA setup until it's on.
export async function requireAdminPage() {
  const current = await getSession();
  const access = adminAccess(current);
  if (access === 'needs-2fa') redirect('/setup-2fa');
  if (access !== 'ok' || !current) redirect('/login');
  return current;
}
