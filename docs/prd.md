# Product Requirements (PRD)

**Product:** Mustafa Apparels — online catalogue of women's unstitched suits, at https://mustafaapparels.com
**Owner:** Mustafa Ahmed · **Status:** v1 · **Last updated:** 2026-11-01

---

## 1. Problem and goal

Mustafa Apparels sells women's unstitched suits online, across Pakistan. Customers order on WhatsApp today. The shop needs a site that looks premium and memorable, shows each suit properly in photos and video, and gets customers into a WhatsApp chat quickly, without the cost and complexity of online checkout.

**Goals for v1**
1. Show every suit with good photos, a short video where one exists, the price, the fabric and what's included.
2. Make it effortless to contact the shop about a suit: WhatsApp first, then phone, email or the inquiry form.
3. Be found on Google and Bing and be understood by AI assistants (`docs/seo-geo.md`).
4. Let the owner manage everything from a private admin panel without touching code.
5. Feel distinctive: 3D hero and smooth GSAP motion, without hurting speed or accessibility.
6. Run on free plans. Hosting credits are tight, so every design choice must respect `docs/deployment.md` §3.

**Non-goals for v1:** cart, checkout, online payment, courier booking or tracking on the site, stitched or ready-to-wear products, size charts, reviews, a stitching service, mobile apps.

**Not planned at all:** an Urdu version of the site. The owner decided this; don't add it to any roadmap.

## 2. The business

| Topic | Fact |
|---|---|
| Public name | **Mustafa Apparels**. The logo reads "MA Apparels by Mustafa Ahmed" |
| Domain | https://mustafaapparels.com · admin at https://admin.mustafaapparels.com |
| Products | Women's **unstitched** suits. **No sizes** |
| Pieces | 2-piece (shirt, trouser) or 3-piece (shirt, dupatta, trouser) |
| Collections | Dhanak, Khaddar, Lajwanti. The admin can add more |
| Price range | About PKR 3,000–10,000 per suit |
| Where | Online only, **no public address and no named city**. Serves all of Pakistan |
| Ordering | Customer contacts the shop, mainly on WhatsApp. The shop arranges a courier and payment is settled in chat |
| Hours | No fixed hours. The site says replies come on WhatsApp during the day |
| WhatsApp | +92 348 2799707 (`+923482799707`) |
| Phone | +92 306 9558717 (`+923069558717`) |
| Email | The owner's Gmail: `TODO-OWNER` |
| Social links | `TODO-OWNER`, optional. Empty links stay hidden |

Anything marked `TODO-OWNER` is listed in `docs/launch-checklist.md` §8 and blocks launch unless marked optional.

### Other brands (hard rule)

The owner's stock posters show other brands' logos, and the owner has no written permission to use those names. So:
- **The site never names another fashion brand**, in product text, alt text, SEO fields, JSON-LD, FAQ answers, URLs or file names.
- A validator rejects those names in customer-facing fields (`docs/database.md` §9).
- Posters are cropped to the model photo before upload. Poster text is never copied.
- Cropping removes logos, but the photos may still belong to those brands. **The owner signs off before launch**: permission confirmed, or own photos in place (`docs/launch-checklist.md` §8).

## 3. Users

| User | Needs |
|---|---|
| **Shopper** (mostly on mobile) | Browse by collection, search, see photos, video and price, save favourites, reach the shop on WhatsApp fast |
| **Registered customer** | Everything above, plus a wishlist and inquiry history saved to an account |
| **Admin / owner** | Upload suits with photos and videos, set prices and collections, publish and unpublish, answer inquiries, edit contact details |

## 4. Scope — v1 features

### Storefront (`apps/web`)
| # | Feature | Acceptance criteria |
|---|---|---|
| W1 | Home page | 3D/animated hero, featured suits, collections, contact strip. Content visible and usable even if WebGL is unavailable or reduced motion is on. |
| W2 | Collection pages `/collections/[slug]` | Grid of published suits in a collection, 24 per page, `?page=N` pagination, filters (pieces, colour, work, price range), sort (newest, price ↑↓). Out-of-range page → 404. |
| W3 | All suits `/shop` | Same as W2 across all collections, plus a collection filter. |
| W4 | Product page `/products/[slug]` | Gallery (zoom, swipe on mobile) with muted video preview where one exists, name, design code, price (PKR), pieces with each piece's fabric and finish, colours, care instructions, availability, related suits, **Inquire** section. Old slug → 301 to new slug. Unknown slug → 404. |
| W5 | Inquire about a suit | Buttons: WhatsApp first (`wa.me` with pre-filled message incl. name, design code, link), Call (`tel:`), Email (`mailto:`). Optional form (name, phone, email, message) saved to DB and emailed to the shop. Rate-limited. |
| W6 | Search `/search?q=` | Searches name, design code, description, collection, colour, fabric, work. Typo-tolerant. Suggestions while typing (debounced). Searching "dhanak" also finds Lajwanti suits, because their fabric is Dhanak. Results page is `noindex, follow`. |
| W7 | Accounts | Sign up, log in, log out, forgot/reset password, email verification, profile edit, delete account. |
| W8 | Wishlist | Logged-in users save/remove suits; guests are prompted to log in. |
| W9 | My inquiries | Logged-in users see inquiries they sent and their status. |
| W10 | Static pages | About, Contact (phone, WhatsApp, email; **no map or address**), How to Order (WhatsApp, courier, payment, returns), FAQ, Privacy (discloses GA4), Terms. |
| W11 | 404 / error pages | Branded, helpful, correct HTTP status codes. |

### Admin (`apps/admin`)
| # | Feature | Acceptance criteria |
|---|---|---|
| A1 | Admin login | Separate app. Only `role = admin` can sign in. 2FA (TOTP) required. No public sign-up. |
| A2 | Suits | List with search/filter; create, edit, duplicate, publish/unpublish, archive. Fields: name, slug (auto, editable), design code, description, price, compare-at price, collection, pieces, piece details, fabric, colours, work, season, care instructions, availability, featured, SEO title/description. A draft may have no price; publishing requires a price and a main image. |
| A3 | Photos and videos | Drag-and-drop multi-upload, reorder, set main image (must be a photo), alt text required. Photos: JPEG/PNG/WebP, max 10 MB. Videos: MP4/MOV/WebM, max 50 MB and 60 seconds. Video poster picked automatically and changeable. |
| A4 | Collections | Create, edit, reorder, hide. Slug changes create redirects. Starts with Dhanak, Khaddar, Lajwanti. |
| A5 | Inquiries | List (new / contacted / closed), view, change status, quick WhatsApp/call/email reply links. |
| A6 | Customers | Read-only list (name, email, joined, inquiries count). |
| A7 | Shop settings | Shop name, phone, WhatsApp number, email, service area, delivery, payment and return text, reply note, social links, default SEO text. |
| A8 | Audit log | Every admin create/update/delete recorded with who and when. |

*Fields decided later* — the product model has an `attributes` JSON field and the admin form is built from a field config so new fields can be added without a redesign.

### Stock import (owner's existing media)
| # | Feature | Acceptance criteria |
|---|---|---|
| I1 | Import script | Imports `Business data/Stock/<Collection>` as **draft** products with no price. Crops posters locally, uploads the result, can be re-run without duplicates, has a dry-run mode, and never writes to `Business data/`. See `docs/project-implementation.md` Phase 5. |

## 5. Non-functional requirements

| Area | Requirement |
|---|---|
| Responsive | Works from 320px phones to 2560px+ monitors, incl. tablets and landscape. Tested on 5 viewports in CI. |
| Performance | Mobile Lighthouse ≥ 90 Performance; LCP < 2.5 s, CLS < 0.1, INP < 200 ms on product and collection pages. 3D and video never block first paint. |
| Accessibility | WCAG 2.2 AA. Keyboard navigable, screen-reader labels, colour contrast, reduced motion. |
| SEO | All rules in `AGENTS.md` §8, `docs/design.md` §8 and `docs/seo-geo.md`. Lighthouse SEO = 100. |
| Security | OWASP Top 10 covered (see `docs/auth-security.md`). Passwords hashed (scrypt). Admin 2FA. Rate limits. Security headers + two-tier CSP. |
| Quality | Every change has tests; CI must be green; no known bugs at release. Coverage ≥ 80% for `packages/core` and server code. |
| Cost | Runs on free plans: Netlify, Neon, Cloudinary, Resend, Upstash, GA4. Budgets and warning signs are in `docs/deployment.md` §3 and `docs/integrations.md`. |
| Caching | Public pages stay cached. Anything that forces them to render per request costs hosting credits and needs an ADR. |

## 6. SEO requirements (from the owner's list)

Sitemap · llms.txt · Open Graph · robots.txt · JSON-LD. The canonical items from the owner's checklist are **mistakes to prevent**, each enforced by a test:

1. Same canonical on every page → each page canonicalizes to itself
2. Two canonical tags → exactly one
3. Relative URL → absolute URL
4. Added by JavaScript → server-rendered in initial HTML
5. Page 2 → page 1 → page 2 canonicalizes to page 2
6. Canonical → redirect / 404 → canonical target always returns 200

## 7. Success metrics (first 3 months)

- Leads per week: `generate_lead` + `whatsapp_click` + `call_click` in GA4 (`docs/analytics.md`)
- Organic search clicks (Google Search Console, Bing Webmaster Tools)
- Mobile Core Web Vitals "Good" for ≥ 75% of visits
- Netlify credits stay under 75% each month
- Zero security incidents; zero P1 bugs open

## 8. Open decisions

| Decision | Owner | Blocks | Default if undecided |
|---|---|---|---|
| Gmail address | Owner | Launch | — |
| Payment methods, courier charges and timing, return policy | Owner | Launch (How to Order, FAQ) | — |
| Photo rights: permission or own photos | Owner | Launch sign-off | — |
| The name "Lajwanti": the posters say "Lajwanti by" another brand, so the collection name may belong to it | Owner | Launch sign-off | Keep the collection name as the owner asked; confirm with the supplier |
| Whose is the round black and yellow Urdu logo on the Dhanak and Khaddar posters | Owner | Nothing; it is cropped out | — |
| Social links | Owner | Nothing; hidden when empty | Hidden |
| 3D hero concept | Owner | Phase 8 | Flowing-fabric shader with no downloaded model (`docs/design.md` §6) |

## 9. Future (v2+ candidates)

Cart + local payment gateway, courier booking and tracking, stitching service, reviews, lookbook pages, 360° product spins, newsletter, own photo shoots for every suit.
