---
name: seo-guard
description: Technical SEO rules for this shop — metadata, one absolute self-referencing server-rendered canonical, pagination, redirects/404, Open Graph, JSON-LD, sitemap.xml, robots.txt, llms.txt and noindex rules, plus the tests that enforce them. Use whenever creating or changing a public page, route, slug logic, metadata, or any SEO file.
---

# SEO guard

Reference: `docs/design.md` §8 and `docs/seo-geo.md`. Every rule here has a test in `e2e/seo/`.

Never name another fashion brand in titles, descriptions, slugs, alt text or JSON-LD (`docs/database.md` §9).

## Adding or changing a public page — checklist
1. Export `generateMetadata` (dynamic) or `metadata` (static) built **only** with `buildMetadata()` from `apps/web/lib/seo.ts`:
   ```ts
   export async function generateMetadata({ params }): Promise<Metadata> {
     const { slug } = await params;
     const category = await getCategoryBySlug(slug);
     if (!category) notFound();
     return buildMetadata({
       title: category.seoTitle ?? category.name,
       description: category.seoDescription ?? category.description,
       path: `/collections/${slug}`,
       image: category.imageUrl,
     });
   }
   ```
   A later page is its own route at `/collections/[slug]/page/[n]`, with `path` set to that URL and a title and description unique to that page.

   **Keep the page cached.** Reading `searchParams` in a page or its metadata makes the whole route dynamic, which breaks the caching rule (`docs/architecture.md` §4). So `(shop)` pages never read it: page numbers come from the path (ADR-017), and filters and sort run in the browser (ADR-018). No `loading.tsx` above `(shop)` routes, because a 404 or redirect after streaming starts loses its real status code.
2. Page body: exactly one `<h1>`; breadcrumbs; JSON-LD via `<JsonLd data={...} />` (uses `serializeJsonLd`).
3. Add the route to `app/sitemap.ts` (if indexable) and to `llms.txt` if it's a key page.
4. Add the URL to the SEO E2E fixtures list so canonical/meta tests cover it.
5. Run `pnpm test:seo`.

## Content that ranks and gets quoted (`docs/seo-geo.md` §4, §7)
- Real text in the server HTML: many AI crawlers don't run JavaScript. Motion and 3D are add-ons.
- Each suit needs its own description of the fabric, work and pieces, never copied from a poster (`brand-mustafa` skill).
- Never add fake city pages, invented awards, customer counts or "best in Pakistan" claims, or `Review` or `AggregateRating` data without real reviews. No hidden text.

## Canonical rules (the owner's checklist — all are mistakes to prevent)
| ❌ Never | ✅ Always | How |
|---|---|---|
| Same canonical on every page | Self-referencing canonical | `path` = this page's path |
| Two canonical tags | Exactly one | Only `buildMetadata` sets `alternates.canonical`; never hand-write `<link rel="canonical">`, never set it in a layout *and* a page |
| Relative URL | Absolute `https://…` | `metadataBase` + `canonicalUrl()` uses `NEXT_PUBLIC_SITE_URL` |
| Added by JavaScript | Server-rendered in `<head>` | Metadata API in server components only; verify with `curl` (no JS) using a normal and a Googlebot UA. If metadata streams outside `<head>`, set `htmlLimitedBots` in `next.config` |
| Page 2 → page 1 | Page N → page N | `/collections/dhanak/page/2` is its own canonical; `/page/1` → 301 to the clean URL (`next.config`, `statusCode: 301`); `/page/0`, `/page/abc`, `/page/01` and out-of-range pages → 404 |
| Canonical → redirect/404 | Canonical returns 200 | Canonical uses the *current* slug; old slugs redirect permanently via `slug_redirect` (`permanentRedirect()` sends 308; search engines treat it like a 301); deleted/unpublished items 404 and leave the sitemap |

Also: filter/sort params (`?pieces=`, `?sort=`) are read only in the browser, so the server sends the unfiltered page and its canonical; lowercase slugs; no trailing slash; one URL per suit (`/products/[slug]`, with no `/collections/x/products/y` duplicates).

## Helpers (implement once in `apps/web/lib/seo.ts`, unit-test thoroughly)
- `canonicalUrl(path)` → absolute URL, normalizes slashes/case, drops all query params and the hash; throws on a full URL. Built at step 1.8.
- `buildMetadata({ title, description, path, image?, noindex?, nofollow? })` → absolute title `<title> | Mustafa Apparels`, dropping the suffix when the full title would pass 60 or already names the shop; description 120–160, trimmed at a word boundary; canonical, OG (`og:url` = canonical, absolute 1200×630 image, `og:type`, `og:site_name`, `og:locale=en_PK`), Twitter `summary_large_image`, robots.
- `serializeJsonLd(obj)` → `JSON.stringify(obj).replace(/</g, '\\u003c')`.

## robots / noindex
| Page | robots |
|---|---|
| Home, shop, collections, product, static pages | `index, follow` |
| `/search` | `noindex, follow` |
| `/account/*`, `/login`, `/register`, reset pages | `noindex, nofollow` |
| Admin app (all) | `X-Robots-Tag: noindex, nofollow` header + `Disallow: /` |
| Preview deployments, and production before launch (`SITE_INDEXABLE=false`) | `X-Robots-Tag: noindex` header + `Disallow: /` |

## Files
- `app/sitemap.ts`: absolute URLs, `lastModified` from `updated_at`, only published/active items, including paginated collection pages; revalidated with tag `products`.
- `app/robots.ts`: live production allows all except `/api`; includes `Sitemap:`; `SITE_INDEXABLE=false` disallows all. **Never disallow `/search`, `/account` or auth pages**: a crawler blocked from a page can't read its `noindex`.
- `app/llms.txt/route.ts`: `text/plain; charset=utf-8`; `# Mustafa Apparels`, `> summary`, `## Collections`, `## Key pages`, `## Optional`; every link absolute and 200.
- OG images: default `/og/og-default-1200x630.png` (logo on powder blue); dynamic `opengraph-image.tsx` for collection and product (photo + name + price). **Cached**, because each generation costs compute credits.
- IndexNow: the admin pings on publish, unpublish and slug change, and sends nothing unless `SITE_INDEXABLE=true`. A failure never blocks a save.

## JSON-LD
- Product: `Product` + `offers` (`price`, `priceCurrency: "PKR"`, `availability` schema.org URL, `url` = canonical, `seller` = Mustafa Apparels) + `BreadcrumbList`. **No `brand`.** Add `VideoObject` when the product has a video.
- Collection: `BreadcrumbList` + `ItemList`.
- Home/Contact: `OnlineStore` with `name`, `alternateName: "MA Apparels"`, `url`, `logo`, `contactPoint`, `areaServed: "PK"`, `sameAs`. **No `address` or opening hours**: the shop is online-only.
