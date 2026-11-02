// @vitest-environment node
import { createRequire } from 'node:module';

import { TIER_B_PATHS } from '@mustafa/config/headers';
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { config, proxy } from './proxy';

const { pathToRegexp } = createRequire(import.meta.url)('next/dist/compiled/path-to-regexp');
const matches = (path: string) =>
  config.matcher.some((pattern) => pathToRegexp(pattern).test(path));

describe('web proxy matcher', () => {
  it('lists exactly the Tier B paths', () => {
    expect(config.matcher).toEqual(TIER_B_PATHS);
  });

  it('never runs on a cached page, which would make it per-request', () => {
    for (const path of [
      '/',
      '/shop',
      '/shop/page/2',
      '/collections/dhanak',
      '/collections/dhanak/page/2',
      '/products/black-embroidered-dhanak-3-piece-suit',
      '/about',
      '/contact',
      '/how-to-order',
      '/faq',
      '/privacy',
      '/terms',
      '/api/suits',
      '/sitemap.xml',
      '/robots.txt',
    ]) {
      expect(matches(path), path).toBe(false);
    }
  });

  it('runs on every dynamic page', () => {
    for (const path of [
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/account',
      '/account/wishlist',
      '/search',
    ]) {
      expect(matches(path), path).toBe(true);
    }
  });
});

describe('web proxy', () => {
  const run = () => proxy(new NextRequest('http://localhost:3000/login'));

  it('sends a nonce CSP and passes the nonce on to Next', () => {
    const response = run();
    const csp = response.headers.get('content-security-policy')!;
    const nonce = csp.match(/'nonce-([^']+)'/)![1]!;
    expect(csp).toContain("'strict-dynamic'");
    expect(response.headers.get('x-middleware-request-x-nonce')).toBe(nonce);
  });

  it('makes a new nonce for every request', () => {
    const nonceOf = () =>
      run()
        .headers.get('content-security-policy')!
        .match(/'nonce-([^']+)'/)![1];
    expect(nonceOf()).not.toBe(nonceOf());
  });
});
