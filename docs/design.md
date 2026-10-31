# Design

Brand name, logo, colours and fonts are **not decided yet**. Everything visual is driven by design tokens, so the theme is applied in one place later (Phase 6 in `project-implementation.md`) without touching components.

## 1. Brand placeholders (fill in after the logo)

| Token group | Placeholder | Decide later |
|---|---|---|
| Name / logo | `<SHOP_NAME>`, text wordmark | SVG logo, favicon set, OG template |
| Colours | `--color-bg`, `--color-fg`, `--color-muted`, `--color-accent`, `--color-accent-fg`, `--color-border` | Palette from logo (contrast-checked AA) |
| Fonts | Display: elegant serif; Body: clean sans (both via `next/font`, self-hosted) | Final pair |
| Radius / shadow | `--radius-sm/md/lg`, `--shadow-soft` | Style direction |

Tokens live in `packages/config/tailwind` (Tailwind theme reads CSS variables) and `apps/*/app/globals.css`. Dark mode: optional, tokens support it.

## 2. Layout and responsive design

Mobile-first. Must work from **320px** to **2560px+**.

| Name | Min width | Typical device | Layout notes |
|---|---|---|---|
| base | 0 | small phones (320–479) | 1-col text, 2-col product grid, bottom-sheet filters, sticky "Inquire" bar on product page |
| `sm` | 480 | large phones | 2-col grid |
| `md` | 768 | tablets portrait | 3-col grid, side filters as drawer |
| `lg` | 1024 | tablets landscape / small laptops | 3–4 col grid, persistent filter sidebar |
| `xl` | 1280 | laptops | 4-col grid |
| `2xl` | 1536 | desktops | 4-col grid, max content width 1440px |
| `3xl` | 1920 | large monitors | 5-col grid option, bigger type scale |
| `4xl` | 2560 | 2K/4K monitors | content stays centred (max 1760px), imagery scales via `srcset` |

Rules:
- Fluid type with `clamp()` (e.g. hero heading `clamp(2.5rem, 6vw + 1rem, 7rem)`).
- Use container queries for cards so the same card works in grid, carousel and sidebar.
- Touch targets ≥ 44×44px; hover effects have a tap/focus equivalent.
- Test portrait **and** landscape on phones and tablets; respect safe areas (`env(safe-area-inset-*)`).
- Product images: fixed **3:4** aspect ratio boxes (no layout shift), `next/image` + Cloudinary loader, `sizes` set per grid.

## 3. Page inventory

**Storefront:** Home · Shop (all) · Collection · Product · Search · About · Contact · FAQ · Privacy · Terms · Login · Register · Forgot/Reset password · Account (profile, wishlist, inquiries) · 404 · Error.
**Admin:** Login + 2FA · Dashboard · Dresses (list, create/edit) · Categories · Inquiries · Customers · Settings · Audit log.

Admin design: clean, fast, no 3D; dense tables on desktop, card lists on mobile; same tokens.

## 4. Home page structure (draft)

1. **Hero** — 3D scene (see §6) with headline revealed by SplitText; static poster fallback.
2. **New arrivals** — horizontal scroll-driven gallery (ScrollTrigger pin on desktop, swipe carousel on mobile).
3. **Collections** — large category tiles with WebGL hover distortion (desktop) / simple scale (mobile).
4. **Featured dress** — sticky image + scrolling details.
5. **Why us / craftsmanship** — text reveal on scroll.
6. **Contact strip** — WhatsApp, call, email, location.
7. Footer — links, socials, hours.

## 5. Motion system (GSAP)

Principles: motion should feel **soft, fabric-like and premium** — never slow down a shopper.

| Token | Value |
|---|---|
| Durations | `fast 0.25s`, `base 0.6s`, `slow 1.1s`, `hero 1.6s` |
| Eases | `power3.out` (enter), `power2.inOut` (move), `expo.out` (hero), `none` (scrubbed scroll) |
| Stagger | 0.06–0.1s for grids, 0.02s for split characters |

Patterns: text line/char reveals (SplitText), image clip-path reveals, scroll-scrubbed parallax (small: ≤ 15% movement), pinned horizontal galleries, Flip transitions for grid ↔ product image, magnetic buttons (desktop only), page transitions (View Transitions API or GSAP overlay).

Rules (enforced by the `motion-gsap` skill):
- Use `useGSAP()` with a scope ref → automatic cleanup on unmount/route change.
- `gsap.matchMedia()` for breakpoints **and** `(prefers-reduced-motion: reduce)` → reduced = opacity fades only, no parallax, no smooth scroll.
- Animate only `transform` and `opacity` (and `clip-path` sparingly). No animating layout properties.
- Content must be visible without JS: initial hidden states set via a `.js` class on `<html>`, not inline in SSR HTML.
- `ScrollTrigger.refresh()` after images/fonts load and after route changes.
- Lenis drives scroll; ScrollTrigger uses Lenis via `lenis.on('scroll', ScrollTrigger.update)`.

## 6. 3D direction (Three.js / React Three Fiber)

Admins upload **photos**, not 3D models — so 3D is used for **brand moments and effects**, not for every product.

Concept options (pick after the logo):
1. **Flowing fabric** — a silk-like cloth plane with a vertex-shader wave, reacting to cursor and scroll; brand colour lighting.
2. **Floating dress** — one hero dress model (`.glb`) slowly rotating, scroll rotates/zooms it.
3. **Abstract** — soft glass/pearl shapes with the logo, depth-of-field.
4. **Image shaders** — WebGL distortion/ripple on product photos on hover and on page transitions (works with uploaded photos).

Performance budget and rules (enforced by the `three-scene` skill):
- 3D is a lazy client island: loads after first paint, only when in viewport; static poster image (same framing) underneath → LCP is the poster, not the canvas.
- Model ≤ 1.5 MB (Draco/Meshopt compressed `.glb`, KTX2 textures); hero JS for 3D ≤ 250 kB gzipped, loaded on the home page only.
- `dpr={[1, 2]}`, `frameloop="demand"` when idle, pause when tab hidden or off-screen.
- Fallbacks: no WebGL / low-end device (`navigator.hardwareConcurrency <= 4` or Save-Data) / reduced motion → poster image + CSS animation.
- Dispose geometries/materials/textures on unmount; handle `webglcontextlost`.

## 7. Accessibility (WCAG 2.2 AA)

- Semantic HTML landmarks; one `<h1>` per page; skip link.
- All images have alt text (admin form requires it); decorative 3D canvas `aria-hidden` with text equivalent nearby.
- Colour contrast ≥ 4.5:1 text, 3:1 large text/UI.
- Full keyboard support: menus, filters, gallery, dialogs (focus trap, Esc closes), visible focus rings.
- Forms: labels, inline errors announced (`aria-live`), no placeholder-only labels.
- Motion: `prefers-reduced-motion` respected everywhere; no auto-playing content > 5s without pause.
- Automated: axe in Playwright on every page template; manual screen-reader check before release.

## 8. SEO implementation

### 8.1 Metadata on every page
Built with the Next.js Metadata API (`generateMetadata`) through one helper `buildMetadata()` in `apps/web/lib/seo.ts`:
- `metadataBase: new URL(SITE_URL)`
- `title` (template `%s | <SHOP_NAME>`), `description` (120–160 chars)
- `alternates.canonical` = **absolute self URL** from `canonicalUrl(pathname, { page })`
- `openGraph` (type, url = canonical, title, description, images 1200×630 absolute, siteName, locale `en_PK`), `twitter` (`summary_large_image`)
- `robots`: `index, follow` for shop pages; `noindex, follow` for search; `noindex, nofollow` for account/auth; previews and admin send `X-Robots-Tag: noindex` header too.

### 8.2 Canonical rules (each one tested in `e2e/seo/canonical.spec.ts`)

| Rule | Implementation | Test |
|---|---|---|
| Unique per page | `canonicalUrl()` uses the real pathname | Crawl sitemap; no two pages share a canonical unless identical content |
| Exactly one tag | Only `buildMetadata()` sets it; never hand-write `<link rel=canonical>` | Count = 1 on every page |
| Absolute URL | Built from `SITE_URL` (`https://…`), no trailing-slash mix | Starts with `SITE_URL`, parses as URL |
| Server-rendered, in `<head>` | Metadata API; verify raw HTML (no JS) | Fetch HTML without JS (normal and Googlebot user-agents); tag inside `<head>`. If Next.js streams metadata outside `<head>` for some user-agents, configure `htmlLimitedBots` so metadata blocks render |
| Pagination self-canonical | `/collections/formal?page=2` → canonical `…?page=2`; `?page=1` → 301 to clean URL | Check pages 1–3 |
| Never to redirect/404 | Canonical = final URL after slug redirects; deleted products 404 and leave the sitemap | Request each canonical → status 200, no redirect |
| Clean parameters | Filter/sort params (`?size=M&sort=price`) canonicalize to the unfiltered page (or are `noindex`) | Filter URLs' canonical has no filter params |

Other URL rules: lowercase slugs, no trailing slash, `http→https` and `www`/non-`www` normalized by the host, one URL per dress.

### 8.3 Structured data (JSON-LD, server-rendered)
- Product page: `Product` (name, image[], description, sku=id, brand, `offers` with `price`, `priceCurrency: PKR`, `availability`, `url`) + `BreadcrumbList`.
- Collection pages: `BreadcrumbList` + `ItemList`.
- Home/Contact: `ClothingStore` (name, logo, telephone, address, openingHours, sameAs socials).
- Validate with Google's Rich Results Test before release.

### 8.4 `llms.txt`
Route `app/llms.txt/route.ts`, `Content-Type: text/plain; charset=utf-8`, cached and revalidated with the `products` tag. Format (llmstxt.org):
```markdown
# <SHOP_NAME>

> Women's dress shop in <city>, Pakistan. Browse formal, casual, party and bridal dresses online and order by phone, WhatsApp or email. Prices in PKR.

## Collections
- [Formal](https://SITE_URL/collections/formal): short description
- ...

## Key pages
- [All dresses](https://SITE_URL/shop)
- [How to order / Contact](https://SITE_URL/contact)
- [FAQ](https://SITE_URL/faq)

## Optional
- [Sitemap](https://SITE_URL/sitemap.xml)
```

### 8.5 Sitemap & robots
- `app/sitemap.ts`: home, shop, static pages, active categories (and their paginated pages), published products with `lastModified`. Absolute URLs. Split into multiple sitemaps if > 45k URLs.
- `app/robots.ts`: allow all on production except `/account`, `/api`, `/search`, auth pages; `Sitemap:` line. Preview/dev: `Disallow: /`.

### 8.6 Status codes
- Unknown product/category/page number → `notFound()` → real **404**.
- Changed slug → **301** via `slug_redirect`.
- Unpublished/archived product → 404 (or 410 for permanently removed).
- Errors → 500 page with no stack trace.

## 9. Reference-site workflow ("image to code")

Use references for ideas — layout rhythm, motion timing, interaction patterns — never copy their code, images, fonts, text or logos. Process: `reference-to-code` skill (screenshots at each breakpoint via Playwright MCP → describe structure and motion → rebuild with our tokens and components).

Starting references collected so far (add more as you find them):

| Reference | What to study |
|---|---|
| outfit.hellohello.is | GSAP-driven shop interactions, product hover/transition motion |
| ceciliebahnsen.com | Soft, feminine pacing for a dress brand |
| almadalabel.com | Clean womenswear store, "shop the look" runway page |
| immersivebags.miumiu.com | Immersive 3D brand moment |
| heirest.com | 3D/interactive product view inside a real store |
| awwwards.com/websites/fashion | Ongoing inspiration (filter by GSAP, 3D, E-commerce) |
