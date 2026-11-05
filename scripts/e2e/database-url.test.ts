import { describe, expect, it } from 'vitest';

import { e2eDatabaseUrl, e2eServerEnv } from './database-url';

const DEV = 'postgresql://u:p@ep-dev-123-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';
const DEV_DIRECT = 'postgresql://u:p@ep-dev-123.us-east-2.aws.neon.tech/neondb?sslmode=require';
const E2E = 'postgresql://u:p@ep-e2e-456.us-east-2.aws.neon.tech/neondb?sslmode=require';

describe('e2eDatabaseUrl', () => {
  it('uses the Neon e2e branch locally', () => {
    expect(e2eDatabaseUrl({ DATABASE_URL: DEV, E2E_DATABASE_URL: ` ${E2E} ` })).toBe(E2E);
  });

  it('refuses a local run without E2E_DATABASE_URL', () => {
    expect(() => e2eDatabaseUrl({ DATABASE_URL: DEV })).toThrow(/E2E_DATABASE_URL/);
    expect(() => e2eDatabaseUrl({ DATABASE_URL: DEV, E2E_DATABASE_URL: '  ' })).toThrow(
      /E2E_DATABASE_URL/,
    );
  });

  it('refuses the dev database, pooled or direct', () => {
    expect(() => e2eDatabaseUrl({ DATABASE_URL: DEV, E2E_DATABASE_URL: DEV })).toThrow(/same/);
    expect(() => e2eDatabaseUrl({ DATABASE_URL: DEV, E2E_DATABASE_URL: DEV_DIRECT })).toThrow(
      /same/,
    );
    expect(() =>
      e2eDatabaseUrl({ DATABASE_URL_UNPOOLED: DEV_DIRECT, E2E_DATABASE_URL: DEV }),
    ).toThrow(/same/);
  });

  it('uses the service database on GitHub Actions and ignores E2E_DATABASE_URL there', () => {
    const ci = 'postgresql://postgres:postgres@localhost:5432/shop_test';
    const actions = { CI: 'true', GITHUB_ACTIONS: 'true' };
    expect(e2eDatabaseUrl({ ...actions, DATABASE_URL: ci, E2E_DATABASE_URL: E2E })).toBe(ci);
    expect(() => e2eDatabaseUrl(actions)).toThrow(/DATABASE_URL/);
  });

  it('keeps a local CI=1 run (against a build) on the e2e branch', () => {
    expect(e2eDatabaseUrl({ CI: '1', DATABASE_URL: DEV, E2E_DATABASE_URL: E2E })).toBe(E2E);
    expect(() => e2eDatabaseUrl({ CI: '1', DATABASE_URL: DEV })).toThrow(/E2E_DATABASE_URL/);
  });

  it('gives both server variables the same URL', () => {
    expect(e2eServerEnv({ DATABASE_URL: DEV, E2E_DATABASE_URL: E2E })).toEqual({
      DATABASE_URL: E2E,
      DATABASE_URL_UNPOOLED: E2E,
    });
  });
});
