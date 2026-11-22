# AGENTS.md

Rules for any AI coding agent (Claude Code, Cursor, Codex, etc.) working in this repo.
Claude Code reads this file through `CLAUDE.md`. Humans: see `README.md`.

---

## 1. What we are building

**Mustafa Apparels** (https://mustafaapparels.com): an online catalogue of women's **unstitched** 2-piece and 3-piece suits, serving all of Pakistan. Online only, with no public address. The logo reads "MA Apparels by Mustafa Ahmed".

- **Storefront** (`apps/web`): multi-page, 3D/GSAP-animated, SEO-first catalogue with photos and short videos. Collections: Dhanak, Khaddar, Lajwanti.
  Visitors browse, search, save favourites and **send an inquiry, mainly on WhatsApp**. There is **no cart, no online payment and no courier booking on the site**; the shop arranges courier delivery and payment in chat.
- **Admin panel** (`apps/admin`, https://admin.mustafaapparels.com): a separate app where the owner uploads suits (photos, videos, price, collection, details), manages collections, reads inquiries and edits shop contact details.
- **Customer accounts**: sign up / log in, wishlist, inquiry history. Passwords are hashed and never stored in plain text.

Hard product rules:
- **No sizes.** Products are unstitched; there are no size fields or filters.
- **Filter values are a fixed list** in `docs/catalog.md` §4. Prices are never in `catalog/`; the owner sets them in admin.
- **Never name another fashion brand** anywhere customers or search engines can see. The owner has no written permission. A validator enforces it (`docs/database.md` §9).
- **No Urdu version.** The owner decided this; don't add it.
- Call products "suits", not "dresses".

Full requirements: `docs/prd.md`. Architecture: `docs/architecture.md`.

## 2. Tech stack (do not swap without an ADR in `docs/architecture.md`)

| Area | Choice |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Framework | Next.js (latest stable, App Router, TypeScript strict), React Server Components |
| Styling | Tailwind CSS + CSS variables for design tokens |
| Motion | GSAP (core, ScrollTrigger, SplitText, Flip) via `@gsap/react`, Lenis smooth scroll |
| 3D | Three.js via React Three Fiber + Drei (shader hero, no downloaded model) |
| Database | PostgreSQL on Neon (serverless) |
| ORM | Drizzle ORM + drizzle-kit migrations |
| Auth | Better Auth (email + password, scrypt hashing; roles as our own fields, no admin plugin (ADR-020); 2FA for admins) |
| Validation | Zod at every boundary |
| Media | Cloudinary (signed uploads from admin, auto WebP/AVIF, video with posters) |
| Email | Resend (password reset, verification, inquiry notifications) |
| Rate limiting | Upstash Redis |
| Analytics | Google Analytics 4 (storefront only) |
| Tests | Vitest + React Testing Library, Playwright (E2E, responsive, SEO), axe-core, Lighthouse CI |
| Hosting | Netlify free plan, two sites from one repo; DNS at Spaceship (`docs/deployment.md`) |

## 3. Commands

```bash
pnpm install              # install everything
pnpm dev                  # run web (3000) + admin (3001)
pnpm dev --filter web     # run one app
pnpm lint                 # ESLint (apps, packages, e2e, scripts, .claude/hooks)
pnpm typecheck            # tsc --noEmit across workspace, incl. e2e, scripts and .claude/hooks
pnpm test                 # Vitest unit + integration
pnpm test:e2e             # Playwright (all 7 devices): CI, and locally at the end of a phase
pnpm exec playwright test <spec> --project=mobile-small --project=laptop   # local run for a change
pnpm test:seo             # SEO/canonical suite (Playwright)
pnpm test:a11y            # axe accessibility checks
pnpm verify               # lint + typecheck + test + build  (once per change, before the commit; not for docs-only changes)
pnpm db:generate          # create a migration from schema changes
pnpm db:migrate           # apply migrations
pnpm db:seed              # seed collections, contact details, first admin
pnpm import:stock --dry-run   # check catalog/ and its files; writes nothing
pnpm import:stock             # import catalog/ as draft products with no price
```

## 4. Repo layout

```
apps/web        storefront (public), https://mustafaapparels.com
apps/admin      admin panel (private, noindex), https://admin.mustafaapparels.com
packages/db     Drizzle schema, client, migrations, seed
packages/core   business logic (products, search, inquiries) — pure TS, most unit tests live here
packages/auth   Better Auth config shared by both apps
packages/validators  Zod schemas shared by apps and core, incl. banned brand names
packages/ui     shared primitives (Button, Input, Dialog)
packages/config ESLint, tsconfig, Tailwind preset
scripts/        import-stock.ts, install-skills.sh
e2e/            Playwright tests (web, admin, seo, a11y, responsive)
docs/           all project docs (start with docs/prd.md)
catalog/        one details file per suit, by collection (docs/catalog.md)
mustafa-apparels-logos/  official logo pack
Business data/  owner's collection files, photos, videos: git-ignored, read-only, used only to build catalog/ and by the import script
```

Public routes: `/`, `/shop`, `/shop/page/[n]`, `/collections/[slug]`, `/collections/[slug]/page/[n]`, `/products/[slug]`, `/search`, `/about`, `/contact`, `/how-to-order`, `/faq`, `/privacy`, `/terms`.

## 5. The golden workflow (non-negotiable)

**One change at a time.** A "change" is the smallest piece that can be tested and committed on its own
(one component, one server action, one schema change, one SEO rule). Never bundle unrelated edits.

For every change:

1. **Understand**: read the relevant doc(s) in section 9. State the change in 1–3 lines before coding.
2. **Test first**: write or update the test(s) that prove the change (unit, integration or E2E — see `docs/testing-qa.md`). Cover the real behaviour and the important edge cases, not every imaginable case. Run them and watch them fail. A docs-only change needs no test.
3. **Implement** the smallest code that makes them pass.
4. **Verify, once**: run `pnpm verify` one time. For a UI change, also run E2E for the pages it touches, on `mobile-small` and `laptop` only. CI runs all 7 devices and the SEO, a11y and security suites on every push; run those in full locally only at the end of a phase. **Docs-only changes** (`docs/`, `.claude/`, other Markdown no test reads) skip verify and E2E. All green, zero warnings ignored.
5. **Docs**: if behaviour, schema, API or setup changed, update the matching doc in the same commit.
6. **Commit** with Conventional Commits: `feat(web): add product image gallery`, `fix(admin): ...`, `test(seo): ...`, `docs: ...`, `chore: ...`.
7. **Push** to the current branch (`develop` by default). Then report briefly: change, tests run, commit, next step, and anything the owner must do.

**Tool quirks:** don't spend more than about 10 minutes on one. Record it in `docs/debugging.md` and move on, unless it blocks the step.

**Review agents** (`code-reviewer`, `qa-tester`, `security-auditor`) run only at the end of Phase 3, at the end of Phase 6 and before launch. `seo-auditor` runs at the end of the SEO phase (Phase 7) and before launch.

If a test fails and you cannot fix it within the change, **stop and report** — never skip, delete or `.only`/`.skip` a test to get green, and never commit with failing tests.

Branches: work on `develop` (every push gets a preview deploy at no deploy cost). `main` = production.

**Merging `develop` → `main` costs Netlify credits: 15 per site that changed, and running out of credits takes both sites offline.** Merge only when a phase or batch of phases is complete and CI is green, and at most 4 times a month. See `docs/deployment.md` §3. Never trigger a production deploy just to test something; use the `develop` preview.

## 6. Definition of Done (every change)

- [ ] Tests written for the new behaviour, including edge and failure cases
- [ ] `pnpm verify` passes once (skipped for docs-only changes); E2E for the touched pages passes on `mobile-small` and `laptop`
- [ ] Works at 360px, 768px, 1280px, 1920px and 2560px widths (if UI): checked at 360 and 1366 locally; the other widths are covered by CI and the end-of-phase run
- [ ] Keyboard accessible, visible focus, `prefers-reduced-motion` respected (if UI/motion/video)
- [ ] No secrets in code; inputs validated with Zod; auth checked on the server (if server code)
- [ ] SEO rules in section 8 hold (if a public page)
- [ ] Public pages stay cached: no per-request work added to them
- [ ] Docs updated; committed; pushed

## 7. Security rules

- Validate **every** input on the server with Zod (forms, search params, route params, JSON bodies).
- Check auth and role **on the server** in every admin action/route: call `requireAdmin()` first. Hiding a button is not security.
- Passwords: only through Better Auth (scrypt). Never log, return or store plain passwords. Never write your own hashing.
- Secrets live in env vars only. Never prefix a secret with `NEXT_PUBLIC_`. Server-only modules import `server-only`.
- Never read, print or commit `.env*` files (except `.env.example`).
- No `dangerouslySetInnerHTML` except JSON-LD built with `serializeJsonLd()` (escapes `<`).
- Media uploads: admin only, signed, size-capped. Photos: JPEG, PNG, WebP, 10 MB. Videos: MP4, MOV, WebM, 50 MB, 60 seconds. Re-checked on the server when saving (see `docs/auth-security.md`).
- CSP has two tiers: a fixed policy on cached public pages, nonces only on dynamic routes and admin. **Never add a nonce to a cached page**: it disables caching (`docs/auth-security.md` §3.2).
- Auth errors must not reveal whether an email exists.
- Rate-limit login, signup, password reset, inquiry form and search.
- Full details: `docs/auth-security.md`.

## 8. SEO rules (public pages)

Every indexable page must have, **rendered on the server in the initial HTML `<head>`**:

- Unique `<title>` and meta description
- **Exactly one** `<link rel="canonical">`, **absolute** URL (`https://mustafaapparels.com/...`), pointing to **this page itself**
- Open Graph + Twitter card tags (title, description, absolute image URL, `og:url` = canonical)
- JSON-LD where relevant (Product, VideoObject, BreadcrumbList, OnlineStore). Product has no `brand`; Mustafa Apparels is the `seller`. OnlineStore has no address or opening hours.

Canonical mistakes that must **never** happen (each one has an automated test in `e2e/seo/`):

| ❌ Mistake | ✅ Rule |
|---|---|
| Same canonical on every page | Each page's canonical = its own URL |
| Two canonical tags | Exactly one per page |
| Relative canonical URL | Always absolute, built from `SITE_URL` |
| Canonical added by JavaScript | Server-rendered in the initial HTML |
| Page 2 canonical → page 1 | Paginated pages use path URLs and canonicalize to themselves (`/collections/dhanak/page/2`); `/page/1` redirects to the clean URL |
| Canonical → redirect or 404 | Canonical target must return HTTP 200 |

Also: dynamic `sitemap.xml`, `robots.txt`, `llms.txt`; `noindex` on search results, account, auth and all admin pages;
old product slugs permanently redirect (301 or 308) to the new slug; unknown slugs and out-of-range pages return a real 404. Cached pages never read `searchParams`: page numbers come from the path, and filters and sort run in the browser (`docs/architecture.md` ADR-017, ADR-018).
`robots.txt` disallows `/api` only, because a crawler blocked from a `noindex` page never reads the tag. Before launch and on previews, `SITE_INDEXABLE=false` disallows everything.
Full details: `docs/design.md` §8, `docs/seo-geo.md` and `.claude/skills/seo-guard/SKILL.md`.

## 9. Which doc to read before which task

| Task | Read first |
|---|---|
| Any new feature | `docs/prd.md`, `docs/feature-development.md` |
| Structure, data flow, caching | `docs/architecture.md` |
| Stock, suit files, filters, import, new collections | `docs/catalog.md` |
| Schema, migrations, queries | `docs/database.md` |
| Server actions, route handlers | `docs/api.md` |
| Login, roles, uploads, headers | `docs/auth-security.md` |
| UI, brand, logo, motion, video, 3D, responsive, SEO tags | `docs/design.md` (colours, type and logo at a glance: `docs/brand.md`) |
| Tests | `docs/testing-qa.md` |
| Something is broken | `docs/debugging.md` |
| Third-party services, Cloudinary video | `docs/integrations.md` |
| MCP servers | `docs/mcp-connection.md` |
| What to build next | `docs/project-implementation.md` |
| Environment setup, env vars | `docs/setup.md` |
| Netlify, credits, DNS, email DNS, merging to `main` | `docs/deployment.md` |
| Search Console, Bing, IndexNow, AI answers, backlinks | `docs/seo-geo.md` |
| GA4, events, conversions | `docs/analytics.md` |
| Going live | `docs/launch-checklist.md` |

## 10. Never

- Never push code that fails `pnpm verify` (docs-only changes have nothing to verify).
- Never change the stack, add a paid service, or add a dependency over ~50 kB gzipped to the client without asking.
- Never copy code, images, logos, fonts or text from reference websites. Use them for ideas only and build original work.
- Never name another fashion brand in customer-facing text, or copy text from the stock posters.
- Never upload media that shows another brand's logo, name or text. Check videos through to the end.
- Never commit or modify anything in `Business data/`, or save any output there.
- Never redraw, recolour or stretch the logo.
- Never serve heavy files (video, models, large images) from `public/`: Netlify bandwidth costs credits. Media goes on Cloudinary.
- Never make a cached public page dynamic without an ADR.
- Never run destructive commands (`rm -rf`, `git push --force`, `drizzle-kit push` against production, dropping tables) without explicit approval.
- Never edit migrations that are already applied; create a new one.
- Never disable a lint rule, type check or test to make CI pass.
