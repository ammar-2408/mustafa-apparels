---
name: ship-change
description: Finish one change the project way — confirm tests exist and pass, run full verification, update docs and the plan checklist, commit with a Conventional Commit message, push, and report. Use at the end of every change, or when the user says ship, commit, push or done.
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

All green. Read warnings — fix new ones rather than ignoring them.

## 4. Docs and plan
- Behaviour/schema/API/setup/env changed? Update the matching file in `docs/` (and `.env.example`).
- If this completes a step in `docs/project-implementation.md`, tick its box `[x]`.

## 5. Commit
```bash
git add -A
git commit -m "<type>(<scope>): <summary>" -m "<why, and what tests cover it>"
```
- Types: feat, fix, test, refactor, perf, style, docs, chore, ci, build
- Scopes: web, admin, db, core, auth, ui, seo, motion, 3d, e2e, deps
- Summary ≤ 72 chars, present tense. Example: `feat(web): add inquiry form to product page`
- The pre-commit hook re-runs lint/typecheck/tests; if it blocks, fix and retry (never `--no-verify`).

## 6. Push
```bash
git push            # current branch, normally develop
```
If the push is rejected because the remote moved: `git pull --rebase`, re-run `pnpm verify`, push again. Never force-push.

## 7. Report to the user
```
Change: <one line>
Tests:  <suites run> — <passed>/<total>, coverage <x>% (if measured)
Commit: <short hash> <message>
Pushed: <branch> → preview deploy will update
Next:   <next unchecked step in docs/project-implementation.md>
```
