import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildMetadata, canonicalUrl, DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from './seo';

// The app Vitest preset sets NEXT_PUBLIC_SITE_URL to the production URL.
const freshImport = async (siteUrl: string | undefined) => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', siteUrl);
  vi.resetModules();
  return import('./seo');
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('SITE_URL', () => {
  it('is the configured site origin', () => {
    expect(SITE_URL).toBe('https://mustafaapparels.com');
  });

  it('drops a trailing slash, so joined paths never get a double slash', async () => {
    expect((await freshImport('https://mustafaapparels.com/')).SITE_URL).toBe(
      'https://mustafaapparels.com',
    );
  });

  it('refuses to build without a site URL rather than guess one', async () => {
    await expect(freshImport(undefined)).rejects.toThrow(/NEXT_PUBLIC_SITE_URL/);
    await expect(freshImport('  ')).rejects.toThrow(/NEXT_PUBLIC_SITE_URL/);
  });
});

describe('default share image', () => {
  // PNG: 8-byte signature, then the IHDR chunk with width and height as 32-bit integers.
  const png = readFileSync(join(import.meta.dirname, '../public', DEFAULT_OG_IMAGE.url));

  it('is a PNG in public/ of the size it claims', () => {
    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([
      DEFAULT_OG_IMAGE.width,
      DEFAULT_OG_IMAGE.height,
    ]);
  });

  it('is the 1200×630 logo image from the brand pack, described by the logo text', () => {
    expect(DEFAULT_OG_IMAGE).toMatchObject({
      url: '/og/og-default-1200x630.png',
      width: 1200,
      height: 630,
      alt: 'MA Apparels by Mustafa Ahmed',
    });
  });

  it('goes with the public shop name', () => {
    expect(SITE_NAME).toBe('Mustafa Apparels');
  });
});

describe('canonicalUrl', () => {
  it.each([
    ['/shop', 'https://mustafaapparels.com/shop'],
    ['/collections/dhanak/page/2', 'https://mustafaapparels.com/collections/dhanak/page/2'],
    ['about', 'https://mustafaapparels.com/about'],
    ['/shop/', 'https://mustafaapparels.com/shop'],
    ['//collections//dhanak///', 'https://mustafaapparels.com/collections/dhanak'],
    ['/Collections/Dhanak', 'https://mustafaapparels.com/collections/dhanak'],
    ['/shop?fabric=dhanak&sort=price#grid', 'https://mustafaapparels.com/shop'],
    [
      '/products/black-dhanak-suit?utm_source=whatsapp',
      'https://mustafaapparels.com/products/black-dhanak-suit',
    ],
  ])('turns %s into %s', (path, url) => {
    expect(canonicalUrl(path)).toBe(url);
  });

  it.each(['/', '', '?ref=home'])('gives the home page its root URL for %j', (path) => {
    expect(canonicalUrl(path)).toBe('https://mustafaapparels.com/');
  });

  it.each(['https://example.com/shop', 'http://mustafaapparels.com/shop'])(
    'refuses a full URL, so a canonical never points off this site: %s',
    (url) => {
      expect(() => canonicalUrl(url)).toThrow();
    },
  );
});

describe('buildMetadata', () => {
  const DESCRIPTION =
    'Unstitched 2-piece and 3-piece Dhanak suits for winter, with embroidered shirts, printed dupattas and plain dyed trousers, ordered on WhatsApp.';
  const build = (overrides: Partial<Parameters<typeof buildMetadata>[0]> = {}) =>
    buildMetadata({
      title: 'Dhanak suits',
      description: DESCRIPTION,
      path: '/collections/dhanak',
      ...overrides,
    });
  const titleOf = (title: string) => (build({ title }).title as { absolute: string }).absolute;
  const descriptionOf = (description: string) => build({ description }).description!;
  const words = (count: number) => Array.from({ length: count }, (_, i) => `word${i}`).join(' ');

  describe('title', () => {
    it('adds the shop name when the whole title fits in 60 characters', () => {
      expect(titleOf('Dhanak suits')).toBe('Dhanak suits | Mustafa Apparels');
    });

    it('keeps the shop name at exactly 60 characters and drops it at 61', () => {
      const suffix = ' | Mustafa Apparels';
      const at60 = 'a'.repeat(60 - suffix.length);
      expect(titleOf(at60)).toBe(`${at60}${suffix}`);
      expect(titleOf(`${at60}b`)).toBe(`${at60}b`);
    });

    it('drops the shop name for a long suit name instead of cutting the name', () => {
      const name = 'Black embroidered 3-piece Dhanak suit with printed dupatta';
      expect(titleOf(name)).toBe(name);
    });

    it('never names the shop twice', () => {
      expect(titleOf('Mustafa Apparels')).toBe('Mustafa Apparels');
      expect(titleOf('About Mustafa Apparels')).toBe('About Mustafa Apparels');
    });

    it('trims a title over 60 characters at a word boundary', () => {
      const title = titleOf(words(15));
      expect(title.length).toBeLessThanOrEqual(60);
      expect(title.endsWith('…')).toBe(true);
      expect(words(15).startsWith(`${title.slice(0, -1)} `)).toBe(true);
    });

    it('tidies spaces', () => {
      expect(titleOf('  Dhanak   suits ')).toBe('Dhanak suits | Mustafa Apparels');
    });
  });

  describe('description', () => {
    it('keeps a description of 160 characters or fewer as it is', () => {
      expect(descriptionOf(DESCRIPTION)).toBe(DESCRIPTION);
      const at160 = `${'a'.repeat(155)} bcde`;
      expect(descriptionOf(at160)).toBe(at160);
    });

    it('trims a longer one at a word boundary to at most 160 characters', () => {
      const long = `${DESCRIPTION} Each suit has its own design code, and the shop replies quickly with photos.`;
      const trimmed = descriptionOf(long);
      expect(trimmed.length).toBeLessThanOrEqual(160);
      expect(trimmed.endsWith('…')).toBe(true);
      expect(long.startsWith(trimmed.slice(0, -1))).toBe(true);
      expect(long[trimmed.length - 1]).toBe(' ');
    });

    it('trims at 161 characters', () => {
      const at161 = `${'a'.repeat(150)} bcdefghijk`;
      expect(at161).toHaveLength(161);
      expect(descriptionOf(at161)).toBe(`${'a'.repeat(150)}…`);
    });

    it('drops a trailing comma or dash before the ellipsis', () => {
      const text = `${'a'.repeat(140)}, ${'b'.repeat(30)}`;
      expect(descriptionOf(text)).toBe(`${'a'.repeat(140)}…`);
    });

    it('cuts a run of text with no spaces at 160 characters', () => {
      expect(descriptionOf('a'.repeat(200))).toBe(`${'a'.repeat(159)}…`);
    });

    it('tidies spaces and line breaks', () => {
      expect(descriptionOf('Unstitched\n  suits  for winter.')).toBe(
        'Unstitched suits for winter.',
      );
    });
  });

  it('points the canonical and og:url at this page itself', () => {
    const metadata = build({ path: '/collections/dhanak/page/2' });
    expect(metadata.alternates?.canonical).toBe(
      'https://mustafaapparels.com/collections/dhanak/page/2',
    );
    expect(metadata.openGraph).toMatchObject({
      url: 'https://mustafaapparels.com/collections/dhanak/page/2',
    });
  });

  it('fills Open Graph and Twitter with the same title, description and default image', () => {
    const metadata = build();
    expect(metadata.openGraph).toMatchObject({
      type: 'website',
      siteName: 'Mustafa Apparels',
      locale: 'en_PK',
      title: 'Dhanak suits | Mustafa Apparels',
      description: DESCRIPTION,
      images: [DEFAULT_OG_IMAGE],
    });
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      title: 'Dhanak suits | Mustafa Apparels',
      description: DESCRIPTION,
      images: [DEFAULT_OG_IMAGE],
    });
  });

  it('uses a page image when it has one', () => {
    const image = {
      url: '/collections/dhanak/opengraph-image',
      width: 1200,
      height: 630,
      alt: 'Dhanak suits',
    };
    const metadata = build({ image });
    expect(metadata.openGraph).toMatchObject({ images: [image] });
    expect(metadata.twitter).toMatchObject({ images: [image] });
  });

  it.each([
    [{}, { index: true, follow: true }],
    [{ noindex: true }, { index: false, follow: true }],
    [
      { noindex: true, nofollow: true },
      { index: false, follow: false },
    ],
  ])('sets robots for %j to %j', (options, robots) => {
    expect(build(options).robots).toEqual(robots);
  });
});
