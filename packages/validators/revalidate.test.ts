import { describe, expect, it } from 'vitest';

import {
  categoryTag,
  collectionTags,
  productTag,
  revalidateBody,
  suitTags,
  TAGS,
} from './revalidate';

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

describe('tag builders', () => {
  it('build tags the storefront accepts', () => {
    const tags = [
      ...suitTags('0193c1a2-7b1e-7cc0-9d2a-4c1f0e8b9a11', 'dhanak', 'khaddar'),
      ...collectionTags('dhanak'),
      TAGS.settings,
    ];
    expect(revalidateBody.safeParse({ tags }).success).toBe(true);
  });

  it('give a suit change its id, the lists and each collection once', () => {
    expect(suitTags('p1', 'dhanak', null, 'dhanak', undefined)).toEqual([
      'products',
      'product:p1',
      'category:dhanak',
    ]);
  });

  it('give a collection change the menus, every card and each slug it had', () => {
    expect(collectionTags('old-name', 'new-name', 'new-name')).toEqual([
      'categories',
      'products',
      'category:old-name',
      'category:new-name',
    ]);
    expect(productTag('x')).toBe('product:x');
    expect(categoryTag('y')).toBe('category:y');
  });
});
