---
name: security-check
description: Security checklist to apply while writing any server action, route handler, auth flow, admin feature, file upload, environment variable or HTTP header change, including the two-tier CSP and the photo and video upload limits, plus the tests each needs. Use whenever touching server-side code, authentication, roles, uploads, secrets, headers, CSP or proxy.ts.
---

# Security check (apply while coding, not after)

Standard: `docs/auth-security.md`. After the change, run the `security-auditor` agent for anything in auth/admin/uploads.

## Server action / route handler template
```ts
'use server';
import 'server-only';
// requireAdmin: packages/auth/guards · updateProductInput: packages/validators
// products: packages/core · rateLimit: packages/core/integrations/rate-limit

export async function updateProduct(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await requireAdmin();                                // 1. authz FIRST
  const parsed = updateProductInput.safeParse(raw);                    // 2. validate (.strict())
  if (!parsed.success) return validationError(parsed.error);
  const limited = await rateLimit('admin-write', session.user.id);     // 3. rate limit
  if (!limited.ok) return rateLimited();
  const result = await products.update(parsed.data, { actorId: session.user.id }); // 4. core (+ audit log)
  await revalidateStorefront(['products', `product:${result.id}`]);    // 5. side effects
  return { ok: true, data: { id: result.id } };                        // 6. safe result
}
```

## Checklist
- [ ] `requireUser()` / `requireAdmin()` is the **first** line (`requireAdmin` also checks 2FA); user-owned data filtered by `session.user.id`
- [ ] Zod `.strict()` validates every input (body, params, searchParams); lengths capped; no client-controlled `role`, `userId`, `status` unless explicitly allowed for admins
- [ ] Customer-facing text goes through `noBannedTerms` (`docs/database.md` §9)
- [ ] Only Drizzle parameterized queries; no string-built SQL
- [ ] Errors returned as safe messages; no stack traces, SQL or "email not found"
- [ ] Rate limit for public or expensive endpoints (login, signup, reset, inquiry, search, upload sign). If Upstash is down, log it, then fail **closed** for login, 2FA and password reset only, and **open** for everything else, including the inquiry form (owner's decision, 2026-11-02). Each `Limit` in `packages/core/integrations/rate-limit.ts` declares its `failMode`
- [ ] Public forms: honeypot, rate limit and time check (submitted < 2 s after the form mounts = bot). Set the timestamp in the browser on mount, because a cached page's render time may be hours old
- [ ] Secrets only from validated env; file imports `server-only`; nothing secret in `NEXT_PUBLIC_*`
- [ ] No `dangerouslySetInnerHTML` (except `serializeJsonLd`)
- [ ] Admin mutation writes `audit_log`
- [ ] Logs contain no passwords, tokens, full emails or phone numbers
- [ ] `/api/revalidate` stays protected: HMAC with constant-time compare, timestamp ≤ 5 min, tag allow-list
- [ ] Admin and storefront cookies stay host-only: never enable cross-subdomain cookies

## Uploads (admin only)
| Kind | Formats | Max size | Other |
|---|---|---|---|
| Photo | JPEG, PNG, WebP | 10 MB | Alt text required |
| Video | MP4, MOV, WebM | 50 MB | Max 60 seconds; alt text required; delivered with no audio |

- [ ] `/api/upload/sign` is admin-only, rate-limited, takes `{ kind }`, and signs `folder=products`, `resource_type`, `allowed_formats`, with a 5-minute expiry
- [ ] Browser checks are for quick feedback only. **On save, the server re-reads metadata from Cloudinary by `public_id`** and rejects anything outside our folder, format list, size limit or duration limit, then deletes the rejected asset
- [ ] Width, height, bytes, format and duration come from Cloudinary, never the client
- [ ] Deleting media also deletes it from Cloudinary
- [ ] The import script runs only on the owner's machine, uploads only what `catalog/` lists, and crops **before** upload: anything uploaded can be reached at a public URL

## CSP: two tiers (`docs/auth-security.md` §3.2, ADR-010)
Next.js nonces force dynamic rendering, which disables caching and costs Netlify credits. **Never add a nonce to a cached page.**

| Tier | Pages | `script-src` | Set in |
|---|---|---|---|
| A: cached public | Home, shop, collections, products, static pages | `'self' 'unsafe-inline' https://www.googletagmanager.com` (step 3.9 tries experimental SRI first) | `next.config.ts` |
| B: dynamic | `/search`, `/account/*`, `/login`, `/register`, password pages | `'self' 'nonce-{NONCE}' 'strict-dynamic'` | `apps/web/proxy.ts`, whose `matcher` lists **only** these paths |
| Admin | Every route | `'self' 'nonce-{NONCE}' 'strict-dynamic'`, no GA4 | `apps/admin/proxy.ts` |

- [ ] A new route is in the right tier, and the web `proxy.ts` matcher still excludes every cached page
- [ ] Tier A pages render no user-supplied HTML, because `'unsafe-inline'` leaves them less protected
- [ ] New external domain? Add it deliberately to the exact directive in each tier that needs it, and to `images.remotePatterns` if it serves images
- [ ] Media stays in `media-src https://res.cloudinary.com`; `blob:` stays in `worker-src` and `img-src` for Three.js
- [ ] Other headers (`docs/auth-security.md` §3.1) stay in `next.config.ts`; HSTS has no `preload`

## Tests to add with the change
- Unauthenticated → 401/redirect; customer on admin action → 403 (add the action to the admin-actions loop test)
- Mass assignment attempt (extra fields like `role: 'admin'`) → rejected
- Boundary/invalid inputs → validation error shape
- Rate limit → 429
- Banned brand name in any customer-facing field → rejected
- Uploads: non-admin and unknown `kind` rejected at signing; wrong format, photo over 10 MB, video over 50 MB or 60 s, and asset outside our folder rejected on save and deleted
- For headers/CSP changes → `e2e/security/headers.spec.ts`: cached pages have the fixed CSP with **no nonce**; Tier B and admin have a nonce; `media-src` allows Cloudinary; no CSP errors on any template, with GA4 on
