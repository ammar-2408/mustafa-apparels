# Product Requirements (PRD)

**Product:** <SHOP_NAME> — women's dress shop website
**Owner:** shop owner · **Status:** v1 draft · **Last updated:** 2026-10-23

---

## 1. Problem and goal

The shop needs an online presence that looks premium and memorable (3D, motion) and lets customers find dresses and contact the shop quickly, without the cost and complexity of online payments and delivery.

**Goals for v1**
1. Showcase every dress with great photos, price, sizes and details.
2. Make it effortless to contact the shop about a dress (phone, WhatsApp, email, inquiry form).
3. Rank well on Google and be readable by AI assistants (SEO, sitemap, llms.txt).
4. Let the owner manage everything from a private admin panel without touching code.
5. Feel distinctive: 3D hero, smooth GSAP motion, without hurting speed or accessibility.

**Non-goals for v1:** cart, checkout, online payment, delivery tracking, multi-vendor, reviews, multiple languages, mobile apps.

## 2. Users

| User | Needs |
|---|---|
| **Shopper** (mostly on mobile) | Browse by category, search, see photos and price, save favourites, contact the shop fast |
| **Registered customer** | Everything above + wishlist and inquiry history saved to an account |
| **Admin / owner** | Upload dresses with photos, set price and category, publish/unpublish, answer inquiries, edit contact details |

## 3. Scope — v1 features

### Storefront (`apps/web`)
| # | Feature | Acceptance criteria |
|---|---|---|
| W1 | Home page | 3D/animated hero, featured dresses, categories, contact strip. Content visible and usable even if WebGL is unavailable or reduced motion is on. |
| W2 | Collection pages `/collections/[slug]` | Grid of published dresses in a category, 24 per page, `?page=N` pagination, filters (size, colour, price range), sort (newest, price ↑↓). Out-of-range page → 404. |
| W3 | All dresses `/shop` | Same as W2 across all categories. |
| W4 | Product page `/dresses/[slug]` | Gallery (zoom, swipe on mobile), name, price (PKR), sizes, colours, fabric, description, availability, related dresses, **Inquire** section. Old slug → 301 to new slug. Unknown slug → 404. |
| W5 | Inquire about a dress | Buttons: Call (`tel:`), WhatsApp (`wa.me` with pre-filled message incl. dress name + link), Email (`mailto:`). Optional form (name, phone, email, message) saved to DB and emailed to the shop. Rate-limited. |
| W6 | Search `/search?q=` | Searches name, description, category, colour, fabric. Typo-tolerant. Suggestions while typing (debounced). Results page is `noindex, follow`. |
| W7 | Accounts | Sign up, log in, log out, forgot/reset password, email verification, profile edit, delete account. |
| W8 | Wishlist | Logged-in users save/remove dresses; guests are prompted to log in. |
| W9 | My inquiries | Logged-in users see inquiries they sent and their status. |
| W10 | Static pages | About, Contact (map link, hours, phone, WhatsApp, email), FAQ, Privacy, Terms. |
| W11 | 404 / error pages | Branded, helpful, correct HTTP status codes. |

### Admin (`apps/admin`)
| # | Feature | Acceptance criteria |
|---|---|---|
| A1 | Admin login | Separate app. Only `role = admin` can sign in. 2FA (TOTP) required. No public sign-up. |
| A2 | Dresses | List with search/filter; create, edit, duplicate, publish/unpublish, archive. Fields: name, slug (auto, editable), description, price, compare-at price, category, sizes, colours, fabric, availability, featured, SEO title/description. |
| A3 | Photos | Drag-and-drop multi-upload, reorder, set primary, alt text required. JPEG/PNG/WebP only, max 10 MB each. |
| A4 | Categories | Create, edit, reorder, hide. Slug changes create redirects. |
| A5 | Inquiries | List (new / contacted / closed), view, change status, quick WhatsApp/call/email reply links. |
| A6 | Customers | Read-only list (name, email, joined, inquiries count). |
| A7 | Shop settings | Shop name, phone, WhatsApp number, email, address, hours, social links, default SEO text. |
| A8 | Audit log | Every admin create/update/delete recorded with who and when. |

*"More options will be decided later"* — the product model has an `attributes` JSON field and the admin form is built from a field config so new fields can be added without a redesign.

## 4. Non-functional requirements

| Area | Requirement |
|---|---|
| Responsive | Works from 320px phones to 2560px+ monitors, incl. tablets and landscape. Tested on 5 viewports in CI. |
| Performance | Mobile Lighthouse ≥ 90 Performance; LCP < 2.5 s, CLS < 0.1, INP < 200 ms on product and collection pages. 3D never blocks first paint. |
| Accessibility | WCAG 2.2 AA. Keyboard navigable, screen-reader labels, colour contrast, reduced motion. |
| SEO | All rules in `AGENTS.md` §8 and `docs/design.md` §8. Lighthouse SEO = 100. |
| Security | OWASP Top 10 covered (see `docs/auth-security.md`). Passwords hashed (scrypt). Admin 2FA. Rate limits. Security headers + CSP. |
| Quality | Every change has tests; CI must be green; no known bugs at release. Coverage ≥ 80% for `packages/core` and server code. |
| Cost | Runs on free tiers at launch (see `docs/setup.md` → Hosting for the commercial-use caveat). |
| Portability | No host-specific APIs, so the site can move hosts or add a custom domain by changing env vars. |

## 5. SEO requirements (from the owner's list)

Sitemap · llms.txt · Open Graph · robots.txt · JSON-LD. The canonical items from the owner's checklist are **mistakes to prevent**, each enforced by a test:

1. Same canonical on every page → each page canonicalizes to itself
2. Two canonical tags → exactly one
3. Relative URL → absolute URL
4. Added by JavaScript → server-rendered in initial HTML
5. Page 2 → page 1 → page 2 canonicalizes to page 2
6. Canonical → redirect / 404 → canonical target always returns 200

## 6. Success metrics (first 3 months)

- Inquiries per week (form + WhatsApp clicks + call clicks, tracked as events)
- Organic search clicks (Google Search Console)
- Mobile Core Web Vitals "Good" for ≥ 75% of visits
- Zero security incidents; zero P1 bugs open

## 7. Open decisions

| Decision | Owner | Blocks |
|---|---|---|
| Shop name, logo | Owner | Design tokens, OG images, `<SHOP_NAME>` replacement |
| Colour theme, fonts | Owner (after logo) | Phase 6 in `project-implementation.md` |
| Hosting plan (see setup.md) | Owner | Production launch |
| Custom domain (later) | Owner | Nothing — `SITE_URL` env switch + redirects |
| 3D hero concept (fabric, mannequin, abstract) | Owner + designer | Phase 7 |
| WhatsApp number, phone, email, address | Owner | Seed data / settings |

## 8. Future (v2+ candidates)

Cart + local payment gateway, delivery, size guide with measurements, reviews, Urdu language, appointment booking, lookbook pages, 360° product spins, newsletter.
