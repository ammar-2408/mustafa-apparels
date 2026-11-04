import { describe, expect, it } from 'vitest';

import { slugify } from './slugify';

describe('slugify', () => {
  it.each([
    ['Dhanak', 'dhanak'],
    ['Black Embroidered Dhanak 3-Piece Suit', 'black-embroidered-dhanak-3-piece-suit'],
    ['  Winter  & Festive!! ', 'winter-festive'],
    ['Café Crème', 'cafe-creme'],
    ['KDR-13', 'kdr-13'],
    ['---', ''],
  ])('turns %j into %j', (name, expected) => {
    expect(slugify(name)).toBe(expected);
  });

  it('cuts to the limit without leaving a hyphen at the end', () => {
    expect(slugify('ab cd ef', 3)).toBe('ab');
    expect(slugify('a'.repeat(200))).toHaveLength(140);
  });

  it('always gives a slug matching the validator pattern', () => {
    for (const name of ['Lajwanti', 'Pink Printed Lawn 2-Piece Suit', 'A-Line / Kurta']) {
      expect(slugify(name)).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });
});
