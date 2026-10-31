---
name: security-check
description: Security checklist to apply while writing any server action, route handler, auth flow, admin feature, file upload, environment variable or HTTP header change, plus the tests each needs. Use whenever touching server-side code, authentication, roles, uploads, secrets or headers.
---

# Security check (apply while coding, not after)

Standard: `docs/auth-security.md`. After the change, run the `security-auditor` agent for anything in auth/admin/uploads.

## Server action / route handler template
```ts
'use server';
import 'server-only';
import { requireAdmin } from '@shop/auth/guards';
import { productInput } from '@shop/validators/product';
import { products } from '@shop/core';
import { rateLimit } from '@shop/core/integrations/rate-limit';

export async function updateProduct(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await requireAdmin();                                // 1. authz FIRST
  const parsed = productInput.extend({ id: z.string() }).safeParse(raw); // 2. validate (.strict())
  if (!parsed.success) return validationError(parsed.error);
  const limited = await rateLimit('admin-write', session.user.id);     // 3. rate limit
  if (!limited.ok) return rateLimited();
  const result = await products.update(parsed.data, { actorId: session.user.id }); // 4. core (+ audit log)
  await revalidateStorefront(['products', `product:${result.id}`]);    // 5. side effects
  return { ok: true, data: { id: result.id } };                        // 6. safe result
}
```

## Checklist
- [ ] `requireUser()` / `requireAdmin()` is the **first** line; user-owned data filtered by `session.user.id`
- [ ] Zod `.strict()` validates every input (body, params, searchParams); lengths capped; no client-controlled `role`, `userId`, `status` unless explicitly allowed for admins
- [ ] Only Drizzle parameterized queries; no string-built SQL
- [ ] Errors returned as safe messages; no stack traces, SQL or "email not found"
- [ ] Rate limit for public or expensive endpoints (login, signup, reset, inquiry, search, upload sign)
- [ ] Secrets only from validated env; file imports `server-only`; nothing secret in `NEXT_PUBLIC_*`
- [ ] Uploads: admin-only signature, folder/format/size restricted, `public_id` re-verified server-side
- [ ] No `dangerouslySetInnerHTML` (except `serializeJsonLd`)
- [ ] New external domain? Update CSP (`connect-src`/`img-src`) and `images.remotePatterns` deliberately
- [ ] Admin mutation writes `audit_log`
- [ ] Logs contain no passwords, tokens, full emails or phone numbers

## Tests to add with the change
- Unauthenticated → 401/redirect; customer on admin action → 403 (add the action to the admin-actions loop test)
- Mass assignment attempt (extra fields like `role: 'admin'`) → rejected
- Boundary/invalid inputs → validation error shape
- Rate limit → 429
- For headers/CSP changes → `e2e/security/headers.spec.ts`
