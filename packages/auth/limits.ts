// Rate limits on /api/auth (docs/auth-security.md §1). Counted in Upstash through
// packages/core/integrations/rate-limit.ts. If Upstash can't answer, sign-in, 2FA and password
// reset are refused; every other path is let through (owner's decision, 2026-11-02).
import type { FailMode, Limit, Limiter } from '@mustafa/core/integrations/rate-limit';
import { APIError } from 'better-auth';

// Per IP, on top of the failed-login limit. Paths are relative to /api/auth.
export const AUTH_RULES = {
  '/sign-in/email': { window: 60, max: 10 },
  '/sign-up/email': { window: 600, max: 5 },
  '/request-password-reset': { window: 900, max: 3 },
  '/reset-password': { window: 900, max: 10 },
  '/send-verification-email': { window: 900, max: 3 },
  '/two-factor/*': { window: 60, max: 5 },
  // Read on every account page; counting it would spend Upstash commands for nothing.
  '/get-session': false,
} as const;

const CLOSED = ['/sign-in', '/two-factor', '/request-password-reset', '/reset-password'];

// Better Auth's keys are "<ip>|<path>".
export function failModeFor(key: string): FailMode {
  const path = key.slice(key.indexOf('|') + 1);
  return CLOSED.some((prefix) => path.startsWith(prefix)) ? 'closed' : 'open';
}

// 5 failed logins per 15 minutes for one IP and email, then wait (docs/auth-security.md §1).
export const LOGIN_FAILURES: Limit = {
  name: 'login-failures',
  max: 5,
  windowSeconds: 15 * 60,
  failMode: 'closed',
};

export const loginKey = (ip: string | null, email: unknown) =>
  `${ip ?? 'no-ip'}|${typeof email === 'string' ? email.trim().toLowerCase() : ''}`;

export const tooManyAttempts = (retryAfter: number | null) =>
  new APIError(
    'TOO_MANY_REQUESTS',
    {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many attempts. Please try again in a few minutes.',
    },
    { 'X-Retry-After': String(retryAfter ?? 60) },
  );

// Better Auth's own limiter, stored through ours.
export const rateLimitOptions = (limiter: Limiter | undefined) =>
  limiter
    ? {
        enabled: true,
        window: 60,
        max: 100,
        customRules: AUTH_RULES,
        customStorage: {
          consume: (key: string, rule: { window: number; max: number }) =>
            limiter.consume(
              {
                name: 'auth',
                max: rule.max,
                windowSeconds: rule.window,
                failMode: failModeFor(key),
              },
              key,
            ),
        },
      }
    : { enabled: false };
