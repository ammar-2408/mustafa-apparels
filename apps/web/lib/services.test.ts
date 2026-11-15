// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
const consume = vi.hoisted(() => vi.fn(async () => ({ allowed: false, retryAfter: 30 })));

vi.mock('server-only', () => ({}));
vi.mock('@mustafa/config/env', () => ({ getEnv: () => env.value }));
vi.mock('@mustafa/core/integrations/rate-limit', () => ({
  createLimiter: () => ({ consume, check: consume }),
}));
vi.mock('@mustafa/core/integrations/email', () => ({
  createMailer: () => async () => ({ ok: true }),
}));

const open = { name: 'test-open', max: 5, windowSeconds: 60, failMode: 'open' } as const;
const closed = { name: 'test-closed', max: 3, windowSeconds: 3600, failMode: 'closed' } as const;

beforeEach(() => {
  vi.resetModules();
  consume.mockClear();
});

describe('withinLimit', () => {
  it('asks the limiter, with the limit and key, when there is a secret', async () => {
    env.value = { BETTER_AUTH_SECRET: 's'.repeat(40), INTEGRATIONS_MODE: 'mock' };
    const { withinLimit } = await import('./services');
    expect(await withinLimit(open, '203.0.113.9')).toBe(false);
    expect(consume).toHaveBeenCalledWith(open, '203.0.113.9');
  });

  it('with no limiter (no secret), lets open limits through and refuses closed ones', async () => {
    env.value = {};
    const { withinLimit } = await import('./services');
    expect(await withinLimit(open, 'k')).toBe(true);
    expect(await withinLimit(closed, 'k')).toBe(false);
    expect(consume).not.toHaveBeenCalled();
  });
});
