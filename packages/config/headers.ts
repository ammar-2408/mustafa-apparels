// Fixed at build time, so it adds no per-request work to cached pages.
// Netlify isn't relied on here: it may not send noindex on branch deploys. See docs/deployment.md §6.
import type { App } from './env.ts';

export function robotsHeaders(app: App, source: Record<string, string | undefined> = process.env) {
  if (app === 'web' && source.SITE_INDEXABLE === 'true') return [];
  return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }];
}

type Options = { dev: boolean };

// docs/auth-security.md §3.1, on every response of both apps. HSTS has no preload for now.
export function securityHeaders() {
  return [
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ];
}

const GA = 'https://www.googletagmanager.com';
const CLOUDINARY = 'https://res.cloudinary.com';

const policy = (directives: Record<string, string[]>) =>
  Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ');

const shared = {
  'default-src': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'font-src': ["'self'"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'object-src': ["'none'"],
};

// Next's dev server evaluates code for fast refresh; production never gets 'unsafe-eval'.
const devEval = ({ dev }: Options) => (dev ? ["'unsafe-eval'"] : []);

const webSources = {
  'img-src': ["'self'", 'data:', 'blob:', CLOUDINARY, GA, 'https://*.google-analytics.com'],
  'media-src': ["'self'", CLOUDINARY],
  'connect-src': ["'self'", GA, 'https://*.google-analytics.com', 'https://*.google.com'],
  'worker-src': ["'self'", 'blob:'],
};

// Tier A (ADR-010): cached public pages can't carry a nonce, so they allow inline scripts.
// They render no user HTML, and the only raw HTML is JSON-LD through serializeJsonLd().
export function cspTierA(options: Options) {
  return policy({
    ...shared,
    'script-src': ["'self'", "'unsafe-inline'", ...devEval(options), GA],
    ...webSources,
  });
}

// Tier B and the whole admin: a fresh nonce per request, set by each app's proxy.ts.
export function nonceCsp(app: App, nonce: string, options: Options) {
  const scripts = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...devEval(options)];
  if (app === 'web') return policy({ ...shared, 'script-src': scripts, ...webSources });
  return policy({
    ...shared,
    'script-src': scripts,
    'img-src': ["'self'", 'data:', 'blob:', CLOUDINARY],
    'media-src': ["'self'", 'blob:', CLOUDINARY],
    'connect-src': ["'self'", 'https://api.cloudinary.com'],
  });
}

// The dynamic storefront pages. apps/web/proxy.ts lists the same paths in its matcher, which
// must be a literal; a test keeps the two equal.
export const TIER_B_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/account',
  '/account/:path*',
  '/search',
];

// Every path except the Tier B ones, so a page never gets two policies. Each name ends at a
// slash or the end, so /accounts-help or /search-tips still gets this policy.
export const TIER_A_SOURCE =
  '/((?!(?:login|register|forgot-password|reset-password|account|search)(?:/|$)).*)';

export function webHeaders(options: Options) {
  return [
    { source: '/:path*', headers: securityHeaders() },
    {
      source: TIER_A_SOURCE,
      headers: [{ key: 'Content-Security-Policy', value: cspTierA(options) }],
    },
  ];
}
