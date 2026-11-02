// Rate limits (docs/auth-security.md §1, docs/api.md). Live mode counts in Upstash Redis, mock mode
// in memory. If Upstash is down, slow or over its monthly limit, the error is logged and each
// limit's failMode decides: 'closed' refuses (login, 2FA, password reset), 'open' lets the
// request through, so the rest of the site keeps working.
// Keys are HMACs, so no raw IP or email ever reaches Upstash.
import { createHmac } from 'node:crypto';

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export type FailMode = 'open' | 'closed';

export type Limit = {
  // Part of the stored key, so two limits never share a counter.
  name: string;
  max: number;
  windowSeconds: number;
  failMode: FailMode;
};

export type LimitResult = {
  allowed: boolean;
  // Seconds until the next try is allowed, when refused.
  retryAfter: number | null;
  // True when the store couldn't be reached and failMode decided.
  unavailable?: true;
};

export type Limiter = {
  // Counts one request and says whether it may go ahead.
  consume(limit: Limit, key: string): Promise<LimitResult>;
  // Says whether a request would be allowed, without counting it.
  check(limit: Limit, key: string): Promise<LimitResult>;
};

export type LimiterOptions = {
  mode: 'live' | 'mock';
  appEnv: string | undefined;
  // Keys are HMACs made with it (BETTER_AUTH_SECRET).
  secret: string;
  url?: string | undefined;
  token?: string | undefined;
  // How long to wait for Upstash before failMode decides.
  timeoutMs?: number;
  log?: (message: string) => void;
};

const DEFAULT_TIMEOUT_MS = 2000;

export function createLimiter(options: LimiterOptions): Limiter {
  const log = options.log ?? ((message: string) => console.error(message));
  const hash = (limit: Limit, key: string) =>
    createHmac('sha256', options.secret).update(`${limit.name}:${key}`).digest('hex').slice(0, 32);
  const store = options.mode === 'live' ? upstashStore(options) : memoryStore();

  const run = async (limit: Limit, key: string, count: boolean): Promise<LimitResult> => {
    try {
      return await store(limit, hash(limit, key), count);
    } catch (error) {
      const reason = error instanceof Error ? error.message.slice(0, 80) : 'unknown error';
      log(`[rate-limit] ${limit.name} store unavailable (${reason}); failing ${limit.failMode}`);
      return limit.failMode === 'open'
        ? { allowed: true, retryAfter: null, unavailable: true }
        : { allowed: false, retryAfter: 60, unavailable: true };
    }
  };

  return {
    consume: (limit, key) => run(limit, key, true),
    check: (limit, key) => run(limit, key, false),
  };
}

type Store = (limit: Limit, key: string, count: boolean) => Promise<LimitResult>;

function upstashStore({
  url,
  token,
  appEnv,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: LimiterOptions): Store {
  if (!url || !token) throw new Error('UPSTASH_REDIS_REST_URL and _TOKEN are needed in live mode');
  // No retries: a slow or failing Upstash should decide quickly, not stall a login.
  const redis = new Redis({ url, token, retry: false });
  const limiters = new Map<string, Ratelimit>();
  const limiterFor = (limit: Limit) => {
    const id = `${limit.name}:${limit.max}:${limit.windowSeconds}`;
    let limiter = limiters.get(id);
    if (!limiter) {
      limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit.max, `${limit.windowSeconds} s`),
        // One database serves every environment.
        prefix: `ma:${appEnv ?? 'unknown'}:${limit.name}`,
        timeout: timeoutMs,
        // Blocked keys are refused from memory, saving commands on the free plan.
        ephemeralCache: new Map(),
        analytics: false,
      });
      limiters.set(id, limiter);
    }
    return limiter;
  };

  return async (limit, key, count) => {
    const limiter = limiterFor(limit);
    if (!count) {
      const { remaining, reset } = await withTimeout(limiter.getRemaining(key), timeoutMs);
      return remaining > 0
        ? { allowed: true, retryAfter: null }
        : { allowed: false, retryAfter: secondsUntil(reset) };
    }
    const result = await limiter.limit(key);
    // On a timeout the library lets the request through; we let failMode decide instead.
    if (result.reason === 'timeout') throw new Error('Upstash timed out');
    return result.success
      ? { allowed: true, retryAfter: null }
      : { allowed: false, retryAfter: secondsUntil(result.reset) };
  };
}

function memoryStore(): Store {
  const hits = new Map<string, number[]>();
  return async (limit, key, count) => {
    const now = Date.now();
    const since = now - limit.windowSeconds * 1000;
    const recent = (hits.get(key) ?? []).filter((at) => at > since);
    if (recent.length >= limit.max) {
      hits.set(key, recent);
      return { allowed: false, retryAfter: secondsUntil(recent[0]! + limit.windowSeconds * 1000) };
    }
    if (count) recent.push(now);
    hits.set(key, recent);
    return { allowed: true, retryAfter: null };
  };
}

const secondsUntil = (at: number) => Math.max(1, Math.ceil((at - Date.now()) / 1000));

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Upstash timed out')), ms).unref?.(),
    ),
  ]);
}
