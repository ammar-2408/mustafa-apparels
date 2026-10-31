# Auth & Security

## 1. Accounts (Better Auth)

| Topic | Decision |
|---|---|
| Library | Better Auth, configured once in `packages/auth` (`createAuth({ app: 'web' | 'admin' })`) |
| Method | Email + password (v1). Google sign-in can be added later with one plugin. |
| Password hashing | **scrypt** (Better Auth default, memory-hard, OWASP-acceptable). Optional upgrade: argon2id via a custom `password.hash/verify` — decide **before** launch; switching later invalidates existing passwords. |
| Password policy | Min 10, max 128 chars; no composition rules; block known-breached passwords (Better Auth Have I Been Pwned plugin); show a strength meter. |
| Email verification | Required before sending inquiries from an account and before wishlist sync. |
| Password reset | Single-use token, 1-hour expiry, emailed via Resend; all sessions revoked after reset (`revokeSessionsOnPasswordReset`). |
| Sessions | Stored in DB; cookie `httpOnly`, `secure`, `sameSite=lax`; 7-day expiry with sliding refresh; "log out everywhere" in account settings. |
| User enumeration | Sign-up, login and reset return the same generic message whether the email exists or not. |
| Brute force | Better Auth built-in rate limit on `/api/auth/*` + Upstash limit: 5 failed logins / 15 min / (IP + email), then backoff. |

### Admins
- Separate app (`apps/admin`), separate cookie (admin domain), **sign-up disabled**.
- Sign-in hook rejects any user whose `role !== 'admin'` (generic error).
- **2FA (TOTP) mandatory**: first login forces setup; backup codes shown once.
- First admin is created only by `pnpm db:seed` from env vars; more admins only by an existing admin (audit-logged).
- Admin sessions: 12-hour max, re-auth required for destructive actions (purge, role change).
- `apps/admin/proxy.ts` redirects every unauthenticated request to `/login`, and every page/action **also** calls `requireAdmin()` (defence in depth — the proxy alone is not trusted).

### Authorization helpers (`packages/auth/guards.ts`)
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
| A08 Integrity failures | Signed Cloudinary uploads; HMAC on `/api/revalidate`; CI-only production deploys; pinned GitHub Actions |
| A09 Logging failures | Audit log for admin actions; auth events logged (no passwords/tokens); alerts on repeated failures |
| A10 SSRF | Server never fetches user-supplied URLs; image URLs must be our Cloudinary domain (`images.remotePatterns` locked) |

## 3. HTTP security headers (both apps)

Set in `next.config.ts` `headers()` and `proxy.ts` (for the per-request CSP nonce):

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
X-Frame-Options: DENY            (and CSP frame-ancestors 'none')
Cross-Origin-Opener-Policy: same-origin
Content-Security-Policy: default-src 'self';
  script-src 'self' 'nonce-{NONCE}' 'strict-dynamic';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://res.cloudinary.com;
  font-src 'self';
  connect-src 'self' https://api.cloudinary.com {analytics};
  worker-src 'self' blob:;
  frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
```
Admin adds `X-Robots-Tag: noindex, nofollow` on every response. Test headers in `e2e/security/headers.spec.ts`. Three.js/R3F needs `blob:` for workers/textures — keep it in `worker-src`/`img-src` only.

## 4. Forms & input

- Zod on client (UX) **and** server (security). Server is the source of truth.
- `.strict()` schemas reject unexpected fields (prevents mass assignment, e.g. `role: "admin"` in a profile update).
- Text fields length-capped; HTML stripped from plain-text fields; descriptions rendered as text or sanitized limited markdown.
- Public forms: honeypot field + rate limit + server-side time check (submitted < 2 s after render = bot).
- Server Actions get built-in origin checks from Next.js; Better Auth checks origin/CSRF for its routes. Don't disable either.

## 5. File uploads (admin only)

1. Client requests signature from `/api/upload/sign` (admin session required).
2. Signature restricts: folder `products/`, `allowed_formats: jpg,png,webp`, `max_file_size: 10MB`, expiry 5 min.
3. On save, the server re-fetches image metadata from Cloudinary by `public_id` and rejects anything outside our folder or format list.
4. Cloudinary strips EXIF/GPS metadata on delivery (`fl_strip_profile` or the account default).
5. Deleting an image removes it from Cloudinary too.

## 6. Secrets & environment

| Variable | Where | Notes |
|---|---|---|
| `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` | server | Neon |
| `BETTER_AUTH_SECRET` | server | 32+ random bytes; different per environment |
| `CLOUDINARY_API_SECRET` | server | admin only |
| `RESEND_API_KEY`, `UPSTASH_REDIS_REST_TOKEN` | server | |
| `REVALIDATE_SECRET` | server (both apps) | 32+ random bytes |
| `SEED_ADMIN_EMAIL/PASSWORD` | local/CI only | never in hosting env after first seed |
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | public | non-secret only |

- Validate env at startup with Zod (`packages/config/env.ts`) — the app refuses to boot with missing/invalid vars.
- Modules that use secrets start with `import 'server-only'`.
- `.env*` git-ignored (except `.env.example`); Claude Code is denied read access to them (`.claude/settings.json`).
- Rotate secrets if they ever appear in a log, screenshot or commit; use GitHub secret scanning.

## 7. Privacy

- Collect only what's needed (name, email, phone for inquiries).
- Privacy page explains what's stored and why; users can delete their account (inquiries anonymized).
- IPs stored only as salted hashes for abuse prevention.
- Analytics: cookieless/privacy-friendly; no third-party ad trackers.

## 8. Threat model (short)

| Threat | Mitigation |
|---|---|
| Bot spams inquiry form | Honeypot, timing check, rate limit, optional Turnstile later |
| Credential stuffing on login | Rate limit per IP + email, breached-password check, generic errors |
| Customer tries admin actions | Separate app + server-side `requireAdmin` + tests |
| Stolen admin password | Mandatory 2FA, short sessions, audit log |
| Malicious upload | Signed, format-limited, admin-only uploads to Cloudinary (never served from our origin) |
| Cache poisoning via revalidate endpoint | HMAC + timestamp + tag allow-list |
| XSS via product description | Plain text / sanitized markdown, CSP with nonces |
| Leaked secret in repo | `.gitignore`, hook denies reading `.env`, secret scanning, rotation runbook |

## 9. Security tests (must exist)

`e2e/security/`: headers present; admin routes redirect when logged out; customer session → 403 on each admin action; rate limits return 429; generic auth errors; upload sign rejects non-admin; revalidate rejects bad signature/old timestamp; JSON-LD can't break out of `<script>`.
Unit: guards, Zod schemas (including mass-assignment attempts), HMAC verify, slug/redirect logic.
Use the `security-check` skill and the `security-auditor` agent for every auth/admin/API change.
