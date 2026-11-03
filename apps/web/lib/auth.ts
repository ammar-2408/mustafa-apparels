// The storefront's Better Auth instance and session helpers (docs/auth-security.md §1).
// Only dynamic pages and route handlers call these: cached pages never read cookies.
import 'server-only';

import { createAuth } from '@mustafa/auth';
import { requireUser as guardUser } from '@mustafa/auth/guards';
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

// Built on first use, never at build time. Null in mock mode with no database (a fresh
// preview), where sign-in can't work yet.
export function getAuth() {
  if (instance === undefined) {
    const env = getEnv('web');
    instance =
      env.DATABASE_URL && env.BETTER_AUTH_SECRET && env.NEXT_PUBLIC_SITE_URL
        ? createAuth({
            app: 'web',
            db: getDb(),
            baseURL: env.NEXT_PUBLIC_SITE_URL,
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
  // The request comes first, even with auth off: it keeps the page per-request, so a page
  // behind proxy.ts's nonce is never prerendered, and the instance is never built at build time.
  const requestHeaders = await headers();
  const auth = getAuth();
  if (!auth) return null;
  return auth.api.getSession({ headers: requestHeaders });
});

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
