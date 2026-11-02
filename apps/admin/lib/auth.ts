// The admin's Better Auth instance and guards (docs/auth-security.md §1, "Admins").
// Every admin page and action checks on the server; proxy.ts is only a first filter.
import 'server-only';

import { createAuth } from '@mustafa/auth';
import { adminAccess, requireAdmin as guardAdmin } from '@mustafa/auth/guards';
import { getEnv } from '@mustafa/config/env';
import { createBreachCheck } from '@mustafa/core/integrations/breached-passwords';
import { createMailer } from '@mustafa/core/integrations/email';
import { createLimiter } from '@mustafa/core/integrations/rate-limit';
import { getDb } from '@mustafa/db/client';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { cache } from 'react';

let instance: ReturnType<typeof createAuth> | null | undefined;

// Built on first use, never at build time. Null in mock mode with no database.
export function getAuth() {
  if (instance === undefined) {
    const env = getEnv('admin');
    instance =
      env.DATABASE_URL && env.BETTER_AUTH_SECRET && env.ADMIN_URL
        ? createAuth({
            app: 'admin',
            db: getDb(),
            baseURL: env.ADMIN_URL,
            secret: env.BETTER_AUTH_SECRET,
            sendEmail: createMailer({
              mode: env.INTEGRATIONS_MODE,
              appEnv: env.APP_ENV,
              apiKey: env.RESEND_API_KEY,
              from: env.EMAIL_FROM,
              replyTo: env.SHOP_INBOX_EMAIL,
            }),
            limiter: createLimiter({
              mode: env.INTEGRATIONS_MODE,
              appEnv: env.APP_ENV,
              secret: env.BETTER_AUTH_SECRET,
              url: env.UPSTASH_REDIS_REST_URL,
              token: env.UPSTASH_REDIS_REST_TOKEN,
            }),
            isBreached: createBreachCheck({ mode: env.INTEGRATIONS_MODE }),
            background: (task) => after(task),
          })
        : null;
  }
  return instance;
}

// One lookup per request, however many components ask.
export const getSession = cache(async () => {
  const auth = getAuth();
  if (!auth) return null;
  return auth.api.getSession({ headers: await headers() });
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
  if (access !== 'ok') redirect('/login');
  return current!;
}
