// Search rate limits (docs/api.md): 30 a minute per IP for the page and for suggestions, each
// counted apart. Open: an Upstash outage must not stop shoppers searching.
import type { Limit } from '@mustafa/core/integrations/rate-limit';

export const SEARCH_LIMITS = {
  page: { name: 'search-page', max: 30, windowSeconds: 60, failMode: 'open' },
  suggest: { name: 'search-suggest', max: 30, windowSeconds: 60, failMode: 'open' },
} as const satisfies Record<string, Limit>;
