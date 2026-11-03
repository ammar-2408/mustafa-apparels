# Auth & Security

## 1. Accounts (Better Auth)

| Topic | Decision |
|---|---|
| Library | Better Auth, configured once in `packages/auth` (`createAuth({ app: 'web' | 'admin' })`) |
| Method | Email + password (v1). Google sign-in can be added later with one plugin. |
| Password hashing | **scrypt** (Better Auth default, memory-hard, OWASP-acceptable). |
| Password policy | Min 10, max 128 chars; no composition rules. A strength meter (`packages/validators/password-strength.ts`, small on purpose) guides without blocking.

Known-breached passwords are refused on sign-up, reset and change-password:
- **How:** our own hook calls Have I Been Pwned's range API, sending only the first 5 characters of the SHA-1, with padding.
- **When HIBP is down or slow:** after 3 seconds the password is allowed and the error logged (owner's decision, 2026-11-02). Better Auth's plugin isn't used, because it fails closed with no timeout.
- **In mock mode:** a short list in `breached-passwords.ts` stands in, so E2E can see the refusal. |
| Email verification | Required before the first login (owner's decision, 2026-11-02). Sign-up never signs in and always says "check your email". The link lasts 24 hours and signs the person in. A login before confirming answers "verify first" and sends a fresh link. A sign-up with a registered email sends that inbox an "you already have an account" email instead. Anyone can still send an inquiry without an account, because leads come first. |
| Password reset | Single-use token, 1-hour expiry, emailed via Resend; all sessions revoked after reset (`revokeSessionsOnPasswordReset`). |
| Sessions | Stored in DB; cookie `httpOnly`, `secure`, `sameSite=lax`; 7-day expiry with sliding refresh; "log out everywhere" in account settings. |
| User enumeration | Sign-up, login and reset return the same generic message whether the email exists or not. |
| Sign-up input | `signUpInput` (`packages/validators/auth.ts`, `.strict()`) runs in the form and again in a Better Auth `before` hook, so an extra field such as `role: "admin"` is refused with 400, not quietly dropped. `role`, `phone` and `banned` are also `input: false` |
| Error text | Every auth error goes through `authErrorMessage()`: wrong password, unknown email and banned all read "Email or password is incorrect." Unknown server errors show a generic message |
| Brute force | Better Auth's limiter on `/api/auth/*`, stored in Upstash through `packages/core/integrations/rate-limit.ts` (rules in `packages/auth/limits.ts`):
- sign-in: 10 a minute per IP
- sign-up: 5 per 10 minutes
- reset request: 3 per 15 minutes
- reset: 10 per 15 minutes
- resend verification: 3 per 15 minutes
- `/two-factor/*`: 5 a minute
- `/get-session`: not counted, to save commands

On top of that, **5 failed logins per 15 minutes per IP and email**: only wrong passwords count, and the 6th try gets 429, even with the right password. Keys are HMACs, so no IP or email reaches Upstash. If Upstash is down, slow or over its limit, sign-in, 2FA and reset are refused and everything else is allowed, with the error logged. The IP comes from Netlify's `x-nf-client-connection-ip`. |

### Admins
- Separate app (`apps/admin`) at `https://admin.mustafaapparels.com`, separate host-only cookie, **sign-up disabled**. Don't enable cross-subdomain cookies: a storefront session must never be readable by admin, or the reverse.
- Sign-in hook rejects any user whose `role !== 'admin'` (generic error). It's the admin instance's `session.create.before` hook, which runs after the password check, so a customer with the right password gets the same answer, at the same speed, as a wrong password.
- **Admin cookies:** `ma-admin.session_token`, host-only, `HttpOnly`, `SameSite=Lax`, and `Secure` with an https URL. The storefront uses `ma.session_token`, and the admin never reads it.
- **Session origin:** a storefront session replayed under the admin's cookie name is still refused, because `session.app` is `web` (ADR-020).
- **Guards:** `adminAccess()` returns `ok`, `signed-out`, `forbidden` or `needs-2fa`. `requireAdmin()` throws `UNAUTHENTICATED` or `FORBIDDEN`. Pages use `requireAdminPage()`, which redirects to `/login`, or to `/setup-2fa` until 2FA is on.
- **2FA (TOTP) mandatory**: first login forces setup; backup codes shown once. As built at step 3.8, with Better Auth's `twoFactor` plugin:
  - **First login:** `/setup-2fa`. The admin confirms the password, then a server action draws the QR code as a PNG data URL with `qrcode` and shows the key as text. The 10 backup codes (`xxxxx-xxxxx`, encrypted at rest) appear once, and one code from the app turns 2FA on.
  - **Every later login:** the password creates no session until `/login/verify` gets a code from the app or a backup code. No browser is ever trusted (owner's decision, 2026-11-02): `trustDevice` is refused.
  - **Limits:** a login allows 5 wrong codes. After 10 wrong codes across logins, 2FA locks for 15 minutes. `/two-factor/*` is also rate-limited, and fails closed if Upstash is down.
- **Turning 2FA on ends every other session** of the account, so a password-only session from before setup can't become a full admin session. One gap remains, and only a person can close it: until 2FA is on, anyone with the seeded password could set it up first. **Set up 2FA right after each `pnpm db:seed`** (local, preview and production), and keep `SEED_ADMIN_PASSWORD` used nowhere else.
- **Admin sessions come only from sign-in and the 2FA code step** (`/sign-in/email`, `/two-factor/verify-totp`, `/two-factor/verify-backup-code`). The admin's `session.create.before` hook refuses any other path, such as a verify-email auto sign-in, a future endpoint or a direct call. The admin also has no email verification endpoints; admins are created verified.
- **Admin accounts can't sign in on the storefront**: that would be a login without 2FA. The owner uses a separate customer account to shop. The storefront also answers 404 for `/two-factor/*`.
- First admin is created only by `pnpm db:seed` from env vars; more admins only by an existing admin (audit-logged).
- Admin sessions: 12-hour max, re-auth required for destructive actions (purge, role change).
- `apps/admin/proxy.ts` redirects every unauthenticated request to `/login`, and every page/action **also** calls `requireAdmin()` (defence in depth — the proxy alone is not trusted). As built at step 3.10:
  - **What the proxy checks:** only that a `ma-admin` session cookie exists. Without one, a page redirects to `/login` and an `/api/*` call gets 401.
  - **What it lets through:** `/login`, `/login/verify` and `/api/auth/*`. Static files, `/favicon.ico`, `/manifest.webmanifest` and `/brand/*` are outside its matcher.
  - **Pages:** each calls `requireAdminPage()`.
  - **Actions:** each is built with `adminAction(schema, handler)` (`apps/admin/lib/action.ts`), which runs `requireAdmin()` first and `.strict()` Zod second.
  - **The loop test:** `apps/admin/test/admin-actions-authz.test.ts` finds every `app/**/actions.ts` export and checks it answers `UNAUTHENTICATED` when signed out, and `FORBIDDEN` to a customer or to a storefront session. It also checks that the action never reached Better Auth or the database.

### Authorization helpers (`packages/auth/guards.ts`)
The guards take the session the app already read, so they stay pure. Each app's `lib/auth.ts` reads it once per request (`getSession()`, wrapped in React `cache`) and offers `requireUser()` for actions and route handlers (throws `UNAUTHENTICATED`) and `requireUserPage()` for pages (redirects to `/login`). A banned user counts as signed out. The auth instance is built on first use, never at build time, and is `null` in mock mode with no database.
```ts
export async function requireUser()  { /* session or throw UNAUTHENTICATED */ }
export async function requireAdmin() { /* session + role admin + 2FA verified, or throw FORBIDDEN */ }
export function assertOwner(userId: string, resourceUserId: string) { /* throw FORBIDDEN */ }
```
Every query for user-owned data filters by `user_id = session.user.id` (wishlist, inquiries, profile) — never trust an id sent from the client.

## 2. OWASP Top 10 checklist

| Risk | How we handle it |
|---|---|
| A01 Broken access control | `requireUser/requireAdmin` in every action; owner checks; admin is a separate app; tests that customers get 403 on every admin action |
| A02 Cryptographic failures | HTTPS only (HSTS); scrypt hashing; secrets in env; 2FA secrets encrypted; no sensitive data in URLs or logs |
| A03 Injection | Drizzle parameterized queries only; Zod validation; no `eval`; React escaping; JSON-LD serialized with `<` escaped |
| A04 Insecure design | Threat model below; rate limits; honeypot on public forms; least privilege |
| A05 Security misconfiguration | Security headers + CSP; `poweredByHeader: false`; previews `noindex`; no default credentials; error pages without stack traces |
| A06 Vulnerable components | Renovate/Dependabot weekly; `pnpm audit --prod` in CI (fail on high/critical); lockfile committed |
| A07 Auth failures | Better Auth; rate limits; generic errors; session revocation; 2FA for admins |
| A08 Integrity failures | Signed Cloudinary uploads; HMAC on `/api/revalidate`; production deploys only from `main`; pinned GitHub Actions |
| A09 Logging failures | Audit log for admin actions; auth events logged (no passwords/tokens); alerts on repeated failures |
| A10 SSRF | Server never fetches user-supplied URLs; media URLs must be our Cloudinary domain (`images.remotePatterns` locked) |

## 3. HTTP security headers

### 3.1 All responses, both apps

Set in `next.config.ts` `headers()`:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
X-Frame-Options: DENY            (and CSP frame-ancestors 'none')
Cross-Origin-Opener-Policy: same-origin
```
HSTS has **no `preload`** for now: browsers' preload lists are hard to leave. Reconsider once the domain has been stable for some months.

Admin and previews add `X-Robots-Tag: noindex, nofollow` on every response.

### 3.2 Content Security Policy: two tiers

Next.js nonces force dynamic rendering, which disables static pages, ISR and CDN caching. So nonces can't be used on the cached storefront pages (`docs/architecture.md` ADR-010).

**Tier A: cached public pages** (home, shop, collections, products, static pages). A fixed policy set in `next.config.ts`:
```
default-src 'self';
script-src 'self' 'unsafe-inline' https://www.googletagmanager.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://res.cloudinary.com https://www.googletagmanager.com https://*.google-analytics.com;
media-src 'self' https://res.cloudinary.com;
font-src 'self';
connect-src 'self' https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com;
worker-src 'self' blob:;
frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
```
**Trade-off:** `'unsafe-inline'` weakens protection against injected scripts on these pages. To compensate: they render no user-supplied HTML, the only `dangerouslySetInnerHTML` is JSON-LD through `serializeJsonLd()`, and login and account pages sit in Tier B.

Step 3.9 tried **experimental SRI** first (`experimental.sri`, sha256) with `script-src 'self'`, against a real production build of the storefront (Next 16.4.3, 2026-11-02):
- **What SRI covered:** it added `integrity` to the 6 external scripts on `/`.
- **What it didn't:** Next's 3 inline bootstrap scripts were still blocked, giving 3 violations.
- **Outcome:** SRI can't replace `'unsafe-inline'` on cached pages, so the policy above ships. Try again if Next starts hashing its inline scripts.

**Tier B: dynamic pages** (`/search`, `/account/*`, `/login`, `/register`, password pages). `proxy.ts` sets a per-request nonce, and its `matcher` lists only these paths, so it never runs on cached pages:
```
script-src 'self' 'nonce-{NONCE}' 'strict-dynamic';
(other directives as Tier A)
```

**As built (step 3.9):**
- **Builders:** `packages/config/headers.ts` has `securityHeaders()`, `cspTierA()`, `nonceCsp()` and `TIER_B_PATHS`.
- **Tier A:** set in `next.config.ts` on `TIER_A_SOURCE`, which matches every path except the Tier B ones, so a page never gets two policies.
- **Tier B:** `apps/web/proxy.ts` makes a fresh nonce per request. Its matcher is a literal copy of `TIER_B_PATHS`, and a test keeps them equal and checks that no cached path matches.
  - Tier B pages render per request, through `await connection()` or by reading the session, so Next can put the nonce on its scripts.
  - The admin's root layout does the same.
- **Development:** only there, both tiers add `'unsafe-eval'` for fast refresh.
- **Zod:** Zod 4 probes for `new Function`, which the browser reports as a violation. So `packages/validators/zod-config.ts` turns on `jitless` parsing, and every schema module imports it first.

**Admin app:** nonce on every route (it's dynamic anyway). No GA4.
```
default-src 'self';
script-src 'self' 'nonce-{NONCE}' 'strict-dynamic';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://res.cloudinary.com;
media-src 'self' blob: https://res.cloudinary.com;
font-src 'self';
connect-src 'self' https://api.cloudinary.com;
frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
```

GA4 hosts come from Google's CSP guide for GA4 without Ads features (`docs/analytics.md`). Test headers in `e2e/security/headers.spec.ts`, including that cached pages get **no** nonce. Three.js/R3F needs `blob:` for workers/textures — keep it in `worker-src`/`img-src` only.

## 4. Forms & input

- Zod on client (UX) **and** server (security). Server is the source of truth.
- `.strict()` schemas reject unexpected fields (prevents mass assignment, e.g. `role: "admin"` in a profile update).
- Text fields length-capped; HTML stripped from plain-text fields; descriptions rendered as text or sanitized limited markdown.
- Public forms: honeypot field + rate limit + time check (submitted < 2 s after the form mounts = bot). The timestamp is set in the browser on mount, because the render time of a cached page may be hours old. A bot can fake it, so the rate limit stays the real protection.
- Server Actions get built-in origin checks from Next.js; Better Auth checks origin/CSRF for its routes. Don't disable either.

## 5. File uploads (admin only)

1. Client requests a signature from `/api/upload/sign` with `{ kind }` (admin session required).
2. Signature restricts: folder `products/`, `resource_type`, `allowed_formats` for that kind, expiry 5 min.
   - **Images:** `jpg,png,webp`, 10 MB.
   - **Videos:** `mp4,mov,webm`, 50 MB, 60 seconds.
3. On save, the server re-fetches metadata from Cloudinary by `public_id` and rejects anything outside our folder, format list, size limit or duration limit. Rejected assets are deleted from Cloudinary.
4. Cloudinary strips EXIF/GPS metadata on delivery (`fl_strip_profile` or the account default). Videos are delivered with no audio track.
5. Deleting media removes it from Cloudinary too.

The import script (`scripts/import-stock.ts`) runs only on the owner's machine with the owner's keys, never on the server. It uploads only the media listed in `catalog/`. Media showing another brand is left out of the catalog, because anything uploaded could be reached at a public URL, and any crop is applied **before** upload for the same reason (`docs/catalog.md` §5).

## 6. Secrets & environment

| Variable | Where | Notes |
|---|---|---|
| `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` | server | Neon |
| `BETTER_AUTH_SECRET` | server | 32+ random bytes; different per environment |
| `CLOUDINARY_API_SECRET` | server | admin and import script only |
| `RESEND_API_KEY`, `UPSTASH_REDIS_REST_TOKEN` | server | |
| `REVALIDATE_SECRET` | server (both apps) | 32+ random bytes |
| `SEED_ADMIN_EMAIL/PASSWORD` | local/CI only | never in hosting env after first seed |
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_GA_MEASUREMENT_ID` | public | non-secret only |
| `INDEXNOW_KEY` | server (admin) | Not a secret: the key file is public |
| `SITE_INDEXABLE` | server (both apps) | `false` until launch. The web app uses it for `robots.txt` and `noindex`, and the admin for IndexNow |

- Validate env with Zod (`packages/config/env.ts`): `dev`, `build` and `start` stop on missing or invalid vars. On Netlify that means the build, because `next start` never runs there. `instrumentation.ts` runs the same check when each deployed server starts, and app code reads env only through `getEnv()` (`docs/setup.md` §6).
- **How Better Auth treats a bad setup** (1.7.15, checked at step 3.2): with no secret it throws under `NODE_ENV=production`, which includes `next build`, but in development it quietly uses a built-in default. So the env check requires `BETTER_AUTH_SECRET` whenever `DATABASE_URL` is set, and each app builds its auth instance lazily, never at build time. An `http` base URL silently turns off the `Secure` flag and the `__Secure-` cookie prefix, so `useSecureCookies` is forced on whenever the base URL is https, and production already requires https URLs. Weak secrets only get a warning from Better Auth, so production refuses CI placeholders, secrets with fewer than 16 distinct characters, and the same value for both secrets.
- Modules that use secrets start with `import 'server-only'`.
- `.env*` git-ignored (except `.env.example`); Claude Code is denied read access to them (`.claude/settings.json`).
- The `protect-files` hook blocks Claude Code from changing `.env*` (except the example), `Business data/`, `pnpm-lock.yaml` and committed migrations. It covers Edit and Write, and since step 3.11 Bash too.
  - **In shell commands it catches:** redirect targets, `tee`, `sed -i`, the destination of `cp`, `mv`, `install` and `ln`, and the files given to `rm`, `touch`, `truncate` and PowerShell's `Set-Content`, `Add-Content`, `Out-File` and `Remove-Item`.
  - **Its limit:** it reads the words of the command, so a path built from a variable (`f=.env; echo x > $f`), or a script or program that writes the file itself, isn't caught. The permission rules and code review are the other layers.
- `pnpm add` and `npx -y skills add` need the user's approval each time: a new dependency or skill is a decision.
- Rotate secrets if they ever appear in a log, screenshot or commit; use GitHub secret scanning.

## 7. Privacy

- Collect only what's needed (name, email, phone for inquiries).
- Privacy page explains what's stored and why, including GA4 and its cookies; users can delete their account (inquiries anonymized).
- IPs stored only as salted hashes for abuse prevention.
- **Analytics:** GA4 on the storefront only, with no cookie banner in v1. This is a practical default for a Pakistan audience, not legal advice. Search text, names, emails, phone numbers and inquiry messages are never sent to GA4 (`docs/analytics.md` §4).

## 8. Threat model (short)

| Threat | Mitigation |
|---|---|
| Bot spams inquiry form | Honeypot, timing check, rate limit, optional Turnstile later |
| Credential stuffing on login | Rate limit per IP + email, breached-password check, generic errors |
| Customer tries admin actions | Separate app + server-side `requireAdmin` + tests |
| Stolen admin password | Mandatory 2FA, short sessions, audit log |
| Malicious upload | Signed, format-limited, admin-only uploads to Cloudinary (never served from our origin) |
| Cache poisoning via revalidate endpoint | HMAC + timestamp + tag allow-list |
| XSS via product description | Plain text / sanitized markdown; React escaping; no raw HTML. CSP is a weaker backstop on Tier A pages (§3.2) |
| Traffic spike or bots exhaust Netlify credits, pausing the site | Cached pages, media on Cloudinary, usage alerts, rate limits (`docs/deployment.md` §3) |
| Leaked secret in repo | `.gitignore`, hook denies reading `.env`, secret scanning, rotation runbook |

## 9. Security tests (must exist)

`e2e/security/`: headers present; cached pages have a fixed CSP with no nonce, Tier B and admin have a nonce; `media-src` allows Cloudinary; admin routes redirect when logged out; customer session → 403 on each admin action; rate limits return 429; generic auth errors; upload sign rejects non-admin and unknown `kind`; save rejects oversized, too-long or wrong-format media; revalidate rejects bad signature/old timestamp; JSON-LD can't break out of `<script>`.
Unit: guards, Zod schemas (including mass-assignment attempts and banned brand names), HMAC verify, slug/redirect logic.
Use the `security-check` skill and the `security-auditor` agent for every auth/admin/API change.
