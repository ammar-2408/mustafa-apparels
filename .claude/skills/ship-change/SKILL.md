---
name: ship-change
description: Finish one change the project way — confirm tests exist and pass, run full verification, update docs and the plan checklist, commit with a Conventional Commit message, push to develop, and report, with the rules for when a merge to main is allowed under the Netlify credit budget. Use at the end of every change, or when the user says ship, commit, push, merge, release or done.
allowed-tools: Bash(pnpm *) Bash(git status *) Bash(git diff *) Bash(git add *) Bash(git commit *) Bash(git push) Bash(git log *)
---

# Ship a change

Run these steps in order. Stop and report at the first failure — never skip a step.

## 1. Scope check
- `git status` and `git diff --stat`.
- The diff must be **one logical change**. If it contains unrelated edits, split them: stash or unstage the extra work and ship it as its own change afterwards.

## 2. Tests exist for this change
- New behaviour → new tests in the same diff (see `write-tests` skill).
- Bug fix → a test that failed before the fix.
- No `.only`, `.skip`, `test.fixme`, or commented-out tests in the diff: `git diff | grep -nE '\.(only|skip)\(|fixme'` must print nothing.

## 3. Verify (once)
**Docs-only change** (`docs/`, `.claude/`, `*.md` that no test reads): no `pnpm verify`, no E2E. Go to step 4.

Anything else: run `pnpm verify` **once** (lint + typecheck + unit/integration + build). Don't run lint, typecheck or tests again by hand; the commit hooks don't repeat them (step 5).

Then, for a UI or page change, run E2E **only for the pages the change touches**, on 2 projects (`mobile-small` and `laptop`):
```bash
pnpm exec playwright test <spec or --grep feature> --project=mobile-small --project=laptop
```
| Change touches | Also run locally |
|---|---|
| `catalog/` or the import script | `pnpm import:stock --dry-run` |
| Anything else | nothing more; CI covers it |

**CI runs the rest on every push:** all 7 device projects, SEO, a11y and security suites. Locally you run them in full only at the end of a phase (or when the change is about them, e.g. a new SEO rule). After the push, check `gh run list --limit 1` before starting a change that depends on this one; fix a red run before anything else.

All green. Read warnings and fix new ones rather than ignoring them.

**Keep public pages cached:** nothing in the diff may add per-request work (`searchParams`, `cookies()`, `headers()`, a nonce) to a public cached page without an ADR. Uncached pages cost Netlify compute credits. In the browser, `useSearchParams` needs a `<Suspense>` boundary around its client component.

## 4. Docs and plan
- Behaviour/schema/API/setup/env changed? Update the matching file in `docs/` (and `.env.example`).
- If this completes a step in `docs/project-implementation.md`, tick its box `[x]`.
- If the report will carry a note for a future step ("check during X", "step X should..."), write it into that step in `docs/project-implementation.md` now, so it's in this commit and survives `/clear`. The report alone isn't enough.

## 5. Commit
```bash
git add <the files in this change>
git commit -m "<type>(<scope>): <summary>" -m "<why, and what tests cover it>"
```
- Types: feat, fix, test, refactor, perf, style, docs, chore, ci, build
- Scopes: web, admin, db, core, auth, ui, validators, config, catalog, seo, motion, 3d, e2e, deps
- Summary ≤ 72 chars, present tense. Example: `feat(web): add inquiry form to product page`
- Husky runs lint-staged and typecheck on commit; the Claude hook only refuses `--no-verify`. If a hook blocks, fix the cause and retry (never `--no-verify`).
- Commit bodies: lines ≤ 100 characters (commitlint).
- Never commit `.env*`, or anything from `Business data/`, including frames and screenshots. Never use `git add -f`.

## 6. Push
```bash
git push            # current branch, normally develop
```
If the push is rejected because the remote moved: `git pull --rebase`, re-run `pnpm verify` (code changes only), push again. Never force-push. Never push directly to `main`.

## 7. Report to the user (short)
```
Change: <one line>
Tests:  <what ran> — <passed>/<total>   (or "docs only, nothing run")
Commit: <short hash> <message>
Next:   <next unchecked step>, and the model the playbook recommends
You:    <anything the owner must do, or "nothing">
```
No long summaries. Say more only when something failed, was skipped, or needs a decision.

## Merging to `main`: not part of a normal ship

Shipping ends at the push to `develop`, which costs no deploy credits. **Each merge to `main` costs Netlify credits, and reaching 300 credits a month takes both sites offline until the reset.** You can't buy more on the free plan.

Only when a phase or batch of phases is done, and the user wants a release (`docs/deployment.md` §3):

1. **Work out the cost and say it.** 15 credits per site whose files changed. A change in `packages/` rebuilds both sites, so 30. Changes only in `docs/`, `.claude/` or `e2e/` should skip the build.
2. **Check the budget.** At most 4 merges a month. At 75% of the month's credits, stop merging until the reset. You can't see the balance yourself, so ask the user for the figure from Netlify's usage page.
3. **Check it's ready.** CI is green, the review agents have no blockers, and the release checklist in `docs/testing-qa.md` §7 is done.
4. **Open the PR** from `develop` to `main` with `gh` and show the CI result. **The owner does the merging.** Never merge it yourself.

If the budget doesn't allow it, keep building on `develop`, and let the next merge carry several phases. Never deploy to production just to test something: use the `develop` preview. If production breaks, roll back in Netlify, which is free, rather than rushing a fix.
