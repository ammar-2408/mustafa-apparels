// Fixed at build time, so it adds no per-request work to cached pages.
// Netlify isn't relied on here: it may not send noindex on branch deploys. See docs/deployment.md §6.
import type { App } from './env.ts';

export function robotsHeaders(app: App, source: Record<string, string | undefined> = process.env) {
  if (app === 'web' && source.SITE_INDEXABLE === 'true') return [];
  return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }];
}
