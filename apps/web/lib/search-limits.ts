// The search rate limit (docs/api.md): 30 suggestion requests a minute per IP. Open: an Upstash
// outage must not stop shoppers searching.
import type { Limit } from '@mustafa/core/integrations/rate-limit';

export const SEARCH_LIMITS = {
  suggest: { name: 'search-suggest', max: 30, windowSeconds: 60, failMode: 'open' },
} as const satisfies Record<string, Limit>;
