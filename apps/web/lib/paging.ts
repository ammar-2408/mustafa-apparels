// Path-based paging (ADR-017): /shop/page/2 and /collections/<slug>/page/2. Page 1 has no
// /page/1 URL (next.config sends it to the clean URL with a 301).
import { laterPageParam } from '@mustafa/validators/paging';

/** The page number from the URL, or null for anything that must 404. */
export function parsePageParam(value: string): number | null {
  const parsed = laterPageParam.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** The URL of a list page: page 1 is the clean URL. */
export const pageHref = (base: string, page: number) => (page <= 1 ? base : `${base}/page/${page}`);

/**
 * Params for generateStaticParams: every later page. Cache Components needs at least one, so a
 * one-page list still prerenders /page/2, as a cached 404. A page that appears later renders on
 * its first request (the route's layout sets instant = false, so it renders whole and a bad
 * number gets a real 404), then stays cached.
 */
export function laterPageParams(pageCount: number) {
  const pages = Array.from({ length: Math.max(pageCount - 1, 1) }, (_, i) => String(i + 2));
  return pages.map((n) => ({ n }));
}
