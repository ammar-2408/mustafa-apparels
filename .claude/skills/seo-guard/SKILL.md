---
name: seo-guard
description: Technical SEO rules for this shop — metadata, one absolute self-referencing server-rendered canonical, pagination, redirects/404, Open Graph, JSON-LD, sitemap.xml, robots.txt, llms.txt and noindex rules, plus the tests that enforce them. Use whenever creating or changing a public page, route, slug logic, metadata, or any SEO file.
---

# SEO guard

Reference: `docs/design.md` §8. Every rule here has a test in `e2e/seo/`.

## Adding or changing a public page — checklist
1. Export `generateMetadata` (dynamic) or `metadata` (static) built **only** with `buildMetadata()` from `apps/web/lib/seo.ts`:
   ```ts
   export async function generateMetadata({ params, searchParams }): Promise<Metadata> {
     const { slug } = await params;
     const { page } = await searchParams;
     const category = await getCategoryBySlug(slug);
     if (!category) notFound();
     return buildMetadata({
       title: category.seoTitle ?? category.name,
       description: category.seoDescription ?? category.description,
       path: `/collections/${slug}`,
       page: toPageNumber(page),          // adds ?page=N only when N > 1
       image: category.imageUrl,
     });
   }
   ```
2. Page body: exactly one `<h1>`; breadcrumbs; JSON-LD via `<JsonLd data={...} />` (uses `serializeJsonLd`).
3. Add the route to `app/sitemap.ts` (if indexable) and to `llms.txt` if it's a key page.
4. Add the URL to the SEO E2E fixtures list so canonical/meta tests cover it.
5. Run `pnpm test:seo`.

## Canonical rules (the owner's checklist — all are mistakes to prevent)
| ❌ Never | ✅ Always | How |
|---|---|---|
| Same canonical on every page | Self-referencing canonical | `path` = this page's path |
| Two canonical tags | Exactly one | Only `buildMetadata` sets `alternates.canonical`; never hand-write `<link rel="canonical">`, never set it in a layout *and* a page |
| Relative URL | Absolute `https://…` | `metadataBase` + `canonicalUrl()` uses `NEXT_PUBLIC_SITE_URL` |
| Added by JavaScript | Server-rendered in `<head>` | Metadata API in server components only; verify with `curl` (no JS) using a normal and a Googlebot UA. If metadata streams outside `<head>`, set `htmlLimitedBots` in `next.config` |
| Page 2 → page 1 | Page N → page N | `?page=2` canonical includes `?page=2`; `?page=1` → 301 to clean URL; invalid/out-of-range page → 404 |
| Canonical → redirect/404 | Canonical returns 200 | Canonical uses the *current* slug; old slugs 301 via `slug_redirect`; deleted/unpublished items 404 and leave the sitemap |

Also: filter/sort params (`?size=`, `?sort=`) canonicalize to the unfiltered page; lowercase slugs; no trailing slash; one URL per dress (no `/collections/x/dresses/y` duplicates).

## Helpers (implement once in `apps/web/lib/seo.ts`, unit-test thoroughly)
- `canonicalUrl(path, { page? })` → absolute URL, normalizes slashes/case, drops tracking/filter params, appends `?page=N` only for N > 1.
- `buildMetadata({ title, description, path, page?, image?, noindex? })` → title template, description trim (≤ 160), canonical, OG (`og:url` = canonical, absolute 1200×630 image, `og:type`, `og:site_name`, `og:locale=en_PK`), Twitter `summary_large_image`, robots.
- `serializeJsonLd(obj)` → `JSON.stringify(obj).replace(/</g, '\\u003c')`.

## robots / noindex
| Page | robots |
|---|---|
| Home, shop, collections, product, static pages | `index, follow` |
| `/search` | `noindex, follow` |
| `/account/*`, `/login`, `/register`, reset pages | `noindex, nofollow` |
| Admin app (all) | `X-Robots-Tag: noindex, nofollow` header + `Disallow: /` |
| Preview deployments | `X-Robots-Tag: noindex` header + `Disallow: /` |

## Files
- `app/sitemap.ts`: absolute URLs, `lastModified` from `updated_at`, only published/active items; revalidated with tag `products`.
- `app/robots.ts`: production allows all except `/account`, `/api`, `/search`, auth pages; includes `Sitemap:`; non-production disallows all.
- `app/llms.txt/route.ts`: `text/plain; charset=utf-8`; `# <SHOP_NAME>`, `> summary`, `## Collections`, `## Key pages`, `## Optional`; every link absolute and 200.
- OG images: `opengraph-image.tsx` per route group (default, collection, product with photo + name + price).

## JSON-LD
- Product: `Product` + `offers` (`price`, `priceCurrency: "PKR"`, `availability` schema.org URL, `url` = canonical) + `BreadcrumbList`.
- Collection: `BreadcrumbList` + `ItemList`.
- Home/Contact: `ClothingStore` with `telephone`, `address`, `openingHoursSpecification`, `sameAs`.
