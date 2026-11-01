# Claude Code Playbook — Mustafa Apparels

The exact prompts to give Claude Code, in order, with the model, effort and mode for each.
Written for the **Max plan ($100/month)** in the **VS Code extension** on Windows.

---

## 1. How to choose a model

Change it from the model chip at the bottom of the Claude Code panel (it shows something like "Opus 5.5 Extra high"), or type:
`/model opus` · `/model sonnet` · `/model haiku` · `/model opusplan` and `/effort low|medium|high|xhigh`.

| Pick | Use it for | Why |
|---|---|---|
| **Opus 5.5 · high** | Scope, architecture, auth/security, hard bugs, 3D, reviews | Best reasoning; uses your allowance fastest |
| **Opus 5.5 · xhigh** ("Extra high") | Only the one-time scope prompt and the 3D hero | Deepest thinking, highest usage |
| **opusplan · medium** | Normal build steps | Opus writes the plan in Plan mode, Sonnet 5.5 writes the code, so you get most of Opus's quality for much less usage |
| **Sonnet 5.5 · medium** | Setup chores, media import, small features, ordinary bugs | Fast and economical |
| **Haiku 5.5 · low** | Tiny edits: wording, typos, renames | Cheapest |
| Fable | Skip | It can bill usage credits on top of your plan |

**Plan mode:** click the mode chip next to the send button (it shows "Auto") and choose **Plan**. Claude reads and plans but can't change files until you approve. Use it for anything big.

**Stretching the $100 plan**
- Don't leave "Extra high" on all the time. Opus 5.5 at medium or high is enough for almost everything.
- Type `/clear` after each finished step. The docs and the plan file carry the memory, not the chat.
- Type `/status` to see how much of your 5-hour and weekly allowance is left. The limits are shared with your Claude chats on the web and desktop.
- If Claude Code offers usage credits when you hit a limit, decline to stay within $100, and continue after the reset.

---

## 2. Before Claude Code (done)

Git, Node, pnpm and GitHub CLI are installed, the kit is in the `Mustafa Apparels` folder, and the repo is at `ammar-06/mustafa-apparels`.

You create the service accounts (Neon, Cloudinary, Resend, Upstash, Netlify, Google Analytics) when Claude Code asks for them, and you paste the keys into `.env.local` yourself. Claude Code is blocked from reading that file.

---

## 3. Prompts before any code (scope, docs, skills)

**All four prompts are done:** Prompt 1 (setup), Prompt 2 (scope and doc rewrite), Prompt 3 (project skills) and Prompt 4 (final scope check). The next step is §4. Prompts 3 and 4 stay here for reference.

### Prompt 3 — Project skills for this shop (done)
**Opus 5.5 · high · Auto mode**
```
The scope is final. Review our skills and fill the gaps. Use the skill-creator skill to add these project skills, short and specific to Mustafa Apparels:
- product-media: the catalog flow from docs/catalog.md: collection file + photos in "Business data/" → per-suit files in catalog/ → import to drafts → I set prices in admin. Include the checks in §5 (open every photo, sample every video including its last seconds, leave out anything showing another brand), the suit file format, the filter taxonomy, alt text written by looking at each photo, marking anything unsure with "check:", never committing raw media, and how to add a new collection. Use docs/catalog.md, docs/design.md §5.2 and docs/integrations.md.
- brand-mustafa: logo usage rules, colour tokens, Montserrat, spacing, and the tone for product descriptions (simple English, warm, mentions fabric and season, never another brand's name, never poster text). Use docs/design.md §1.
Then check every existing project skill (seo-guard, motion-gsap, three-scene, security-check, db-change, write-tests, ship-change, next-step, reference-to-code) against the updated docs and fix anything out of date. Pay special attention to: three-scene has no downloaded model now; ship-change's merge rule must respect Netlify credits; security-check needs the two-tier CSP and media limits. One commit per skill, then push.
```

### Prompt 4 — Final scope check (done)
First type `/doctor prompt-audit` (it finds conflicting instructions across CLAUDE.md, AGENTS.md and skills). Then:

**Opus 5.5 · high · Plan mode**
```
Act as the project lead before we build. Check that prd.md, architecture.md, database.md, api.md, design.md, auth-security.md, testing-qa.md, deployment.md, seo-geo.md, analytics.md, launch-checklist.md, project-implementation.md, CLAUDE.md, AGENTS.md and all skills agree with each other and with my answers. List conflicts, gaps and open questions, and ask me anything only I can decide. After I answer, fix the docs (one commit per file), push, and tell me the first build step and which model to use for it.
```

---

## 4. Building — the same loop for every step

**opusplan · medium · Plan mode**
1. Switch to **Plan** mode and type:
   ```
   /next-step
   ```
2. Read the plan Opus proposes and approve it. Sonnet then writes the tests and code, runs everything, commits and pushes.
3. Read the report, then type `/clear`.
4. Repeat.

Small, easy steps (config, copy, simple pages): `/next-step 3` does three steps in a row, each tested and pushed separately.

### Model per phase

| Phase | Model · effort | Have this ready first |
|---|---|---|
| 0 Foundation (repo, tests, CI, deploy) | opusplan · medium | Netlify account (step 0.11) |
| 1 Brand (logo, colours, Montserrat) | **Opus 5.5 · high** | — |
| 2 Data layer (database, search) | opusplan · medium; **Opus 5.5 · high** for the table/schema steps | Neon account → `DATABASE_URL` in `.env.local` |
| 3 Auth & security | **Opus 5.5 · high** for every step | Resend + Upstash keys; Spaceship login for email DNS |
| 4 Admin panel | opusplan · medium | Cloudinary keys |
| 5 Import my stock | Sonnet 5.5 · medium | Admin and Cloudinary working; your answers to the `check:` items in `catalog/` |
| 6 Storefront pages | opusplan · medium | — |
| 7 SEO, GEO, analytics | opusplan · medium | — |
| 8 Motion (GSAP) | **Opus 5.5 · high** | — |
| 8 3D hero and WebGL effects | **Opus 5.5 · xhigh** | Default is the fabric shader (`docs/design.md` §6); say if you want otherwise |
| 9 Hardening | Opus 5.5 · high for reviews, Sonnet 5.5 for fixes | — |
| 10 Launch | Sonnet 5.5 · medium | Spaceship, Search Console, Bing and Google Analytics access; your sign-offs (`docs/launch-checklist.md` §8) |

### End of each phase — review and release
**Opus 5.5 · high · Auto mode**
```
This phase is done. Run the code-reviewer, qa-tester and security-auditor agents (and seo-auditor if public pages changed) on everything since the last merge to main. Show me the findings, then fix the blockers one change at a time with tests, committing and pushing each. Then tell me how many Netlify credits a merge would cost and whether this month's budget allows it (docs/deployment.md §3). If it does and everything is green, open a pull request from develop to main with gh and show me the CI result. I will merge it myself.
```
If the budget doesn't allow a merge, keep building on `develop`. Its previews are free, and the next merge can carry several phases.

---

## 5. Prompts for anytime

**Copy an idea from a website** (Opus 5.5 · high)
```
/reference-to-code https://outfit.hellohello.is — I like the <product hover / page transition / hero>. Rebuild the idea as an original Mustafa Apparels component. Don't copy their code or images.
```
You can attach a screenshot or screen recording instead of a URL.

**Something is broken** (Sonnet 5.5 · medium; switch to Opus 5.5 · high if it isn't fixed after two tries)
```
Bug: <what happens>. Expected: <what should happen>. Steps: <1, 2, 3>. Device: <phone/laptop, browser>. Follow docs/debugging.md: reproduce it with a failing test first, find the root cause, fix, verify, commit and push.
```

**New feature idea** (Opus 5.5 · high · Plan mode)
```
I want: <feature>. Update docs/prd.md with the requirement and acceptance criteria, and break it into small steps in docs/project-implementation.md. Don't write code yet.
```

**Tiny change** (Haiku 5.5 · low)
```
Change the text "<old>" to "<new>" on <page>. Run the tests that cover it, commit and push.
```
Text in admin (prices, products, contact details) needs no code and no deploy.

**Add new stock later** (Opus 5.5 · high for looking at the photos, because the details come from them)
```
I added new photos and videos to "Business data/Stock/<Collection>", with a collection .md file if the folder is new. Follow docs/catalog.md §7 and the product-media skill: open every photo, sample every video including the end, group photos into suits and ask me when unsure, and create catalog/<collection>/<design-id>.md for each new suit with price empty and anything unsure marked "check:". Commit, run the import as drafts, and show me a table per collection: suits found, photos per suit, and anything I must fix or confirm. List anything showing another brand and leave it out.
```

**Check hosting usage** (Haiku 5.5 · low)
```
I'm looking at Netlify's Account usage insights: <paste the numbers>. Using docs/deployment.md §3, tell me whether we're on budget, and what to do if we're not.
```

---

## 6. Better product photos (biggest visual upgrade)

New photos that show your own shop's style, with several angles per suit, are the biggest visual upgrade available. They also replace the small Lajwanti photos and let a suit have more than one photo.

- Daylight near a window, plain light background, phone at 1x zoom (not wide-angle).
- The same set for every suit: full front, back, dupatta spread open, fabric close-up (shows the Khaddar or Dhanak texture), embroidery detail.
- Portrait 3:4. Videos 10–20 seconds, vertical, slow and steady.
- Consistent names, e.g. `dhanak-01-front.jpg`, `dhanak-01-fabric.jpg`, `dhanak-01.mp4`.
