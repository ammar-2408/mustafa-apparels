import { describe, expect, it } from 'vitest';

import {
  categoryImageInput,
  categoryInput,
  categoryReorderInput,
  categoryUpdateInput,
  categoryVisibilityInput,
} from './category';

const dhanak = { name: 'Dhanak', slug: 'dhanak' };

describe('categoryInput', () => {
  it('needs only a name and slug, and fills the rest', () => {
    expect(categoryInput.parse(dhanak)).toEqual({
      ...dhanak,
      description: null,
      imageUrl: null,
      imagePublicId: null,
      parentId: null,
      sortOrder: 0,
      isActive: true,
      seoTitle: null,
      seoDescription: null,
    });
  });

  it('treats blank optional text as empty', () => {
    expect(categoryInput.parse({ ...dhanak, description: '  ' }).description).toBeNull();
  });

  it.each([
    ['a one-letter name', { name: 'D' }],
    ['a slug with spaces', { slug: 'dhanak suits' }],
    ['a banned brand name in the name', { name: 'Khaadi Lawn' }],
    ['a banned brand name in the description', { description: 'Same as Elaf' }],
    ['a banned brand name in the SEO title', { seoTitle: 'Maria B style' }],
    ['an SEO title over 70 characters', { seoTitle: 'a'.repeat(71) }],
    ['an SEO description over 160 characters', { seoDescription: 'a'.repeat(161) }],
    ['an image URL that is not https', { imageUrl: 'http://res.cloudinary.com/x.jpg' }],
    ['an unknown key', { featured: true }],
  ])('rejects %s', (_, change) => {
    expect(categoryInput.safeParse({ ...dhanak, ...change }).success).toBe(false);
  });
});

describe('categoryUpdateInput', () => {
  it('takes an id and only the fields that change', () => {
    expect(categoryUpdateInput.parse({ id: 'c1', isActive: false })).toEqual({
      id: 'c1',
      isActive: false,
    });
  });

  it('does not let a collection be its own parent', () => {
    expect(categoryUpdateInput.safeParse({ id: 'c1', parentId: 'c1' }).success).toBe(false);
  });
});

describe('categoryReorderInput', () => {
  it('takes the ids in their new order', () => {
    expect(categoryReorderInput.parse({ ids: ['c2', 'c1'] })).toEqual({ ids: ['c2', 'c1'] });
  });

  it('rejects an empty list and repeated ids', () => {
    expect(categoryReorderInput.safeParse({ ids: [] }).success).toBe(false);
    expect(categoryReorderInput.safeParse({ ids: ['c1', 'c1'] }).success).toBe(false);
  });
});

describe('categoryVisibilityInput', () => {
  it('takes an id and a true or false, and nothing else', () => {
    expect(categoryVisibilityInput.safeParse({ id: 'c1', isActive: false }).success).toBe(true);
    expect(categoryVisibilityInput.safeParse({ id: 'c1', isActive: 'no' }).success).toBe(false);
    expect(categoryVisibilityInput.safeParse({ id: 'c1' }).success).toBe(false);
    expect(categoryVisibilityInput.safeParse({ id: 'c1', isActive: true, name: 'x' }).success).toBe(
      false,
    );
  });
});

describe('categoryImageInput', () => {
  it('takes a collection upload or null, nothing else', () => {
    const ok = (publicId: unknown) => categoryImageInput.safeParse({ id: 'c1', publicId }).success;
    expect(ok('categories/c1/abc')).toBe(true);
    expect(ok(null)).toBe(true);
    expect(ok('products/p1/abc')).toBe(false);
    expect(ok('categories/c1/../x')).toBe(false);
  });
});
