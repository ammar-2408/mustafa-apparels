// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@mustafa/config/env', () => ({ getEnv: () => ({}) }));

import { cloudNameForPreviews, mockUploadsAllowed } from './media';

const config = (mode: 'live' | 'mock', appEnv: string) => ({
  mode,
  appEnv,
  cloudName: 'mustafa',
  apiKey: 'k',
  apiSecret: 's',
});

describe('mockUploadsAllowed', () => {
  it('allows the mock upload route only in mock mode on a local or test run', () => {
    expect(mockUploadsAllowed(config('mock', 'development'))).toBe(true);
    expect(mockUploadsAllowed(config('mock', 'test'))).toBe(true);
  });

  it('never on a hosted preview or production, even in mock mode, nor in live mode', () => {
    expect(mockUploadsAllowed(config('mock', 'preview'))).toBe(false);
    expect(mockUploadsAllowed(config('mock', 'production'))).toBe(false);
    expect(mockUploadsAllowed(config('live', 'development'))).toBe(false);
  });
});

describe('cloudNameForPreviews', () => {
  it('uses the real cloud in live mode and the demo cloud in mock mode', () => {
    expect(cloudNameForPreviews(config('live', 'production'))).toBe('mustafa');
    expect(cloudNameForPreviews(config('mock', 'test'))).toBe('demo');
  });
});
