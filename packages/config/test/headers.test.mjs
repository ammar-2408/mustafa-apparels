import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import { test } from 'vitest';

import {
  cspTierA,
  nonceCsp,
  robotsHeaders,
  securityHeaders,
  TIER_A_SOURCE,
  TIER_B_PATHS,
  webHeaders,
} from '../headers.ts';

const NOINDEX = [
  { source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
];

test('the storefront sends noindex until it is marked indexable', () => {
  assert.deepEqual(robotsHeaders('web', { SITE_INDEXABLE: 'false' }), NOINDEX);
});

test('the storefront sends noindex when the flag is missing', () => {
  assert.deepEqual(robotsHeaders('web', {}), NOINDEX);
});

test('the storefront sends no robots header once indexable', () => {
  assert.deepEqual(robotsHeaders('web', { SITE_INDEXABLE: 'true' }), []);
});

test('the admin always sends noindex, even with the flag on', () => {
  assert.deepEqual(robotsHeaders('admin', { SITE_INDEXABLE: 'true' }), NOINDEX);
  assert.deepEqual(robotsHeaders('admin', { SITE_INDEXABLE: 'false' }), NOINDEX);
});

const { pathToRegexp } = createRequire(import.meta.url)('next/dist/compiled/path-to-regexp');
const directives = (csp) =>
  Object.fromEntries(
    csp
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, ...values] = part.split(/\s+/);
        return [name, values];
      }),
  );

test('every response gets the §3.1 headers, with HSTS and no preload', () => {
  const headers = Object.fromEntries(securityHeaders().map((h) => [h.key, h.value]));
  assert.deepEqual(headers, {
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'X-Frame-Options': 'DENY',
    'Cross-Origin-Opener-Policy': 'same-origin',
  });
});

test('Tier A: a fixed policy, inline scripts and GA4 allowed, no nonce, no eval in production', () => {
  const csp = directives(cspTierA({ dev: false }));
  assert.deepEqual(csp['script-src'], [
    "'self'",
    "'unsafe-inline'",
    'https://www.googletagmanager.com',
  ]);
  assert.deepEqual(csp['media-src'], ["'self'", 'https://res.cloudinary.com']);
  assert.ok(csp['img-src'].includes('https://res.cloudinary.com'));
  assert.ok(csp['worker-src'].includes('blob:'));
  assert.deepEqual(csp['frame-ancestors'], ["'none'"]);
  assert.deepEqual(csp['object-src'], ["'none'"]);
  assert.ok(!cspTierA({ dev: false }).includes('nonce'));
  assert.ok(cspTierA({ dev: true }).includes("'unsafe-eval'"));
});

test('Tier B and admin: a nonce with strict-dynamic, and no unsafe-inline for scripts', () => {
  const web = directives(nonceCsp('web', 'abc123', { dev: false }));
  assert.deepEqual(web['script-src'], ["'self'", "'nonce-abc123'", "'strict-dynamic'"]);
  assert.deepEqual(web['media-src'], ["'self'", 'https://res.cloudinary.com']);

  const admin = directives(nonceCsp('admin', 'abc123', { dev: false }));
  assert.deepEqual(admin['script-src'], ["'self'", "'nonce-abc123'", "'strict-dynamic'"]);
  assert.deepEqual(admin['connect-src'], ["'self'", 'https://api.cloudinary.com']);
  assert.ok(!JSON.stringify(admin).includes('googletagmanager'));
  assert.ok(admin['img-src'].includes('data:'));
  assert.ok(nonceCsp('admin', 'n', { dev: true }).includes("'unsafe-eval'"));
  assert.ok(!nonceCsp('admin', 'n', { dev: false }).includes("'unsafe-eval'"));
});

test("Tier A's source matches cached pages and never a Tier B page", () => {
  const tierA = pathToRegexp(TIER_A_SOURCE);
  for (const path of [
    '/',
    '/shop',
    '/shop/page/2',
    '/collections/dhanak',
    '/products/a-suit',
    '/about',
    '/no-such-page',
  ]) {
    assert.ok(tierA.test(path), path);
  }
  for (const path of [...TIER_B_PATHS.filter((p) => !p.includes(':')), '/account/wishlist']) {
    assert.ok(!tierA.test(path), path);
  }
});

test('web headers: security headers everywhere, Tier A only off the Tier B paths', () => {
  const rules = webHeaders({ dev: false });
  assert.equal(rules[0].source, '/:path*');
  assert.deepEqual(rules[0].headers, securityHeaders());
  assert.equal(rules[1].source, TIER_A_SOURCE);
  assert.deepEqual(rules[1].headers, [
    { key: 'Content-Security-Policy', value: cspTierA({ dev: false }) },
  ]);
});
