# Testing & QA

**Rule:** every change ships with tests for the real behaviour it affects and its important edge cases — invalid input, unauthorized access, failure of external services, and the boundaries that could break. Not every imaginable case: skip tests that repeat another test or only check the framework. Tests are written **first**, run, seen failing, then made to pass. Docs-only changes need none.

**Where tests run** (checks run once per level, not repeated):

| Where | What runs |
|---|---|
| Locally, per change | `pnpm verify` once (in `ship-change`), plus E2E for the touched pages on `mobile-small` and `laptop`. Docs-only changes: nothing. |
| Husky on commit | lint-staged and typecheck. The Claude commit hook only refuses `--no-verify` |
| CI on every push | Everything: lint, typecheck, unit + integration, build, all 7 device projects, SEO, a11y and security suites |
| Locally, end of a phase | The full set once: all 7 projects, `pnpm test:seo`, `pnpm test:a11y`, `e2e/security` |
| Review agents | End of Phase 3 and Phase 6 (`code-reviewer`, `qa-tester`, `security-auditor`), end of Phase 7 (`seo-auditor`), and all four before launch |

Root `pnpm lint` and `pnpm typecheck` also cover `e2e/`, `scripts/` and `.claude/hooks/`, so `pnpm verify` catches what Husky would. `scripts/tsconfig.json` type-checks their JavaScript in strict mode, minus `noImplicitAny` and `noUncheckedIndexedAccess`: it catches null and `unknown` mistakes without JSDoc on every parameter.

## 1. Test pyramid and tools

| Level | Tool | Lives in | What it covers | Speed |
|---|---|---|---|---|
| Unit | Vitest | `packages/*/**/*.test.ts` | Pure logic: validators, banned terms, price formatting, slug/redirect rules, search query building, guards, HMAC, media URL builders | ms |
| Integration | Vitest + PGlite (or Neon test branch) | `packages/core/**/*.int.test.ts` | `core` functions against a real Postgres schema: create/update product, publish rules, search ranking, wishlist, inquiry, cascade rules | < 1 s each |
| Component | Vitest + React Testing Library + jsdom | `apps/*/components/**/*.test.tsx` | Forms (validation messages), filters, gallery, video tile, inquiry buttons build correct `tel:`/`wa.me`/`mailto:` links | fast |
| E2E | Playwright | `e2e/web`, `e2e/admin` | Real user journeys in real browsers | seconds |
| Responsive | Playwright projects | `e2e/responsive` | Layout at 5+ viewports, no horizontal scroll, menu/filters usable | seconds |
| SEO | Playwright (raw HTML fetch + DOM) | `e2e/seo` | Canonical rules, meta, OG, JSON-LD, sitemap, robots, llms.txt, status codes | seconds |
| Accessibility | `@axe-core/playwright` | `e2e/a11y` | Every page template, zero serious/critical violations of WCAG 2.2 A/AA. Add each new template to the `PAGES` list in `e2e/a11y/pages.spec.ts`. Run with `pnpm test:a11y` (SEO: `pnpm test:seo`) | seconds |
| Security | Playwright + Vitest | `e2e/security` | Headers, CSP tiers, authz, rate limits, upload signing, revalidate HMAC | seconds |
| Performance | Lighthouse CI | `.lighthouserc.json` | Budgets on home, collection, product (mobile) | minutes (CI) |
| Visual (optional) | Playwright screenshots | `e2e/visual` | Key templates at 3 widths; review diffs on motion/theme changes | seconds |

## 2. Device / viewport matrix (Playwright projects)

| Project | Viewport | Browser |
|---|---|---|
| `mobile-small` | 360×780 | Chromium (Android UA, touch) |
| `mobile-ios` | iPhone 15 preset | WebKit |
| `tablet` | iPad (gen 7) preset, portrait | WebKit |
| `tablet-landscape` | iPad (gen 7) landscape preset (same device, its own project because a project has one viewport) | WebKit |
| `laptop` | 1366×768 | Chromium |
| `desktop` | 1920×1080 | Firefox |
| `large` | 2560×1440 | Chromium |

Every responsive test asserts: no horizontal overflow (`document.documentElement.scrollWidth <= innerWidth`), header/menu usable, product grid column count as designed, primary CTA visible without overlap. One extra check loads each page template at 320px wide and asserts no horizontal overflow, because the design promises support down to 320px.

## 3. Test cases by feature

These are the cases that can go wrong. Write the ones the change can break; you don't need every line for every change.

### Catalogue & product
- Published products appear; drafts/archived/deleted never appear (list, search, sitemap, direct URL → 404).
- Pagination on `/shop` and collections: `/page/2`, middle and last pages return 200 with a self-canonical; `/page/1` → 301 to the clean URL; `/page/0`, `/page/-1`, `/page/abc`, `/page/01`, `/page/999` → real 404. A page that comes into range after new suits are published stops returning 404 once revalidated.
- Filters (collection, volume style, dress category, fabric, design, season, outfit style, colour, price) combine correctly; empty results show a helpful state. No size filter or size text anywhere.
- Filters and sort run in the browser: `/api/suits` loads only on first use and returns published suits only; the URL updates; a shared `?fabric=` link restores the filter after load; Back works; a filter click sends no page request to the server. With JavaScript off, the unfiltered grid and its `/page/<n>` links work.
- Filter values with no published suit are hidden; a filter with one value or none is hidden.
- "Also in this design" links to the other colours, and hides when a linked suit isn't published.
- Sort by price asc/desc, newest.
- Slug change → old URL permanently redirects (301 or 308) to the new URL; chain of two renames still resolves in one hop; an old collection slug also redirects on its `/page/<n>` URLs.
- Price formatting (PKR, no decimals), compare-at price shown only when higher.
- 2-piece product shows shirt and trouser; 3-piece also shows dupatta; piece details render each fabric and finish, and length only when set. A zero, negative or over-10 `length_m` is rejected.
- Filter chips show only values a published suit has, set the same filter as the full panel, and hide when they wouldn't narrow anything.
- On phones the sticky WhatsApp bar stays visible on the product page without covering content. An out-of-stock suit keeps its page and its WhatsApp button.

### Publish rules
- Draft with no price saves. Publishing with no price, no colour, no main image or missing alt text fails with a clear message, in Zod and in `core`.
- A value outside the taxonomy in `docs/catalog.md` §4 is rejected for each of fabric, design, dress category, outfit style and colour family.
- Database rejects a published row with a null price.
- A video can't be the main item.

### Banned brand names
- Each banned name, in any case and with or without punctuation (`Maria.B`, `maria b`, `MARIAB`), is rejected in every customer-facing field: name, slug, description, care instructions, alt text, SEO fields, collection text.
- Whole names only: `Khaddar`, `khadi` and `also Kamal` are accepted, while `so-kamal` and `SOKAMAL` are rejected. Every real file in `catalog/` still passes.
- E2E: no banned name appears in the HTML or JSON-LD of any page in the sitemap.

### Photos and video
- Admin upload: valid photo; valid video; wrong type; photo over 10 MB; video over 50 MB; video over 60 s; unsigned upload; asset outside our folder. Rejected assets get deleted.
- Product page: video has `muted`, `playsInline`, `preload="none"`, no source until in view, poster visible first.
- Video URL has `ac_none`. Video never appears in grids.
- Reduced motion and Save-Data: poster only, tap to play works.
- Video pauses off-screen and when the tab is hidden; pause control works by keyboard.
- Landscape video shows whole, with no layout shift. Main image stays the LCP element.

### Catalog and stock import
- Every real file in `catalog/` passes the Zod schema in CI: required fields, taxonomy values, no banned names, unique design IDs, names and slugs, `price` empty, `status: draft`.
- `also_in_this_design` points to IDs that exist, and the link goes both ways.
- Left-out media (`dhnk1-VID`, `Laj1vid`, `laj3vid`) appears in no suit file.
- A listed file missing from `Business data/` fails the dry run. A file in the folder that no suit lists and `_collection.md` doesn't explain is reported.
- Dry run writes nothing. Real run creates drafts with no price. A second run creates no duplicates and doesn't overwrite a price or a change made in admin.
- Script never opens a `Business data/` file for writing.
- With `crop` set, the uploaded image is the crop, not the full file.
- `Business data/` isn't in git, so CI import tests use small fixture files; the catalog schema test uses the real `catalog/`.

### Search
- Exact match, partial word, typo ("khadar", "dhanuk"), design code ("DHN-01", "kdr-13"), colour, fabric, design, motif, collection name.
- "dhanak" returns Lajwanti suits as well as Dhanak ones.
- Empty query, 1-char query, 61-char query, SQL-ish input (`' OR 1=1 --`), emoji, HTML tags → safe results/validation error.
- Suggestions debounce; rate limit → 429 handled gracefully in UI.

### Inquiry
- Valid submit (guest and logged in) → DB row + email sent (Resend mocked at the network boundary with MSW in tests).
- Each invalid field shows its message; honeypot filled → silently rejected; submitted under 2 s after the form mounts in the browser → rejected, while a page cached for hours still submits normally; 6th submit in 10 min → 429.
- WhatsApp link goes to `wa.me/923482799707` and contains the encoded suit name, design code and absolute product URL; `tel:+923069558717` and `mailto:` correct.
- Email provider down → inquiry still saved, admin sees it, user gets success.

### Auth (web)
- Sign up, verify email, log in, log out, forgot/reset (token expiry, reuse), change password, delete account.
- Wrong password and unknown email return the **same** message.
- Rate limit on repeated failures. Session cookie flags (`HttpOnly`, `Secure`, `SameSite`).
- Passwords never appear in responses, logs or DB (`account.password` looks like a scrypt hash).

### Wishlist & account
- Add/remove, persists across sessions, guest prompted to log in, user A can't read/modify user B's wishlist or inquiries (IDOR test).

### Admin
- Logged out → redirect to login for every route; customer account can't log in to admin.
- 2FA required on first login; wrong code rejected.
- Create/edit/publish/archive/duplicate product; reorder media; required alt text.
- Collection CRUD and slug redirect; inquiry status changes; settings validation per key.
- Every mutation writes an audit log row and triggers revalidation (storefront shows the change).
- Publishing sends the URL to IndexNow (mocked); IndexNow failure doesn't fail the save; nothing is sent when `SITE_INDEXABLE=false`.
- Every admin server action called with a customer session → FORBIDDEN (loop over all actions).

### SEO (`e2e/seo`)
For every URL in the sitemap plus representative noindex pages:
- Status 200; exactly one canonical; absolute; equals the page's own URL; present in raw server HTML inside `<head>` (fetched without JS, normal and Googlebot UAs).
- Canonical target returns 200 with no redirect.
- No two indexable pages share a canonical; page 2 canonical ≠ page 1.
- Title unique and ≤ 60 chars, with the shop-name suffix dropped when it would pass 60; description 120–160 chars, trimmed at a word boundary; one `<h1>`.
- OG: `og:title`, `og:description`, `og:image` (absolute, 200, 1200×630), `og:url` = canonical; Twitter card present.
- JSON-LD parses. Product has price, currency, availability, image and `seller`, and has **no `brand`**. Product with a video has `VideoObject`. Home and Contact have `OnlineStore` with **no address or opening hours**.
- `sitemap.xml` valid XML, only 200 + indexable URLs, absolute; `llms.txt` returns 200 text/plain and links resolve.
- `robots.txt` has the sitemap line and disallows `/api`, and does **not** disallow `/search`, `/account` or auth pages. With `SITE_INDEXABLE=false` it has `Disallow: /`.
- Search/account/auth pages: `noindex` readable by a crawler; admin: `X-Robots-Tag: noindex`.

### Analytics (`e2e/web/analytics.spec.ts`)
- Each event in `docs/analytics.md` §3 fires once with the listed parameters (intercept the GA4 request or stub `gtag`).
- `search` sends query length only. No name, email, phone, message or search text in any event.
- No GA4 script when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is unset (previews, admin, tests). No CSP violations with GA4 on.

### Motion & 3D
- Reduced motion: no transforms animated, Lenis disabled, content visible immediately.
- No-JS / no-WebGL: content and poster visible; no console errors.
- Route change: no leaked ScrollTriggers (count before/after), no WebGL context warnings.
- Page transition: runs between pages, the cover clears in about 0.5 s, it doesn't trap keyboard focus, and it never shows with reduced motion.
- Phones: no pinned sections and no backdrop blur. Pages other than Home don't request Three.js.
- CLS < 0.1 on pages with animations (Lighthouse + `PerformanceObserver` assertion).

### Caching (protects Netlify credits)
- Home, shop, collection, `/page/<n>` and product pages return cache headers showing they're served from cache on the second request.
- Adding `?fabric=` or `?sort=` to a cached page doesn't make it render per request.
- `proxy.ts` matcher doesn't include any cached page.
- Real status codes: an unknown slug and an out-of-range page return 404, not 200, on the built app.
- Session-only UI (header account state, wishlist hearts) loads client-side, and the cached HTML holds no user data.

## 4. Test data

- Factories in `packages/core/test/factories.ts`, each taking the db first: `makeProduct(db, { published })`, `makeCategory(db)`, `makeUser(db, { role })`, `makeMedia(db, { productId, kind })`. Every call makes a unique, valid row; `published: true` also meets every publish rule, with a main photo and alt text.
- Integration tests: each test file starts one PGlite with `createTestDb()` from `@mustafa/db/testing` (the real migrations, plus `pg_trgm`), and calls `resetTestDb(db)` in `afterEach` to empty every table. The `library` Vitest preset allows 30 s per test and hook, because PGlite can take seconds to start under load.
- E2E: CI starts a throwaway Postgres container, runs migrations + `db:seed --e2e`, and discards it after. (Locally you can point E2E at a Neon `test` branch instead.)
- External services mocked at the network boundary (MSW) in unit/integration; real test keys only in a nightly E2E job.

## 5. Coverage

- `packages/core`, `packages/validators`, `packages/auth`: ≥ 90% lines, ≥ 85% branches.
- Apps (server actions, route handlers): ≥ 80% lines.
- Coverage is a floor, not the goal — every bug fix starts with a test reproducing it.
- The floors live in the presets in `packages/config/vitest/`: `app` for apps, `library` for `core`, `validators` and `auth`, and `tooling` (no floor) for tests that spawn other tools. Each package's `vitest.config.mjs` re-exports one. Files no test loads still count against the floor. The `app` preset turns on Vitest `globals`, so Testing Library cleans up the page after every test (`apps/web/test/testing-library.test.tsx` fails without it); tests still import `it` and `expect` from `vitest`. It also sets `NEXT_PUBLIC_SITE_URL=https://mustafaapparels.com` for unit tests, so URL helpers are tested against the production origin on every machine.
- `pnpm test` runs the workspace tests, then each package through Turbo with coverage. `pnpm exec vitest run` from the root runs everything without coverage or caching.

## 6. CI pipeline (`.github/workflows/ci.yml`)

On every push and PR (this is where the full 7-device, SEO, a11y and security runs happen): install → migrate a fresh `postgres:18` container (Neon's version) → lint → typecheck → unit + integration (coverage) → build both apps → `pnpm audit --prod` → Playwright (all projects: E2E, responsive, SEO, a11y, security) against the built apps → Lighthouse CI on PRs to `main`. External services run in `INTEGRATIONS_MODE=mock`. Any failure means no merge to `main`. Lighthouse joins at step 9.2. Integration tests run on PGlite; the container proves the migrations apply to real Postgres.

## 7. Release QA checklist (before merging `develop` → `main`)

- [ ] CI green on the merge commit
- [ ] Check the Netlify credit balance: is there room for this merge? (`docs/deployment.md` §3)
- [ ] The pre-launch review agents (`code-reviewer`, `qa-tester`, `security-auditor`, `seo-auditor`) report no blockers. For a merge before launch, CI green is enough; the agents already ran at the end of Phases 3 and 6
- [ ] Manual pass on a real Android phone and an iPhone (Safari): home, collection, product with video, inquiry, WhatsApp button, login
- [ ] Lighthouse mobile: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO = 100
- [ ] Rich Results Test passes for a product page
- [ ] Keyboard-only walkthrough of main journey; VoiceOver/TalkBack spot check
- [ ] Reduced-motion walkthrough
- [ ] Admin: create → publish → appears on site within a minute → archive → 404

The full first-launch list is in `docs/launch-checklist.md`.
