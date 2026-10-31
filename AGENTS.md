# AGENTS.md

Rules for any AI coding agent (Claude Code, Cursor, Codex, etc.) working in this repo.
Claude Code reads this file through `CLAUDE.md`. Humans: see `README.md`.

---

## 1. What we are building

A women's dress shop website (brand name and logo not decided yet; written as `<SHOP_NAME>` in the docs).

- **Storefront** (`apps/web`): multi-page, 3D/GSAP-animated, SEO-first catalogue of dresses.
  Visitors browse, search, save favourites and **send an inquiry**. There is **no cart, no payment and no delivery** in v1.
- **Admin panel** (`apps/admin`): a separate app where the owner uploads dresses (photos, price, category, details), manages categories, reads inquiries and edits shop contact details.
- **Customer accounts**: sign up / log in, wishlist, inquiry history. Passwords are hashed and never stored in plain text.

Full requirements: `docs/prd.md`. Architecture: `docs/architecture.md`.

## 2. Tech stack (do not swap without an ADR in `docs/architecture.md`)

| Area | Choice |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Framework | Next.js (latest stable, App Router, TypeScript strict), React Server Components |
| Styling | Tailwind CSS + CSS variables for design tokens |
| Motion | GSAP (core, ScrollTrigger, SplitText, Flip) via `@gsap/react`, Lenis smooth scroll |
| 3D | Three.js via React Three Fiber + Drei |
| Database | PostgreSQL on Neon (serverless) |
| ORM | Drizzle ORM + drizzle-kit migrations |
| Auth | Better Auth (email + password, scrypt hashing; admin plugin; 2FA for admins) |
| Validation | Zod at every boundary |
| Images | Cloudinary (signed uploads from admin, auto WebP/AVIF) |
| Email | Resend (password reset, verification, inquiry notifications) |
| Rate limiting | Upstash Redis |
| Tests | Vitest + React Testing Library, Playwright (E2E, responsive, SEO), axe-core, Lighthouse CI |
| Hosting | Host-agnostic Next.js (see `docs/setup.md` → Hosting) |

## 3. Commands

```bash
pnpm install              # install everything
pnpm dev                  # run web (3000) + admin (3001)
pnpm dev --filter web     # run one app
pnpm lint                 # ESLint
pnpm typecheck            # tsc --noEmit across workspace
pnpm test                 # Vitest unit + integration
pnpm test:e2e             # Playwright (all devices)
pnpm test:seo             # SEO/canonical suite (Playwright)
pnpm test:a11y            # axe accessibility checks
pnpm verify               # lint + typecheck + test + build  (run before every commit)
pnpm db:generate          # create a migration from schema changes
pnpm db:migrate           # apply migrations
pnpm db:seed              # seed categories, demo dresses, first admin
```

## 4. Repo layout

```
apps/web        storefront (public)
apps/admin      admin panel (private, noindex)
packages/db     Drizzle schema, client, migrations, seed
packages/core   business logic (products, search, inquiries) — pure TS, most unit tests live here
packages/auth   Better Auth config shared by both apps
packages/validators  Zod schemas shared by apps and core
packages/ui     shared primitives (Button, Input, Dialog)
packages/config ESLint, tsconfig, Tailwind preset
e2e/            Playwright tests (web, admin, seo, a11y, responsive)
docs/           all project docs (start with docs/prd.md)
```

## 5. The golden workflow (non-negotiable)

**One change at a time.** A "change" is the smallest piece that can be tested and committed on its own
(one component, one server action, one schema change, one SEO rule). Never bundle unrelated edits.

For every change:

1. **Understand**: read the relevant doc(s) in section 9. State the change in 1–3 lines before coding.
2. **Test first**: write or update the test(s) that prove the change (unit, integration or E2E — see `docs/testing-qa.md`). Run them and watch them fail.
3. **Implement** the smallest code that makes them pass.
4. **Verify**: run `pnpm verify` plus any E2E suite the change touches. All green, zero warnings ignored.
5. **Docs**: if behaviour, schema, API or setup changed, update the matching doc in the same commit.
6. **Commit** with Conventional Commits: `feat(web): add product image gallery`, `fix(admin): ...`, `test(seo): ...`, `docs: ...`, `chore: ...`.
7. **Push** to the current branch (`develop` by default). Then report: what changed, which tests ran, the commit hash.

If a test fails and you cannot fix it within the change, **stop and report** — never skip, delete or `.only`/`.skip` a test to get green, and never commit with failing tests.

Branches: work on `develop` (every push gets a preview deploy). `main` = production; merge `develop` → `main` only when a feature is complete and CI is green.

## 6. Definition of Done (every change)

- [ ] Tests written for the new behaviour, including edge and failure cases
- [ ] `pnpm verify` passes; relevant E2E suites pass
- [ ] Works at 360px, 768px, 1280px, 1920px and 2560px widths (if UI)
- [ ] Keyboard accessible, visible focus, `prefers-reduced-motion` respected (if UI/motion)
- [ ] No secrets in code; inputs validated with Zod; auth checked on the server (if server code)
- [ ] SEO rules in section 8 hold (if a public page)
- [ ] Docs updated; committed; pushed

## 7. Security rules

- Validate **every** input on the server with Zod (forms, search params, route params, JSON bodies).
- Check auth and role **on the server** in every admin action/route: call `requireAdmin()` first. Hiding a button is not security.
- Passwords: only through Better Auth (scrypt). Never log, return or store plain passwords. Never write your own hashing.
- Secrets live in env vars only. Never prefix a secret with `NEXT_PUBLIC_`. Server-only modules import `server-only`.
- Never read, print or commit `.env*` files (except `.env.example`).
- No `dangerouslySetInnerHTML` except JSON-LD built with `serializeJsonLd()` (escapes `<`).
- Image uploads: admin only, signed, image MIME types only, size-capped (see `docs/auth-security.md`).
- Auth errors must not reveal whether an email exists.
- Rate-limit login, signup, password reset, inquiry form and search.
- Full details: `docs/auth-security.md`.

## 8. SEO rules (public pages)

Every indexable page must have, **rendered on the server in the initial HTML `<head>`**:

- Unique `<title>` and meta description
- **Exactly one** `<link rel="canonical">`, **absolute** URL (`https://...`), pointing to **this page itself**
- Open Graph + Twitter card tags (title, description, absolute image URL, `og:url` = canonical)
- JSON-LD where relevant (Product, BreadcrumbList, Organization/ClothingStore)

Canonical mistakes that must **never** happen (each one has an automated test in `e2e/seo/`):

| ❌ Mistake | ✅ Rule |
|---|---|
| Same canonical on every page | Each page's canonical = its own URL |
| Two canonical tags | Exactly one per page |
| Relative canonical URL | Always absolute, built from `SITE_URL` |
| Canonical added by JavaScript | Server-rendered in the initial HTML |
| Page 2 canonical → page 1 | Paginated pages canonicalize to themselves (`?page=2`) |
| Canonical → redirect or 404 | Canonical target must return HTTP 200 |

Also: dynamic `sitemap.xml`, `robots.txt`, `llms.txt`; `noindex` on search results, account, auth and all admin pages;
old product slugs 301 to the new slug; unknown slugs and out-of-range pages return a real 404.
Full details: `docs/design.md` (SEO section) and `.claude/skills/seo-guard/SKILL.md`.

## 9. Which doc to read before which task

| Task | Read first |
|---|---|
| Any new feature | `docs/prd.md`, `docs/feature-development.md` |
| Structure, data flow, caching | `docs/architecture.md` |
| Schema, migrations, queries | `docs/database.md` |
| Server actions, route handlers | `docs/api.md` |
| Login, roles, uploads, headers | `docs/auth-security.md` |
| UI, motion, 3D, responsive, SEO tags | `docs/design.md` |
| Tests | `docs/testing-qa.md` |
| Something is broken | `docs/debugging.md` |
| Third-party services | `docs/integrations.md` |
| MCP servers | `docs/mcp-connection.md` |
| What to build next | `docs/project-implementation.md` |
| Environment setup | `docs/setup.md` |

## 10. Never

- Never push code that fails `pnpm verify`.
- Never change the stack, add a paid service, or add a dependency over ~50 kB gzipped to the client without asking.
- Never copy code, images, logos, fonts or text from reference websites. Use them for ideas only and build original work.
- Never run destructive commands (`rm -rf`, `git push --force`, `drizzle-kit push` against production, dropping tables) without explicit approval.
- Never edit migrations that are already applied; create a new one.
- Never disable a lint rule, type check or test to make CI pass.
