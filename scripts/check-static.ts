// `pnpm check:static` after `pnpm build`: proves the cached public pages really are cached
// (ADR-009/021), and that the storefront's browser JavaScript names no banned brand (AGENTS.md §1).
// A page that reads cookies, headers or searchParams stops being prerendered, which costs compute
// credits on every visit. CI runs this after the build.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { BANNED_TERMS } from '@mustafa/validators/banned-terms';

type Route = { response?: string; compute?: string };
export type PrerenderManifest = {
  routes: Record<string, Route>;
  dynamicRoutes: Record<string, unknown>;
};

// Public pages served whole from the cache.
export const CACHED = [
  '/',
  '/shop',
  '/api/suits',
  '/about',
  '/contact',
  '/how-to-order',
  '/faq',
  '/privacy',
  '/terms',
];
// Public routes with a value in the path: prerendered from generateStaticParams, and one that
// appears later is rendered once, then cached. A route that turned per-request drops out of the
// manifest's dynamicRoutes.
export const CACHED_PATTERNS = [
  '/shop/page/[n]',
  '/collections/[slug]',
  '/collections/[slug]/page/[n]',
  '/products/[slug]',
];
// Per-request pages (proxy.ts nonce or session): never served from the cache. Search is a navbar
// box, not a page (owner, 2026-11-22).
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
  patterns = CACHED_PATTERNS,
) {
  const problems: string[] = [];
  for (const path of cached) {
    if (!isCached(manifest.routes[path])) problems.push(`${path} is not prerendered whole`);
  }
  for (const pattern of patterns) {
    if (!(pattern in manifest.dynamicRoutes)) {
      problems.push(`${pattern} is not prerendered (it renders per request)`);
    }
  }
  for (const path of perRequest) {
    if (isCached(manifest.routes[path]))
      problems.push(`${path} is cached but must render per request`);
  }
  return problems;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Banned brand names found in browser files, as "file: name". */
export function bannedInBundle(
  files: { path: string; text: string }[],
  terms: readonly string[] = BANNED_TERMS,
) {
  const patterns = terms.map((term) => ({
    term,
    pattern: new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i'),
  }));
  return files.flatMap(({ path, text }) =>
    patterns.filter(({ pattern }) => pattern.test(text)).map(({ term }) => `${path}: ${term}`),
  );
}

function scriptsUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return scriptsUnder(path);
    return name.endsWith('.js') ? [path] : [];
  });
}

if (require.main === module) {
  const web = join(__dirname, '..', 'apps', 'web', '.next');
  const problems = cacheProblems(
    JSON.parse(readFileSync(join(web, 'prerender-manifest.json'), 'utf8')) as PrerenderManifest,
  );
  const files = scriptsUnder(join(web, 'static')).map((path) => ({
    path: relative(web, path),
    text: readFileSync(path, 'utf8'),
  }));
  problems.push(...bannedInBundle(files).map((hit) => `brand name in browser JavaScript: ${hit}`));
  if (problems.length > 0) {
    console.error(problems.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(
      `Cached: ${CACHED.join(', ')}, ${CACHED_PATTERNS.join(', ')}. Per request: ${PER_REQUEST.join(', ')}. ${files.length} browser files name no banned brand.`,
    );
  }
}
