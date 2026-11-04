// Rate limits for admin actions and route handlers (docs/api.md §3, docs/auth-security.md §1).
// Better Auth limits its own endpoints; these cover the work our own code does.
import 'server-only';

import { getEnv } from '@mustafa/config/env';
import { rateLimited } from '@mustafa/core/errors';
import { createLimiter, type Limit, type Limiter } from '@mustafa/core/integrations/rate-limit';

export const ADMIN_LIMITS = {
  // A password check Better Auth's own limiter never sees, so it fails closed like login.
  twoFactorSetup: { name: 'admin-2fa-setup', max: 5, windowSeconds: 60, failMode: 'closed' },
  // Every admin write, per admin. Open: an Upstash outage must not stop the owner working.
  adminWrite: { name: 'admin-write', max: 60, windowSeconds: 60, failMode: 'open' },
  // Upload signatures, per admin.
  uploadSign: { name: 'upload-sign', max: 30, windowSeconds: 60, failMode: 'open' },
} as const satisfies Record<string, Limit>;

let limiter: Limiter | null | undefined;

// Null without BETTER_AUTH_SECRET (keys are HMACs made with it). Auth is off then too, so
// nothing reaches a limit.
function getLimiter() {
  if (limiter === undefined) {
    const env = getEnv('admin');
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

// Counts one request for `key` (an admin's user id) and throws RATE_LIMITED when over.
export async function enforceLimit(limit: Limit, key: string) {
  const current = getLimiter();
  if (!current) {
    if (limit.failMode === 'closed') throw rateLimited();
    return;
  }
  const result = await current.consume(limit, key);
  if (!result.allowed) throw rateLimited();
}
