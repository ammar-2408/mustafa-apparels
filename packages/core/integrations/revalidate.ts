// Admin → storefront cache refresh (docs/api.md §4, docs/auth-security.md). The admin signs the
// body with REVALIDATE_SECRET; the storefront checks the signature, the time and the tags before
// calling revalidateTag. Never fails an admin save: a lost call only means a page refreshes later.
import { createHmac, timingSafeEqual } from 'node:crypto';

import { revalidateBody } from '@mustafa/validators/revalidate';

export const MAX_BODY_BYTES = 2048;
export const MAX_SKEW_SECONDS = 300;

export const signRevalidate = (secret: string, timestamp: string, body: string) =>
  createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');

export type RevalidateCheck =
  { ok: true; tags: string[] } | { ok: false; status: 400 | 401; reason: string };

type VerifyInput = {
  secret: string;
  timestamp: string | null;
  signature: string | null;
  body: string;
  // Unix seconds; the test passes its own.
  now?: number;
};

// Signature and time first, so an unsigned caller learns nothing about what the body should be.
export function verifyRevalidate({
  secret,
  timestamp,
  signature,
  body,
  now = Math.floor(Date.now() / 1000),
}: VerifyInput): RevalidateCheck {
  if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
    return { ok: false, status: 400, reason: 'body too large' };
  }
  if (!timestamp || !/^\d{1,12}$/.test(timestamp)) {
    return { ok: false, status: 401, reason: 'bad timestamp' };
  }
  if (Math.abs(now - Number(timestamp)) > MAX_SKEW_SECONDS) {
    return { ok: false, status: 401, reason: 'stale timestamp' };
  }
  const expected = Buffer.from(signRevalidate(secret, timestamp, body), 'hex');
  const given = Buffer.from(signature && /^[0-9a-f]{64}$/i.test(signature) ? signature : '', 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, status: 401, reason: 'bad signature' };
  }
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return { ok: false, status: 400, reason: 'bad body' };
  }
  const parsed = revalidateBody.safeParse(json);
  if (!parsed.success) return { ok: false, status: 400, reason: 'bad tags' };
  return { ok: true, tags: [...new Set(parsed.data.tags)] };
}

export type Revalidator = (tags: string[]) => Promise<void>;

type RevalidatorOptions = {
  mode: 'live' | 'mock';
  // The storefront's base URL (WEB_URL) and the shared secret.
  webUrl: string | undefined;
  secret: string | undefined;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  log?: (message: string) => void;
  now?: () => number;
};

const DEFAULT_TIMEOUT_MS = 5000;

export function createRevalidator({
  mode,
  webUrl,
  secret,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = fetch,
  log = (message) => console.error(message),
  now = () => Math.floor(Date.now() / 1000),
}: RevalidatorOptions): Revalidator {
  return async (tags) => {
    const unique = [...new Set(tags)];
    if (unique.length === 0) return;
    if (mode === 'mock') {
      log(`[revalidate] mock mode, skipped: ${unique.join(', ')}`);
      return;
    }
    if (!webUrl || !secret) {
      log('[revalidate] WEB_URL or REVALIDATE_SECRET missing, skipped');
      return;
    }
    const body = JSON.stringify({ tags: unique });
    const timestamp = String(now());
    try {
      const response = await fetchImpl(new URL('/api/revalidate', webUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Timestamp': timestamp,
          'X-Signature': signRevalidate(secret, timestamp, body),
        },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) log(`[revalidate] storefront answered ${response.status}`);
    } catch (error) {
      const reason = error instanceof Error ? error.name : 'unknown error';
      log(`[revalidate] call failed (${reason})`);
    }
  };
}
