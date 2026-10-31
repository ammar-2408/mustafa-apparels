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

## 2. Before Claude Code (manual, about 15 minutes)

1. Install **Git for Windows** (Claude Code uses its Git Bash), **Node.js LTS**, and **GitHub CLI** (`winget install GitHub.cli`). Then in a terminal: `corepack enable` (gives you pnpm) and `gh auth login`.
2. Extract the kit into the **root** of your `Mustafa Apparels` folder, so it looks like this:
   ```
   Mustafa Apparels/
   ├─ Business data/Stock/Dhanak | Khaddar | Lajwanti   ← raw photos/videos (git-ignored)
   ├─ mustafa-apparels-logos/                           ← logo files
   ├─ .claude/  .github/  docs/  scripts/
   └─ AGENTS.md  CLAUDE.md  README.md  .mcp.json  .env.example  .gitignore
   ```
3. Reopen the folder in VS Code and start a new Claude Code conversation.

You create the service accounts (Neon, Cloudinary, Resend, Upstash, Netlify) when Claude Code asks for them, and you paste the keys into `.env.local` yourself. Claude Code is blocked from reading that file.

---

## 3. Prompts before any code (scope, docs, skills)

### Prompt 1 — Setup: git, GitHub, skills, MCP
**Sonnet 5.5 · medium · Auto mode**
```
Set up this project for development. Read CLAUDE.md first, then do these in order and report after each:
1. Check tools: node -v, pnpm -v (if missing, run corepack enable), git --version, gh --version, gh auth status. Tell me what's missing and how to install it on Windows.
2. git init with branch "develop". Confirm with git check-ignore that "Business data/" is ignored, so my photos and videos never go to GitHub. Make the first commit: "docs: project kit".
3. Create a private GitHub repo "mustafa-apparels" with gh and push develop.
4. Run: bash scripts/install-skills.sh. List every skill now available (project and installed) and add new ones to the skills registry table in CLAUDE.md. Commit and push.
5. Prove the hooks work on this Windows machine: try to create .env.local (it must be blocked), then try to edit a file inside "Business data/" (it must be blocked). Don't create anything else.
6. Tell me to approve the MCP servers from .mcp.json and how to check them.
```

### Prompt 2 — Make the scope "Mustafa Apparels"
**Opus 5.5 · Extra high · Plan mode** (one-time, worth the extra usage)
```
We're building the website for my shop "Mustafa Apparels". The docs in this folder were written for a generic "<SHOP_NAME>" dress shop. Adapt them to my real business before any code is written.

1. Read CLAUDE.md, AGENTS.md and every file in docs/.
2. Look at my real material:
   - "Business data/Stock": the folders Dhanak, Khaddar and Lajwanti hold photos and videos of each variety. List every file, open a sample of the photos and tell me what you see (product type, colours, quality). Flag files that break the naming pattern, e.g. "KDR-1-VID.png" is an image, not a video.
   - "mustafa-apparels-logos": open the logo files (png/svg/favicon) and work out the brand colours and style.
3. Before editing anything, ask me what you need (use AskUserQuestion), for example: stitched or unstitched, 2-piece or 3-piece, do sizes apply, price range, city and address, phone, WhatsApp, email, opening hours, Urdu later or not, anything else that changes the scope.
4. Then plan the doc updates:
   - replace <SHOP_NAME> with "Mustafa Apparels" everywhere
   - starting categories: Dhanak, Khaddar, Lajwanti (the admin can add more)
   - products have photos AND videos: video upload, Cloudinary video, poster frames, size limits, a muted autoplay preview on the product page
   - product fields that fit my answers (fabric, pieces, colours; sizes only if they apply)
   - real brand colours and typography direction from the logo in docs/design.md
   - which logo/favicon files go into the apps
   - "Business data/" stays out of git and is used only by an import script
   - move the brand phase earlier because the logo is ready
   - add a step to import my stock into the catalogue as draft products for me to review and price
Show me the plan. After I approve, update the docs one file per commit ("docs: ...") and push. Don't write app code.
```

### Prompt 3 — Project skills for this shop
**Opus 5.5 · high · Auto mode**
```
The scope is final. Review our skills and fill the gaps. Use the skill-creator skill to add these project skills, short and specific to Mustafa Apparels:
- product-media: my photos and videos: naming, compressing, 3:4 crops, uploading to Cloudinary, video posters, alt text written by looking at each photo, never committing raw media, and importing a folder like "Business data/Stock/<Variety>" into draft products.
- brand-mustafa: logo usage rules, colour tokens, fonts, spacing, and the tone for product descriptions (simple English, warm, mentions fabric and season).
Then check every existing project skill (seo-guard, motion-gsap, three-scene, security-check, db-change, write-tests, ship-change, next-step, reference-to-code) against the updated docs and fix anything out of date. One commit per skill, then push.
```

### Prompt 4 — Final scope check
First type `/doctor prompt-audit` (it finds conflicting instructions across CLAUDE.md, AGENTS.md and skills). Then:

**Opus 5.5 · high · Plan mode**
```
Act as the project lead before we build. Check that prd.md, architecture.md, database.md, api.md, design.md, auth-security.md, testing-qa.md, project-implementation.md, CLAUDE.md, AGENTS.md and all skills agree with each other and with my answers. List conflicts, gaps and open questions, and ask me anything only I can decide. After I answer, fix the docs (one commit per file), push, and tell me the first build step and which model to use for it.
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
| Foundation (repo, tests, CI, deploy) | opusplan · medium | Netlify account (deploy step) |
| Data layer (database, search) | opusplan · medium; **Opus 5.5 · high** for the table/schema steps | Neon account → `DATABASE_URL` in `.env.local` |
| Auth & security | **Opus 5.5 · high** for every step | Resend + Upstash keys |
| Admin panel | opusplan · medium | Cloudinary keys |
| Import my stock | Sonnet 5.5 · medium | Admin panel and Cloudinary working |
| Storefront pages | opusplan · medium | — |
| SEO | opusplan · medium | — |
| Brand (logo, colours, fonts) | **Opus 5.5 · high** | — |
| Motion (GSAP) | **Opus 5.5 · high** | — |
| 3D hero and WebGL effects | **Opus 5.5 · xhigh** | Pick the 3D idea (see `docs/design.md` §6) |
| Hardening | Opus 5.5 · high for reviews, Sonnet 5.5 for fixes | — |
| Launch | Sonnet 5.5 · medium | Google Search Console access |

### End of each phase — review and release
**Opus 5.5 · high · Auto mode**
```
This phase is done. Run the code-reviewer, qa-tester and security-auditor agents (and seo-auditor if public pages changed) on everything since the last merge to main. Show me the findings, then fix the blockers one change at a time with tests, committing and pushing each. When everything is green, open a pull request from develop to main with gh and show me the CI result. I will merge it myself.
```

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

**Add new stock later** (Sonnet 5.5 · medium)
```
I added new photos/videos to "Business data/Stock/<Variety>". Use the product-media skill to import only the new files as draft products and show me a table of what was created.
```

---

## 6. Better product photos (biggest visual upgrade)

- Daylight near a window, plain light background, phone at 1x zoom (not wide-angle).
- The same set for every suit: full front, back, dupatta spread open, fabric close-up (shows the Khaddar or Dhanak texture), embroidery detail.
- Portrait 3:4. Videos 10–20 seconds, vertical, slow and steady.
- Consistent names, e.g. `dhanak-01-front.jpg`, `dhanak-01-fabric.jpg`, `dhanak-01.mp4`.
