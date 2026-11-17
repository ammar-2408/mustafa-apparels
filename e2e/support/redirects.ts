import { type APIResponse, expect } from '@playwright/test';

// The address(es) a redirect sends a browser to. Next.js (15.4.1 and later, tracked as NEXT-4749)
// sends the Location header twice when a cached page calls redirect() or permanentRedirect(); the
// request client joins the copies with ", ". Every browser follows it (checked in Chromium,
// Firefox and WebKit, 2026-11-17), so what matters is that every copy points to the same place.
// docs/debugging.md has the details; recheck when Next.js is upgraded.
export function redirectTargets(response: APIResponse): string[] {
  const location = response.headers()['location'] ?? '';
  return location.split(', ').map((value) => new URL(value, 'http://x').pathname);
}

/** Every Location copy points to `path`, and there is at least one. */
export function expectRedirectTo(response: APIResponse, path: string) {
  const targets = redirectTargets(response);
  expect(targets.length, 'Location header').toBeGreaterThan(0);
  expect(new Set(targets), `Location: ${response.headers()['location']}`).toEqual(new Set([path]));
}
