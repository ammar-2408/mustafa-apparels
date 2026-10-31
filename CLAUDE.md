# CLAUDE.md

@AGENTS.md

Everything in AGENTS.md applies. This file adds Claude Code–specific behaviour.

## Session start (every new session)

1. Read `docs/project-implementation.md` and find the first unchecked step. That is the next change unless the user asks for something else.
2. Run `git status` and `git log --oneline -5` so you know where work stopped.
3. Check skills (section below). Install any missing skill from the registry before starting the task it covers.
4. The user's prompt order and model choices are in `docs/claude-code-playbook.md`. When you finish a step, name the model it recommends for the next one.

`Business data/` holds the owner's original stock photos and videos. Read them (you can view images) but never modify, move or commit them; imports go through the `product-media` workflow.

## How to work

- **Plan before big changes.** For anything touching more than ~3 files, a schema, auth, or a new page: use plan mode, show the plan, wait for approval.
- **One change → test → verify → commit → push.** Use the `ship-change` skill to finish every change. Do not start the next change until the current one is pushed.
- **Small context.** Don't @-import all docs. Read only the doc the task needs (AGENTS.md section 9). After a feature is done, suggest `/clear`.
- **Report** after each change in this format:
  `Change:` … `Tests:` (what ran, pass counts) … `Commit:` hash + message … `Next:` the next step.
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

### External skills registry (install automatically when needed)

If a task needs one of these and it is not in `.claude/skills/`, install it yourself with the command shown, then tell the user what you installed. To install all at once: `bash scripts/install-skills.sh`.

| Skill(s) | Source (trusted) | Install |
|---|---|---|
| GSAP core, timeline, ScrollTrigger, plugins, React | greensock (official) | `npx -y skills add greensock/gsap-skills --agent claude-code` |
| React/Next.js best practices, web design guidelines, view transitions, composition patterns | vercel-labs (official) | `npx -y skills add vercel-labs/agent-skills --agent claude-code` |
| Better Auth best practices, email & password | better-auth (official) | `npx -y skills add better-auth/skills --agent claude-code` |
| frontend-design, webapp-testing, skill-creator | anthropics (official) | `npx -y skills add anthropics/skills --skill frontend-design --agent claude-code` (repeat with `webapp-testing`, `skill-creator`) |

**Rules for skills not in this registry:**
- You may search https://skills.sh or the official plugin directory (`/plugin` → Discover) for a skill that fits.
- Prefer official sources (anthropics, vercel-labs, greensock, better-auth, microsoft, the tool's own org).
- For any **third-party** skill: show the user the repo, what it does, and ask before installing (skills can contain scripts).
- After installing, add it to this registry table in the same commit.
- If no good skill exists and the task will repeat, create a project skill with `skill-creator`.

## Subagents (`.claude/agents/`)

Use them proactively; they keep the main context clean.

| Agent | When |
|---|---|
| `code-reviewer` | After finishing a feature (before merging to `main`) |
| `qa-tester` | To design test cases for a feature and find gaps in coverage |
| `security-auditor` | After any auth, admin, upload, API or env change |
| `seo-auditor` | After adding/changing any public page, and before every release |

## MCP servers (`.mcp.json`, details in `docs/mcp-connection.md`)

- `playwright` — open pages, take screenshots at each breakpoint, test flows.
- `chrome-devtools` — performance traces, console errors, network, Core Web Vitals.
- `context7` — up-to-date docs for Next.js, GSAP, Drizzle, Better Auth, R3F. **Use it before writing code against a library API you are not sure is current.**
- `neon` — inspect the database and create test branches (never touch the production branch without approval).

## Hooks (`.claude/settings.json`)

Hooks are Node scripts (`.claude/hooks/*.mjs`), so they work the same on Windows, macOS and Linux.
- Before any edit: `.env*` files (except `.env.example`), anything in `Business data/`, `pnpm-lock.yaml` and already-committed migrations are blocked (`protect-files.mjs`).
- After every file edit: Prettier + ESLint fix run on that file automatically (`format-file.mjs`).
- Before any `git commit`: lint, typecheck and unit tests run; the commit is blocked if any fail (`pre-commit-gate.mjs`).
- Git's own pre-commit (Husky + lint-staged) and CI on GitHub run the same checks again, so nothing slips through.
If a hook blocks you, fix the cause; don't work around it.

## Git

- Commit and push after every verified change (see AGENTS.md section 5).
- Use `gh` for PRs: `develop` → `main` when a phase from `docs/project-implementation.md` is done.
- Never force-push. Never commit `.env*`, build output or `node_modules`.
