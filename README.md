# Mustafa Apparels

Website for Mustafa Apparels, an online shop for women's unstitched 2-piece and 3-piece suits, serving all of Pakistan: https://mustafaapparels.com

A 3D, GSAP-animated, SEO-first catalogue with a separate admin panel. Visitors browse and search suits, watch short videos, and contact the shop on WhatsApp, by phone or by email. The shop arranges courier delivery and payment in chat, so there's no cart or online payment in v1.

## What's inside

| App | Live | Local | Purpose |
|---|---|---|---|
| `apps/web` | https://mustafaapparels.com | http://localhost:3000 | Public storefront: home, collections, product pages, search, account, wishlist, inquiries |
| `apps/admin` | https://admin.mustafaapparels.com | http://localhost:3001 | Private admin panel: suits, photos, videos, prices, collections, inquiries, shop settings |

Collections: **Dhanak**, **Khaddar**, **Lajwanti**. The admin can add more.

## Tech stack

Next.js (App Router, TypeScript) · Tailwind CSS · GSAP + Lenis · Three.js / React Three Fiber · PostgreSQL (Neon) · Drizzle ORM · Better Auth · Zod · Cloudinary · Resend · Upstash · Google Analytics 4 · Vitest · Playwright · Turborepo + pnpm · Netlify

Why each was chosen: `docs/architecture.md`.

## Quick start

```bash
# 1. Prerequisites: Node.js 24 LTS, pnpm, Git, GitHub account
corepack enable

# 2. Install
pnpm install

# 3. Environment
cp .env.example .env.local      # then fill in values (see docs/setup.md)

# 4. Database
pnpm db:migrate
pnpm db:seed                     # creates collections, contact details and your admin user

# 5. Run
pnpm dev
```

Full setup, including free accounts to create: **`docs/setup.md`**. Going live: **`docs/deployment.md`**.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Run web + admin locally |
| `pnpm verify` | Lint, typecheck, unit tests, build — must pass before every commit |
| `pnpm test` | Unit + integration tests (Vitest) |
| `pnpm test:e2e` | End-to-end tests on mobile, tablet, laptop, desktop and large screens (Playwright) |
| `pnpm test:seo` | SEO suite: canonical, meta, sitemap, robots, llms.txt, Open Graph |
| `pnpm test:a11y` | Accessibility checks (axe) |
| `pnpm db:generate` / `db:migrate` / `db:seed` | Database migrations and seed data |
| `pnpm import:stock` | Import `catalog/` as draft products (`--dry-run` to preview) |

## Before you merge to `main`

Each merge deploys to production and costs Netlify credits. Running out takes both sites offline until the monthly reset. Read `docs/deployment.md` §3 first. Admin edits (prices, products, contact details) don't need a deploy.

`Business data/` holds the owner's collection files, photos and videos, and stays out of git. Each suit's details live in `catalog/`, which the import script turns into draft products. The owner sets prices in admin. See `docs/catalog.md`.

## Documentation

| Doc | About |
|---|---|
| [`docs/prd.md`](docs/prd.md) | Product requirements: what we build and why |
| [`docs/architecture.md`](docs/architecture.md) | System architecture, data flow, decisions |
| [`docs/catalog.md`](docs/catalog.md) | Stock flow, suit files, filter taxonomy, media rules, adding a collection |
| [`docs/database.md`](docs/database.md) | Schema, indexes, migrations, search |
| [`docs/api.md`](docs/api.md) | Server actions and API routes |
| [`docs/design.md`](docs/design.md) | Brand, logo, design system, motion, video, 3D, responsive, SEO tags |
| [`docs/auth-security.md`](docs/auth-security.md) | Accounts, password hashing, roles, security headers |
| [`docs/testing-qa.md`](docs/testing-qa.md) | Test strategy and QA checklist |
| [`docs/feature-development.md`](docs/feature-development.md) | How to build a feature, one change at a time |
| [`docs/project-implementation.md`](docs/project-implementation.md) | Step-by-step build plan |
| [`docs/setup.md`](docs/setup.md) | Local setup, accounts, env vars |
| [`docs/deployment.md`](docs/deployment.md) | Netlify, credit budget, Spaceship DNS, email DNS, rollback |
| [`docs/seo-geo.md`](docs/seo-geo.md) | Search Console, Bing, IndexNow, Pakistan-wide SEO, AI answers, backlinks |
| [`docs/analytics.md`](docs/analytics.md) | Google Analytics 4, events and conversions |
| [`docs/launch-checklist.md`](docs/launch-checklist.md) | Everything to check before going live, incl. owner sign-offs |
| [`docs/integrations.md`](docs/integrations.md) | Neon, Cloudinary, Resend, Upstash, WhatsApp, IndexNow |
| [`docs/mcp-connection.md`](docs/mcp-connection.md) | MCP servers for Claude Code |
| [`docs/debugging.md`](docs/debugging.md) | Common problems and how to fix them |
| [`docs/claude-code-playbook.md`](docs/claude-code-playbook.md) | Prompts to give Claude Code, in order, with the model for each |
| [`AGENTS.md`](AGENTS.md) / [`CLAUDE.md`](CLAUDE.md) | Rules for AI coding agents |

## Working with Claude Code

This repo is set up for Claude Code: rules in `CLAUDE.md` + `AGENTS.md`, project skills in `.claude/skills/`,
review agents in `.claude/agents/`, hooks in `.claude/settings.json`, MCP servers in `.mcp.json`.

Every change follows: **test → implement → verify → commit → push**, one change at a time.
The prompts to use, in order, with the model for each: [`docs/claude-code-playbook.md`](docs/claude-code-playbook.md). Day to day it's just `/next-step`.
