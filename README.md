# <SHOP_NAME> — Women's Dress Shop

A 3D, GSAP-animated, SEO-first website for a women's dress shop, with a separate admin panel.
Visitors browse and search dresses and contact the shop by phone, WhatsApp or email. No online payment or delivery in v1.

> Brand name, logo and colour theme are not decided yet. Replace `<SHOP_NAME>` everywhere once they are.

## What's inside

| App | URL (local) | Purpose |
|---|---|---|
| `apps/web` | http://localhost:3000 | Public storefront: home, collections, product pages, search, account, wishlist, inquiries |
| `apps/admin` | http://localhost:3001 | Private admin panel: dresses, photos, prices, categories, inquiries, shop settings |

## Tech stack

Next.js (App Router, TypeScript) · Tailwind CSS · GSAP + Lenis · Three.js / React Three Fiber · PostgreSQL (Neon) · Drizzle ORM · Better Auth · Zod · Cloudinary · Resend · Upstash · Vitest · Playwright · Turborepo + pnpm

Why each was chosen: `docs/architecture.md`.

## Quick start

```bash
# 1. Prerequisites: Node.js LTS (22+), pnpm, Git, GitHub account
corepack enable

# 2. Install
pnpm install

# 3. Environment
cp .env.example .env.local      # then fill in values (see docs/setup.md)

# 4. Database
pnpm db:migrate
pnpm db:seed                     # creates categories, sample dresses and your admin user

# 5. Run
pnpm dev
```

Full setup, including free accounts to create and hosting: **`docs/setup.md`**.

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

## Documentation

| Doc | About |
|---|---|
| [`docs/prd.md`](docs/prd.md) | Product requirements: what we build and why |
| [`docs/architecture.md`](docs/architecture.md) | System architecture, data flow, decisions |
| [`docs/database.md`](docs/database.md) | Schema, indexes, migrations, search |
| [`docs/api.md`](docs/api.md) | Server actions and API routes |
| [`docs/design.md`](docs/design.md) | Design system, motion, 3D, responsive, SEO tags |
| [`docs/auth-security.md`](docs/auth-security.md) | Accounts, password hashing, roles, security headers |
| [`docs/testing-qa.md`](docs/testing-qa.md) | Test strategy and QA checklist |
| [`docs/feature-development.md`](docs/feature-development.md) | How to build a feature, one change at a time |
| [`docs/project-implementation.md`](docs/project-implementation.md) | Step-by-step build plan |
| [`docs/setup.md`](docs/setup.md) | Local setup, accounts, deployment |
| [`docs/integrations.md`](docs/integrations.md) | Neon, Cloudinary, Resend, Upstash, WhatsApp, Search Console |
| [`docs/mcp-connection.md`](docs/mcp-connection.md) | MCP servers for Claude Code |
| [`docs/debugging.md`](docs/debugging.md) | Common problems and how to fix them |
| [`docs/claude-code-playbook.md`](docs/claude-code-playbook.md) | Prompts to give Claude Code, in order, with the model for each |
| [`AGENTS.md`](AGENTS.md) / [`CLAUDE.md`](CLAUDE.md) | Rules for AI coding agents |

## Working with Claude Code

This repo is set up for Claude Code: rules in `CLAUDE.md` + `AGENTS.md`, project skills in `.claude/skills/`,
review agents in `.claude/agents/`, hooks in `.claude/settings.json`, MCP servers in `.mcp.json`.

Every change follows: **test → implement → verify → commit → push**, one change at a time.
The prompts to use, in order, with the model for each: [`docs/claude-code-playbook.md`](docs/claude-code-playbook.md). Day to day it's just `/next-step`.
