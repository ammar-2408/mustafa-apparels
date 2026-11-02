import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from './seo';

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
      url: '/brand/social/og-share-image-1200x630.png',
      width: 1200,
      height: 630,
      alt: 'MA Apparels by Mustafa Ahmed',
    });
  });

  it('goes with the public shop name', () => {
    expect(SITE_NAME).toBe('Mustafa Apparels');
  });
});
