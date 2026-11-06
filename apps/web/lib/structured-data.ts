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
