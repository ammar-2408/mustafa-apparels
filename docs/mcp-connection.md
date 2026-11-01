# MCP Connections (Claude Code)

MCP servers give Claude Code extra abilities: a real browser, live library docs, database access. Project servers are defined in `.mcp.json` at the repo root (committed), so they load for anyone who opens the repo in Claude Code. Claude Code asks you to approve project servers the first time; check status anytime with `/mcp`.

## Servers in this project

| Server | Type | Why we use it | Safety notes |
|---|---|---|---|
| `playwright` | local (npx) | Open pages in a real browser, click through flows, take screenshots at each breakpoint, study reference sites for the `reference-to-code` skill | Read-only browsing of public sites is fine; never log in to personal accounts through it. Screenshots must never be saved inside `Business data/` |
| `chrome-devtools` | local (npx) | Performance traces, Core Web Vitals, console and CSP errors, network waterfall — used when debugging motion/3D/video performance | Uses a separate Chrome profile |
| `context7` | remote (http) | Current docs and examples for Next.js, GSAP, Drizzle, Better Auth, R3F, Tailwind — prevents outdated API usage | Public docs only |
| `neon` | remote (http, OAuth) | Inspect schema, run read queries, create/delete test branches | Needs authorizing with `/mcp` before use. Approve per action; **never** run writes on the production branch; prefer the `dev` branch |

Optional (add when needed):
| Server | Why |
|---|---|
| GitHub MCP | Manage issues/PRs from Claude Code (the `gh` CLI already covers most of this) |
| Netlify MCP | Read deploy logs, env status and usage from the host. Never let it trigger a production deploy: each costs credits |
| Cloudinary MCP | Inspect uploaded assets and check no full posters were uploaded |

## `.mcp.json`

```json
{
  "mcpServers": {
    "playwright": { "type": "stdio", "command": "npx", "args": ["-y", "@playwright/mcp@latest"] },
    "chrome-devtools": { "type": "stdio", "command": "npx", "args": ["-y", "chrome-devtools-mcp@latest"] },
    "context7": { "type": "http", "url": "https://mcp.context7.com/mcp" },
    "neon": { "type": "http", "url": "https://mcp.neon.tech/mcp" }
  }
}
```

## Adding a server from the command line

```bash
# remote (http) server, saved to .mcp.json for the whole project
claude mcp add --transport http context7 --scope project https://mcp.context7.com/mcp

# local (stdio) server
claude mcp add --transport stdio --scope project playwright -- npx -y @playwright/mcp@latest

claude mcp list            # see what's configured
```
Inside Claude Code: `/mcp` shows status and lets you authenticate OAuth servers (Neon).

## Secrets

Never hard-code API keys in `.mcp.json`. Reference env vars instead: `"headers": { "Authorization": "Bearer ${SOME_TOKEN}" }` and keep the token in your shell profile, not in the repo.

## Verify before relying on it

Package names and URLs of MCP servers change. If a server fails to start, check its official repo/docs and update `.mcp.json` (and this table) in one commit.

## How Claude Code should use them

- Before writing code against a library API: query `context7`.
- After building UI: `playwright` screenshots at 360, 768, 1280, 1920 and 2560 widths; compare against design intent.
- Motion, 3D or video slow or janky: `chrome-devtools` performance trace; fix the top issue; re-measure.
- Launch checks: `chrome-devtools` Lighthouse on key pages (`docs/launch-checklist.md` §1).
- Database questions: `neon` read queries on `dev`; schema changes still go through migrations (`db-change` skill), never ad-hoc.
