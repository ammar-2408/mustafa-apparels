# Project Implementation Plan

Each `[ ]` is **one change = one commit + push**, with its tests. Claude Code: find the first unchecked box, do it, tick it in the same commit.
Order matters: the logo is ready, so brand comes right after the foundation, and everything is built with the real look from the start.

**Merging to `main` costs Netlify credits.** At most 4 merges a month: batch finished phases if needed (`docs/deployment.md` §3). Pushes to `develop` cost no deploy credits.

`TODO-OWNER` items are listed in `docs/launch-checklist.md` §8.

---

## Phase 0 — Foundation
- [x] 0.1 Init monorepo: pnpm workspaces, Turborepo, `.gitignore`, `.nvmrc` (Node 24 LTS), root `package.json` scripts. Root `package.json` must include `"packageManager": "pnpm@12.16.1"` so CI matches this machine
- [x] 0.2 `packages/config`: shared tsconfig (strict), ESLint (next, typescript, jsx-a11y, import order), Prettier. Add `*.yaml text eol=lf` to `.gitattributes` so Prettier doesn't flag CRLF in `pnpm-workspace.yaml` on Windows
- [x] 0.3 Create `apps/web` (Next.js, App Router, TS, Tailwind) — home page "Hello" + one smoke test. Check the root ESLint Next link-rule setting (`settings.next.rootDir: ['apps/*/']` in `eslint.config.mjs`): linting an `apps/web` file from the repo root must print no "Pages directory cannot be found" warning, and `<a href="/">` must be flagged
- [x] 0.4 Create `apps/admin` the same way on port 3001
- [x] 0.5 Vitest workspace config + coverage thresholds; sample unit test passes; port `scripts/workspace.test.mjs` and `packages/config/test/*.test.mjs` from `node:test` to Vitest and drop the former from the root `test` script. `apps/web` already has its own `vitest.config.mts` and smoke test from step 0.3 (and `apps/admin` from 0.4): fold them into the workspace config. Coverage output also clears Turbo's "no output files found" warning on the `test` task
- [x] 0.6 Playwright config with the 6 device projects (`docs/testing-qa.md` §2); smoke E2E for both apps. On Windows, dev servers can survive after stopping, so Playwright's `webServer` setup must reuse or cleanly stop servers on ports 3000 and 3001, and tests must not fail because a port is busy
- [x] 0.7 `pnpm verify` script (lint + typecheck + test + build)
- [x] 0.8 Husky + lint-staged pre-commit (format, lint staged files, typecheck), commitlint for Conventional Commits
- [x] 0.9 GitHub Actions CI (`.github/workflows/ci.yml`) green on push. With `CI` set, Playwright runs `next start`, so build both apps first and install browsers with `pnpm exec playwright install --with-deps chromium firefox webkit`. Watch the `desktop` project for the unexplained Firefox close error in `docs/debugging.md` §2. Check whether branch protection on `main` is available for this repo; if not, use the fallback in `docs/deployment.md` §2
- [x] 0.10 Env validation with Zod (`packages/config/env.ts`) + bring `.env.example` in line with `docs/setup.md` §6: real shop name and sender, production URLs, all new variables
- [x] 0.11 Two Netlify sites (`docs/deployment.md` §2): package directories, `netlify.toml` per app with the skip rule, `develop` branch deploys, production from `main`; `SITE_INDEXABLE=false`; previews `noindex`. Confirm Netlify supports the `.nvmrc` Node version. Check the credit balance after the first skipped build and record the result in `docs/deployment.md`. `main` doesn't exist on GitHub yet (only `develop`), so create it first. Set `APP_ENV=preview` and `INTEGRATIONS_MODE=mock` on branch deploys. Production refuses `mock`, so production builds fail env validation until the service accounts exist (`docs/deployment.md` §2). Each `netlify.toml` build command must go through the app's `build` script, because `check-env` lives there and a direct `next build` skips it; add a test asserting this
- [x] 0.12 Install external skills (`bash scripts/install-skills.sh`) and commit the lock/registry update

## Phase 1 — Brand (logo is ready; see `docs/design.md` §1)

**Design direction:** `docs/design.md` §9.1. White and powder blue with ink text and a small racing orange accent (palette changed 2026-11-04), Montserrat, very large headings set against tiny spaced labels, and generous empty space.

- [x] 1.1 Copy logo files into `apps/web/public/brand/` and `apps/admin/public/brand/` (exact list: `docs/design.md` §1.3) + test that each referenced file exists Phase 0 review: root `lint` and `typecheck` skip `scripts/` and `.claude/hooks/` (Husky caught a lint error that `pnpm verify` missed). Add them to the root lint and typecheck (or give them their own tsconfig) and fix what shows up, in a commit before the logo copy
- [x] 1.2 Colour tokens (ink, cream, white, derived neutrals), error and success colours, spacing tokens (`docs/design.md` §1.4) and the custom breakpoints (`docs/design.md` §2), in the Tailwind preset and `globals.css` + contrast unit test
- [x] 1.3 Montserrat 300/400 via `next/font`, type scale with `clamp()` and tight leading on large headings, spaced-capitals label style
- [x] 1.4 Favicons, `theme-color`, web manifest (`name: Mustafa Apparels`) in both apps + test
- [x] 1.5 `<Logo>` component (variant, colour, `alt` rules, responsive header swap, min sizes) + component tests Phase 0 review: the app test setup never calls Testing Library's `cleanup()` between tests, so rendered pages pile up. Add it (an `afterEach(cleanup)` in the shared Vitest setup, or turn on globals) with a test that fails without it, before the first component test here
- [x] 1.6 `packages/ui` primitives in the brand style: Button, Input, Dialog, with focus rings + tests
- [x] 1.7 Default Open Graph image wired up in `apps/web` (`/brand/social/og-share-image-1200x630.png`) + test
- [x] 1.8 `SITE_URL` (already in `apps/web/lib/seo.ts` from step 1.7, with `SITE_NAME` and `DEFAULT_OG_IMAGE`) + `canonicalUrl()` + `buildMetadata()` helpers in `apps/web/lib/seo.ts` + unit tests, incl. title suffix dropped past 60 and description trimmed at a word boundary to 160. Built here so every later page can use them

## Phase 2 — Data layer
- [x] 2.1 `packages/db`: Drizzle + Neon client, drizzle-kit config, first migration enabling `pg_trgm` and creating `immutable_array_to_string`. Add a `postgres:18` service (Neon runs 18) and `pnpm db:migrate` to both CI jobs (removed in step 0.9 until this exists). When `db:seed` exists, add `pnpm db:seed -- --e2e` to the `e2e` job. Change the build command in `apps/web/netlify.toml` to `pnpm db:migrate && pnpm turbo build --filter=web`, and update its test (left out at step 0.11 because the script didn't exist)
- [x] 2.2 `category` table + migration + integration test
- [x] 2.3 `product` table: design code, import key, nullable price, pieces, piece details, collection type, dress categories, fabric, design, season, outfit style, main colour, colour family, accent colours, motifs, related design codes, care; publish-needs-price check; generated `search_vector`; indexes + tests
- [x] 2.4 `product_media` table: `kind`, poster, duration, bytes; one-primary index; primary-must-be-image and video-duration checks + tests
- [x] 2.5 `slug_redirect`, `site_setting`, `audit_log` tables + tests, and the `user` table in Better Auth's core shape (they point at it)
- [x] 2.6 `inquiry`, `wishlist_item` tables + tests
- [x] 2.7 PGlite test harness + factories (`makeProduct`, `makeMedia`, `makeCategory`, `makeUser`)
- [x] 2.8 `packages/validators`: banned brand names helper + exhaustive unit tests (`docs/database.md` §9)
- [x] 2.9 `packages/validators`: filter taxonomy (`docs/catalog.md` §4), then product, media, category, inquiry, search, settings schemas + exhaustive unit tests
- [x] 2.10 `core.categories` (list, getBySlug, create, update w/ redirect, reorder) + tests
- [x] 2.11 `core.products` (list w/ filters+sort+pagination, getBySlug, create, update w/ redirect, duplicate, archive) + tests
- [x] 2.12 `core.products.setStatus`: publish rules (price, colour, main image, alt text, no banned names) + tests
- [x] 2.13 `core.search` (full-text + trigram + design code, filters, suggestions) + ranking tests, incl. "dhanak" finds Lajwanti
- [x] 2.14 `core.settings`, `core.audit` + tests
- [x] 2.15 `pnpm db:seed` (idempotent, `docs/database.md` §6): the 3 collections (Dhanak, Khaddar, Lajwanti), site settings with the owner's real WhatsApp, phone and email, first admin from `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD`; `--e2e` demo data. Tests: running twice changes nothing, missing admin env vars fail clearly. The admin needs Better Auth's tables and hashing from step 3.2, so if this step runs first, build the admin part and its tests at 3.2 and don't tick this step until then. **Done on 2026-11-02 except the admin:** collections, settings and `--e2e` (`packages/db/seed.ts`, CI `e2e` job), seeded on Neon `dev`. The admin and its "missing admin env vars fail clearly" test followed at step 3.2

## Phase 3 — Authentication & security base
- [x] 3.1 Resend: verify `updates.mustafaapparels.com`, add DNS at Spaceship incl. DMARC (`docs/deployment.md` §5); real test email passes SPF and DKIM. **Done 2026-11-02:** verified (us-east-1, Resend Forge CNAMEs), records checked, test email sent; owner to confirm PASS in Gmail "Show original"
- [x] 3.2 `packages/auth`: Better Auth with Drizzle adapter, email/password, generate auth tables migration. Also tighten `packages/config/env.ts`: run `parseEnv` at runtime from `instrumentation.ts` in both apps with app code reading only the parsed object, because Netlify functions never run `check-env`; on preview, require both secrets when `DATABASE_URL` is set, and consider refusing `mock` with a real database; in production, refuse CI placeholder and low-variety secrets and require the two secrets to differ. Check how Better Auth treats a missing secret and an http base URL. The `user` table already exists (step 2.5): compare the Better Auth CLI output with `packages/db/schema/user.ts` and add only the other tables and plugin columns. Then finish step 2.15: the first admin in `packages/db/seed.ts` from `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` (hashed by Better Auth), with tests that running twice changes nothing and missing values fail clearly, and tick 2.15
- [x] 3.3 Web auth routes + session helpers; `requireUser` + tests
- [x] 3.4 Sign-up / login / logout pages (forms, Zod, generic errors) + E2E
- [x] 3.5 Email verification + password reset via Resend + E2E (email mocked)
- [x] 3.6 Breached-password check, password policy, rate limits (Better Auth + Upstash) + tests
- [x] 3.7 Admin auth: sign-up disabled, admin-only sign-in hook, `requireAdmin`, host-only cookies + tests
- [x] 3.8 Admin 2FA (TOTP) mandatory on first login + E2E
- [x] 3.9 Security headers + two-tier CSP (`docs/auth-security.md` §3): fixed policy on cached pages, `proxy.ts` nonce on dynamic routes and admin. Try experimental SRI first on a real build, and record the result + header tests incl. "no nonce on cached pages". Add them to `e2e/security/headers.spec.ts`, which already checks noindex and no `X-Powered-By` on both apps
- [x] 3.10 Admin `proxy.ts` gate + "customer gets 403 on every admin action" test loop. Let `/favicon.ico`, `/manifest.webmanifest` and `/brand/*` through without a session (from step 1.4), so the login page keeps its icons; `e2e/admin/icons.spec.ts` must stay green
- [x] 3.11 `security-auditor` agent pass; fix findings (one commit each) Also close these Phase 0 review items first: (a) `Bash(pnpm add *)` and `Bash(npx -y skills add *)` are allowed without asking in `.claude/settings.json`, so move them to ask (a new dependency or skill should be a decision); (b) `protect-files.mjs` covers Edit and Write only, so a file written through a shell command (`echo >`, `sed -i`, `tee`) bypasses it: add the same path checks for Bash writes to protected files, or note the limit in `docs/auth-security.md`. Run `code-reviewer`, `qa-tester` and `security-auditor` together here, as the end-of-Phase-3 review **Done 2026-11-03:** Phase 0 items closed (4672174); full local run on all 7 projects green; the three agents found 5 blockers, each fixed in its own commit (9477299, c00a2fa, 006f207, f19a619, 2744574); non-blockers carried into the steps below.

## Phase 4 — Admin panel
- [x] 4.1 Admin layout (sidebar, responsive), dashboard counts. For the sidebar logo, move `<Logo>` from `apps/web/components/logo.tsx` into `packages/ui` (admin has only the submark and simplified black files) rather than copying it. Server actions must live in files named `actions.ts` (or `route.ts` for handlers) so the 80% coverage floor applies, or extend the coverage pattern in `packages/config/vitest/app.mjs` Phase 3 review: (a) the web and admin `lib/auth.ts` repeat the env-to-`createAuth` wiring: move it into one factory in `packages/auth` and keep only the memo and page guards in each app; (b) move `FormError` and `LogoutButton` into `packages/ui` with the Logo; (c) extend `apps/admin/test/admin-actions-authz.test.ts` with an admin who has no 2FA yet (FORBIDDEN everywhere but `startTwoFactorSetup`) and a banned admin, and make it fail on a `'use server'` file that isn't `actions.ts`; (d) rate-limit `startTwoFactorSetup` (a password check Better Auth's limiter doesn't see); (e) narrow the admin proxy matcher's `brand/` exclusion to image files; (f) replace the `!` assertions in `guards.ts`, `apps/admin/lib/auth.ts` and `setup-2fa/actions.ts` with narrowed types and a null check that returns UNAVAILABLE.
- [x] 4.2 Collections list + create/edit + reorder + hide
- [x] 4.3 Cloudinary signed upload endpoint for images and videos + tests
- [x] 4.4 Media metadata check on save: folder, format, size, video length; delete rejected assets + tests
- [x] 4.5 Photo uploader component (drag-drop, progress, reorder, main image, alt required)
- [x] 4.6 Video upload in the same component: 50 MB and 60 s checks, eager delivery version, poster preview and change
- [x] 4.7 Product list (search, filter by status/collection, "needs price" filter, pagination)
- [x] 4.8 Product create form (field config driven): every field in `docs/database.md`, with taxonomy values as choices + E2E
- [x] 4.9 Product edit, publish/unpublish with clear errors, duplicate, archive/restore + E2E
- [x] 4.10 Cross-app revalidation (`/api/revalidate` HMAC on web + caller in admin) + tests
- [x] 4.11 Inquiries inbox + status changes + reply links
- [x] 4.12 Customers list (read-only)
- [x] 4.13 Site settings page (contact info, service area, delivery, payment, returns, socials, default SEO)
- [x] 4.14 Audit log page

## Phase 5 — Stock import (`catalog/` → draft products)

The flow: collection file + photos in `Business data/` → per-suit files in `catalog/` → import to drafts → the owner sets prices in admin. `Business data/` stays out of git, and only this script reads it. It never writes there. Full rules: `docs/catalog.md`.

- [x] 5.1 Review all media and create `catalog/`: 30 suit files and 3 `_collection.md` files
- [x] 5.2 Owner: answer the `check:` items that affect import: Lajwanti photo size and corner flowers, the 3 left-out videos (`TODO-OWNER`). Update the catalog files **Done 2026-11-05:** 11 checks accepted and removed; the three left-out videos became non-blocking `notes:`. Open after import: the DHN-01 crop and sharpness on KDR-07, KDR-08 and LAJ-02 to LAJ-05
- [x] 5.3 Catalog Zod schema + test over the real `catalog/` files: taxonomy, banned names, unique IDs, names and slugs, empty price, two-way colour links
- [x] 5.4 `scripts/import-stock.ts --dry-run`: reads `catalog/`, checks each listed file exists, reports files no suit lists. Tests with fixture files
- [x] 5.5 Real run: crop in memory (`sharp`) where `crop` is set, upload to `products/imported/<design-id>/`, create **draft** products with no price; `import_key` prevents duplicates, and a re-run keeps prices and admin edits + re-run test. Add `pnpm import:stock` Phase 4 review: `packages/core/integrations/media.ts` and `packages/auth/factory.ts` hold secrets but have no `import 'server-only'` because the import script may load `media.ts` in plain Node; add it, or split a server entry and note the exception there. **Done 2026-11-05:** 30 drafts on Neon `dev` (45 uploaded, 3 reused, about 1 credit); a second run uploaded and changed nothing. Rollback point: Neon branch `before-import`. The first run found that the Admin API leaves out a video's duration without `media_metadata=true` (fixed in 4780ea9, which also fixes live video saves in admin).
- [x] 5.6 Check real imports in the admin: sharpness (especially KDR-7, KDR-8, Laj1–5), framing, no logos left; adjust crops and re-run. Output a review table. The 3:4 storefront check comes at step 6.14
- [ ] 5.7 Owner: clear remaining `check:` items, set prices, choose what to publish (`TODO-OWNER`)

## Phase 6 — Storefront

**Design direction:** `docs/design.md` §9.1, applied to every page in `docs/design.md` §3. The reference guides look and motion only: the pages below stay as planned. Shopping patterns for the menu, grid, filters, suit cards and product page: `docs/design.md` §9.2.

- [x] 6.0 Caching foundation (ADR-021): Next 16.4.5, Cache Components with `'use cache'` reads in `apps/web/lib/catalog.ts`, shared tag builders in `packages/validators/revalidate.ts` used by admin, web and `import:stock`, `instant = false` on the per-request group, `pnpm check:static` in CI. Closes step 6.3's tag-parity and import-refresh notes
- [x] 6.1 Root layout: header (`<HeaderLogo>` from step 1.5, which replaces the placeholder header on the home page and keeps `e2e/web/logo.spec.ts` green; simplified logo on the floating bar; side-panel menu built on `@mustafa/ui/dialog`, with the first committed E2E for it: Tab stays inside, Esc closes, focus returns to the menu button, page doesn't scroll behind (checked only by hand at step 1.6, as jsdom has no `<dialog>`), search, account, WhatsApp button; floating bar on scroll), footer (powder blue, primary black logo), skip link, `.js` class. Account state loads client-side after paint, so the layout never reads cookies **Done:** header, floating bar, menu and footer in the root layout from cached settings and collections (`components/site/`); public pages in the `(shop)` group, which adds the `js` class. Account is a plain link to `/account` with no session fetch, so a page view costs no function call; the wishlist (6.10) fetches only after a heart is used. `e2e/web/menu.spec.ts` covers the menu, floating bar and skip link
- [x] 6.2 Product card (3:4 image, finish and fabric line, name, pieces, price, wishlist toggle), no video. Wishlist state loads client-side + component tests **Done:** `components/product/product-card.tsx`; photos through the custom `next/image` loader (`lib/image-loader.ts`) over `@mustafa/core/media-url` (moved from the admin, shared): card shape `c_fill,g_north,ar_3:4`, gallery shape `c_limit`, width, `f_auto`, `q_auto`. The heart asks a guest to log in until 6.10 connects saving
- [ ] 6.3 `/shop` grid + `/shop/page/[n]` (ADR-017: static, self-canonical, `/page/1` 301, invalid or out-of-range 404) + E2E Phase 4 review: tag cached pages with exactly the tags the admin sends (`docs/api.md` §4): `products`, `product:<id>` (the id, not the slug), `category:<slug>`, `categories`, `settings`, and add a test that the page tags and the admin's tags match, or saves won't refresh anything. Phase 5 review: `pnpm import:stock` can change a published suit's text, slug or media (when the owner hasn't edited them) but doesn't refresh the storefront: once the page tags exist, have it call the revalidate endpoint for each suit it changes, or skip published suits.
- [ ] 6.4 `/collections/[slug]` + `/collections/[slug]/page/[n]` with the same rules, and real text for each collection (drafted here, fabric facts checked by the owner) + E2E
- [ ] 6.4a Filters and sort in the browser (ADR-018): cached `/api/suits`, taxonomy values with none hidden (`docs/catalog.md` §4), one-tap chips above the grid, suit count, URL updates and Back, client-side paging while filtered, `useSearchParams` inside `<Suspense>` + E2E, incl. "page stays static"
- [ ] 6.5 `/products/[slug]` product page: gallery (swipe/zoom), design code, "What's included" with one row per piece (fabric, finish, length when known), fabric, colour, design, care, "Also in this design", related + permanent slug redirect + 404
- [ ] 6.6 Product video tile: poster first, loads in view, muted, pause control, reduced motion and Save-Data rules (`docs/design.md` §5.2) + tests
- [ ] 6.7 Contact buttons (WhatsApp first, Call, Email) on product page + sticky mobile WhatsApp bar + short delivery, payment and reply line from settings + out-of-stock wording Phase 4 review: `mailtoLink` in `packages/core/contact-links.ts` should `encodeURIComponent` the address before it takes values from settings.
- [ ] 6.13 Home page layout sections, static (no motion yet) Built before 6.4a so the design checkpoint (home, collection and suit pages at 360 and 1366) comes early. Hero: large Light headline on powder blue with the MA submark, no photo; it stays as the poster under the Phase 8 shader. Featured suit: the `featured` flag, else the newest published suit with a video
- [ ] 6.8 Inquiry form + server action + rate limit + email (see feature-development.md example) Phase 3 review: add a per-recipient cap (HMAC of the address, e.g. 3 an hour) and a daily total on every outgoing email, including the auth emails, so requests spread over many IPs can't use up Resend's 100 a day.
- [ ] 6.9 Search page + suggestions dropdown (debounced, keyboard accessible)
- [ ] 6.10 Account: profile, wishlist, my inquiries, delete account Phase 3 review: validate `/reset-password`'s `searchParams` with Zod (reuse the token rule in `resetPasswordInput`); "log out everywhere" lands here; add an int test that a signed-out session token no longer works.
- [ ] 6.11 Static pages: About, Contact (no map or address), How to Order, FAQ, Privacy (incl. GA4), Terms. Text in `TODO-OWNER` areas stays placeholder until the owner supplies it
- [ ] 6.12 Branded 404 + error pages with correct status codes
- [ ] 6.14 Responsive suite passes on all 7 device projects; a11y suite passes. Check real imports in a local storefront at 3:4: grid crop from the top, whole photo in the gallery End of Phase 6: also run the `code-reviewer`, `qa-tester` and `security-auditor` agents on everything since the Phase 3 review, then fix blockers one change at a time Phase 3 review: add the session-only pages to the a11y list (web `/account`, admin `/setup-2fa` with its QR code and backup codes, admin dashboard), using the E2E user fixture.

## Phase 7 — SEO, GEO and analytics
- [ ] 7.2 Metadata on every page (title, description, canonical, robots), using the step 1.8 helpers: fill any gaps
- [ ] 7.3 Canonical E2E suite: one tag, absolute, self, SSR in `<head>`, pagination self, target 200
- [ ] 7.4 Open Graph + Twitter tags; dynamic OG images (collection, product), cached + tests
- [ ] 7.5 JSON-LD: Product (no `brand`, `seller`), VideoObject, BreadcrumbList, ItemList, OnlineStore (no address or hours) + `serializeJsonLd` escaping test
- [ ] 7.6 `sitemap.ts` (dynamic, absolute, lastModified) + tests
- [ ] 7.7 `robots.ts`: live allows all and disallows `/api` only; `SITE_INDEXABLE=false` disallows all + tests incl. "search and account not disallowed"
- [ ] 7.8 `llms.txt` route + tests
- [ ] 7.9 `noindex` rules (search, account, auth, admin header, previews) + tests Phase 3 review: assert the noindex meta on `/forgot-password`, `/reset-password` and `/account` too (only `/login` and `/register` are checked so far).
- [ ] 7.10 AEO/GEO content: plain-fact business statement on Home and About, FAQ written as questions (`docs/seo-geo.md` §7) + test that it's in raw HTML
- [ ] 7.11 IndexNow: key file + `integrations/indexnow` + call on publish, unpublish and slug change; off when not indexable + tests
- [ ] 7.12 GA4: `<GoogleAnalytics>` + `lib/analytics.ts` helper + CSP hosts; strips `q` from URLs (`docs/analytics.md`) + tests Phase 3 review: `/reset-password?token=…` must never reach GA4 as `page_location`: strip the query or leave the page out of GA.
- [ ] 7.13 GA4 events: lists and products, video, search, wishlist, sign-up + tests
- [ ] 7.14 GA4 key events: `generate_lead`, `whatsapp_click`, `call_click`, `email_click` with placement + tests
- [ ] 7.15 `seo-auditor` agent pass; Lighthouse SEO = 100

## Phase 8 — Motion & 3D

**Design direction:** `docs/design.md` §9.1. More motion than the reference, while staying fast on phones and respecting reduced motion. Each page gets the amount of motion listed there.

- [ ] 8.1 GSAP + `@gsap/react` setup, plugin registration, `gsap.matchMedia` + reduced-motion helper + tests
- [ ] 8.2 Lenis smooth scroll synced with ScrollTrigger (disabled for reduced motion)
- [ ] 8.3 Text reveal component (SplitText), word-fill-on-scroll component + image clip reveal component
- [ ] 8.4 Scroll reveals on home sections, hero inset and stacking cards (desktop); pinned horizontal "New arrivals" (desktop) / swipe (mobile); reveals on the other pages per `docs/design.md` §9.1
- [ ] 8.5 Page transitions between all pages: short powder blue cover with the MA submark (View Transitions / GSAP overlay), none with reduced motion + Flip card→product image
- [ ] 8.6 Micro-interactions: collection panel and product card hovers, menu panel motion, magnetic buttons, cursor follower (desktop, pointer:fine only), hover image swap
- [ ] 8.7 R3F setup: lazy `<HeroCanvas>` island with poster fallback + capability detection
- [ ] 8.8 Flowing-fabric hero shader in ink folds on white with powder blue light, reading as real draped cloth with soft folds, **no model or video download**, within budget (≤ 250 kB JS)
- [ ] 8.9 WebGL image hover distortion on collection tiles (desktop)
- [ ] 8.10 Motion/3D tests: reduced motion, no-WebGL, no leaked triggers, CLS < 0.1; Lighthouse ≥ 90 mobile

## Phase 9 — Hardening
- [ ] 9.1 Full E2E regression on all devices; fix flakiness Phase 3 review: CI retries once (`playwright.config.ts`); report tests marked flaky so they aren't hidden. Pin the remaining auth limits in tests: sign-in 10 a minute per IP, `/two-factor/*` 5 a minute, `AUTH_RULES` against the doc table, the 24-hour verify link, 7-day web sessions, the 3-second HIBP default. Phase 4 review: lock the suit row in `core.media.add` (two quick saves on a suit with no photos can both try to be main, and the second gets a misleading "already on a suit" message), cap a suit at 30 photos and videos to match the reorder schema, and have `setPoster`, `updateAlt` and `remove` refuse media of a soft-deleted suit. Phase 5 review: three tests were flaky in the end-of-Phase-5 run (passed on retry): `e2e/admin/media.spec.ts` upload/reorder on mobile-ios, `audit.spec.ts` and `collections.spec.ts` create/rename on desktop Firefox; one `@mustafa/ui` unit run failed once under parallel turbo load and passed alone. Add import tests for a cropped PNG (`planMedia`) and for a catalog name change on an untouched suit writing a slug redirect.
- [ ] 9.2 Lighthouse CI budgets enforced in CI: add `.lighthouserc.json` (perf ≥ 0.9, a11y ≥ 0.95, SEO = 1) and a `lighthouse` job on PRs to `main` (removed in step 0.9 until this exists). If `playwright install --with-deps` fails on CI, pin the runner to `ubuntu-24.04`
- [ ] 9.3 Error tracking + structured logging. Customer management (moved from step 4.12, owner chose read-only for now): if ban or role changes are added, they must also delete that user's sessions; a new admin must be created already verified (the admin has no email verification endpoints) and must set up 2FA at once. Cloudinary (owner, 2026-11-05): consider turning on strict transformations, then allow-list every transformation both sites use (`docs/integrations.md`). Phase 3 review: add a looser per-email failed-login limit (today it's per IP and email), and clear the timer in `withTimeout` (`packages/core/integrations/rate-limit.ts`). Phase 4 review: abandoned uploads (signed but never saved) stay in Cloudinary: add a cleanup task (list each `products/<id>/` prefix, delete files no row uses and older than an hour), sign a `max_file_size`, and warn in the uploader when a pending upload nears the 1-hour limit. Phase 5 review: move the import's three-way merge (`scripts/import-stock/run.ts` `importSuit`) into `packages/core` with one transaction per suit; replace the `as ProductUpdateInput` cast; show "N changes by removed accounts hidden" on the audit page; the E2E database guard should also require `CI` with `GITHUB_ACTIONS` and compare against `IMPORT_DATABASE_URL`; `import:stock` could print the target host (no password) before writing. Audit joins on `id::text` can't use the primary key index: fine at this size.
- [ ] 9.4 Caching check: home, collection and product pages served from cache; measure a real page's Netlify bandwidth and requests, and update the estimate in `docs/deployment.md` §3
- [ ] 9.5 Dependency audit, Renovate/Dependabot config, secret scanning on Phase 0 review: (a) pin the MCP servers in `.mcp.json` to exact versions instead of `@latest`; (b) pin the GitHub Actions in `.github/workflows/ci.yml` to exact versions (or full commit SHAs) and let Renovate/Dependabot update them; (c) GitHub secret scanning isn't available on this plan, so don't turn it on here: use a local scanner (for example gitleaks in Husky or CI) and correct the "secret scanning" lines in `docs/auth-security.md` (two places) and `docs/launch-checklist.md` (§ with the "No secrets in git" item) Phase 3 review: `pnpm audit --prod` shows 2 moderate (minimatch via typescript-eslint tooling). For the owner to decide, since they change Claude Code's own guardrails: deny `git add -f`, widen the `.env` Read deny to every suffix, and teach `protect-files` about `cp -t`, `dd of=`, `perl -pi` and `git checkout`/`git restore` over committed migrations.
- [ ] 9.6 `code-reviewer` + `security-auditor` + `seo-auditor` final pass
- [ ] 9.7 Weekly DB backup workflow

## Phase 10 — Launch

Follow `docs/deployment.md` §8 and `docs/launch-checklist.md`.

- [ ] 10.1 Owner sign-offs (`docs/launch-checklist.md` §8): `check:` items, video rights, the Lajwanti name, payment, courier, returns, prices
- [ ] 10.2 Fill in How to Order, FAQ and Privacy with the owner's real information; add `shippingDetails` and `hasMerchantReturnPolicy` to JSON-LD if the information supports it
- [ ] 10.3 Production env vars set; production database migrated and seeded; approved products published. Phase 0 review: check that `SITE_INDEXABLE` is exactly `true` with no trailing space or newline in the Netlify value (an env value with a space may fail the `true` match and leave the site `noindex`, or pass in one place and not another). Decide whether `parseEnv` should trim values, and add a test if so
- [ ] 10.4 Launch checklist §1–7 passes on the `develop` preview
- [ ] 10.5 Add domains in Netlify; DNS at Spaceship for apex, `www`, `admin` (`docs/deployment.md` §4); HTTPS active
- [ ] 10.6 `.netlify.app` redirect + `SITE_INDEXABLE=true` + final `NEXT_PUBLIC_SITE_URL`; merge `develop` → `main`; tag `v1.0.0`. Phase 0 review: before the merge, check on both production sites that `NEXT_PUBLIC_SITE_URL` is exactly `https://mustafaapparels.com` (https, apex, no trailing slash or space) and `ADMIN_URL` / `WEB_URL` match their real hosts, not a `.netlify.app` or `localhost` value left over from before launch
- [ ] 10.7 Launch checks on the live domain: DNS `curl` checks, links, SEO, real phone. Include `curl -s https://mustafaapparels.com/robots.txt` (no `Disallow: /`) and `curl -sI` for no `X-Robots-Tag: noindex` on the storefront, which prove `SITE_INDEXABLE` and the site URL took effect
- [ ] 10.8 Google Search Console: confirm property, submit sitemap, inspect key URLs (`docs/seo-geo.md` §1)
- [ ] 10.9 Bing Webmaster Tools import + IndexNow check (`docs/seo-geo.md` §5)
- [ ] 10.10 GA4: property, DebugView test, key events, link Search Console (`docs/analytics.md`)
- [ ] 10.11 First-week watch: credits daily, errors, leads (`docs/launch-checklist.md` §10)
