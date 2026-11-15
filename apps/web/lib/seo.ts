// Site-wide SEO values and the metadata every public page is built with (docs/design.md §8).
import type { Metadata } from 'next';

export const SITE_NAME = 'Mustafa Apparels';

const TITLE_MAX = 60;
const DESCRIPTION_MAX = 160;

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
  url: '/og/og-default-1200x630.png',
  width: 1200,
  height: 630,
  alt: 'MA Apparels by Mustafa Ahmed',
};

/**
 * The absolute canonical URL for a path on this site: lowercase, no repeated or trailing slash,
 * no query or hash. Filters and tracking parameters never make a new canonical.
 */
export function canonicalUrl(path: string) {
  if (/^[a-z][a-z\d+.-]*:/i.test(path)) throw new Error(`canonicalUrl takes a path, not ${path}`);
  const pathname = path.split(/[?#]/)[0]!.toLowerCase().replace(/\/+/g, '/').replace(/\/$/, '');
  return `${SITE_URL}/${pathname.replace(/^\//, '')}`;
}

const tidy = (text: string) => text.replace(/\s+/g, ' ').trim();

/** Cuts at the last space that leaves room for "…", then drops trailing punctuation. */
function trimAtWord(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.lastIndexOf(' ', max - 1);
  const head = text.slice(0, cut > 0 ? cut : max - 1);
  return `${head.replace(/[\s,;:.–—-]+$/, '')}…`;
}

function pageTitle(title: string) {
  const name = tidy(title);
  const full = `${name} | ${SITE_NAME}`;
  if (name.includes(SITE_NAME)) return trimAtWord(name, TITLE_MAX);
  return full.length <= TITLE_MAX ? full : trimAtWord(name, TITLE_MAX);
}

type OgImage = typeof DEFAULT_OG_IMAGE;

type PageMetadata = {
  title: string;
  description: string;
  /** This page's own path, e.g. /collections/dhanak/page/2. */
  path: string;
  image?: OgImage;
  /** Search results: noindex, follow. */
  noindex?: boolean;
  /** Account and sign-in pages add this too: noindex, nofollow. */
  nofollow?: boolean;
};

/**
 * The only way public pages set metadata: one self-referencing absolute canonical, a title of at
 * most 60 characters, a description of at most 160, and matching Open Graph and Twitter tags.
 */
export function buildMetadata({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  noindex = false,
  nofollow = false,
}: PageMetadata): Metadata {
  const url = canonicalUrl(path);
  const fullTitle = pageTitle(title);
  const text = trimAtWord(tidy(description), DESCRIPTION_MAX);
  return {
    title: { absolute: fullTitle },
    description: text,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: SITE_NAME,
      locale: 'en_PK',
      title: fullTitle,
      description: text,
      images: [image],
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description: text, images: [image] },
    robots: { index: !noindex, follow: !nofollow },
  };
}

// Characters that could end the script tag, start an HTML comment or entity, or break a line in
// old JavaScript parsers. Built from char codes, so no escape in this source can be mangled.
const UNSAFE_IN_SCRIPT = [0x3c, 0x3e, 0x26, 0x2028, 0x2029];
const UNSAFE_PATTERN = new RegExp(
  '[' + UNSAFE_IN_SCRIPT.map((code) => String.fromCharCode(code)).join('') + ']',
  'g',
);
const BACKSLASH = String.fromCharCode(0x5c);

/**
 * JSON-LD for a `<script type="application/ld+json">`. `<`, `>`, `&`, U+2028 and U+2029 become
 * JSON unicode escapes, so text from the database can never close the script tag; JSON.parse
 * reads them back as the same characters. The only allowed use of dangerouslySetInnerHTML
 * (AGENTS.md §7).
 */
export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(
    UNSAFE_PATTERN,
    (char) => BACKSLASH + 'u' + char.charCodeAt(0).toString(16).padStart(4, '0'),
  );
}
