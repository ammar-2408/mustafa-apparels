import { describe, expect, it } from 'vitest';

import { menuLinks, socialLinks } from './nav';

describe('menuLinks', () => {
  it('puts new arrivals and the collections first, in shop order', () => {
    const links = menuLinks([
      { slug: 'dhanak', name: 'Dhanak' },
      { slug: 'khaddar', name: 'Khaddar' },
    ]);
    expect(links.map((l) => l.label)).toEqual([
      'New arrivals',
      'Dhanak',
      'Khaddar',
      'All suits',
      'How to Order',
    ]);
    expect(links[1]!.href).toBe('/collections/dhanak');
  });

  it('still works with no collections yet', () => {
    expect(menuLinks([]).map((l) => l.href)).toEqual(['/#new-arrivals', '/shop', '/how-to-order']);
  });
});

describe('socialLinks', () => {
  it('lists only the profiles that are set, in a fixed order', () => {
    expect(
      socialLinks({ youtube: 'https://youtube.com/@ma', instagram: 'https://instagram.com/ma' }),
    ).toEqual([
      { href: 'https://instagram.com/ma', label: 'Instagram' },
      { href: 'https://youtube.com/@ma', label: 'YouTube' },
    ]);
  });

  it('is empty when none are set', () => {
    expect(socialLinks(null)).toEqual([]);
    expect(socialLinks({})).toEqual([]);
  });
});
