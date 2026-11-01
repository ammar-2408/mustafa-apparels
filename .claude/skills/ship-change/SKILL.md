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

## 3. Verify
```bash
pnpm verify                # lint + typecheck + unit/integration + build
```
Then run the E2E projects the change touches:
| Change touches | Run |
|---|---|
| Any page/UI | `pnpm test:e2e -- --grep <feature>` (all device projects) |
| Public page, metadata, sitemap, robots, llms.txt | `pnpm test:seo` |
| UI components/pages | `pnpm test:a11y` |
| Auth, admin, API, headers | `pnpm exec playwright test e2e/security` |
| `catalog/` or the import script | `pnpm import:stock --dry-run` |

All green. Read warnings — fix new ones rather than ignoring them.

**Docs or skills only:** there's nothing for these to test. Before step 0.7 adds `pnpm verify`, run only what exists and say in the report what you couldn't run.

**Keep public pages cached:** nothing in the diff may add per-request work (`searchParams`, `cookies()`, `headers()`, a nonce) to a public cached page without an ADR. Uncached pages cost Netlify compute credits.

## 4. Docs and plan
- Behaviour/schema/API/setup/env changed? Update the matching file in `docs/` (and `.env.example`).
- If this completes a step in `docs/project-implementation.md`, tick its box `[x]`.

## 5. Commit
```bash
git add <the files in this change>
git commit -m "<type>(<scope>): <summary>" -m "<why, and what tests cover it>"
```
- Types: feat, fix, test, refactor, perf, style, docs, chore, ci, build
- Scopes: web, admin, db, core, auth, ui, seo, motion, 3d, e2e, deps
- Summary ≤ 72 chars, present tense. Example: `feat(web): add inquiry form to product page`
- The pre-commit hook re-runs lint/typecheck/tests; if it blocks, fix and retry (never `--no-verify`).
- Never commit `.env*`, or anything from `Business data/`, including frames and screenshots. Never use `git add -f`.

## 6. Push
```bash
git push            # current branch, normally develop
```
If the push is rejected because the remote moved: `git pull --rebase`, re-run `pnpm verify`, push again. Never force-push. Never push directly to `main`.

## 7. Report to the user
```
Change: <one line>
Tests:  <suites run> — <passed>/<total>, coverage <x>% (if measured)
Commit: <short hash> <message>
Pushed: <branch> → preview updates (skipped if no app or package files changed)
Next:   <next unchecked step in docs/project-implementation.md>, and the model the playbook recommends for it
```

## Merging to `main`: not part of a normal ship

Shipping ends at the push to `develop`, which costs no deploy credits. **Each merge to `main` costs Netlify credits, and reaching 300 credits a month takes both sites offline until the reset.** You can't buy more on the free plan.

Only when a phase or batch of phases is done, and the user wants a release (`docs/deployment.md` §3):

1. **Work out the cost and say it.** 15 credits per site whose files changed. A change in `packages/` rebuilds both sites, so 30. Changes only in `docs/`, `.claude/` or `e2e/` should skip the build.
2. **Check the budget.** At most 4 merges a month. At 75% of the month's credits, stop merging until the reset. You can't see the balance yourself, so ask the user for the figure from Netlify's usage page.
3. **Check it's ready.** CI is green, the review agents have no blockers, and the release checklist in `docs/testing-qa.md` §7 is done.
4. **Open the PR** from `develop` to `main` with `gh` and show the CI result. **The owner does the merging.** Never merge it yourself.

If the budget doesn't allow it, keep building on `develop`, and let the next merge carry several phases. Never deploy to production just to test something: use the `develop` preview. If production breaks, roll back in Netlify, which is free, rather than rushing a fix.
