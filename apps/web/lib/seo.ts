// Site-wide SEO values for the storefront (docs/design.md §8).

export const SITE_NAME = 'Mustafa Apparels';

function siteUrl(value: string | undefined) {
  const url = value?.trim();
  // check-env validates it before every dev, build and start, so this only catches a bypass.
  // Guessing would put a wrong origin into canonicals and share links.
  if (!url) throw new Error('NEXT_PUBLIC_SITE_URL is missing: run the app through its scripts');
  return url.replace(/\/+$/, '');
}

/** The storefront origin with no trailing slash, e.g. https://mustafaapparels.com. */
export const SITE_URL = siteUrl(process.env.NEXT_PUBLIC_SITE_URL);

/** The share image for pages without their own; metadataBase makes it absolute. */
export const DEFAULT_OG_IMAGE = {
  url: '/brand/social/og-share-image-1200x630.png',
  width: 1200,
  height: 630,
  alt: 'MA Apparels by Mustafa Ahmed',
};
