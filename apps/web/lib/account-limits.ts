// Per-user limits for account actions (docs/api.md §2). Open: an Upstash outage must not stop
// shoppers saving suits; deleting stays limited by the password check either way.
import type { Limit } from '@mustafa/core/integrations/rate-limit';

export const ACCOUNT_LIMITS = {
  wishlist: { name: 'wishlist', max: 60, windowSeconds: 60, failMode: 'open' },
  profile: { name: 'profile', max: 20, windowSeconds: 3600, failMode: 'open' },
  deleteAccount: { name: 'delete-account', max: 3, windowSeconds: 3600, failMode: 'closed' },
} as const satisfies Record<string, Limit>;

/** Deleting an account needs a session from the last day (log in again otherwise). */
export const FRESH_SESSION_MS = 24 * 60 * 60 * 1000;
