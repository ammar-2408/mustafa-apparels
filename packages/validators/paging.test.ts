import { describe, expect, it } from 'vitest';

import { laterPageParam } from './paging';

describe('laterPageParam', () => {
  it('accepts page 2 and up', () => {
    expect(laterPageParam.parse('2')).toBe(2);
    expect(laterPageParam.parse('15')).toBe(15);
  });

  it.each(['1', '0', '-1', '01', '02', 'abc', '2.5', ' 2', '2 ', '+2', '', '1e3', '99999'])(
    'refuses %j',
    (value) => {
      expect(laterPageParam.safeParse(value).success).toBe(false);
    },
  );
});
