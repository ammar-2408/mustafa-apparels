# Design

The brand comes from the logo pack in `mustafa-apparels-logos/mustafa-apparels-logos/`. Everything visual is driven by design tokens, so components never hard-code colours or fonts.

## 1. Brand

### 1.1 Style

Monochrome, minimal and editorial: an angular, high-contrast MA monogram over widely spaced thin capitals. The site stays quiet so the suits' colours and embroidery carry the page. **There is no accent colour; product photos supply the colour.**

### 1.2 Tokens

Tokens live in `packages/config/tailwind` (Tailwind theme reads CSS variables) and `apps/*/app/globals.css`.

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--color-bg` | `#FAF7EC` cream | Main background | — |
| `--color-surface` | `#FFFFFF` white | Cards, forms | — |
| `--color-fg` | `#111111` ink | Headings, main text | 17.61:1 on cream |
| `--color-muted` | `#5C584E` | Secondary text | 6.61:1 on cream |
| `--color-accent` | `#111111` ink | Primary buttons, links | 17.61:1 on cream |
| `--color-accent-fg` | `#FAF7EC` cream | Text on ink | 17.61:1 |
| `--color-border-strong` | `#8A8578` | Form fields, UI borders | 3.43:1 on cream (AA for UI) |
| `--color-border` | `#D9D3C3` | Decorative lines only | 1.39:1 (not for anything that must be seen) |
| `--color-inverse-bg` | `#111111` ink | Footer, dark sections | — |
| `--color-inverse-muted` | `#BDB7A6` | Secondary text on ink | 9.43:1 on ink |

Error and success colours are chosen and contrast-tested at step 1.2. `--color-border-strong` and `--color-muted` are derived from the logo's ink and cream; only `#111111`, `#FAF7EC` and `#FFFFFF` are official.

**Typography:** Montserrat only, via `next/font` (self-hosted).
| Use | Weight | Style |
|---|---|---|
| Headings | Light 300 | Fluid sizes with `clamp()` |
| Small labels, nav, buttons | Regular 400 | Uppercase, `letter-spacing: 0.4em` (reduce to about `0.2em` where text would wrap on phones) |
| Body | Regular 400 | Sentence case, no extra tracking |

Don't use Light 300 under about 20px, because it gets hard to read on phones. Load only weights 300 and 400.

Radius: small or none (`--radius-sm: 2px`), to match the logo's angular shapes. Shadows: `--shadow-soft`, sparingly. Dark mode: not in v1.

### 1.3 Logo files

Source: `mustafa-apparels-logos/mustafa-apparels-logos/`. Use the files as they are; never redraw, stretch, recolour or add effects. Step 1.1 copies them, keeping the pack's folder names.

| Goes into | Files |
|---|---|
| `apps/web/public/brand/svg/` | All 8 SVGs: `mustafa-apparels-{primary,secondary,simplified,submark}-{black,white}.svg` |
| `apps/web/public/brand/favicon/` | `favicon.svg`, `favicon.ico`, `favicon-32.png`, `apple-touch-icon-180.png`, `icon-192.png`, `icon-512.png` |
| `apps/web/public/brand/social/` | `og-share-image-1200x630.png` |
| `apps/admin/public/brand/svg/` | `mustafa-apparels-submark-black.svg`, `mustafa-apparels-simplified-black.svg` |
| `apps/admin/public/brand/favicon/` | The same favicon set |
| Stay out of the apps | `pdf/` (print), `png/` (social), `social/profile-picture-1080.png` (profile pictures) |

| Place | Logo | Minimum height |
|---|---|---|
| Desktop header | Secondary, black | 40 px (use 48 px) |
| Mobile header | Submark, black | 24 px (use 32 px) |
| Sticky header on scroll | Simplified, black | 28 px |
| Footer on ink | Primary, white | 120 px (use 140 px) |
| About page, hero | Primary | 120 px |

Rules: keep clear space of at least a quarter of the monogram's height. Black on light backgrounds, white on dark. Never place the black logo on a dark or busy photo. Set one dimension in CSS, with `width` and `height` attributes to prevent layout shift.

**Text:** the logo reads "MA Apparels by Mustafa Ahmed", and the shop's public name is Mustafa Apparels.
- Primary and secondary `alt`: `MA Apparels by Mustafa Ahmed`
- Simplified and submark `alt`: `MA Apparels`
- Home link `aria-label`: `Mustafa Apparels home`
- Manifest `name` and `short_name`: `Mustafa Apparels`
- `theme_color` and `background_color`: `#FAF7EC`

## 2. Layout and responsive design

Mobile-first. Must work from **320px** to **2560px+**.

| Name | Min width | Typical device | Layout notes |
|---|---|---|---|
| base | 0 | small phones (320–479) | 1-col text, 2-col product grid, bottom-sheet filters, sticky WhatsApp bar on product page |
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
- Stock photos are full-length and tall, about 0.55 width to height, against 0.75 for a 3:4 box. Grid cards fill the box from the top, cutting off the lower part. The product gallery shows the whole photo on the surface colour rather than cutting off the model. Check this with real imports at step 5.6.

## 3. Page inventory

**Storefront:** Home · Shop (all) · Collection · Product · Search · About · Contact · How to Order · FAQ · Privacy · Terms · Login · Register · Forgot/Reset password · Account (profile, wishlist, inquiries) · 404 · Error.
**Admin:** Login + 2FA · Dashboard · Suits (list, create/edit) · Collections · Inquiries · Customers · Settings · Audit log.

Admin design: clean, fast, no 3D; dense tables on desktop, card lists on mobile; same tokens.

**Wording:** the site calls products "suits" or "unstitched suits", never "dresses". It never mentions other brands (`docs/prd.md` §2).

**Filters:** volume style, dress category, fabric, design, season, outfit style, colour and price, from the fixed list in `docs/catalog.md` §4. A filter value shows only when a published suit has it, and a filter with one value or none is hidden. With 30 suits, that keeps the bar short; on mobile, it's a bottom sheet. Colour swatches use `color_family`; the product page shows the fuller `main_color` name.

**The same design in another colour:** the product page shows a small "Also in this design" row, linking to the other colours (`related_design_codes`).

## 4. Home page structure (draft)

1. **Hero** — 3D fabric scene (see §6) with headline revealed by SplitText; static poster fallback.
2. **New arrivals** — horizontal scroll-driven gallery (ScrollTrigger pin on desktop, swipe carousel on mobile).
3. **Collections** — large tiles for Dhanak, Khaddar and Lajwanti, with WebGL hover distortion (desktop) / simple scale (mobile).
4. **Featured suit** — sticky image + scrolling details, including a muted video when in view.
5. **How to order** — WhatsApp, courier across Pakistan, payment in chat; text reveal on scroll.
6. **Contact strip** — WhatsApp first, then call and email. No address or map.
7. Footer — primary white logo on ink, links, socials (hidden when empty).

## 5. Motion and video

### 5.1 Motion system (GSAP)

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

### 5.2 Product video

Video appears **on product pages only**, plus at most one featured suit on the home page. **Never in grids**, because Cloudinary's free plan has about 25 GB of shared monthly capacity.

| Behaviour | Rule |
|---|---|
| Sound | Delivered with no audio track (`ac_none`), `muted`, `playsInline`. The stock videos have audio tracks, which are removed on delivery |
| Loading | `preload="none"`, poster image first. Source attached only when the tile enters the viewport |
| Playback | Autoplays muted while in view, pauses out of view and when the tab is hidden. Loops. Visible pause button |
| Reduced motion or Save-Data | Poster only, with a tap-to-play button |
| Shape | Tile keeps the video's own ratio with `object-fit: contain`. Most stock is 9:16; `dhnk8-VID` is landscape with blurred sides, and `dhnk4-VID` has beige bars above and below |
| Gallery position | After the main image, so a video is never the LCP element |
| Accessibility | Pause control reachable by keyboard; `aria-label` from the alt text; nothing plays over 5 s without a pause control |

## 6. 3D direction (Three.js / React Three Fiber)

Admins upload **photos and videos**, not 3D models — so 3D is used for **brand moments and effects**, not for every product.

**Chosen concept: flowing fabric.** A cloth-like plane with a vertex-shader wave, reacting to cursor and scroll, in ink on cream with the MA monogram nearby. It suits a fabric business and fits the monochrome brand. It downloads **no model**, only shader code, because at Netlify's 20 credits per GB a 1.5 MB model would cost about 30 credits per 1,000 home visits.

**Also planned:** WebGL distortion on collection tiles and product photos on hover (works with uploaded photos).

Performance budget and rules (enforced by the `three-scene` skill):
- 3D is a lazy client island: loads after first paint, only when in viewport; static poster image (same framing) underneath → LCP is the poster, not the canvas.
- Hero JS for 3D ≤ 250 kB gzipped, loaded on the home page only. No `.glb`. If a model is ever added, serve it from Cloudinary, keep it ≤ 1.5 MB, and record an ADR.
- `dpr={[1, 2]}`, `frameloop="demand"` when idle, pause when tab hidden or off-screen.
- Fallbacks: no WebGL / low-end device (`navigator.hardwareConcurrency <= 4` or Save-Data) / reduced motion → poster image + CSS animation.
- Dispose geometries/materials/textures on unmount; handle `webglcontextlost`.

## 7. Accessibility (WCAG 2.2 AA)

- Semantic HTML landmarks; one `<h1>` per page; skip link.
- All images and videos have alt text (admin form requires it); decorative 3D canvas `aria-hidden` with text equivalent nearby.
- Colour contrast ≥ 4.5:1 text, 3:1 large text/UI.
- Full keyboard support: menus, filters, gallery, video, dialogs (focus trap, Esc closes), visible focus rings.
- Forms: labels, inline errors announced (`aria-live`), no placeholder-only labels.
- Motion: `prefers-reduced-motion` respected everywhere; no auto-playing content > 5s without pause.
- Automated: axe in Playwright on every page template; manual screen-reader check before release.

## 8. SEO implementation

This section covers tags and URLs in code. Search Console, Bing, AI answers and backlinks are in `docs/seo-geo.md`.

### 8.1 Metadata on every page
Built with the Next.js Metadata API (`generateMetadata`) through one helper `buildMetadata()` in `apps/web/lib/seo.ts`:
- `metadataBase: new URL(SITE_URL)`
- `title` (template `%s | Mustafa Apparels`), `description` (120–160 chars)
- `alternates.canonical` = **absolute self URL** from `canonicalUrl(pathname, { page })`
- `openGraph` (type, url = canonical, title, description, images 1200×630 absolute, siteName `Mustafa Apparels`, locale `en_PK`), `twitter` (`summary_large_image`)
- `robots`: `index, follow` for shop pages; `noindex, follow` for search; `noindex, nofollow` for account/auth; previews and admin send `X-Robots-Tag: noindex` header too.

Default share image: `/brand/social/og-share-image-1200x630.png`. Product pages use the product's main image.

### 8.2 Canonical rules (each one tested in `e2e/seo/canonical.spec.ts`)

| Rule | Implementation | Test |
|---|---|---|
| Unique per page | `canonicalUrl()` uses the real pathname | Crawl sitemap; no two pages share a canonical unless identical content |
| Exactly one tag | Only `buildMetadata()` sets it; never hand-write `<link rel=canonical>` | Count = 1 on every page |
| Absolute URL | Built from `SITE_URL` (`https://mustafaapparels.com`), no trailing-slash mix | Starts with `SITE_URL`, parses as URL |
| Server-rendered, in `<head>` | Metadata API; verify raw HTML (no JS) | Fetch HTML without JS (normal and Googlebot user-agents); tag inside `<head>`. If Next.js streams metadata outside `<head>` for some user-agents, configure `htmlLimitedBots` so metadata blocks render |
| Pagination self-canonical | `/collections/dhanak?page=2` → canonical `…?page=2`; `?page=1` → 301 to clean URL | Check pages 1–3 |
| Never to redirect/404 | Canonical = final URL after slug redirects; deleted products 404 and leave the sitemap | Request each canonical → status 200, no redirect |
| Clean parameters | Filter/sort params (`?pieces=three_piece&sort=price`) canonicalize to the unfiltered page (or are `noindex`) | Filter URLs' canonical has no filter params |

Other URL rules: lowercase slugs, no trailing slash, `http→https` and `www`→apex handled by Netlify, one URL per suit.

### 8.3 Structured data (JSON-LD, server-rendered)
- **Product page:** `Product` (name, image[], description, sku = design code, color, material = fabric, `offers` with `price`, `priceCurrency: PKR`, `availability`, `url`, and `seller` = Mustafa Apparels) + `BreadcrumbList`. **No `brand`** (`docs/architecture.md` ADR-014). Add `shippingDetails` and `hasMerchantReturnPolicy` only once the owner supplies that information.
- **Videos on a product page:** `VideoObject` (name, description, thumbnailUrl, uploadDate, contentUrl, duration). Check the current required properties in Google's docs when building it.
- **Collection pages:** `BreadcrumbList` + `ItemList`.
- **Home and Contact:** `OnlineStore` (name `Mustafa Apparels`, alternateName `MA Apparels`, url, logo, description, `contactPoint` with telephone, `areaServed: PK`, `sameAs` socials if any). **No address or opening hours.**
- Validate with Google's Rich Results Test before release.

### 8.4 `llms.txt`
Route `app/llms.txt/route.ts`, `Content-Type: text/plain; charset=utf-8`, cached and revalidated with the `products` tag. Format (llmstxt.org):
```markdown
# Mustafa Apparels

> Online shop for women's unstitched suits in Pakistan. Browse Dhanak, Khaddar and Lajwanti 2-piece and 3-piece suits and order on WhatsApp, with courier delivery across Pakistan. Prices in PKR.

## Collections
- [Dhanak](https://mustafaapparels.com/collections/dhanak): short description
- [Khaddar](https://mustafaapparels.com/collections/khaddar): short description
- [Lajwanti](https://mustafaapparels.com/collections/lajwanti): short description

## Key pages
- [All suits](https://mustafaapparels.com/shop)
- [How to order](https://mustafaapparels.com/how-to-order)
- [Contact](https://mustafaapparels.com/contact)
- [FAQ](https://mustafaapparels.com/faq)

## Optional
- [Sitemap](https://mustafaapparels.com/sitemap.xml)
```

### 8.5 Sitemap & robots
- `app/sitemap.ts`: home, shop, static pages, active collections (and their paginated pages), published products with `lastModified`. Absolute URLs. Split into multiple sitemaps if > 45k URLs.
- `app/robots.ts`, live production: allow all, `Disallow: /api`, `Sitemap:` line. **Do not disallow search, account or auth pages**: if crawlers are blocked they can't read the `noindex` on those pages, and the URLs can still appear in results.
- Preview, dev and production before launch (`SITE_INDEXABLE=false`): `Disallow: /`.

### 8.6 Status codes
- Unknown product/collection/page number → `notFound()` → real **404**.
- Changed slug → **301** via `slug_redirect`.
- Unpublished/archived product → 404 (or 410 for permanently removed).
- Errors → 500 page with no stack trace.

## 9. Reference-site workflow ("image to code")

Use references for ideas — layout rhythm, motion timing, interaction patterns — never copy their code, images, fonts, text or logos. Process: `reference-to-code` skill (screenshots at each breakpoint via Playwright MCP → describe structure and motion → rebuild with our tokens and components).

Starting references collected so far (add more as you find them):

| Reference | What to study |
|---|---|
| outfit.hellohello.is | GSAP-driven shop interactions, product hover/transition motion |
| ceciliebahnsen.com | Soft, feminine pacing for a clothing brand |
| almadalabel.com | Clean womenswear store, "shop the look" runway page |
| immersivebags.miumiu.com | Immersive 3D brand moment |
| heirest.com | 3D/interactive product view inside a real store |
| awwwards.com/websites/fashion | Ongoing inspiration (filter by GSAP, 3D, E-commerce) |
