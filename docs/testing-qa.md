# Testing & QA

**Rule:** every change ships with tests for every case and scenario it affects — happy path, edge cases, invalid input, unauthorized access, and failure of external services. Tests are written **first**, run, seen failing, then made to pass.

## 1. Test pyramid and tools

| Level | Tool | Lives in | What it covers | Speed |
|---|---|---|---|---|
| Unit | Vitest | `packages/*/src/**/*.test.ts` | Pure logic: validators, price formatting, slug/redirect rules, search query building, guards, HMAC | ms |
| Integration | Vitest + PGlite (or Neon test branch) | `packages/core/**/*.int.test.ts` | `core` functions against a real Postgres schema: create/update product, search ranking, wishlist, inquiry, cascade rules | < 1 s each |
| Component | Vitest + React Testing Library + jsdom | `apps/*/components/**/*.test.tsx` | Forms (validation messages), filters, gallery, inquiry buttons build correct `tel:`/`wa.me`/`mailto:` links | fast |
| E2E | Playwright | `e2e/web`, `e2e/admin` | Real user journeys in real browsers | seconds |
| Responsive | Playwright projects | `e2e/responsive` | Layout at 5+ viewports, no horizontal scroll, menu/filters usable | seconds |
| SEO | Playwright (raw HTML fetch + DOM) | `e2e/seo` | Canonical rules, meta, OG, JSON-LD, sitemap, robots, llms.txt, status codes | seconds |
| Accessibility | `@axe-core/playwright` | `e2e/a11y` | Every page template, zero serious/critical violations | seconds |
| Security | Playwright + Vitest | `e2e/security` | Headers, authz, rate limits, upload signing, revalidate HMAC | seconds |
| Performance | Lighthouse CI | `.lighthouserc.json` | Budgets on home, collection, product (mobile) | minutes (CI) |
| Visual (optional) | Playwright screenshots | `e2e/visual` | Key templates at 3 widths; review diffs on motion/theme changes | seconds |

## 2. Device / viewport matrix (Playwright projects)

| Project | Viewport | Browser |
|---|---|---|
| `mobile-small` | 360×780 | Chromium (Android UA, touch) |
| `mobile-ios` | iPhone 15 preset | WebKit |
| `tablet` | iPad (gen 7) preset, portrait + landscape | WebKit |
| `laptop` | 1366×768 | Chromium |
| `desktop` | 1920×1080 | Firefox |
| `large` | 2560×1440 | Chromium |

Every responsive test asserts: no horizontal overflow (`document.documentElement.scrollWidth <= innerWidth`), header/menu usable, product grid column count as designed, primary CTA visible without overlap.

## 3. Required test cases by feature

### Catalogue & product
- Published products appear; drafts/archived/deleted never appear (list, search, sitemap, direct URL → 404).
- Pagination: page 1, middle, last; `?page=0`, `?page=-1`, `?page=abc`, `?page=999` → 404 or normalized; `?page=1` → 301 clean URL.
- Filters combine correctly; empty results show a helpful state.
- Sort by price asc/desc, newest.
- Slug change → old URL 301 → new URL; chain of two renames still resolves in one hop.
- Price formatting (PKR, no decimals), compare-at price shown only when higher.

### Search
- Exact match, partial word, typo ("chifon"), Roman-Urdu word, colour, fabric, category name.
- Empty query, 1-char query, 61-char query, SQL-ish input (`' OR 1=1 --`), emoji, HTML tags → safe results/validation error.
- Suggestions debounce; rate limit → 429 handled gracefully in UI.

### Inquiry
- Valid submit (guest and logged in) → DB row + email sent (Resend mocked at the network boundary with MSW in tests).
- Each invalid field shows its message; honeypot filled → silently rejected; too fast → rejected; 6th submit in 10 min → 429.
- WhatsApp link contains encoded dress name + absolute product URL; `tel:` and `mailto:` correct.
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
- Create/edit/publish/archive/duplicate product; image upload (valid, wrong type, too big, not signed); reorder images; required alt text.
- Category CRUD and slug redirect; inquiry status changes; settings validation per key.
- Every mutation writes an audit log row and triggers revalidation (storefront shows the change).
- Every admin server action called with a customer session → FORBIDDEN (loop over all actions).

### SEO (`e2e/seo`)
For every URL in the sitemap plus representative noindex pages:
- Status 200; exactly one canonical; absolute; equals the page's own URL; present in raw server HTML inside `<head>` (fetched without JS, normal and Googlebot UAs).
- Canonical target returns 200 with no redirect.
- No two indexable pages share a canonical; page 2 canonical ≠ page 1.
- Title unique and ≤ 60 chars; description 70–160 chars; one `<h1>`.
- OG: `og:title`, `og:description`, `og:image` (absolute, 200, 1200×630), `og:url` = canonical; Twitter card present.
- JSON-LD parses; Product has price, currency, availability, image.
- `sitemap.xml` valid XML, only 200 + indexable URLs, absolute; `robots.txt` contains sitemap line and disallows; `llms.txt` returns 200 text/plain and links resolve.
- Search/account/auth pages: `noindex`; admin: `X-Robots-Tag: noindex`.

### Motion & 3D
- Reduced motion: no transforms animated, Lenis disabled, content visible immediately.
- No-JS / no-WebGL: content and poster visible; no console errors.
- Route change: no leaked ScrollTriggers (count before/after), no WebGL context warnings.
- CLS < 0.1 on pages with animations (Lighthouse + `PerformanceObserver` assertion).

## 4. Test data

- Factories in `packages/core/test/factories.ts` (`makeProduct()`, `makeCategory()`, `makeUser({ role })`).
- Integration tests: each test file gets a fresh schema (PGlite) or transaction rolled back after each test.
- E2E: CI starts a throwaway Postgres container, runs migrations + `db:seed --e2e`, and discards it after. (Locally you can point E2E at a Neon `test` branch instead.)
- External services mocked at the network boundary (MSW) in unit/integration; real test keys only in a nightly E2E job.

## 5. Coverage

- `packages/core`, `packages/validators`, `packages/auth`: ≥ 90% lines, ≥ 85% branches.
- Apps (server actions, route handlers): ≥ 80% lines.
- Coverage is a floor, not the goal — every bug fix starts with a test reproducing it.

## 6. CI pipeline (`.github/workflows/ci.yml`)

On every push and PR: install → lint → typecheck → migrate a fresh Postgres container → unit + integration (coverage) → build both apps → `pnpm audit --prod` → Playwright (all projects: E2E, responsive, SEO, a11y, security) against the built apps → Lighthouse CI on PRs to `main`. External services run in `INTEGRATIONS_MODE=mock`. Any failure blocks merge to `main` (branch protection).

## 7. Release QA checklist (before merging `develop` → `main`)

- [ ] CI green on the merge commit
- [ ] `seo-auditor` and `security-auditor` agents report no blockers
- [ ] Manual pass on a real Android phone and an iPhone (Safari): home, collection, product, inquiry, login
- [ ] Lighthouse mobile: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO = 100
- [ ] Rich Results Test passes for a product page
- [ ] Keyboard-only walkthrough of main journey; VoiceOver/TalkBack spot check
- [ ] Reduced-motion walkthrough
- [ ] Admin: create → publish → appears on site within a minute → archive → 404
