# Deployment

How Mustafa Apparels goes live: Netlify hosting, Spaceship DNS and email DNS. **Read §3 before merging anything to `main`.**

| | |
|---|---|
| Storefront | https://mustafaapparels.com |
| Admin | https://admin.mustafaapparels.com |
| Host | Netlify free plan, two sites from one repo |
| DNS | Spaceship |
| Production branch | `main` |
| Preview branch | `develop` |

Netlify's pricing and limits change. Figures here were checked on 2026-11-01 against [how credits work](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/). Check them again before relying on them.

## 1. How deploys work

| Event | What happens | Credits |
|---|---|---|
| Push to `develop` | CI runs; both sites make a branch deploy at `develop--<site>.netlify.app`, unless the skip rule applies | 0 for the deploy; traffic and compute still count |
| Merge `develop` → `main` | Production deploy of each site whose files changed | **15 per site** |
| Admin edits a product, price or setting | Storefront cache refreshes by tag. **No deploy** | 0 for a deploy |
| Failed deploy, or rollback to an earlier deploy | | 0 |

## 2. Create the two sites

Do this at step 0.11. Netlify → **Add new project** → import `ammar-2408/mustafa-apparels`, twice.

**Repo moved (2026-11-15):** the first GitHub account (`ammar-06`) was suspended, so the code now lives at `ammar-2408/mustafa-apparels` (public), with the same history. Both Netlify sites were relinked the same day through the Netlify API (`PATCH /api/v1/sites/<id>` with a `repo` object: `repo_path`, `repo_branch: main`, `installation_id` of the Netlify GitHub app on `ammar-2408` (182196850), package path, command and publish directory as in the table below, `allowed_branches: [main, develop]`), then `build_settings.skip_prs: true` set again, since the relink cleared it. The API route starts no production build. CI uses no GitHub secrets.

**Previews need a database (2026-11-15).** From Phase 6 the storefront reads the database while it builds (it prerenders shop, collection and suit pages), so a `develop` deploy with no database fails with `DATABASE_URL is missing`. Branch deploys on both sites now use the Neon `preview` branch (br-billowing-dew-bdxkdw28, copied from `dev`, so it has the 30 imported suits at the placeholder price) for `DATABASE_URL` and `DATABASE_URL_UNPOOLED`, with preview-only `BETTER_AUTH_SECRET` and `REVALIDATE_SECRET` (the same pair on both sites, different from production), still in mock mode with `APP_ENV=preview`. Production values are unchanged. Neon, Resend, Upstash, Cloudinary and Spaceship are unchanged.

| Setting | Web site | Admin site | Where |
|---|---|---|---|
| Site name | `mustafa-apparels` | `mustafa-apparels-admin` | UI |
| Base directory | empty (repo root) | empty (repo root) | UI |
| **Package directory** | `apps/web` | `apps/admin` | **UI only**; can't be set in a file |
| Production branch | `main` | `main` | UI |
| Branch deploys | `develop` only | `develop` only | UI |
| Deploy previews for PRs | Off | Off | UI. CI already tests PRs |

Both sites were created on 2026-11-02 with these names and settings. To read deploys or variables from the CLI without linking the repo: `netlify api listSiteDeploys --data '{"site_id":"<id>"}'`, and `NETLIFY_SITE_ID=<id> netlify env:list --filter <web|admin> --context branch-deploy --json`. The `--filter` is needed because the CLI otherwise stops to ask which app in the monorepo you mean.

If a name is taken, pick another and update §1, `docs/architecture.md` §7 and the `netlify.toml` redirect in §6.

`apps/web/netlify.toml`:
```toml
[build]
  command = "pnpm db:migrate && pnpm turbo build --filter=web"
  publish = "apps/web/.next"
  ignore  = "[ \"$CACHED_COMMIT_REF\" != \"$COMMIT_REF\" ] && git diff --quiet $CACHED_COMMIT_REF $COMMIT_REF -- :/apps/web :/packages :/package.json :/pnpm-lock.yaml :/pnpm-workspace.yaml :/turbo.json :/.nvmrc"
```

Only the web command migrates the database (step 2.1), so each deploy migrates once.

`apps/admin/netlify.toml`:
```toml
[build]
  command = "pnpm turbo build --filter=admin"
  publish = "apps/admin/.next"
  ignore  = "[ \"$CACHED_COMMIT_REF\" != \"$COMMIT_REF\" ] && git diff --quiet $CACHED_COMMIT_REF $COMMIT_REF -- :/apps/admin :/packages :/package.json :/pnpm-lock.yaml :/pnpm-workspace.yaml :/turbo.json :/.nvmrc"
```

**The skip rule:** `ignore` exits 0 ("nothing changed", skip) or 1 (build). Changes to `docs/`, `.claude/`, `e2e/` or the other app skip that site. A change in `packages/` rebuilds both, costing 30 credits at production. So keep shared-package changes together, and don't touch them casually.

**Why the rule has two extra parts:** on 2026-11-02 the plain `git diff` form cancelled the first `develop` builds, even for a commit that changed both apps. Netlify doesn't document `$CACHED_COMMIT_REF` on a branch's first build, and the likely cause is that it equals `$COMMIT_REF`. So equal refs now always build, and `:/` anchors each path to the repo root wherever the command runs. This means a manual redeploy of the same commit builds rather than cancels, and on production that costs credits.

**Team login stays on (owner's decision, 2026-11-02):** both sites have Netlify's team login protection on all contexts (`sso_login_context: all`), so anyone not logged in to the team gets a 401 from Netlify, and so does `curl`. It keeps previews private, so check previews in a browser logged in to the team. It must be off for production before launch (`docs/launch-checklist.md`).

**Previews checked, 2026-11-02:** logged in to the team, both `develop` URLs returned 200 with `X-Robots-Tag: noindex, nofollow` and no `X-Powered-By`.

**Credit check, 2026-11-02:** 0 of 300 credits used after skipped `develop` builds on both sites, successful `develop` builds on both, and a failed production build on each. This was read from Netlify's usage page on the same day, so a late-posting charge can't be ruled out. Look again at the next weekly check (§3).

**First production builds, 2026-11-02:** the web log shows it failed at `Invalid environment for web` from `check-env.mjs`, because it ran before the variables were set. The admin's log wasn't read; it failed the same way as far as the API shows (exit code 2).

**Migrations** run once per deploy, from the web site only, through `pnpm db:migrate` with `DATABASE_URL_UNPOOLED`. A preview build migrates the Neon `preview` branch, and production migrates the `production` branch. Until the `preview` branch exists and its two URLs are set on branch deploys, a preview in `INTEGRATIONS_MODE=mock` skips migrating with a note in the log; production, or any build in live mode, fails without the URL. **Owner, when convenient:** create the Neon `preview` branch (child of `production`) and set its `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) on the web site's Branch deploys context, and the pooled one on the admin's. A `packages/db` change rebuilds both sites, and they may build at once, so migrations must be backward compatible (`db-change` skill).

**Environment variables:** set them per site and per deploy context (Production, Branch deploys). Full table: `docs/setup.md` §6. Before launch, production uses `SITE_INDEXABLE=false`, its `.netlify.app` URL for `NEXT_PUBLIC_SITE_URL` (auth runs there too, so there is no separate auth URL).

Builds stop if env is invalid (`docs/setup.md` §6). Set `APP_ENV` on every site and context (`preview` on branch deploys, `production` on production). Until the Neon, Resend, Upstash and Cloudinary accounts exist, branch deploys also need `INTEGRATIONS_MODE=mock`. Production refuses `mock`, so a production build can't pass until all those values are set.

**Node version: 24.** Checked 2026-11-02 at step 0.11. AWS Lambda, which runs Netlify functions, lists `nodejs26.x` as a public preview that isn't for production, with general availability targeted for November 2026. Netlify's docs don't mention Node 26, its default for new sites is 24, and functions fall back to 24 if the build's version isn't a valid runtime. Move up only when both Lambda and Netlify support a newer LTS: update `.nvmrc`, its test, `README.md` and `docs/setup.md` §1. CI reads `.nvmrc`.

**GitHub branch protection:** not available. Checked 2026-11-02: GitHub returns 403 for both branch protection and rulesets on this private repo on the free plan. The rule is a process one: merge only after CI is green, and the owner does the merging.

## 3. Credit budget (read before merging)

**On the free plan, reaching 300 credits pauses all projects, and visitors see "Site not available" until the monthly reset.** You can't buy more on this plan, and unused credits don't roll over.

| Meter | Cost |
|---|---|
| Production deploy | 15 credits per successful deploy, per site |
| Bandwidth | 20 credits per GB |
| Web requests | 2 credits per 10,000 |
| Compute | 10 credits per GB-hour |

Netlify's docs don't say outright that credits are shared across a team's sites, but the wording strongly suggests they are. **Plan as if both sites share 300.**

### Monthly budget

| Item | Credits |
|---|---|
| Up to 4 merges to `main` (both sites) | 120 |
| Traffic and compute | 180 |
| **Total** | 300 |

**Rule: at most 4 merges to `main` a month.** Batch finished phases together when needed. A failed deploy costs nothing, but a good one that needs fixing costs another 15–30, so test on the `develop` preview first. A rollback is free, so roll back rather than rushing a fix.

**Traffic estimate (ours, not Netlify's):** about 12 credits per 1,000 page views, assuming cached pages, roughly 400 KB and 20 requests per view served by Netlify. That gives about **15,000 page views a month** within the budget.

**One user's forum report:** 20 deploys used the whole allowance, and later deploys showed "Skipped due to account credit usage exceeded". They also reported a small grant of "operational credits" that kept published sites online but couldn't pay for deploys. That's one report, not a documented guarantee, so don't rely on it.

### What keeps credits low

- Public pages stay cached. No nonces or per-request rendering on them (`docs/architecture.md` ADR-010).
- Photos and videos come from Cloudinary, never Netlify.
- `next/image` uses the Cloudinary loader, not Netlify's image service.
- 3D downloads no model (ADR-015).
- OG images are cached.

### Monitoring

Netlify emails and notifies at **50%, 75% and 100%** of the monthly credits. Its docs don't say whether this differs on the free plan, so confirm the first email arrives.

Once a week: **Usage & billing → Account usage insights → Credits**, then look at the daily spend per meter.

| Sign | Action |
|---|---|
| 50% before mid-month | Look at which meter is highest |
| 75% | **Stop merging to `main`** until the reset. Admin edits still work, because they don't deploy |
| Compute is the top meter | Find what stopped being cached; check for bots hitting `/api/search/suggest` |
| Bandwidth is the top meter | Check that nothing heavy is served from `public/` |
| Close to 100% | **Owner decides** whether to wait or upgrade. The Personal plan has 1,000 credits a month, with packs of 500 credits for $5 ([price on Netlify's pricing page](https://www.netlify.com/pricing/)) |

Check Cloudinary's usage at the same time (`docs/integrations.md`).

## 4. Connect the domains at Spaceship

Do this at launch (Phase 10). Keep any existing records you don't recognise, especially the **Search Console TXT record**: deleting it can unverify the site.

**Netlify first:** on the web site, **Domain management → Add a domain** → `mustafaapparels.com`. Netlify also adds `www`, and redirects `www` to the apex. On the admin site, add `admin.mustafaapparels.com`.

**Spaceship second:** Advanced DNS → Custom records.

| Type | Host | Value | For |
|---|---|---|---|
| `ALIAS` if offered, otherwise `A` | `@` | `apex-loadbalancer.netlify.com`, or `75.2.60.5` for `A` | Storefront apex |
| `CNAME` | `www` | `mustafa-apparels.netlify.app` | Redirects to apex |
| `CNAME` | `admin` | `mustafa-apparels-admin.netlify.app` | Admin |

We couldn't confirm that Spaceship supports ALIAS, so check its record type dropdown. Confirm these values against Netlify's **Pending DNS verification** screen, and remove any conflicting parking records on `@` and `www`.

**Trade-off of an apex primary domain:** Netlify recommends a subdomain such as `www` as primary with external DNS, and suggests Netlify DNS for an apex primary. With external DNS, an apex goes through a load balancer rather than direct routing on the CDN, so it may be slightly slower for some visitors. The owner chose the apex with DNS at Spaceship. Revisit this only if real speed data shows a problem.

DNS changes can take up to 24 hours. Netlify provisions HTTPS once DNS resolves.

**Check:**
```bash
curl -sI https://mustafaapparels.com | head -5        # 200, HTTPS
curl -sI https://www.mustafaapparels.com | head -5    # 301 to the apex
curl -sI http://mustafaapparels.com | head -5         # 301 to HTTPS
curl -sI https://admin.mustafaapparels.com | grep -i x-robots   # noindex
```

## 5. Email DNS

**Sending and receiving are separate.** Site emails send through Resend. Customer replies arrive in the shop's Gmail (`ammarofficial321@gmail.com`), so **no MX record or mailbox is needed on the main domain for now**. Later, `hello@mustafaapparels.com` would need a mailbox or forwarding (Spacemail is Spaceship's paid product), added as MX records on `@`.

Do this at step 3.1, because login emails depend on it.

**1. Resend:** Domains → Add → `updates.mustafaapparels.com`. Resend recommends sending from a subdomain, which protects the main domain's reputation.

**2. Spaceship:** add exactly what Resend shows, with **values copied from the dashboard**. Spaceship appends `.mustafaapparels.com`, so the host is only the part before it. Our domain uses **Resend Forge**, so SPF and bounces are `CNAME` records rather than the older `MX` + `TXT` pair:

| Type | Host | Value | Purpose |
|---|---|---|---|
| `CNAME` | `send.updates` | `send.forge.rmta.net` | SPF and bounce handling (Resend serves the SPF `TXT` and `MX` behind it) |
| `CNAME` | `rsend.updates` | `rsend.forge.rmta.net` | Resend Forge |
| `TXT` | `resend._domainkey.updates` | Long `p=…` key from Resend | DKIM |

**3. DMARC:** add at the root, starting in monitoring mode:

| Type | Host | Value |
|---|---|---|
| `TXT` | `_dmarc` | `v=DMARC1; p=none;` |

Tighten to `p=quarantine` once emails have delivered well for a few weeks. See Resend's [DMARC guide](https://resend.com/docs/dashboard/domains/dmarc).

**4. Verify** in Resend, then send a real email to a Gmail address and check "Show original": SPF, DKIM and DMARC should all say PASS.

Leave click and open tracking off: tracking rewrites links, which breaks verification and reset links.

`EMAIL_FROM` = `Mustafa Apparels <no-reply@updates.mustafaapparels.com>`, with `Reply-To` set to `ammarofficial321@gmail.com`.

**API keys:** one per environment, each with **Sending access** limited to `updates.mustafaapparels.com`. `local-dev` lives in the root `.env.local`. Create `netlify-production` when the production variables are set. Previews stay in mock mode and need no key.

**Done on 2026-11-02 (step 3.1):**
- **Resend:** `updates.mustafaapparels.com` verified in **North Virginia (us-east-1)** with Resend Forge on. TLS is Opportunistic, and click and open tracking are off.
- **DNS:** checked with `nslookup` against 1.1.1.1:
  - `send.updates` → `send.forge.rmta.net`, which serves `v=spf1 ip4:52.3.252.119 ip4:44.222.39.36 ip4:199.249.231.0/24 ~all` and MX 10 `feedback.forge.rmta.net`
  - `rsend.updates` → `rsend.forge.rmta.net`
  - the DKIM `p=MIGf…` key at `resend._domainkey.updates`
  - `_dmarc` = `v=DMARC1; p=none;`
- **Test email:** one sent to the shop Gmail, accepted by Resend (200).
- **Still to check:** the owner confirms SPF, DKIM and DMARC PASS in Gmail's "Show original". The real password-reset check waits for the first environment running in live mode.

## 6. Keep `.netlify.app` out of Google

Search engines must see one site. The admin never gets indexed, and the storefront only on its own domain.

| Before launch | At launch |
|---|---|
| Production has `SITE_INDEXABLE=false`, so `robots.txt` has `Disallow: /`, responses send `noindex`, and the admin sends nothing to IndexNow | Set `SITE_INDEXABLE=true` and `NEXT_PUBLIC_SITE_URL=https://mustafaapparels.com` on both production sites, then redeploy |
| Branch deploys always `noindex` | Add the redirect below |

**How `noindex` is sent:** forum replies from Netlify say it adds `X-Robots-Tag: noindex` to deploy previews but not branch deploys, so the apps send it themselves from `next.config.ts` (`packages/config/headers.ts`). The value is fixed at build time: the storefront sends it unless `SITE_INDEXABLE=true`, and the admin always sends it.

Netlify's docs don't say that `.netlify.app` redirects to the primary domain on its own, so add it explicitly to `apps/web/netlify.toml`:
```toml
[[redirects]]
  from = "https://mustafa-apparels.netlify.app/*"
  to = "https://mustafaapparels.com/:splat"
  status = 301
  force = true
```
It only matches that host, so `develop--mustafa-apparels.netlify.app` keeps working. Test it at launch.

The domain switch needs a production deploy of both sites, because a changed environment variable only takes effect on the next deploy: budget 30 credits.

## 7. Roll back

**Netlify → Deploys → pick the last good one → Publish deploy.** It's instant and costs no credits. Then fix on `develop`, test the preview, and merge.

Rollback doesn't undo a database migration, which is why migrations must stay backward compatible.

## 8. Going-live order

1. Step 3.1: Resend and email DNS.
2. Phase 10: confirm the launch checklist (`docs/launch-checklist.md`).
3. Add domains in Netlify, then DNS at Spaceship (§4).
4. Wait for HTTPS; set production variables (§6); migrate and seed the production database, then import the stock into it with no new uploads: `IMPORT_DATABASE_URL=<production direct URL> pnpm import:stock --production` (`docs/catalog.md` §6; the report should say 0 uploaded). Then merge to `main`.
5. Run the checks in §4.
6. Search Console, Bing and IndexNow (`docs/seo-geo.md`); confirm GA4 (`docs/analytics.md`).
7. Watch credits daily for the first week.
