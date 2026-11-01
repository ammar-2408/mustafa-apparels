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
| Layout | **Responsive** — `e2e/responsive`, no horizontal overflow on any device project |
| `catalog/` or the import script | **Catalog schema** over the real `catalog/`; **import** with small fixture files, because `Business data/` isn't in git, so CI can't see it |
| Caching or `proxy.ts` | **Caching** — cached on the second request; `proxy.ts` matcher includes no cached page |
| A GA4 event | **Analytics** — `e2e/web/analytics.spec.ts`: fires once, with no search text or personal data |

Usually a change needs 2 levels: the logic (unit/integration) and how a user reaches it (component or E2E).

## 2. Cases to cover (checklist)
- [ ] Happy path
- [ ] Each validation rule: valid boundary, invalid boundary (min-1, max+1), empty, wrong type
- [ ] Unauthenticated → 401/redirect; wrong role → 403
- [ ] Another user's resource (IDOR) → 403/404
- [ ] Not found → 404; slug redirect → permanent (301 or 308)
- [ ] Rate limit → 429 and the UI handles it
- [ ] External service fails (Resend, Cloudinary, Upstash) → defined fallback
- [ ] UI: loading, empty, error and success states; keyboard use; reduced motion
- [ ] Responsive: no horizontal scroll; key elements visible at 360px and 2560px
- [ ] Customer-facing text: each banned brand name rejected, in any case and with or without punctuation (`docs/database.md` §9)
- [ ] Pagination: `/page/2` is self-canonical; `/page/1` → 301; `/page/0`, `/page/abc`, `/page/01`, `/page/999` → real 404
- [ ] Filters: values outside `docs/catalog.md` §4 rejected; values with no published suit hidden; run in the browser with no page request; shared `?fabric=` link restores the filter; no size filter or size text anywhere
- [ ] Metadata: title ≤ 60; description 120–160, unique per page
- [ ] Publishing: refused with no price, colour, main image or alt text
- [ ] Media: wrong type, photo over 10 MB, video over 50 MB or 60 s rejected; video never in grids or as the main item; poster first, muted, `ac_none`
- [ ] Public page stays cached (no nonce, no per-request work)

Required cases per feature: `docs/testing-qa.md` §3. Coverage floors: `packages/core`, `validators` and `auth` ≥ 90% lines and ≥ 85% branches; server actions and route handlers ≥ 80% lines.

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
  const html = await (await request.get('/collections/dhanak/page/2')).text();
  const tags = html.match(/<link[^>]+rel="canonical"[^>]*>/g) ?? [];
  expect(tags).toHaveLength(1);
  expect(tags[0]).toContain(`href="${process.env.NEXT_PUBLIC_SITE_URL}/collections/dhanak/page/2"`);
  expect(html.indexOf(tags[0])).toBeLessThan(html.indexOf('</head>'));
});
```
