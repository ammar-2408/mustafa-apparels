import { describe, expect, it } from 'vitest';

import { cacheProblems, type PrerenderManifest } from './check-static';

const cached = { response: 'complete', compute: 'static' };
const blocking = { response: 'empty', compute: 'blocking' };
const manifest = (routes: PrerenderManifest['routes']): PrerenderManifest => ({
  routes,
  dynamicRoutes: {},
});

describe('cacheProblems', () => {
  it('passes cached public pages and per-request account pages', () => {
    expect(cacheProblems(manifest({ '/': cached, '/login': blocking }), ['/'], ['/login'])).toEqual(
      [],
    );
  });

  it('flags a public page that renders per request or is missing', () => {
    expect(cacheProblems(manifest({ '/': blocking }), ['/', '/shop'], [])).toEqual([
      '/ is not prerendered whole',
      '/shop is not prerendered whole',
    ]);
  });

  it('flags an account page served from the cache', () => {
    expect(cacheProblems(manifest({ '/account': cached }), [], ['/account'])).toEqual([
      '/account is cached but must render per request',
    ]);
  });

  it('passes on the real build list shape', () => {
    expect(cacheProblems(manifest({ '/': cached }), ['/'], ['/account'])).toEqual([]);
  });
});
