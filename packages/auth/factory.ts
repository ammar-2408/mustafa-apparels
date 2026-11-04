// Turns an app's env into its Better Auth instance, so both apps wire the mailer, limiter and
// breach check the same way. Each app's lib/auth.ts keeps only the memo and its page guards.
import { createBreachCheck } from '@mustafa/core/integrations/breached-passwords';
import { createMailer } from '@mustafa/core/integrations/email';
import { createLimiter } from '@mustafa/core/integrations/rate-limit';
import type { Database } from '@mustafa/db/client';

import type { AuthApp } from './cookies';
import { createAuth } from './index';

// The env fields the factory reads (a subset of packages/config/env.ts).
export type AuthEnv = {
  INTEGRATIONS_MODE: 'live' | 'mock';
  APP_ENV?: string | undefined;
  DATABASE_URL?: string | undefined;
  BETTER_AUTH_SECRET?: string | undefined;
  NEXT_PUBLIC_SITE_URL?: string | undefined;
  ADMIN_URL?: string | undefined;
  RESEND_API_KEY?: string | undefined;
  EMAIL_FROM?: string | undefined;
  SHOP_INBOX_EMAIL?: string | undefined;
  UPSTASH_REDIS_REST_URL?: string | undefined;
  UPSTASH_REDIS_REST_TOKEN?: string | undefined;
};

export type AuthDeps = {
  // Called only when the config is complete, so a mock preview never opens a connection.
  db: () => Database;
  background?: (task: Promise<unknown>) => void;
};

export type AppAuth = ReturnType<typeof createAuth>;

// Null when the database, secret or base URL is missing (mock mode on a fresh preview): callers
// then answer UNAVAILABLE instead of crashing.
export function authFromEnv(app: AuthApp, env: AuthEnv, deps: AuthDeps): AppAuth | null {
  const baseURL = app === 'admin' ? env.ADMIN_URL : env.NEXT_PUBLIC_SITE_URL;
  if (!env.DATABASE_URL || !env.BETTER_AUTH_SECRET || !baseURL) return null;
  return createAuth({
    app,
    db: deps.db(),
    baseURL,
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
    ...(deps.background && { background: deps.background }),
  });
}
