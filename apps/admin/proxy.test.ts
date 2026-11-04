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
      '/brand/svg/mustafa-apparels-submark-black.svg',
      '/brand/favicon/favicon.svg',
      '/brand/favicon/icon-192.png',
      '/brand/favicon/apple-touch-icon-180.png',
    ]) {
      expect(matches(path), path).toBe(false);
    }
  });

  // Only image files skip the session check: anything else under /brand/ is gated like a page.
  it('still gates /brand/ paths that are not image files', () => {
    for (const path of ['/brand', '/brand/', '/brand/secret', '/brand/notes.txt', '/brandx']) {
      expect(matches(path), path).toBe(true);
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

describe('admin gate', () => {
  const get = (path: string, cookie?: string) =>
    proxy(
      new NextRequest(`http://localhost:3001${path}`, {
        headers: cookie ? { cookie } : {},
      }),
    );

  it('sends a signed-out visitor on any page to the login page', () => {
    for (const path of ['/', '/products', '/setup-2fa', '/settings?tab=contact']) {
      const response = get(path);
      expect(response.status, path).toBe(307);
      expect(new URL(response.headers.get('location')!).pathname).toBe('/login');
    }
  });

  it('answers 401 to a signed-out API call instead of redirecting', async () => {
    const response = get('/api/upload/sign');
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED' } });
  });

  it('lets the login pages and Better Auth through without a session', () => {
    for (const path of ['/login', '/login/verify', '/api/auth/sign-in/email']) {
      expect(get(path).status, path).toBe(200);
    }
  });

  it("ignores the storefront's cookie", () => {
    expect(get('/', 'ma.session_token=abc.def').status).toBe(307);
  });

  it('passes a request with an admin cookie on, for the page itself to check', () => {
    const response = get('/', 'ma-admin.session_token=abc.def');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-security-policy')).toContain("'strict-dynamic'");
  });

  it('keeps the CSP on redirects too', () => {
    expect(get('/').headers.get('content-security-policy')).toContain("'strict-dynamic'");
  });
});
