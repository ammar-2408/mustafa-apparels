import { describe, expect, it } from 'vitest';

import { bannedInBundle, cacheProblems, type PrerenderManifest } from './check-static';

const cached = { response: 'complete', compute: 'static' };
const blocking = { response: 'empty', compute: 'blocking' };
const manifest = (
  routes: PrerenderManifest['routes'],
  dynamicRoutes: PrerenderManifest['dynamicRoutes'] = {},
): PrerenderManifest => ({ routes, dynamicRoutes });

describe('cacheProblems', () => {
  it('passes cached pages, prerendered patterns and per-request account pages', () => {
    expect(
      cacheProblems(
        manifest({ '/': cached, '/login': blocking }, { '/products/[slug]': {} }),
        ['/'],
        ['/login'],
        ['/products/[slug]'],
      ),
    ).toEqual([]);
  });

  it('flags a public page that renders per request or is missing', () => {
    expect(cacheProblems(manifest({ '/': blocking }), ['/', '/shop'], [], [])).toEqual([
      '/ is not prerendered whole',
      '/shop is not prerendered whole',
    ]);
  });

  it('flags a suit or collection route that stopped being prerendered', () => {
    expect(
      cacheProblems(
        manifest({}, { '/collections/[slug]': {} }),
        [],
        [],
        ['/collections/[slug]', '/products/[slug]'],
      ),
    ).toEqual(['/products/[slug] is not prerendered (it renders per request)']);
  });

  it('flags an account or search page served from the cache', () => {
    expect(cacheProblems(manifest({ '/search': cached }), [], ['/search'], [])).toEqual([
      '/search is cached but must render per request',
    ]);
  });
});

describe('bannedInBundle', () => {
  const terms = ['Maria B', 'So Kamal', 'Nishat'] as const;

  it('finds a banned name in any case, as a whole name', () => {
    expect(
      bannedInBundle(
        [
          { path: 'static/chunks/a.js', text: 'const list=["maria b","x"]' },
          { path: 'static/chunks/b.js', text: 'say("SO KAMAL")' },
        ],
        terms,
      ),
    ).toEqual(['static/chunks/a.js: Maria B', 'static/chunks/b.js: So Kamal']);
  });

  it('ignores words that only contain a name inside them', () => {
    expect(
      bannedInBundle([{ path: 'static/c.js', text: 'also kamalpur nishatpur mariab' }], terms),
    ).toEqual([]);
  });
});
