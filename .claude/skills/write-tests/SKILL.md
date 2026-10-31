---
name: write-tests
description: Decide which tests a change needs and write them first (Vitest unit/integration, React Testing Library, Playwright E2E across devices, SEO, a11y, security). Use before implementing any change, when fixing a bug, or when asked to add or improve tests.
---

# Write tests (test-first)

Full strategy: `docs/testing-qa.md`. This skill is the quick decision guide.

## 1. Pick the level
| The change is… | Write |
|---|---|
| Pure logic (validator, formatter, slug rule, HMAC, guard) | **Unit** — `*.test.ts` next to the file |
| A `packages/core` function that hits the DB | **Integration** — `*.int.test.ts`, PGlite/Neon test branch, factories |
| A React component with behaviour | **Component** — RTL, test what the user sees/does (roles, labels), not implementation |
| A user journey or page | **E2E** — Playwright in `e2e/web` or `e2e/admin`, runs on all 6 device projects |
| Public page/metadata | **SEO** — `e2e/seo/*` (raw HTML, canonical rules) |
| Auth/admin/API/headers | **Security** — `e2e/security/*` + unit tests for guards/schemas |
| Any page template | **a11y** — axe check in `e2e/a11y` |

Usually a change needs 2 levels: the logic (unit/integration) and how a user reaches it (component or E2E).

## 2. Cases to cover (checklist)
- [ ] Happy path
- [ ] Each validation rule: valid boundary, invalid boundary (min-1, max+1), empty, wrong type
- [ ] Unauthenticated → 401/redirect; wrong role → 403
- [ ] Another user's resource (IDOR) → 403/404
- [ ] Not found → 404; slug redirect → 301
- [ ] Rate limit → 429 and the UI handles it
- [ ] External service fails (Resend, Cloudinary, Upstash) → defined fallback
- [ ] UI: loading, empty, error and success states; keyboard use; reduced motion
- [ ] Responsive: no horizontal scroll; key elements visible at 360px and 2560px

## 3. Conventions
- Name tests as behaviour: `it('rejects a compare-at price lower than the price')`.
- Arrange/Act/Assert; one behaviour per test; no shared mutable state.
- Factories from `packages/core/test/factories.ts`; never rely on seed data order.
- Mock only at the network boundary (MSW) — not our own modules.
- Playwright: use `getByRole`/`getByLabel`; no fixed `waitForTimeout`; use web-first assertions (`await expect(locator).toBeVisible()`).
- Deterministic: freeze time (`vi.useFakeTimers()` / Playwright clock) when dates matter.

## 4. Red → green
1. Write the tests. 2. Run them: `pnpm exec vitest run <path>` or `pnpm exec playwright test <path>` — confirm they **fail for the right reason**. 3. Implement. 4. Re-run until green. 5. Hand off to `ship-change`.

## 5. Examples

```ts
// packages/validators/inquiry.test.ts
import { inquiryInput } from './inquiry';
it('rejects a filled honeypot field', () => {
  const r = inquiryInput.safeParse({ name: 'Ayesha', email: 'a@b.pk', message: 'Hi', website: 'spam' });
  expect(r.success).toBe(false);
});
```

```ts
// e2e/seo/canonical.spec.ts (excerpt)
test('paginated collection canonicalizes to itself', async ({ request }) => {
  const html = await (await request.get('/collections/formal?page=2')).text();
  const tags = html.match(/<link[^>]+rel="canonical"[^>]*>/g) ?? [];
  expect(tags).toHaveLength(1);
  expect(tags[0]).toContain(`href="${process.env.NEXT_PUBLIC_SITE_URL}/collections/formal?page=2"`);
  expect(html.indexOf(tags[0])).toBeLessThan(html.indexOf('</head>'));
});
```
