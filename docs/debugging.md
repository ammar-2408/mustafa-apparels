# Debugging

## 1. Method (always the same)

1. **Reproduce** — exact steps, page, device/viewport, logged in or not, environment (local/preview/prod).
2. **Write a failing test** that shows the bug (unit if logic, E2E if it needs a browser).
3. **Find the cause** — read the error, check logs, narrow down with the tools below. Fix the cause, not the symptom.
4. **Fix** with the smallest change; the new test passes; the full suite passes.
5. **Commit** `fix(scope): ...` and push. If the bug could happen elsewhere, add a guard test there too.

Never "fix" by deleting a test, adding `any`, swallowing an error, or adding `setTimeout` delays.

## 2. Tools

| Tool | Use for |
|---|---|
| Terminal output of `pnpm dev` | Server errors, server action failures |
| Browser DevTools (or `chrome-devtools` MCP) | Console errors, network, performance, layout shifts |
| Playwright trace viewer (`pnpm exec playwright show-trace`) | Flaky or failing E2E: see every step, DOM snapshot, network |
| `pnpm exec playwright test --ui` / `--debug` | Step through tests |
| `pnpm build && pnpm start` | Reproduce production-only bugs (caching, minification) |
| Neon console / `neon` MCP | Check data, slow queries (`EXPLAIN ANALYZE`) |
| Host deploy logs | Build failures, runtime errors in preview/prod |
| `curl -sI <url>` | Status codes, redirects, headers (`X-Robots-Tag`, CSP) |
| `curl -s <url> \| grep -i canonical` | Confirm canonical is in raw server HTML |

## 3. Common problems in this stack

### Next.js
| Symptom | Likely cause | Fix |
|---|---|---|
| "Hydration failed" | Server and client render different output (dates, `Math.random`, `window` checks during render, browser extensions) | Move browser-only logic into `useEffect`/client island; format dates with a fixed locale/timezone |
| Admin change not visible on site | Revalidation call failed or wrong tag | Check admin logs for `/api/revalidate` response; verify HMAC secret matches in both apps; check tag names |
| Works locally, 500 in prod | Missing env var, or Node-only API at the edge | Startup env validation message; check deploy logs; keep routes on Node runtime |
| Canonical missing in `curl` output | Set in a client component or via JS | Move to `generateMetadata`; never set SEO tags client-side |
| Canonical appears in `<body>` | Streaming metadata for some user-agents | Configure `htmlLimitedBots`; re-run SEO suite |

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
| Blank canvas | WebGL unavailable, wrong camera/lights, model path | Check capability detection fallback; Drei `<Stats>`/`<Html>` debug; verify `.glb` loads in a viewer |
| Memory grows on navigation | Geometries/textures not disposed | Unmount canvas off-screen; dispose in cleanup; R3F disposes JSX objects automatically — check manual ones |
| "WebGL context lost" | Too many contexts / GPU pressure | One canvas per page; handle `webglcontextlost` → show poster |
| Low FPS on phones | DPR too high, too many draw calls | `dpr={[1, 1.5]}` on mobile, merge meshes, `frameloop="demand"` |
| LCP got worse | Canvas is the LCP element | Poster image as LCP; load canvas after idle |

### Database / Drizzle / Neon
| Symptom | Cause | Fix |
|---|---|---|
| First request slow after idle | Neon compute scaled to zero | Expected on free tier; cache pages; keep queries few |
| "too many connections" | Using direct URL in app | Use the pooled `DATABASE_URL` |
| Search misses obvious results | `pg_trgm` not enabled, wrong text config, product not `published` | Check migration 0000, query uses `'simple'`, status filter |
| Migration fails in CI | Edited an applied migration | Revert edit; create a new migration |

### Auth (Better Auth)
| Symptom | Cause | Fix |
|---|---|---|
| Logged out immediately on preview URL | Cookie domain / `baseURL` mismatch | Set auth `baseURL` from the deployment URL; trusted origins include preview domain |
| Admin can't log in | Role not `admin`, or 2FA not set up | Check `user.role`; re-run seed for first admin |
| Reset email never arrives | Resend key/sender, spam | Check Resend logs; verify domain later |

### Cloudinary
| Symptom | Cause | Fix |
|---|---|---|
| "Invalid signature" | Params signed differ from params sent, clock skew | Sign exactly the params uploaded; timestamp from server |
| Images blurry on large screens | Missing large widths in `sizes`/loader | Add 1920 width; correct `sizes` attribute |

## 4. Asking Claude Code to debug

> Bug: <what happens>. Expected: <what should happen>. Steps: <1,2,3>. Device: <phone/desktop, browser>. Environment: <local/preview/prod>. Follow docs/debugging.md: reproduce with a failing test, find the root cause, fix, verify, commit, push.

Attach screenshots or console errors when you have them; Claude Code can read images.
