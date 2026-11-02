// @vitest-environment node
import { createRequire } from 'node:module';

import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { config, proxy } from './proxy';

const { pathToRegexp } = createRequire(import.meta.url)('next/dist/compiled/path-to-regexp');
const matches = (path: string) => config.matcher.some((p) => pathToRegexp(p).test(path));

describe('admin proxy', () => {
  it('runs on every page and route', () => {
    for (const path of [
      '/',
      '/login',
      '/login/verify',
      '/setup-2fa',
      '/products',
      '/api/auth/get-session',
    ]) {
      expect(matches(path), path).toBe(true);
    }
  });

  it('skips static files and the brand icons', () => {
    for (const path of [
      '/_next/static/chunks/a.js',
      '/favicon.ico',
      '/manifest.webmanifest',
      '/brand/svg/x.svg',
    ]) {
      expect(matches(path), path).toBe(false);
    }
  });

  it('sends a fresh nonce CSP with no GA4', () => {
    const csp = (path: string) =>
      proxy(new NextRequest(`http://localhost:3001${path}`)).headers.get(
        'content-security-policy',
      )!;
    const first = csp('/login');
    expect(first).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(first).not.toContain('googletagmanager');
    expect(first).not.toBe(csp('/login'));
  });
});
