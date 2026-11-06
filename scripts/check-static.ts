// `pnpm check:static` after `pnpm build`: proves the cached public pages really are cached
// (ADR-009/021). A page that reads cookies, headers or searchParams outside a cache stops being
// prerendered, which costs compute credits on every visit. CI runs this after the build.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type Route = { response?: string; compute?: string };
export type PrerenderManifest = {
  routes: Record<string, Route>;
  dynamicRoutes: Record<string, unknown>;
};

// Public pages served whole from the cache. Grows with each storefront step.
export const CACHED = ['/', '/shop'];
// Per-request pages (proxy.ts nonce, session): they must never be served from the cache.
export const PER_REQUEST = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/account',
];

const isCached = (route: Route | undefined) =>
  route?.compute === 'static' && route.response === 'complete';

export function cacheProblems(
  manifest: PrerenderManifest,
  cached = CACHED,
  perRequest = PER_REQUEST,
) {
  const problems: string[] = [];
  for (const path of cached) {
    if (!isCached(manifest.routes[path])) problems.push(`${path} is not prerendered whole`);
  }
  for (const path of perRequest) {
    if (isCached(manifest.routes[path]))
      problems.push(`${path} is cached but must render per request`);
  }
  return problems;
}

if (require.main === module) {
  const file = join(__dirname, '..', 'apps', 'web', '.next', 'prerender-manifest.json');
  const problems = cacheProblems(JSON.parse(readFileSync(file, 'utf8')) as PrerenderManifest);
  if (problems.length > 0) {
    console.error(problems.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(`Cached: ${CACHED.join(', ')}. Per request: ${PER_REQUEST.join(', ')}.`);
  }
}
