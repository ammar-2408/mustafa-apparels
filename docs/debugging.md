# Debugging

## 1. Method (always the same)

1. **Reproduce** — exact steps, page, device/viewport, logged in or not, environment (local/preview/prod).
2. **Write a failing test** that shows the bug (unit if logic, E2E if it needs a browser).
3. **Find the cause** — read the error, check logs, narrow down with the tools below. Fix the cause, not the symptom.
4. **Fix** with the smallest change; the new test passes; the full suite passes.
5. **Commit** `fix(scope): ...` and push. If the bug could happen elsewhere, add a guard test there too.

**Tool quirks** (a flaky browser, a hook, a Windows port, a CLI that misbehaves): spend about 10 minutes at most. Then add a row to the table in §2 with the symptom, what you tried and what worked or didn't, and move on. Come back to it only if it blocks the step.

Never "fix" by deleting a test, adding `any`, swallowing an error, or adding `setTimeout` delays.

**Production bug?** Roll back first if it's serious (free and instant, `docs/deployment.md` §7), then fix on `develop` and test on the preview. Don't merge repeated attempts to `main`: each costs credits.

## 2. Tools

| Tool | Use for |
|---|---|
| Terminal output of `pnpm dev` | Server errors, server action failures |
| Browser DevTools (or `chrome-devtools` MCP) | Console errors, CSP violations, network, performance, layout shifts |
| Playwright trace viewer (`pnpm exec playwright show-trace`) | Flaky or failing E2E: see every step, DOM snapshot, network |
| `pnpm exec playwright test --ui` / `--debug` | Step through tests |
| Port 3000 or 3001 busy when E2E starts | Locally, Playwright reuses a server that responds. A hung one, or one returning 5xx, isn't reused and the run fails. Find it with `netstat -ano \| findstr :3000`, check it's your dev server, stop it with `taskkill /PID <pid> /T /F`. Playwright never stops a server it didn't start |
| `desktop` (Firefox) test fails at `browserContext.close` with `_maybeDontRestoreTabs` | The test's own checks passed; Firefox errored while closing. Seen on Windows in 2026-11 with Playwright 1.64.1 (5–19 of 30 repeats, also at 1 worker), then gone after a reboot with the same code. Cause not found: session-store prefs didn't help. Reboot and re-run with `pnpm exec playwright test --project=desktop --repeat-each=15`. Don't skip the test or raise retries to hide it |
| Commit rejected with `body-max-line-length` | commitlint allows at most 100 characters per line in the commit body. Wrap the body (write the message with a heredoc and `-F -`) and commit again |
| Claude's `git commit` blocked by the `--no-verify` check although you didn't use the flag | The hook reads the whole command, including a heredoc body, so a message that quotes `"git" commit` followed by the flag trips it. Reword the message |
| `next build` fails at once with `SyntaxError: Unexpected token '', ""... is not valid JSON` | A build killed part-way (seen 2026-11 when a Claude session ended mid-`pnpm verify`) left `.next/diagnostics/build-diagnostics.json` full of NUL bytes. Delete that file in each app (`apps/*/.next/diagnostics/build-diagnostics.json`) and build again; the rest of `.next` can stay |
| `pnpm build && pnpm start` | Reproduce production-only bugs (caching, minification) |
| Neon console / `neon` MCP | Check data, slow queries (`EXPLAIN ANALYZE`) |
| Netlify deploy and function logs | Build failures, skipped builds, runtime errors in preview/prod |
| Netlify Usage & billing | Which meter is eating credits |
| Cloudinary dashboard and Media Library | Usage, failed transformations, what's actually uploaded |
| GA4 DebugView | Events and parameters |
| `curl -sI <url>` | Status codes, redirects, headers (`X-Robots-Tag`, CSP, cache) |
| `curl -s <url> \| grep -i canonical` | Confirm canonical is in raw server HTML |
| `nslookup <host>` or https://dnschecker.org | DNS at Spaceship: has it changed yet? |

## 3. Common problems in this stack

### Next.js
| Symptom | Likely cause | Fix |
|---|---|---|
| "Hydration failed" | Server and client render different output (dates, `Math.random`, `window` checks during render, browser extensions) | Move browser-only logic into `useEffect`/client island; format dates with a fixed locale/timezone |
| Admin change not visible on site | Revalidation call failed or wrong tag | Check admin logs for `/api/revalidate` response; verify HMAC secret matches in both apps; check tag names |
| Works locally, 500 in prod | Missing env var, or Node-only API at the edge | Startup env validation message; check deploy logs; keep routes on Node runtime |
| Public page became dynamic | `searchParams`, `headers()`, `cookies()` or `connection()` in a page or shared layout, or `proxy.ts` matcher too wide | Move the read into a client island or a dynamic route; narrow the matcher. Test: `docs/testing-qa.md` Caching |
| Page content missing from the HTML, or rendered only in the browser | `useSearchParams` without a `<Suspense>` boundary | Wrap the client component that reads it in `<Suspense>` |
| Missing page returns 200, or a redirect becomes a meta refresh | `loading.tsx` above the route: streaming had already started | Remove it from `(shop)` routes. Check with `curl -sI` |
| `/page/<n>` still 404 after new suits are published | The cached 404 wasn't revalidated | Check the page reads tagged data before `notFound()`, and that the admin's `/api/revalidate` call succeeded |
| Canonical missing in `curl` output | Set in a client component or via JS | Move to `generateMetadata`; never set SEO tags client-side |
| Canonical appears in `<body>` | Streaming metadata for some user-agents | Configure `htmlLimitedBots`; re-run SEO suite |
| Page blank with CSP errors in console | Tier mismatch (`docs/auth-security.md` §3.2): page needs a nonce it doesn't get, or a host is missing | Check which tier the route is in; add the missing host deliberately |

### Netlify
| Symptom | Likely cause | Fix |
|---|---|---|
| "Site not available" on both sites | 300 credits used; projects paused | Wait for the monthly reset, or owner upgrades. Review `docs/deployment.md` §3 |
| Deploy "Skipped due to account credit usage exceeded" | Out of credits for deploys | Same. Don't keep retrying |
| Credits draining fast | Compute: a public page stopped being cached, or bots on `/search`. Bandwidth: something heavy in `public/` | Usage insights by meter → find the source |
| Site built though nothing relevant changed | `ignore` paths too wide, or a redeploy of the same commit, which always builds | Check `netlify.toml` |
| Preview returns 401 with a "Login Redirect" page | Netlify team login protection, not the app | Open it logged in to the team, or change the setting (`docs/deployment.md` §2) |
| Site didn't build though it should have | Changed file isn't in that site's `ignore` list | Add the path to `netlify.toml` |
| Build can't find the app or `netlify.toml` | Package directory not set | Set it in the UI; it can't go in a file. Base directory stays empty |
| `pnpm` version mismatch or install fails | `packageManager` field or Node version | Check root `package.json` and `.nvmrc`; check Netlify supports that Node version |
| Domain shows "Pending DNS verification" or no HTTPS | DNS not updated or conflicting parking records | Compare with `docs/deployment.md` §4; allow up to 24 hours |

### GSAP / motion
| Symptom | Cause | Fix |
|---|---|---|
| Animations run twice in dev | React Strict Mode double-mount | Use `useGSAP()` (auto-cleanup) — never raw `useEffect` without revert |
| ScrollTrigger start/end positions wrong | Images/fonts loaded after setup, or route change | `ScrollTrigger.refresh()` after load and on route change; set image dimensions |
| Triggers pile up after navigation | Not cleaned up | Scope with `useGSAP({ scope })`; test trigger count after route change |
| Content invisible without JS / flashes | Hidden initial state in SSR CSS | Hide only under `.js` class; use `autoAlpha` |
| Janky scroll on mobile | Pinning + heavy effects | Disable pinning/parallax below `lg` via `gsap.matchMedia()` |

### Three.js / React Three Fiber
| Symptom | Cause | Fix |
|---|---|---|
| Blank canvas | WebGL unavailable, wrong camera/lights, shader error | Check capability detection fallback; console for shader compile errors; Drei `<Stats>`/`<Html>` debug |
| Memory grows on navigation | Geometries/textures not disposed | Unmount canvas off-screen; dispose in cleanup; R3F disposes JSX objects automatically — check manual ones |
| "WebGL context lost" | Too many contexts / GPU pressure | One canvas per page; handle `webglcontextlost` → show poster |
| Low FPS on phones | DPR too high, too many vertices | `dpr={[1, 1.5]}` on mobile, fewer shader segments, `frameloop="demand"` |
| LCP got worse | Canvas is the LCP element | Poster image as LCP; load canvas after idle |

### Database / Drizzle / Neon
| Symptom | Cause | Fix |
|---|---|---|
| First request slow after idle | Neon compute scaled to zero | Expected on free tier; cache pages; keep queries few |
| "too many connections" | Using direct URL in app | Use the pooled `DATABASE_URL` |
| `pnpm verify`: "Hook timed out in 30000ms" in a `*.int.test.ts`, once, then fine on a re-run (2026-11-02, step 3.8) | Every package's PGlite files start at once under Turbo, and one start-up can pass 30 s on a busy machine. Seen once, in `packages/db`, after `packages/auth` added five PGlite files | Re-run once. It came back twice on 2026-11-04, in `packages/db/client.test.ts` (a PGlite start inside a test), so the `library` preset now allows 60 s per test and hook. If 60 s runs out too, run Turbo's `test` task with less concurrency |
| `pnpm install --frozen-lockfile` fails with `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION` (2026-11-02) | A package added today is newer than pnpm's release-age policy allows; CI refuses it | Pin the previous release instead of adding an exception, then rebuild the lockfile under the policy (`pnpm clean --lockfile --yes && pnpm install`) and check what else moved |
| Search misses obvious results | `pg_trgm` not enabled, wrong text config, product not `published` | Check migration 0000, query uses `'simple'`, status filter |
| "generation expression is not immutable" | `array_to_string` used directly in `search_vector` | Use `immutable_array_to_string` (`docs/database.md` §4) |
| Migration fails in CI | Edited an applied migration | Revert edit; create a new migration |
| `pnpm db:migrate` prints a `sslmode=require` security warning | node-postgres announcing that `require` will follow libpq's weaker meaning in v9; today it already verifies the certificate | Harmless. Neon URLs need no change now; recheck when `pg` 9 lands |
| Preview build log says "Skipping migrations" | No `DATABASE_URL_UNPOOLED` on Netlify branch deploys (mock mode) | Create the Neon `preview` branch and set its URLs (`docs/deployment.md` §2) |

### Auth (Better Auth)
| Symptom | Cause | Fix |
|---|---|---|
| Logged out immediately on preview URL | Cookie domain / `baseURL` mismatch | Set auth `baseURL` from the deployment URL; trusted origins include preview domain |
| Admin can't log in | Role not `admin`, or 2FA not set up | Check `user.role`; re-run seed for first admin |
| Reset email never arrives | Resend key/sender, spam, DNS | Check Resend logs; `updates.mustafaapparels.com` shows verified; check SPF and DKIM at Spaceship |
| Local E2E: right after logging in, the page bounces back to `/login`, but only on a freshly started `next dev` (2026-11-02, step 3.4) | Dev mode compiles `/account` on first visit, and the Fast Refresh rebuild during that client navigation lands back on `/login`. Sign-in itself returns 200 and sets the cookie. Against `next start`, all auth specs pass on both projects | Run auth specs against a build: `pnpm turbo build --filter=web --filter=admin`, then `CI=1 pnpm exec playwright test <spec> --project=mobile-small --project=laptop --retries=0`. CI always uses `next start`. Not chased further (tool quirk) |

### Cloudinary and media
| Symptom | Cause | Fix |
|---|---|---|
| "Invalid signature" | Params signed differ from params sent, clock skew | Sign exactly the params uploaded; timestamp from server |
| Images blurry on large screens | Missing large widths in `sizes`/loader, or low-resolution source (KDR-7, KDR-8, Laj1–5) | Add 1920 width; correct `sizes` attribute. Source images can't be sharpened; replace them |
| Video won't autoplay on iPhone | Missing `muted` or `playsInline` | Both required on the element |
| Video has sound | Wrong delivery URL | URL needs `ac_none` (`docs/integrations.md`) |
| Slow first video play | Delivery version wasn't created at upload | Eager transformation on upload |
| Video blocked in the browser | `media-src` missing | Check CSP tier (`docs/auth-security.md` §3.2) |
| Landscape video cut off | Tile forces portrait | `object-fit: contain` and the video's own ratio |
| Another brand's logo visible on a photo or video | Missed in review, or crop box too wide | Remove it from the suit's `catalog/` file or fix `crop`, delete the upload, re-run the import. List it in `_collection.md` |
| Importer creates duplicates | `design_id` changed, or `import_key` missing | Never change a `design_id`; the unique index should block this |
| Import fails validation | A value outside the taxonomy, a banned name, or a missing file | The error names the file and field. Fix `catalog/`; add a new value to `docs/catalog.md` §4 and the validator together |
| Import overwrote a price | Import must never touch price or admin edits | Bug: write a failing test, then fix |
| Filter option missing on the site | No published suit has that value | Expected. Check the suit is published and has the value |

### Analytics
| Symptom | Cause | Fix |
|---|---|---|
| No GA4 data | ID unset on production, or CSP blocks it | Check env var, console and DebugView |
| Events counted twice | Fired in an effect re-run, or enhanced measurement also on | Fire on the action; turn off the duplicate in the data stream |
| Search text in reports | Built-in site search on, or `q` left in `page_location` | Turn it off in the data stream; fix the helper |

### Search engines
| Symptom | Cause | Fix |
|---|---|---|
| Pages "Discovered, not indexed" | New domain, thin content | Normal at first; improve the text; request indexing on key pages |
| `.netlify.app` URLs in Google | Redirect missing | `docs/deployment.md` §6 |
| "Indexed, though blocked by robots.txt" | A noindex page is disallowed | Remove the Disallow (`docs/seo-geo.md` §3) |
| Search Console loses verification | TXT record removed at Spaceship | Add it back |

## 4. Asking Claude Code to debug

> Bug: <what happens>. Expected: <what should happen>. Steps: <1,2,3>. Device: <phone/desktop, browser>. Environment: <local/preview/prod>. Follow docs/debugging.md: reproduce with a failing test, find the root cause, fix, verify, commit, push.

Attach screenshots or console errors when you have them; Claude Code can read images.
