# Setup

From zero to running locally, then deployed. Every service below has a free plan.

## 1. Install on your computer

| Tool | How | Check |
|---|---|---|
| Node.js 26 LTS (pinned in `.nvmrc`) | https://nodejs.org (or `nvm install 26`) | `node -v` |
| pnpm | `corepack enable`. On a new machine corepack may be missing from Node; if so, run `npm install -g corepack` first | `pnpm -v` |
| Git | https://git-scm.com. On Windows install **Git for Windows**: Claude Code uses its Git Bash to run commands | `git --version` |
| GitHub CLI | https://cli.github.com → `gh auth login` | `gh auth status` |
| Claude Code | macOS/Linux/WSL: `curl -fsSL https://claude.ai/install.sh \| bash` · Windows PowerShell: `irm https://claude.ai/install.ps1 \| iex` | `claude --version` |

Claude Code needs a Claude subscription (Pro, Max, Team or Enterprise) or a Claude Console account. Official guide: https://code.claude.com/docs/en/quickstart

## 2. Create free accounts

| Service | Used for | What to copy into `.env.local` |
|---|---|---|
| **GitHub** | Code, CI, deploy trigger | — (create an empty private repo `mustafa-apparels`) |
| **Neon** (neon.tech) | PostgreSQL | `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direct). Create branches `main`, `dev`, `preview` |
| **Cloudinary** | Dress photos | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| **Resend** | Emails | `RESEND_API_KEY`, `EMAIL_FROM` (use their test sender until you have a domain) |
| **Upstash** | Rate limiting (Redis) | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| **Hosting** | Deploying both apps | see §5 |

Generate secrets: `openssl rand -base64 32` → `BETTER_AUTH_SECRET`, `REVALIDATE_SECRET` (different values per environment).

## 3. Start the project with Claude Code

The project lives in your `Mustafa Apparels` folder, next to your stock media and logos:

```
Mustafa Apparels/
├─ Business data/Stock/Dhanak | Khaddar | Lajwanti   ← raw photos/videos (git-ignored, read-only for Claude)
├─ mustafa-apparels-logos/                           ← logo, favicons, brand PDFs
├─ .claude/  .github/  docs/  scripts/
└─ AGENTS.md  CLAUDE.md  README.md  .mcp.json  .env.example  .gitignore
```

Extract the kit into that folder's root, open the folder in VS Code, and follow **`docs/claude-code-playbook.md`**: it has every prompt in order, with the model to pick for each. Prompt 1 sets up git, the GitHub repo, skills and MCP servers.

Approve the project MCP servers when Claude Code asks (they come from `.mcp.json`).

## 4. Run locally (after Phase 0–1 exist)

```bash
cp .env.example .env.local   # fill in values from §2
pnpm install
pnpm db:migrate
pnpm db:seed                 # needs SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
pnpm dev                     # web → http://localhost:3000, admin → http://localhost:3001
```

## 5. Hosting — read this before launch

You asked for free Vercel hosting. Important: **Vercel's free Hobby plan is for non-commercial personal use only.** Vercel says all commercial usage requires a Pro or Enterprise plan, and a shop selling dresses counts as commercial. Vercel's own staff have confirmed that even a small business site promoting paid services falls under commercial use.

Your options (the code works on all of them; nothing in this project is Vercel-only):

| Option | Cost | Commercial OK | Notes |
|---|---|---|---|
| **A. Netlify free plan** (recommended free option) | $0 | Yes | Full Next.js support, preview deploys per branch, free `*.netlify.app` subdomain. Exceeding free credits pauses projects until next month. |
| **B. Cloudflare Workers free** (via OpenNext adapter) | $0 | Yes | Very generous free tier, fast global edge; one extra build step; some Next.js features need checking |
| **C. Vercel Pro** | ~$20/month | Yes | Smoothest Next.js experience; use if budget allows later |
| Vercel Hobby | $0 | **No** (personal, non-commercial only) | Fine for learning/demos, not for the live shop |

**Recommendation:** develop and launch on **Netlify free** (option A). Move to Vercel Pro or a custom domain later by changing env vars only.

### Deploy steps (Netlify, monorepo with two apps)
1. Netlify → *Add new site* → *Import from GitHub* → choose `mustafa-apparels`.
2. Site 1 (storefront): base directory `apps/web`, build command `pnpm turbo build --filter=web`, production branch `main`, branch deploys for `develop`.
3. Site 2 (admin): same repo, base directory `apps/admin`, build command `pnpm turbo build --filter=admin`.
4. Add environment variables per site (production values on `main`, preview values on branch deploys). Set `NEXT_PUBLIC_SITE_URL` to the site's URL (e.g. `https://<shop-name>.netlify.app`) and admin's `WEB_URL` to the storefront URL.
5. Database migrations run once per production deploy, from the storefront site only: set its production build command to `pnpm db:migrate && pnpm turbo build --filter=web` (migrations must be backward compatible — see `db-change` skill). Preview builds migrate the `preview` Neon branch the same way.
6. Protect `main` on GitHub (Settings → Branches): require the CI checks to pass before merging, so nothing untested reaches production.

### Deploy steps (Vercel, if you choose Pro)
Import the repo twice (root directory `apps/web` and `apps/admin`), same env vars, production branch `main`.

## 6. Environment variables

See `.env.example` (every variable explained). The apps validate env at startup and refuse to run if something is missing.

## 7. After launch

- Google Search Console → add property → verify → submit `https://<SITE_URL>/sitemap.xml`.
- Later, custom domain: add it in the host, set `NEXT_PUBLIC_SITE_URL` to it, enable a 301 redirect from the old subdomain, re-submit the sitemap.
