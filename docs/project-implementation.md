# Project Implementation Plan

Each `[ ]` is **one change = one commit + push**, with its tests. Claude Code: find the first unchecked box, do it, tick it in the same commit.
Order matters: functionality and quality first, brand/motion/3D after the logo and theme are decided.

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
- [ ] 0.9 GitHub Actions CI (`.github/workflows/ci.yml`) green on push
- [ ] 0.10 Env validation with Zod (`packages/config/env.ts`) + `.env.example`
- [ ] 0.11 Deploy both apps to the chosen host (preview from `develop`, production from `main`); preview `noindex`
- [ ] 0.12 Install external skills (`bash scripts/install-skills.sh`) and commit the lock/registry update

## Phase 1 — Data layer
- [ ] 1.1 `packages/db`: Drizzle + Neon client, drizzle-kit config, first migration enabling `pg_trgm`
- [ ] 1.2 `category` table + migration + integration test
- [ ] 1.3 `product` table (incl. generated `search_vector`, indexes) + tests
- [ ] 1.4 `product_image` table (one-primary constraint) + tests
- [ ] 1.5 `slug_redirect`, `site_setting`, `audit_log` tables + tests
- [ ] 1.6 `inquiry`, `wishlist_item` tables + tests
- [ ] 1.7 PGlite test harness + factories (`makeProduct`, `makeCategory`, `makeUser`)
- [ ] 1.8 `packages/validators`: product, category, inquiry, search, settings schemas + exhaustive unit tests
- [ ] 1.9 `core.categories` (list, getBySlug, create, update w/ redirect, reorder) + tests
- [ ] 1.10 `core.products` (list w/ filters+sort+pagination, getBySlug, create, update w/ redirect, status, duplicate, archive) + tests
- [ ] 1.11 `core.search` (full-text + trigram, filters, suggestions) + ranking tests
- [ ] 1.12 `core.settings`, `core.audit` + tests
- [ ] 1.13 Seed script (idempotent) + test

## Phase 2 — Authentication & security base
- [ ] 2.1 `packages/auth`: Better Auth with Drizzle adapter, email/password, generate auth tables migration
- [ ] 2.2 Web auth routes + session helpers; `requireUser` + tests
- [ ] 2.3 Sign-up / login / logout pages (forms, Zod, generic errors) + E2E
- [ ] 2.4 Email verification + password reset via Resend + E2E (email mocked)
- [ ] 2.5 Breached-password check, password policy, rate limits (Better Auth + Upstash) + tests
- [ ] 2.6 Admin auth: sign-up disabled, admin-only sign-in hook, `requireAdmin` + tests
- [ ] 2.7 Admin 2FA (TOTP) mandatory on first login + E2E
- [ ] 2.8 Admin `proxy.ts` gate + "customer gets 403 on every admin action" test loop
- [ ] 2.9 Security headers + CSP with nonce (both apps) + header tests
- [ ] 2.10 `security-auditor` agent pass; fix findings (one commit each)

## Phase 3 — Admin panel
- [ ] 3.1 Admin layout (sidebar, responsive), dashboard counts
- [ ] 3.2 Categories list + create/edit + reorder + hide
- [ ] 3.3 Cloudinary signed upload endpoint + tests
- [ ] 3.4 Image uploader component (drag-drop, progress, reorder, primary, alt required)
- [ ] 3.5 Product list (search, filter by status/category, pagination)
- [ ] 3.6 Product create form (field config driven) + E2E
- [ ] 3.7 Product edit, publish/unpublish, duplicate, archive/restore + E2E
- [ ] 3.8 Cross-app revalidation (`/api/revalidate` HMAC on web + caller in admin) + tests
- [ ] 3.9 Inquiries inbox + status changes + reply links
- [ ] 3.10 Customers list (read-only)
- [ ] 3.11 Site settings page (contact info, socials, default SEO)
- [ ] 3.12 Audit log page

## Phase 4 — Storefront core (functional, neutral styling)
- [ ] 4.1 Root layout: header (logo text, nav, search, account), footer, skip link, `.js` class
- [ ] 4.2 Design tokens scaffold (neutral placeholder palette/fonts) — swapped in Phase 6
- [ ] 4.3 Product card (3:4 image, name, price, wishlist toggle) + component tests
- [ ] 4.4 `/shop` grid with pagination + filters + sort (URL-driven) + E2E
- [ ] 4.5 `/collections/[slug]` + page-number rules (`?page=1` 301, out-of-range 404) + E2E
- [ ] 4.6 `/dresses/[slug]` product page: gallery (swipe/zoom), details, related + slug 301 + 404
- [ ] 4.7 Contact buttons (Call, WhatsApp, Email) on product page + sticky mobile bar
- [ ] 4.8 Inquiry form + server action + rate limit + email (see feature-development.md example)
- [ ] 4.9 Search page + suggestions dropdown (debounced, keyboard accessible)
- [ ] 4.10 Account: profile, wishlist, my inquiries, delete account
- [ ] 4.11 Static pages: About, Contact, FAQ, Privacy, Terms
- [ ] 4.12 Branded 404 + error pages with correct status codes
- [ ] 4.13 Responsive suite passes on all 6 device projects; a11y suite passes

## Phase 5 — SEO
- [ ] 5.1 `SITE_URL` + `canonicalUrl()` + `buildMetadata()` helpers + unit tests
- [ ] 5.2 Metadata on every page (title, description, canonical, robots) 
- [ ] 5.3 Canonical E2E suite: one tag, absolute, self, SSR in `<head>`, pagination self, target 200
- [ ] 5.4 Open Graph + Twitter tags; dynamic OG images (default, collection, product) + tests
- [ ] 5.5 JSON-LD: Product, BreadcrumbList, ItemList, ClothingStore + `serializeJsonLd` escaping test
- [ ] 5.6 `sitemap.ts` (dynamic, absolute, lastModified) + tests
- [ ] 5.7 `robots.ts` (prod vs preview) + tests
- [ ] 5.8 `llms.txt` route + tests
- [ ] 5.9 `noindex` rules (search, account, auth, admin header, previews) + tests
- [ ] 5.10 `seo-auditor` agent pass; Lighthouse SEO = 100

## Phase 6 — Brand & visual design (needs: name, logo, palette, fonts)
- [ ] 6.1 Replace `<SHOP_NAME>` everywhere; logo SVG, favicons, web manifest
- [ ] 6.2 Final colour tokens (contrast tested) + fonts via `next/font`
- [ ] 6.3 Restyle header/footer/cards/buttons/forms with final tokens; visual snapshots updated
- [ ] 6.4 Home page layout sections (static, no motion yet)
- [ ] 6.5 OG image template with brand

## Phase 7 — Motion & 3D
- [ ] 7.1 GSAP + `@gsap/react` setup, plugin registration, `gsap.matchMedia` + reduced-motion helper + tests
- [ ] 7.2 Lenis smooth scroll synced with ScrollTrigger (disabled for reduced motion)
- [ ] 7.3 Text reveal component (SplitText) + image clip reveal component
- [ ] 7.4 Scroll reveals on home sections; pinned horizontal "New arrivals" (desktop) / swipe (mobile)
- [ ] 7.5 Page transitions (View Transitions / GSAP overlay) + Flip card→product image
- [ ] 7.6 Micro-interactions: magnetic buttons, cursor follower (desktop, pointer:fine only), hover image swap
- [ ] 7.7 R3F setup: lazy `<HeroCanvas>` island with poster fallback + capability detection
- [ ] 7.8 3D hero scene (chosen concept) within budget (≤ 1.5 MB model, ≤ 250 kB JS)
- [ ] 7.9 WebGL image hover distortion on collection tiles (desktop)
- [ ] 7.10 Motion/3D tests: reduced motion, no-WebGL, no leaked triggers, CLS < 0.1; Lighthouse ≥ 90 mobile

## Phase 8 — Hardening
- [ ] 8.1 Full E2E regression on all devices; fix flakiness
- [ ] 8.2 Lighthouse CI budgets enforced in CI
- [ ] 8.3 Error tracking + structured logging
- [ ] 8.4 Privacy-friendly analytics events (inquiry, WhatsApp/call/email clicks, search)
- [ ] 8.5 Dependency audit, Renovate/Dependabot config, secret scanning on
- [ ] 8.6 `code-reviewer` + `security-auditor` + `seo-auditor` final pass
- [ ] 8.7 Weekly DB backup workflow

## Phase 9 — Launch
- [ ] 9.1 Hosting plan confirmed for commercial use (see setup.md)
- [ ] 9.2 Production env vars set; seed real categories; admin creates first real dresses
- [ ] 9.3 Google Search Console: verify site, submit sitemap
- [ ] 9.4 Release QA checklist (`testing-qa.md` §7) signed off
- [ ] 9.5 Merge `develop` → `main`; tag `v1.0.0`; monitor for 48 h
- [ ] 9.6 Later: custom domain → update `SITE_URL`, 301 from old URL, re-submit sitemap
