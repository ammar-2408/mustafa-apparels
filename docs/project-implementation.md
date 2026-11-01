# Project Implementation Plan

Each `[ ]` is **one change = one commit + push**, with its tests. Claude Code: find the first unchecked box, do it, tick it in the same commit.
Order matters: the logo is ready, so brand comes right after the foundation, and everything is built with the real look from the start.

**Merging to `main` costs Netlify credits.** At most 4 merges a month: batch finished phases if needed (`docs/deployment.md` §3). Pushes to `develop` cost no deploy credits.

`TODO-OWNER` items are listed in `docs/launch-checklist.md` §8.

---

## Phase 0 — Foundation
- [ ] 0.1 Init monorepo: pnpm workspaces, Turborepo, `.gitignore`, `.nvmrc` (Node 26 LTS), root `package.json` scripts. Root `package.json` must include `"packageManager": "pnpm@12.16.1"` so CI matches this machine
- [ ] 0.2 `packages/config`: shared tsconfig (strict), ESLint (next, typescript, jsx-a11y, import order), Prettier
- [ ] 0.3 Create `apps/web` (Next.js, App Router, TS, Tailwind) — home page "Hello" + one smoke test
- [ ] 0.4 Create `apps/admin` the same way on port 3001
- [ ] 0.5 Vitest workspace config + coverage thresholds; sample unit test passes
- [ ] 0.6 Playwright config with the 6 device projects (`docs/testing-qa.md` §2); smoke E2E for both apps
- [ ] 0.7 `pnpm verify` script (lint + typecheck + test + build)
- [ ] 0.8 Husky + lint-staged pre-commit (format, lint staged files, typecheck), commitlint for Conventional Commits
- [ ] 0.9 GitHub Actions CI (`.github/workflows/ci.yml`) green on push. Check whether branch protection on `main` is available for this repo; if not, use the fallback in `docs/deployment.md` §2
- [ ] 0.10 Env validation with Zod (`packages/config/env.ts`) + bring `.env.example` in line with `docs/setup.md` §6: real shop name and sender, production URLs, all new variables
- [ ] 0.11 Two Netlify sites (`docs/deployment.md` §2): package directories, `netlify.toml` per app with the skip rule, `develop` branch deploys, production from `main`; `SITE_INDEXABLE=false`; previews `noindex`. Confirm Netlify supports the `.nvmrc` Node version. Check the credit balance after the first skipped build and record the result in `docs/deployment.md`
- [x] 0.12 Install external skills (`bash scripts/install-skills.sh`) and commit the lock/registry update

## Phase 1 — Brand (logo is ready; see `docs/design.md` §1)

**Design direction:** `docs/design.md` §9.1. Cream and ink, Montserrat, very large headings set against tiny spaced labels, and generous empty space.

- [ ] 1.1 Copy logo files into `apps/web/public/brand/` and `apps/admin/public/brand/` (exact list: `docs/design.md` §1.3) + test that each referenced file exists
- [ ] 1.2 Colour tokens (ink, cream, white, derived neutrals), error and success colours, spacing tokens (`docs/design.md` §1.4) and the custom breakpoints (`docs/design.md` §2), in the Tailwind preset and `globals.css` + contrast unit test
- [ ] 1.3 Montserrat 300/400 via `next/font`, type scale with `clamp()` and tight leading on large headings, spaced-capitals label style
- [ ] 1.4 Favicons, `theme-color`, web manifest (`name: Mustafa Apparels`) in both apps + test
- [ ] 1.5 `<Logo>` component (variant, colour, `alt` rules, responsive header swap, min sizes) + component tests
- [ ] 1.6 `packages/ui` primitives in the brand style: Button, Input, Dialog, with focus rings + tests
- [ ] 1.7 Default Open Graph image wired up in `apps/web` (`/brand/social/og-share-image-1200x630.png`) + test
- [ ] 1.8 `SITE_URL` + `canonicalUrl()` + `buildMetadata()` helpers in `apps/web/lib/seo.ts` + unit tests, incl. title suffix dropped past 60 and description trimmed at a word boundary to 160. Built here so every later page can use them

## Phase 2 — Data layer
- [ ] 2.1 `packages/db`: Drizzle + Neon client, drizzle-kit config, first migration enabling `pg_trgm` and creating `immutable_array_to_string`
- [ ] 2.2 `category` table + migration + integration test
- [ ] 2.3 `product` table: design code, import key, nullable price, pieces, piece details, collection type, dress categories, fabric, design, season, outfit style, main colour, colour family, accent colours, motifs, related design codes, care; publish-needs-price check; generated `search_vector`; indexes + tests
- [ ] 2.4 `product_media` table: `kind`, poster, duration, bytes; one-primary index; primary-must-be-image and video-duration checks + tests
- [ ] 2.5 `slug_redirect`, `site_setting`, `audit_log` tables + tests
- [ ] 2.6 `inquiry`, `wishlist_item` tables + tests
- [ ] 2.7 PGlite test harness + factories (`makeProduct`, `makeMedia`, `makeCategory`, `makeUser`)
- [ ] 2.8 `packages/validators`: banned brand names helper + exhaustive unit tests (`docs/database.md` §9)
- [ ] 2.9 `packages/validators`: filter taxonomy (`docs/catalog.md` §4), then product, media, category, inquiry, search, settings schemas + exhaustive unit tests
- [ ] 2.10 `core.categories` (list, getBySlug, create, update w/ redirect, reorder) + tests
- [ ] 2.11 `core.products` (list w/ filters+sort+pagination, getBySlug, create, update w/ redirect, duplicate, archive) + tests
- [ ] 2.12 `core.products.setStatus`: publish rules (price, colour, main image, alt text, no banned names) + tests
- [ ] 2.13 `core.search` (full-text + trigram + design code, filters, suggestions) + ranking tests, incl. "dhanak" finds Lajwanti
- [ ] 2.14 `core.settings`, `core.audit` + tests
- [ ] 2.15 Seed script (idempotent): Dhanak, Khaddar, Lajwanti, real WhatsApp, phone and email, first admin; `--e2e` demo data + test

## Phase 3 — Authentication & security base
- [ ] 3.1 Resend: verify `updates.mustafaapparels.com`, add DNS at Spaceship incl. DMARC (`docs/deployment.md` §5); real test email passes SPF and DKIM
- [ ] 3.2 `packages/auth`: Better Auth with Drizzle adapter, email/password, generate auth tables migration
- [ ] 3.3 Web auth routes + session helpers; `requireUser` + tests
- [ ] 3.4 Sign-up / login / logout pages (forms, Zod, generic errors) + E2E
- [ ] 3.5 Email verification + password reset via Resend + E2E (email mocked)
- [ ] 3.6 Breached-password check, password policy, rate limits (Better Auth + Upstash) + tests
- [ ] 3.7 Admin auth: sign-up disabled, admin-only sign-in hook, `requireAdmin`, host-only cookies + tests
- [ ] 3.8 Admin 2FA (TOTP) mandatory on first login + E2E
- [ ] 3.9 Security headers + two-tier CSP (`docs/auth-security.md` §3): fixed policy on cached pages, `proxy.ts` nonce on dynamic routes and admin. Try experimental SRI first on a real build, and record the result + header tests incl. "no nonce on cached pages"
- [ ] 3.10 Admin `proxy.ts` gate + "customer gets 403 on every admin action" test loop
- [ ] 3.11 `security-auditor` agent pass; fix findings (one commit each)

## Phase 4 — Admin panel
- [ ] 4.1 Admin layout (sidebar, responsive), dashboard counts
- [ ] 4.2 Collections list + create/edit + reorder + hide
- [ ] 4.3 Cloudinary signed upload endpoint for images and videos + tests
- [ ] 4.4 Media metadata check on save: folder, format, size, video length; delete rejected assets + tests
- [ ] 4.5 Photo uploader component (drag-drop, progress, reorder, main image, alt required)
- [ ] 4.6 Video upload in the same component: 50 MB and 60 s checks, eager delivery version, poster preview and change
- [ ] 4.7 Product list (search, filter by status/collection, "needs price" filter, pagination)
- [ ] 4.8 Product create form (field config driven): every field in `docs/database.md`, with taxonomy values as choices + E2E
- [ ] 4.9 Product edit, publish/unpublish with clear errors, duplicate, archive/restore + E2E
- [ ] 4.10 Cross-app revalidation (`/api/revalidate` HMAC on web + caller in admin) + tests
- [ ] 4.11 Inquiries inbox + status changes + reply links
- [ ] 4.12 Customers list (read-only)
- [ ] 4.13 Site settings page (contact info, service area, delivery, payment, returns, socials, default SEO)
- [ ] 4.14 Audit log page

## Phase 5 — Stock import (`catalog/` → draft products)

The flow: collection file + photos in `Business data/` → per-suit files in `catalog/` → import to drafts → the owner sets prices in admin. `Business data/` stays out of git, and only this script reads it. It never writes there. Full rules: `docs/catalog.md`.

- [x] 5.1 Review all media and create `catalog/`: 30 suit files and 3 `_collection.md` files
- [ ] 5.2 Owner: answer the `check:` items that affect import: Lajwanti photo size and corner flowers, the 3 left-out videos (`TODO-OWNER`). Update the catalog files
- [ ] 5.3 Catalog Zod schema + test over the real `catalog/` files: taxonomy, banned names, unique IDs, names and slugs, empty price, two-way colour links
- [ ] 5.4 `scripts/import-stock.ts --dry-run`: reads `catalog/`, checks each listed file exists, reports files no suit lists. Tests with fixture files
- [ ] 5.5 Real run: crop in memory (`sharp`) where `crop` is set, upload to `products/imported/<design-id>/`, create **draft** products with no price; `import_key` prevents duplicates, and a re-run keeps prices and admin edits + re-run test. Add `pnpm import:stock`
- [ ] 5.6 Check real imports in the admin: sharpness (especially KDR-7, KDR-8, Laj1–5), framing, no logos left; adjust crops and re-run. Output a review table. The 3:4 storefront check comes at step 6.14
- [ ] 5.7 Owner: clear remaining `check:` items, set prices, choose what to publish (`TODO-OWNER`)

## Phase 6 — Storefront

**Design direction:** `docs/design.md` §9.1, applied to every page in `docs/design.md` §3. The reference guides look and motion only: the pages below stay as planned.

- [ ] 6.1 Root layout: header (`<Logo>`, side-panel menu, search, account, WhatsApp button; floating bar on scroll), footer (primary white logo on ink), skip link, `.js` class. Account state loads client-side after paint, so the layout never reads cookies
- [ ] 6.2 Product card (3:4 image, name, pieces, price, wishlist toggle), no video. Wishlist state loads client-side + component tests
- [ ] 6.3 `/shop` grid + `/shop/page/[n]` (ADR-017: static, self-canonical, `/page/1` 301, invalid or out-of-range 404) + E2E
- [ ] 6.4 `/collections/[slug]` + `/collections/[slug]/page/[n]` with the same rules, and real text for each collection (drafted here, fabric facts checked by the owner) + E2E
- [ ] 6.4a Filters and sort in the browser (ADR-018): cached `/api/suits`, taxonomy values with none hidden (`docs/catalog.md` §4), URL updates and Back, client-side paging while filtered, `useSearchParams` inside `<Suspense>` + E2E, incl. "page stays static"
- [ ] 6.5 `/products/[slug]` product page: gallery (swipe/zoom), design code, pieces, fabric, colour, design, care, "Also in this design", related + permanent slug redirect + 404
- [ ] 6.6 Product video tile: poster first, loads in view, muted, pause control, reduced motion and Save-Data rules (`docs/design.md` §5.2) + tests
- [ ] 6.7 Contact buttons (WhatsApp first, Call, Email) on product page + sticky mobile WhatsApp bar
- [ ] 6.8 Inquiry form + server action + rate limit + email (see feature-development.md example)
- [ ] 6.9 Search page + suggestions dropdown (debounced, keyboard accessible)
- [ ] 6.10 Account: profile, wishlist, my inquiries, delete account
- [ ] 6.11 Static pages: About, Contact (no map or address), How to Order, FAQ, Privacy (incl. GA4), Terms. Text in `TODO-OWNER` areas stays placeholder until the owner supplies it
- [ ] 6.12 Branded 404 + error pages with correct status codes
- [ ] 6.13 Home page layout sections, static (no motion yet)
- [ ] 6.14 Responsive suite passes on all 6 device projects; a11y suite passes. Check real imports in a local storefront at 3:4: grid crop from the top, whole photo in the gallery

## Phase 7 — SEO, GEO and analytics
- [ ] 7.2 Metadata on every page (title, description, canonical, robots), using the step 1.8 helpers: fill any gaps
- [ ] 7.3 Canonical E2E suite: one tag, absolute, self, SSR in `<head>`, pagination self, target 200
- [ ] 7.4 Open Graph + Twitter tags; dynamic OG images (collection, product), cached + tests
- [ ] 7.5 JSON-LD: Product (no `brand`, `seller`), VideoObject, BreadcrumbList, ItemList, OnlineStore (no address or hours) + `serializeJsonLd` escaping test
- [ ] 7.6 `sitemap.ts` (dynamic, absolute, lastModified) + tests
- [ ] 7.7 `robots.ts`: live allows all and disallows `/api` only; `SITE_INDEXABLE=false` disallows all + tests incl. "search and account not disallowed"
- [ ] 7.8 `llms.txt` route + tests
- [ ] 7.9 `noindex` rules (search, account, auth, admin header, previews) + tests
- [ ] 7.10 AEO/GEO content: plain-fact business statement on Home and About, FAQ written as questions (`docs/seo-geo.md` §7) + test that it's in raw HTML
- [ ] 7.11 IndexNow: key file + `integrations/indexnow` + call on publish, unpublish and slug change; off when not indexable + tests
- [ ] 7.12 GA4: `<GoogleAnalytics>` + `lib/analytics.ts` helper + CSP hosts; strips `q` from URLs (`docs/analytics.md`) + tests
- [ ] 7.13 GA4 events: lists and products, video, search, wishlist, sign-up + tests
- [ ] 7.14 GA4 key events: `generate_lead`, `whatsapp_click`, `call_click`, `email_click` with placement + tests
- [ ] 7.15 `seo-auditor` agent pass; Lighthouse SEO = 100

## Phase 8 — Motion & 3D

**Design direction:** `docs/design.md` §9.1. More motion than the reference, while staying fast on phones and respecting reduced motion. Each page gets the amount of motion listed there.

- [ ] 8.1 GSAP + `@gsap/react` setup, plugin registration, `gsap.matchMedia` + reduced-motion helper + tests
- [ ] 8.2 Lenis smooth scroll synced with ScrollTrigger (disabled for reduced motion)
- [ ] 8.3 Text reveal component (SplitText), word-fill-on-scroll component + image clip reveal component
- [ ] 8.4 Scroll reveals on home sections, hero inset and stacking cards (desktop); pinned horizontal "New arrivals" (desktop) / swipe (mobile); reveals on the other pages per `docs/design.md` §9.1
- [ ] 8.5 Page transitions between all pages: short cream cover with the MA submark (View Transitions / GSAP overlay), none with reduced motion + Flip card→product image
- [ ] 8.6 Micro-interactions: collection panel and product card hovers, menu panel motion, magnetic buttons, cursor follower (desktop, pointer:fine only), hover image swap
- [ ] 8.7 R3F setup: lazy `<HeroCanvas>` island with poster fallback + capability detection
- [ ] 8.8 Flowing-fabric hero shader in ink and cream, reading as real draped cloth with soft folds, **no model or video download**, within budget (≤ 250 kB JS)
- [ ] 8.9 WebGL image hover distortion on collection tiles (desktop)
- [ ] 8.10 Motion/3D tests: reduced motion, no-WebGL, no leaked triggers, CLS < 0.1; Lighthouse ≥ 90 mobile

## Phase 9 — Hardening
- [ ] 9.1 Full E2E regression on all devices; fix flakiness
- [ ] 9.2 Lighthouse CI budgets enforced in CI
- [ ] 9.3 Error tracking + structured logging
- [ ] 9.4 Caching check: home, collection and product pages served from cache; measure a real page's Netlify bandwidth and requests, and update the estimate in `docs/deployment.md` §3
- [ ] 9.5 Dependency audit, Renovate/Dependabot config, secret scanning on
- [ ] 9.6 `code-reviewer` + `security-auditor` + `seo-auditor` final pass
- [ ] 9.7 Weekly DB backup workflow

## Phase 10 — Launch

Follow `docs/deployment.md` §8 and `docs/launch-checklist.md`.

- [ ] 10.1 Owner sign-offs (`docs/launch-checklist.md` §8): `check:` items, video rights, the Lajwanti name, payment, courier, returns, prices
- [ ] 10.2 Fill in How to Order, FAQ and Privacy with the owner's real information; add `shippingDetails` and `hasMerchantReturnPolicy` to JSON-LD if the information supports it
- [ ] 10.3 Production env vars set; production database migrated and seeded; approved products published
- [ ] 10.4 Launch checklist §1–7 passes on the `develop` preview
- [ ] 10.5 Add domains in Netlify; DNS at Spaceship for apex, `www`, `admin` (`docs/deployment.md` §4); HTTPS active
- [ ] 10.6 `.netlify.app` redirect + `SITE_INDEXABLE=true` + final `NEXT_PUBLIC_SITE_URL`; merge `develop` → `main`; tag `v1.0.0`
- [ ] 10.7 Launch checks on the live domain: DNS `curl` checks, links, SEO, real phone
- [ ] 10.8 Google Search Console: confirm property, submit sitemap, inspect key URLs (`docs/seo-geo.md` §1)
- [ ] 10.9 Bing Webmaster Tools import + IndexNow check (`docs/seo-geo.md` §5)
- [ ] 10.10 GA4: property, DebugView test, key events, link Search Console (`docs/analytics.md`)
- [ ] 10.11 First-week watch: credits daily, errors, leads (`docs/launch-checklist.md` §10)
