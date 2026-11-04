import { describe, expect, it } from 'vitest';

import { revalidateBody } from './revalidate';

const ok = (tags: unknown) => revalidateBody.safeParse({ tags }).success;

describe('revalidateBody', () => {
  it('accepts the fixed tags and id or slug tags', () => {
    expect(
      ok([
        'products',
        'categories',
        'settings',
        'product:0193c1a2-7b1e-7cc0-9d2a-4c1f0e8b9a11',
        'category:dhanak',
      ]),
    ).toBe(true);
  });

  it.each([
    ['an unknown tag', ['everything']],
    ['a bare prefix', ['product:']],
    ['a path', ['/']],
    ['a tag with a space', ['category:dhanak suits']],
    ['a tag with a slash', ['category:../x']],
    ['a near miss in case', ['Products']],
    ['an empty list', []],
    ['too many tags', Array.from({ length: 21 }, () => 'products')],
    ['a non-string', [42]],
  ])('refuses %s', (_name, tags) => {
    expect(ok(tags)).toBe(false);
  });

  it('refuses extra fields', () => {
    expect(revalidateBody.safeParse({ tags: ['products'], path: '/' }).success).toBe(false);
  });
});
