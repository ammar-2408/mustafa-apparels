# CLAUDE.md

@AGENTS.md

Everything in AGENTS.md applies. This file adds Claude Code–specific behaviour.

## Session start (every new session)

1. Read `docs/project-implementation.md` and find the first unchecked step. That is the next change unless the user asks for something else.
2. Run `git status` and `git log --oneline -5` so you know where work stopped.
3. Check skills (section below). Install any missing skill from the registry before starting the task it covers.
4. The user's prompt order and model choices are in `docs/claude-code-playbook.md`. When you finish a step, name the model it recommends for the next one.

`Business data/` holds the owner's collection files, photos and videos. Read them (you can view images) but never modify, move or commit them, and never save screenshots or other output inside it. Per-suit details go in `catalog/<collection>/<design-id>.md`, never in `Business data/`. Imports go only through `scripts/import-stock.ts`. Follow `docs/catalog.md` for all stock work, including adding a collection.

Some stock has shown other brands' logos, and the owner has no permission to use those names: see the hard product rules in AGENTS.md §1. Check every photo, and sample every video through to its last seconds. Prices never go in `catalog/`, and anything unsure gets a `check:`.

## How to work

- **Plan before big changes.** For anything touching more than ~3 files, a schema, auth, or a new page: use plan mode, show the plan, wait for approval.
- **One change → test → verify → commit → push.** Use the `ship-change` skill to finish every change. Do not start the next change until the current one is pushed.
- **Run checks once.** `pnpm verify` runs once per change, in `ship-change`. Docs-only changes skip verify and E2E. Locally, run E2E only for the pages the change touches, on `mobile-small` and `laptop`. CI runs all 7 devices plus the SEO, a11y and security suites on every push; run those in full locally only at the end of a phase.
- **Right-size tests.** Cover the real behaviour and the important edge cases, not every imaginable case.
- **Don't sink time into tool quirks.** After about 10 minutes, record the quirk in `docs/debugging.md` and move on, unless it blocks the step.
- **Small context.** Don't @-import all docs. Read only the doc the task needs (AGENTS.md section 9). After a feature is done, suggest `/clear`.
- **Report** after each change, short, in this format:
  `Change:` … `Tests:` (what ran, pass counts) … `Commit:` hash + message … `Next:` the next step … `You:` anything the owner must do.
- Ask the user only when a decision is genuinely theirs (brand, colours, paid services, deleting data). Otherwise pick the sensible default and say so.

## Skills — use them for everything

Skills live in `.claude/skills/` (project) and `~/.claude/skills/` (user). Before any task, check whether a skill covers it and **load it**.

### Project skills (already in this repo)

| Skill | Use for |
|---|---|
| `next-step` | User runs `/next-step`: build the next plan step end to end (manual-only) |
| `ship-change` | Finishing every change: tests, verify, docs, commit, push |
| `write-tests` | Choosing and writing unit / integration / E2E tests |
| `seo-guard` | Any public page, metadata, canonical, sitemap, robots, llms.txt, OG, JSON-LD |
| `motion-gsap` | Any animation, scroll effect, page transition (project rules on top of the official GSAP skills) |
| `three-scene` | Any 3D / WebGL / React Three Fiber work |
| `reference-to-code` | Turning a reference website or screenshot into original UI ("image to code") |
| `security-check` | Any server action, route handler, auth, upload, or env change |
| `db-change` | Any schema or migration change |
| `product-media` | Photos, videos, `catalog/`, filter values, stock import, adding a collection |
| `brand-mustafa` | Logo, colour tokens, Montserrat, spacing, tone for suit descriptions and other customer-facing text |

### External skills registry (install automatically when needed)

If a task needs one of these and it is not in `.claude/skills/`, install it yourself with the command shown, then tell the user what you installed. To install all at once: `bash scripts/install-skills.sh`.

| Skill(s) | Source (trusted) | Install |
|---|---|---|
| `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-react`, `gsap-performance`, `gsap-utils`, `gsap-frameworks` | greensock (official) | `npx -y skills add greensock/gsap-skills --agent claude-code` |
| `vercel-react-best-practices`, `web-design-guidelines`, `vercel-react-view-transitions`, `vercel-composition-patterns` | vercel-labs (official) | `npx -y skills add vercel-labs/agent-skills --agent claude-code` |
| `better-auth-best-practices`, `better-auth-security-best-practices`, `create-auth`, `email-and-password-best-practices`, `two-factor-authentication-best-practices`, `organization-best-practices` | better-auth (official) | `npx -y skills add better-auth/skills --agent claude-code` |
| `frontend-design`, `webapp-testing`, `skill-creator` | anthropics (official) | `npx -y skills add anthropics/skills --skill frontend-design --agent claude-code` (repeat with `webapp-testing`, `skill-creator`) |

**Rules for skills not in this registry:**
- You may search https://skills.sh or the official plugin directory (`/plugin` → Discover) for a skill that fits.
- Prefer official sources (anthropics, vercel-labs, greensock, better-auth, microsoft, the tool's own org).
- For any **third-party** skill: show the user the repo, what it does, and ask before installing (skills can contain scripts).
- After installing, add it to this registry table in the same commit.
- If no good skill exists and the task will repeat, create a project skill with `skill-creator`.

## Subagents (`.claude/agents/`)

They keep the main context clean, but each run is slow and costly, so use them only at the points below, not after every phase.

| Agent | When |
|---|---|
| `code-reviewer` | End of Phase 3, end of Phase 6, and before launch |
| `qa-tester` | End of Phase 3, end of Phase 6, and before launch |
| `security-auditor` | End of Phase 3, end of Phase 6, and before launch |
| `seo-auditor` | End of the SEO phase (Phase 7), and before launch |

Outside those points, use `security-check` and `seo-guard` while you write the code. Run an agent earlier only if the user asks.

## MCP servers (`.mcp.json`, details in `docs/mcp-connection.md`)

- `playwright` — open pages, take screenshots at each breakpoint, test flows.
- `chrome-devtools` — performance traces, console errors, network, Core Web Vitals.
- `context7` — up-to-date docs for Next.js, GSAP, Drizzle, Better Auth, R3F. **Use it before writing code against a library API you are not sure is current.**
- `neon` — inspect the database and create test branches (never touch the production branch without approval).

## Hooks (`.claude/settings.json`)

Hooks are Node scripts (`.claude/hooks/*.mjs`), so they work the same on Windows, macOS and Linux.
- Before any edit: `.env*` files (except `.env.example`), anything in `Business data/`, `pnpm-lock.yaml` and already-committed migrations are blocked (`protect-files.mjs`).
- After every file edit: Prettier + ESLint fix run on that file automatically (`format-file.mjs`).
- Before any `git commit`: `pre-commit-gate.mjs` refuses `--no-verify`. It runs no checks itself.
- Checks run once at each level: `ship-change` runs `pnpm verify`; Git's pre-commit (Husky + lint-staged + typecheck) checks the staged files; CI on GitHub runs everything, including all 7 devices and the SEO, a11y and security suites.
If a hook blocks you, fix the cause; don't work around it.

## Git

- Commit and push after every verified change (see AGENTS.md section 5). Pushing to `develop` costs no deploy credits.
- Use `gh` for PRs: `develop` → `main` when a phase from `docs/project-implementation.md`, or a batch of phases, is done. **Each merge costs Netlify credits, and running out takes both sites offline.** Before opening a PR, say what it will cost and check it against the budget in `docs/deployment.md` §3. At most 4 merges a month. The owner does the merging.
- Never force-push. Never commit `.env*`, build output or `node_modules`.
