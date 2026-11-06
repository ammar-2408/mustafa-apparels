// The inquiry form's spam limits (docs/api.md submitInquiry). Kept out of actions.ts, which may
// only export async functions.
import type { Limit } from '@mustafa/core/integrations/rate-limit';

// 5 per 10 minutes per IP. Open: an Upstash outage mustn't stop shoppers asking.
export const INQUIRY_LIMIT: Limit = {
  name: 'inquiry',
  max: 5,
  windowSeconds: 600,
  failMode: 'open',
};

/** A form sent sooner than this after it appeared is a bot. */
export const MIN_FILL_MS = 2000;
