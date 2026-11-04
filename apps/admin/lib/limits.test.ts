// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('server-only', () => ({}));
vi.mock('@mustafa/config/env', () => ({ getEnv: () => env.value }));

const load = async () => {
  vi.resetModules();
  return import('./limits');
};

const codeOf = async (promise: Promise<unknown>) =>
  promise.then(
    () => 'allowed',
    (error: { code?: string }) => error.code,
  );

beforeEach(() => {
  env.value = { INTEGRATIONS_MODE: 'mock', APP_ENV: 'test', BETTER_AUTH_SECRET: 's'.repeat(40) };
});

describe('enforceLimit', () => {
  it('allows 5 2FA setups a minute per admin, then refuses the sixth', async () => {
    const { enforceLimit, ADMIN_LIMITS } = await load();
    for (let i = 0; i < 5; i++) {
      expect(await codeOf(enforceLimit(ADMIN_LIMITS.twoFactorSetup, 'a1'))).toBe('allowed');
    }
    expect(await codeOf(enforceLimit(ADMIN_LIMITS.twoFactorSetup, 'a1'))).toBe('RATE_LIMITED');
    // Another admin has their own count.
    expect(await codeOf(enforceLimit(ADMIN_LIMITS.twoFactorSetup, 'a2'))).toBe('allowed');
  });

  it('keeps each limit to its own count', async () => {
    const { enforceLimit, ADMIN_LIMITS } = await load();
    for (let i = 0; i < 5; i++) await enforceLimit(ADMIN_LIMITS.twoFactorSetup, 'a1');
    expect(await codeOf(enforceLimit(ADMIN_LIMITS.adminWrite, 'a1'))).toBe('allowed');
  });

  it('fails closed for the 2FA setup and open for writes when no limiter can be built', async () => {
    env.value = { INTEGRATIONS_MODE: 'mock' };
    const { enforceLimit, ADMIN_LIMITS } = await load();
    expect(await codeOf(enforceLimit(ADMIN_LIMITS.twoFactorSetup, 'a1'))).toBe('RATE_LIMITED');
    expect(await codeOf(enforceLimit(ADMIN_LIMITS.adminWrite, 'a1'))).toBe('allowed');
  });

  it('declares the limits from docs/api.md', async () => {
    const { ADMIN_LIMITS } = await load();
    expect(ADMIN_LIMITS).toEqual({
      twoFactorSetup: { name: 'admin-2fa-setup', max: 5, windowSeconds: 60, failMode: 'closed' },
      adminWrite: { name: 'admin-write', max: 60, windowSeconds: 60, failMode: 'open' },
      uploadSign: { name: 'upload-sign', max: 30, windowSeconds: 60, failMode: 'open' },
    });
  });
});
