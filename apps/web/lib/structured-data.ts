// JSON-LD builders (docs/design.md §8.3). Absolute URLs from canonicalUrl; never a brand.
import { canonicalUrl, SITE_NAME } from './seo';

export type Crumb = { name: string; path: string };

export function breadcrumbList(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: canonicalUrl(crumb.path),
    })),
  };
}

/** The suits on one list page, numbered from where the page starts. */
export function itemList(name: string, suits: { slug: string; name: string }[], firstPosition = 1) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: suits.length,
    itemListElement: suits.map((suit, i) => ({
      '@type': 'ListItem',
      position: firstPosition + i,
      url: canonicalUrl(`/products/${suit.slug}`),
      name: suit.name,
    })),
  };
}

export const SELLER = { '@type': 'Organization', name: SITE_NAME, url: canonicalUrl('/') } as const;

type StoreContact = { phone: string | null; email: string | null; socials: string[] };

/**
 * The shop for Home and Contact (docs/design.md §8.3, ADR-013): an online store serving all of
 * Pakistan, with no address or opening hours.
 */
export function onlineStore({ phone, email, socials }: StoreContact) {
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: SITE_NAME,
    alternateName: 'MA Apparels',
    url: canonicalUrl('/'),
    logo: canonicalUrl('/brand/svg/mustafa-apparels-primary-black.svg'),
    description:
      "Online shop for women's unstitched 2-piece and 3-piece suits in Pakistan, ordered on WhatsApp with courier delivery across Pakistan.",
    areaServed: { '@type': 'Country', name: 'Pakistan' },
    ...(phone || email
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            areaServed: 'PK',
            ...(phone ? { telephone: phone } : {}),
            ...(email ? { email } : {}),
          },
        }
      : {}),
    ...(socials.length > 0 ? { sameAs: socials } : {}),
  };
}
