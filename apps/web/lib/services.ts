// The storefront's mailer and rate limiter for its own server actions (Better Auth has its own,
// wired the same way in packages/auth/factory.ts). Built on first use, never at build time.
import 'server-only';

import { getEnv } from '@mustafa/config/env';
import { createMailer, type Mailer } from '@mustafa/core/integrations/email';
import { cappedMailer } from '@mustafa/core/integrations/email-caps';
import { createLimiter, type Limit, type Limiter } from '@mustafa/core/integrations/rate-limit';

let limiter: Limiter | null | undefined;
let mailer: Mailer | undefined;

// Null without BETTER_AUTH_SECRET (keys are HMACs made with it).
export function getLimiter() {
  if (limiter === undefined) {
    const env = getEnv('web');
    limiter = env.BETTER_AUTH_SECRET
      ? createLimiter({
          mode: env.INTEGRATIONS_MODE,
          appEnv: env.APP_ENV,
          secret: env.BETTER_AUTH_SECRET,
          url: env.UPSTASH_REDIS_REST_URL,
          token: env.UPSTASH_REDIS_REST_TOKEN,
        })
      : null;
  }
  return limiter;
}

/** Real emails count toward the per-address and daily caps (packages/core/integrations/email-caps.ts). */
export function getMailer() {
  if (!mailer) {
    const env = getEnv('web');
    const base = createMailer({
      mode: env.INTEGRATIONS_MODE,
      appEnv: env.APP_ENV,
      apiKey: env.RESEND_API_KEY,
      from: env.EMAIL_FROM,
      replyTo: env.SHOP_INBOX_EMAIL,
    });
    const current = getLimiter();
    mailer = env.INTEGRATIONS_MODE === 'live' && current ? cappedMailer(base, current) : base;
  }
  return mailer;
}

/** Counts one request for `key`; false when over the limit (or no limiter and failMode closed). */
export async function withinLimit(limit: Limit, key: string) {
  const current = getLimiter();
  if (!current) return limit.failMode === 'open';
  return (await current.consume(limit, key)).allowed;
}
