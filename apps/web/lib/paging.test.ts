import { describe, expect, it } from 'vitest';

import { laterPageParams, pageHref, parsePageParam } from './paging';

describe('parsePageParam', () => {
  it('accepts page 2 and up', () => {
    expect(parsePageParam('2')).toBe(2);
    expect(parsePageParam('15')).toBe(15);
  });

  it.each(['1', '0', '01', 'abc'])('refuses %j, so the page 404s', (value) => {
    expect(parsePageParam(value)).toBeNull();
  });
});

describe('page links', () => {
  it('sends page 1 to the clean URL', () => {
    expect(pageHref('/shop', 1)).toBe('/shop');
    expect(pageHref('/collections/dhanak', 3)).toBe('/collections/dhanak/page/3');
  });

  it('prerenders every later page, and none for a one-page list', () => {
    expect(laterPageParams(3)).toEqual([{ n: '2' }, { n: '3' }]);
    expect(laterPageParams(1)).toEqual([]);
  });
});
