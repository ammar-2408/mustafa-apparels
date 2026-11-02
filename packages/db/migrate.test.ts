import { describe, expect, it } from 'vitest';

import { migrationPlan } from './migrate';

const URL = 'postgresql://u:secret@ep-x.us-east-2.aws.neon.tech/neondb';

describe('migrationPlan', () => {
  it('runs against the direct URL when it is set', () => {
    expect(migrationPlan({ DATABASE_URL_UNPOOLED: URL, APP_ENV: 'production' })).toEqual({
      run: true,
      url: URL,
    });
  });

  it('skips a mock-mode preview that has no database yet', () => {
    const plan = migrationPlan({ APP_ENV: 'preview', INTEGRATIONS_MODE: 'mock' });
    expect(plan).toEqual({ run: false, note: expect.stringMatching(/DATABASE_URL_UNPOOLED/) });
  });

  it('treats a blank value as missing', () => {
    expect(migrationPlan({ DATABASE_URL_UNPOOLED: '  ', INTEGRATIONS_MODE: 'mock' }).run).toBe(
      false,
    );
  });

  it('fails in production when the URL is missing, even in mock mode', () => {
    expect(() => migrationPlan({ APP_ENV: 'production', INTEGRATIONS_MODE: 'mock' })).toThrowError(
      'DATABASE_URL_UNPOOLED is missing',
    );
  });

  it('fails in live mode when the URL is missing', () => {
    expect(() => migrationPlan({ APP_ENV: 'preview' })).toThrowError(
      'DATABASE_URL_UNPOOLED is missing',
    );
  });
});
