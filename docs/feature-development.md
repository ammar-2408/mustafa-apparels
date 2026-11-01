# Feature Development

How every feature gets built: **one small change at a time, each tested, committed and pushed.**

## 1. The loop (per change)

```
 ┌─► 1. Pick the next step (project-implementation.md)
 │   2. Read the doc(s) for that area (AGENTS.md §9)
 │   3. Write the failing test(s)
 │   4. Implement the minimum code
 │   5. pnpm verify  (+ the E2E suite it touches)
 │   6. Update docs if behaviour/schema/API changed
 │   7. git commit (Conventional Commit)  →  git push
 └── 8. Tick the step in project-implementation.md (same commit)
```

A change is "small" when: it has one purpose, its diff is reviewable in a few minutes (aim < 300 lines excluding tests/snapshots), and it can be reverted alone without breaking anything else.

## 2. Breaking a feature into changes — example

**Feature W5: Inquire about a suit**

| # | Change | Tests | Commit |
|---|---|---|---|
| 1 | `inquiry` table + migration | integration: insert, FK, defaults | `feat(db): add inquiry table` |
| 2 | Zod `inquiryInput` schema | unit: every field valid/invalid, honeypot | `feat(validators): add inquiry schema` |
| 3 | `core.inquiries.create()` | integration: saves, links user, anonymous ok | `feat(core): create inquiry` |
| 4 | Rate limiter util | unit: allows 5, blocks 6th, window reset | `feat(core): add rate limiter` |
| 5 | `submitInquiry` server action | unit/integration: auth optional, 429, validation errors shape | `feat(web): add submitInquiry action` |
| 6 | Resend notification (non-blocking) | unit with MSW: sends, failure doesn't fail action | `feat(core): email shop on new inquiry` |
| 7 | `ContactButtons` component (wa.me/tel/mailto, WhatsApp first) | component: links encoded correctly, design code included | `feat(web): add contact buttons` |
| 8 | `InquiryForm` component | component: errors, success, disabled while sending | `feat(web): add inquiry form` |
| 9 | Wire into product page | E2E: submit on mobile + desktop; a11y | `feat(web): inquiry section on product page` |
| 10 | Admin inquiries list | E2E admin: sees new inquiry, changes status | `feat(admin): inquiries inbox` |

## 3. Prompt templates for Claude Code

**Start a step**
> Next step from `docs/project-implementation.md`. Read the relevant docs, propose the change in 1–3 lines and the tests you'll write, then do it: tests first, implement, `pnpm verify`, commit and push. Report using the CLAUDE.md format.

**New feature not in the plan**
> I want: <describe feature>. Use plan mode. Update `docs/prd.md` with the requirement and acceptance criteria, break it into small changes in `docs/project-implementation.md`, then wait for my approval before coding.

**Copy an idea from a reference site**
> Use the `reference-to-code` skill on <URL or attached screenshot>. I like <the hero / product hover / page transition>. Rebuild it as an original component in our design system. Don't copy their code or assets.

**Fix a bug**
> Bug: <what happens> / expected: <what should happen> / where: <page, device>. Follow `docs/debugging.md`: reproduce with a failing test first, then fix, verify, commit, push.

**Review before release**
> Run the `code-reviewer`, `security-auditor` and `seo-auditor` agents on everything since the last merge to main, then fix blockers one change at a time.

## 4. Git conventions

- Branches: `develop` (daily work, free preview deploys) → `main` (production). Optional `feat/<name>` branches for experiments; merge back with a PR.
- **Each merge to `main` costs 15 Netlify credits per site that changed, and at most 4 merges a month fit the budget.** So merging is a deliberate release, not a routine step. Finished phases can wait on `develop` and go out together. See `docs/deployment.md` §3.
- Commits: [Conventional Commits](https://www.conventionalcommits.org) — `type(scope): summary` in present tense, ≤ 72 chars.
  - types: `feat`, `fix`, `test`, `refactor`, `perf`, `style`, `docs`, `chore`, `ci`, `build`
  - scopes: `web`, `admin`, `db`, `core`, `auth`, `ui`, `seo`, `motion`, `3d`, `e2e`, `deps`
- One logical change per commit. Tests go in the same commit as the code they test.
- Push after every commit. PR `develop` → `main` when a phase or batch of phases is done and the credit budget allows; CI must be green; squash not required (history is already small commits).

## 5. Definition of Done

See `AGENTS.md` §6. A feature is done when all its changes are pushed, its E2E journey passes on all device projects, docs are updated, and the step is ticked in `project-implementation.md`.

## 6. Adding a new admin field later

1. Decide: does it need filtering/searching? → real column (migration via `db-change` skill). Display-only? → `product.attributes` JSON (no migration).
2. Add to Zod schema + field config (`apps/admin/lib/product-fields.ts`). If it's customer-facing text, apply the banned-names check.
3. Show on product page (and JSON-LD if relevant).
4. Tests: schema, admin form E2E, product page display.

Admin data changes need no deploy; only code changes do. Prefer an admin setting over hard-coded text for anything the owner might change.
