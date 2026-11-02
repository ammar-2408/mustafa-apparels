---
name: next-step
description: Build the next unchecked step from docs/project-implementation.md the project way — check prerequisites, read the right docs and skills, plan, write tests first, implement, verify, commit, push and report. Run it as /next-step, optionally with a step id like 1.3 or a count like 3.
argument-hint: "[step id like 1.3, or a count from 1 to 5]"
disable-model-invocation: true
---

# Next step

`$ARGUMENTS`:
- empty → the first unchecked step in `docs/project-implementation.md`
- a step id (e.g. `1.3`) → that step
- a number N from 1 to 5 → the next N steps, one after another, each fully shipped before the next starts

## For each step

1. **Find it.** Print the step id and title. If an earlier step is unchecked, say so and ask before skipping ahead.
2. **Prerequisites.** If the step needs an account, API key or env var (Neon, Cloudinary, Resend, Upstash, Netlify, Google Analytics), check `docs/setup.md` §6 and, from step 0.10 on, `.env.example` and the env check script. You can't read `.env.local`: if a value is needed, stop and tell the user exactly which account to create and which variable to paste into `.env.local`, then wait. A `TODO-OWNER` step (`docs/launch-checklist.md` §8) is the owner's: say what you need from them and wait.
3. **Read and load.** Read only the docs listed for this area in `AGENTS.md` §9. Load every project skill whose description matches the step (e.g. `seo-guard`, `motion-gsap`, `three-scene`, `security-check`, `db-change`, `write-tests`, `brand-mustafa` for UI and customer-facing text, `product-media` for stock) and the matching installed skills (`gsap-*`, `vercel-*`, `better-auth-*`, `frontend-design`). Use the `context7` MCP for any library API you are not sure is current.
4. **Plan** in 3–6 lines: the change, the files, and the tests you'll write. In plan mode, present this plan and wait for approval.
5. **Tests first.** Write the tests the change needs, covering real behaviour and the important edge cases, not every imaginable case (see `write-tests`). Run only those and confirm they fail for the right reason. A docs-only step has no tests.
6. **Implement** the smallest code that makes them pass. UI work: look at it at 360 and 1366 px with the `playwright` MCP; the other widths are covered by CI and the end-of-phase run.
7. **Ship** with the `ship-change` skill: `pnpm verify` once (none for docs-only), E2E only for touched pages on `mobile-small` and `laptop`, update docs, tick the step `[x]`, commit, push, short report.
8. **Stop** at any failure you can't fix inside this step. Report what failed and what you tried. Never skip, weaken or delete a test to get green.
9. **Tool quirks:** don't spend more than about 10 minutes on one. Note it in `docs/debugging.md` and move on, unless it blocks the step.

## After the last step

- Name the next unchecked step and the model recommended for it in `docs/claude-code-playbook.md` (the user switches models; you can't).
- If this finished a phase, say so. At the end of **any** phase, run the full local suites once (all 7 E2E projects, `pnpm test:seo`, `pnpm test:a11y`, `e2e/security`). Review agents run only at the end of Phase 3 (`code-reviewer`, `qa-tester`, `security-auditor`), Phase 6 (the same three) and before launch; `seo-auditor` also at the end of Phase 7. Otherwise skip them. The playbook's end-of-phase prompt applies at those points. **Don't merge or open a PR to `main` from this skill:** each merge costs Netlify credits (`ship-change`, "Merging to `main`").
- If the conversation is long, suggest the user types `/clear` before the next `/next-step`.
