# Setup

From zero to running locally. Going live on Netlify and connecting the domain is in **`docs/deployment.md`**. Every service below has a free plan.

## 1. Install on your computer

| Tool | How | Check |
|---|---|---|
| Node.js 26 LTS (pinned in `.nvmrc`) | https://nodejs.org (or `nvm install 26`) | `node -v` |
| pnpm | `corepack enable`. On a new machine corepack may be missing from Node; if so, run `npm install -g corepack` first | `pnpm -v` |
| Git | https://git-scm.com. On Windows install **Git for Windows**: Claude Code uses its Git Bash to run commands | `git --version` |
| GitHub CLI | https://cli.github.com → `gh auth login` | `gh auth status` |
| Claude Code | macOS/Linux/WSL: `curl -fsSL https://claude.ai/install.sh \| bash` · Windows PowerShell: `irm https://claude.ai/install.ps1 \| iex` | `claude --version` |
| ffmpeg (optional) | Only for trimming videos, such as removing an end card: `winget install Gyan.FFmpeg`. Claude Code can check videos in a browser without it | `ffmpeg -version` |
| Python (optional) | Only for the `skill-creator` skill's benchmark scripts. The project itself doesn't need it | `python --version` |

Claude Code needs a Claude subscription (Pro, Max, Team or Enterprise) or a Claude Console account. Official guide: https://code.claude.com/docs/en/quickstart

## 2. Create free accounts

Create each one when the build reaches it. `docs/claude-code-playbook.md` §4 says which phase needs what.

| Service | Used for | What to copy into `.env.local` |
|---|---|---|
| **GitHub** | Code, CI, deploy trigger | — (repo `ammar-06/mustafa-apparels` already exists) |
| **Neon** (neon.tech) | PostgreSQL | `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direct). Create branches `main`, `dev`, `preview` |
| **Cloudinary** | Photos and videos | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| **Resend** | Emails | `RESEND_API_KEY`. `EMAIL_FROM` = `Mustafa Apparels <no-reply@updates.mustafaapparels.com>` once the domain is verified (`docs/deployment.md` §5) |
| **Upstash** | Rate limiting (Redis) | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| **Netlify** | Hosting both apps | Nothing locally; variables go in each Netlify site (`docs/deployment.md` §2) |
| **Google Analytics** | Events and conversions | `NEXT_PUBLIC_GA_MEASUREMENT_ID` on the production site only (`docs/analytics.md`) |
| **Google Search Console** | Google indexing | Already verified. See `docs/seo-geo.md` §1 |
| **Bing Webmaster Tools** | Bing indexing | `INDEXNOW_KEY` is generated, not copied (`docs/seo-geo.md` §5) |

Generate secrets: `openssl rand -base64 32` → `BETTER_AUTH_SECRET`, `REVALIDATE_SECRET` (different values per environment).

**The domain** `mustafaapparels.com` is registered at Spaceship, and DNS stays there.

## 3. The project folder

```
Mustafa Apparels/
├─ Business data/Stock/Dhanak | Khaddar | Lajwanti   ← collection file + photos + videos (git-ignored, read-only)
├─ catalog/dhanak | khaddar | lajwanti                ← one details file per suit (in git)
├─ mustafa-apparels-logos/mustafa-apparels-logos/    ← logo, favicons, brand PDFs (in git)
├─ .claude/  .github/  docs/  scripts/
└─ AGENTS.md  CLAUDE.md  README.md  .mcp.json  .env.example  .gitignore
```

Follow **`docs/claude-code-playbook.md`**: it has every prompt in order, with the model to pick for each.

Approve the project MCP servers when Claude Code asks (they come from `.mcp.json`).

## 4. Run locally (after Phases 0–2 exist)

```bash
cp .env.example .env.local   # fill in values from §2
pnpm install                 # also installs the git hooks (Husky)
pnpm db:migrate
pnpm db:seed                 # needs SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
pnpm dev                     # web → http://localhost:3000, admin → http://localhost:3001
```

Before the first `pnpm test:e2e`, and after any Playwright upgrade, install the browsers. This also removes browser versions Playwright no longer uses:

```bash
pnpm exec playwright install chromium firefox webkit
```

## 5. Import your stock (after Phase 4 exists)

Your photos, videos and collection files in `Business data/` stay on your computer and out of GitHub. Each suit's details live in `catalog/`, which is in git. The import script reads both, and never changes `Business data/`:

```bash
pnpm import:stock --dry-run   # checks catalog/ and the files; writes nothing
pnpm import:stock             # uploads photos and videos; creates draft products with no price
```
Then clear any `check:` in the suit's catalog file, set its price in admin and publish it. Full flow, and how to add a new collection: `docs/catalog.md`.

## 6. Environment variables

Every variable, and where it's set:

| Variable | Local | Web site | Admin site | Notes |
|---|---|---|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | ✓ | ✓ | ✓ | Different Neon branch per environment |
| `NEXT_PUBLIC_SITE_URL` | ✓ | ✓ | ✓ | `https://mustafaapparels.com` in production |
| `SITE_INDEXABLE` | `false` | ✓ | ✓ | `false` until launch, then `true` on production only. The admin reads it for IndexNow |
| `WEB_URL` | ✓ | — | ✓ | Admin calls this to refresh the storefront |
| `ADMIN_URL` | ✓ | — | ✓ | `https://admin.mustafaapparels.com` in production |
| `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` | ✓ | ✓ | ✓ | URL differs per app |
| `REVALIDATE_SECRET` | ✓ | ✓ | ✓ | Same value in both apps |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | ✓ | ✓ | ✓ | |
| `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | ✓ | — | ✓ | Secret stays out of the storefront |
| `RESEND_API_KEY`, `EMAIL_FROM` | ✓ | ✓ | ✓ | |
| `SHOP_INBOX_EMAIL` | ✓ | ✓ | ✓ | `ammarofficial321@gmail.com` |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | ✓ | ✓ | ✓ | |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | — | Production only | — | Unset means no GA4 |
| `INDEXNOW_KEY` | — | — | Production only | Not secret |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | ✓ | — | — | Never in hosting env |
| `INTEGRATIONS_MODE` | `mock` optional | — | — | CI uses `mock` |

The apps validate env at startup and refuse to run if something is missing.

**`.env.example` is out of date** until step 0.10, which updates it to match this table: it still has the kit's `<SHOP_NAME>` placeholder and test sender, a `.netlify.app` production URL, and none of the variables added since. It also has `APP_ENV`, which CI uses. Step 0.10 keeps it for telling environments apart, and `SITE_INDEXABLE` alone decides indexing.

**Claude Code's access:** it can read and edit `.env.example`. It's denied reading `.env`, `.env.local`, `.env.*.local`, `.env.development` and `.env.production`, in the root and in subfolders. Other names such as `.env.test` aren't covered by that rule, so don't put real secrets in them. All `.env*` files except the example stay git-ignored and blocked from editing by the `protect-files` hook.
