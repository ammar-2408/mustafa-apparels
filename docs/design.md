# Design

The brand comes from the logo pack in `mustafa-apparels-logos/mustafa-apparels-logos/`. Everything visual is driven by design tokens, so components never hard-code colours or fonts.

## 1. Brand

### 1.1 Style

Monochrome, minimal and editorial: an angular, high-contrast MA monogram over widely spaced thin capitals. The site stays quiet so the suits' colours and embroidery carry the page. **There is no accent colour; product photos supply the colour.** Overall look and motion direction: §9.1.

### 1.2 Tokens

Tokens live in `packages/config/tailwind/theme.css`, a Tailwind v4 `@theme static` block that each app's `apps/*/app/globals.css` imports right after Tailwind. It clears Tailwind's default colours, breakpoints, radii and shadows, so `bg-red-500` or `rounded-xl` produce nothing and only brand values exist. Every token is also a CSS variable on `:root`. Utilities follow the token names: `bg-bg`, `bg-surface`, `text-fg`, `text-muted`, `bg-accent`, `text-accent-fg`, `border-border-strong`, `text-error`. `packages/config/test/tailwind-theme.test.mjs` checks every contrast pair below and compiles both apps' CSS.

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
| `--color-error` | `#A3271B` deep brick | Error text, invalid field borders | 6.84:1 on cream, 7.33:1 on white |
| `--color-success` | `#2E6B3F` deep green | Success text | 5.95:1 on cream, 6.38:1 on white |

Error and success are muted, deep tones so they sit with the monochrome palette. They are for text and borders on cream or white, never on ink, and never the only signal: pair them with words or an icon. `--color-border-strong` and `--color-muted` are derived from the logo's ink and cream; only `#111111`, `#FAF7EC` and `#FFFFFF` are official.

**Typography:** Montserrat only, via `next/font` (self-hosted).
| Use | Weight | Style |
|---|---|---|
| Headings | Light 300 | Fluid sizes with `clamp()` |
| Small labels, nav, buttons | Regular 400 | Uppercase, `letter-spacing: 0.4em` (reduce to about `0.2em` where text would wrap on phones) |
| Body | Regular 400 | Sentence case, no extra tracking |

Don't use Light 300 under about 20px, because it gets hard to read on phones. Load only weights 300 and 400. The logo pack's readme suggests Light 300 for spaced capitals, but these labels are small, so Regular 400 is the deliberate choice here.

Each app loads the font in `app/fonts.ts` (`next/font/google`, served from our own domain, `display: swap`) and puts its `--font-montserrat` variable on `<html>`. The theme clears Tailwind's other font families and weights, so only `font-sans`, `font-light` (300) and `font-normal` (400) exist and nothing is faux-bolded. The type scale replaces Tailwind's sizes:

| Utility | Size | Leading | Use |
|---|---|---|---|
| `text-display` | `clamp(2.5rem, 6vw + 1rem, 7rem)` (40–112px) | 1, tracking −0.02em | Home hero, one per page at most |
| `text-h1` | `clamp(2.25rem, 4vw + 1rem, 5rem)` (36–80px) | 1.05, −0.015em | Page headings |
| `text-h2` | `clamp(1.75rem, 2.5vw + 1rem, 3.5rem)` (28–56px) | 1.1, −0.01em | Section headings |
| `text-h3` | `clamp(1.25rem, 1vw + 1rem, 1.75rem)` (20–28px) | 1.25 | Sub-headings, the smallest Light 300 size |
| `text-body-lg` | 1.125rem (18px) | 1.6 | Lead paragraphs |
| `text-body` | 1rem (16px) | 1.6 | Body text (the default on `<body>`) |
| `text-small` | 0.875rem (14px) | 1.5 | Notes, captions |
| `text-label` | 0.75rem (12px) | 1.4 | Size used by `caps` |

Headings pair a size with `font-light`, e.g. `text-h1 font-light`; `h1`–`h3` get `text-wrap: balance`. Spaced capitals use `caps` (12px Regular 400, uppercase, `0.4em`), or `caps-tight` (`0.2em`) where they would wrap on phones, e.g. `caps-tight sm:caps`.

Radius: small or none (`--radius-sm: 2px`, the only radius token; `rounded-full` still works for round icons), to match the logo's angular shapes. Shadows: `--shadow-soft` (the only shadow token), sparingly. Dark mode: not in v1, and `color-scheme: light` keeps form controls light.

### 1.3 Logo files

Source: `mustafa-apparels-logos/mustafa-apparels-logos/`. Use the files as they are; never redraw, stretch, recolour or add effects. Step 1.1 copies them, keeping the pack's folder names.

| Goes into | Files |
|---|---|
| `apps/web/public/brand/svg/` | All 8 SVGs: `mustafa-apparels-{primary,secondary,simplified,submark}-{black,white}.svg` |
| `apps/web/public/brand/favicon/` | `favicon.svg`, `favicon-32.png`, `apple-touch-icon-180.png`, `icon-192.png`, `icon-512.png` |
| `apps/web/public/` and `apps/admin/public/` | `favicon.ico`, at the root where browsers ask for it |
| `apps/web/public/brand/social/` | `og-share-image-1200x630.png` |
| `apps/admin/public/brand/svg/` | `mustafa-apparels-submark-black.svg`, `mustafa-apparels-simplified-black.svg` |
| `apps/admin/public/brand/favicon/` | The same favicon set, without `favicon.ico` |
| Stay out of the apps | `pdf/` (print), `png/` (social), `social/profile-picture-1080.png` (profile pictures) |

| Place | Logo | Minimum height |
|---|---|---|
| Desktop header | Secondary, black | 40 px (use 48 px) |
| Mobile header | Submark, black | 24 px (use 32 px) |
| Sticky header on scroll | Simplified, black | 28 px |
| Footer on ink | Primary, white | 120 px (use 140 px) |
| About page, hero | Primary | 120 px |

**Component:** `apps/web/components/logo.tsx`. `<Logo variant colour height loading>` renders the file through `next/image` (unoptimized SVG) with the right `alt`. Its `width` and `height` attributes come from the file's own viewBox ratio, and CSS sets only the height. A height below the table's minimum is raised to it, and the default is the "use" size. `<HeaderLogo>` is the home link (`aria-label` below, at least 44px tall): the submark below `md`, the secondary logo from `md` (768px) up, both loaded eagerly. Clear space is left to the layout around it.

Rules: keep clear space of at least a quarter of the monogram's height. Black on light backgrounds, white on dark. Never place the black logo on a dark or busy photo. Set one dimension in CSS, with `width` and `height` attributes to prevent layout shift.

**Text:** the logo reads "MA Apparels by Mustafa Ahmed", and the shop's public name is Mustafa Apparels.
- Primary and secondary `alt`: `MA Apparels by Mustafa Ahmed`
- Simplified and submark `alt`: `MA Apparels`
- Home link `aria-label`: `Mustafa Apparels home`
- Manifest `name` and `short_name`: `Mustafa Apparels`. The admin's are `Mustafa Apparels Admin` and `MA Admin`, so the owner can tell the two apart on a home screen
- `theme_color` and `background_color`: `#FAF7EC`

**Favicons and manifest:** `packages/config/brand.ts` holds them for both apps. Each root layout exports `metadata.icons` (`/favicon.ico` sized `32x32` so Chrome prefers the SVG, `favicon.svg`, and the 180px Apple touch icon) and `viewport.themeColor`. Each `app/manifest.ts` serves `/manifest.webmanifest` with the 192 and 512px icons as `purpose: any`. They aren't `maskable`, because the monogram's corners reach just past the safe circle; a maskable icon would need a new file from the logo designer. `favicon-32.png` stays available but isn't linked, since the `.ico` and SVG cover every browser.

### 1.4 Spacing

Generous and even, so the suits have room. Use Tailwind's 4px scale, limited to these steps, with no one-off values:

| Tailwind step | 1 | 2 | 3 | 4 | 6 | 8 | 12 | 16 | 24 | 32 |
|---|---|---|---|---|---|---|---|---|---|---|
| Pixels | 4 | 8 | 12 | 16 | 24 | 32 | 48 | 64 | 96 | 128 |

| Token | Value | Use |
|---|---|---|
| `--spacing-gutter` | `clamp(1rem, 4vw, 3rem)` | Page side padding (16px on phones): `px-gutter` |
| `--spacing-grid` | `clamp(0.75rem, 2vw, 1.5rem)` | Gap between product cards: `gap-grid` |
| `--spacing-section` | `clamp(4rem, 10vw, 10rem)` | Space between page sections: `py-section` |
| `--container-content` | `90rem` (1440px) | Max content width from `2xl`: `max-w-content` |
| `--container-content-wide` | `110rem` (1760px) | Max content width from `4xl`: `max-w-content-wide` |

The names use Tailwind v4's `--spacing-*` and `--container-*` namespaces so the utilities exist. Tailwind's numeric scale stays whole, because it also sizes things (`size-11` is a 44px touch target); keep padding, margins and gaps to the steps above.

### 1.5 Tone

Product descriptions and other customer-facing text use simple English and a warm voice, as if a helpful shopkeeper were describing the suit. A suit description is 1–2 short sentences that **name the fabric and the season**, then say what's visible: the pieces, the print or embroidery, the colours.

Example: "A black unstitched 3-piece Dhanak suit for winter. The embroidered shirt has a beige diamond panel down the front, with a floral printed dupatta and plain dyed trousers."

- **"Warm" describes the voice, not the fabric.** "For winter" is fine, because the season comes from the collection file. "Keeps you warm" is a claim.
- **Only what's visible or in the collection file.** No claims about softness, warmth, quality or stock unless the owner confirmed them.
- **Your own words.** Never another brand's name, and never text from posters or videos.
- **No hype or invented claims:** "luxury", "must-have", "best in Pakistan".
- **"Suits" or "unstitched suits"**, never "dresses". No mention of sizes.

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
- Stock photos are full-length and tall, about 0.4 to 0.6 width to height, against 0.75 for a 3:4 box. Grid cards fill the box from the top (`g_north`, `docs/integrations.md`), cutting off the lower part. The product gallery shows the whole photo on the surface colour rather than cutting off the model. Check this with real imports at step 6.14.

## 3. Page inventory

**Storefront:** Home · Shop (all) · Collection · Product · Search · About · Contact · How to Order · FAQ · Privacy · Terms · Login · Register · Forgot/Reset password · Account (profile, wishlist, inquiries) · 404 · Error.
**Admin:** Login + 2FA · Dashboard · Suits (list, create/edit) · Collections · Inquiries · Customers · Settings · Audit log.

Admin design: clean, fast, no 3D; dense tables on desktop, card lists on mobile; same tokens.

**Wording:** the site calls products "suits" or "unstitched suits", never "dresses". It never mentions other brands (`docs/prd.md` §2).

**Filters:** volume style, dress category, fabric, design, season, outfit style, colour and price, from the fixed list in `docs/catalog.md` §4. Customers see the dress category filter labelled "Category". A filter value shows only when a published suit has it, and a filter with one value or none is hidden. With 30 suits, that keeps the bar short; on mobile, it's a bottom sheet. Colour swatches use `color_family`; the product page shows the fuller `main_color` name.

Filters and sort run in the browser, so pages stay static (ADR-018). The first use loads `/api/suits` once. The URL updates (`?fabric=dhanak&sort=price`), so it can be shared and Back works, and the filtered view has its own client-side paging. The server-rendered page always shows the unfiltered grid with real `/page/<n>` links, so it works without JavaScript and crawlers see every suit.

**The same design in another colour:** the product page shows a small "Also in this design" row, linking to the other colours (`related_design_codes`).

## 4. Home page structure (draft)

Motion for each section follows §9.1.

1. **Hero** — full-screen 3D fabric scene (see §6) with a large headline revealed line by line by SplitText; static poster fallback. On scroll it insets from the page edges (desktop).
2. **Statement** — one plain sentence about the shop in large type, each word filling from muted to ink as you scroll.
3. **New arrivals** — horizontal scroll-driven gallery (ScrollTrigger pin on desktop, swipe carousel on mobile).
4. **Collections** — three tall panels for Dhanak, Khaddar and Lajwanti with thin dividers, large names and a hover reveal, with WebGL hover distortion (desktop) / simple scale (mobile).
5. **Featured suit** — sticky image + scrolling details, including a muted video when in view.
6. **How to order** — WhatsApp, courier across Pakistan, payment in chat, as cards that stack on scroll (desktop) with a text reveal.
7. **Contact strip** — WhatsApp first, then call and email. No address or map.
8. Footer — primary white logo on ink, links, socials (hidden when empty).

## 5. Motion and video

### 5.1 Motion system (GSAP)

Principles: motion should feel **soft, fabric-like and premium** — never slow down a shopper.

| Token | Value |
|---|---|
| Durations | `fast 0.25s`, `base 0.6s`, `slow 1.1s`, `hero 1.6s` |
| Eases | `power3.out` (enter), `power2.inOut` (move), `expo.out` (hero), `none` (scrubbed scroll) |
| Stagger | 0.06–0.1s for grids, 0.02s for split characters |

Patterns: text line/char reveals (SplitText), word-by-word text fill on scroll, image clip-path reveals, scroll-scrubbed parallax (small: ≤ 15% movement), pinned horizontal galleries, stacking cards, Flip transitions for grid ↔ product image, magnetic buttons (desktop only), page transitions (a short cream cover with the MA submark, using the View Transitions API or a GSAP overlay). Where and how much: §9.1.

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

**Chosen concept: flowing fabric.** A cloth-like plane with a vertex-shader wave, reacting to cursor and scroll, in ink on cream with the MA monogram nearby. It suits a fabric business and fits the monochrome brand. It should read as real draped cloth, with large soft folds and light across them, rather than a flat wave (§9.1). It downloads **no model**, only shader code, because at Netlify's 20 credits per GB a 1.5 MB model would cost about 30 credits per 1,000 home visits.

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
- `title`: template `%s | Mustafa Apparels`, at most 60 characters in full. If the suffix would pass 60, drop it (`title.absolute`). Today, 13 of 30 suit names need this
- `description`: 120–160 characters, everywhere. Longer text is trimmed at a word boundary, because most suit descriptions run past 160
- `alternates.canonical` = **absolute self URL** from `canonicalUrl(pathname)`
- `openGraph` (type, url = canonical, title, description, images 1200×630 absolute, siteName `Mustafa Apparels`, locale `en_PK`), `twitter` (`summary_large_image`)
- `robots`: `index, follow` for shop pages; `noindex, follow` for search; `noindex, nofollow` for account/auth; previews and admin send `X-Robots-Tag: noindex` header too.

Default share image: `/brand/social/og-share-image-1200x630.png`. Collection and product pages use a generated image (`opengraph-image.tsx`, 1200×630), cached because each generation costs compute credits.

### 8.2 Canonical rules (each one tested in `e2e/seo/canonical.spec.ts`)

| Rule | Implementation | Test |
|---|---|---|
| Unique per page | `canonicalUrl()` uses the real pathname | Crawl sitemap; no two pages share a canonical unless identical content |
| Exactly one tag | Only `buildMetadata()` sets it; never hand-write `<link rel=canonical>` | Count = 1 on every page |
| Absolute URL | Built from `SITE_URL` (`https://mustafaapparels.com`), no trailing-slash mix | Starts with `SITE_URL`, parses as URL |
| Server-rendered, in `<head>` | Metadata API; verify raw HTML (no JS) | Fetch HTML without JS (normal and Googlebot user-agents); tag inside `<head>`. If Next.js streams metadata outside `<head>` for some user-agents, configure `htmlLimitedBots` so metadata blocks render |
| Pagination self-canonical | `/collections/dhanak/page/2` → canonical is itself; `/collections/dhanak/page/1` → 301 to `/collections/dhanak` (ADR-017) | Check pages 1–3 |
| Never to redirect/404 | Canonical = final URL after slug redirects; deleted products 404 and leave the sitemap | Request each canonical → status 200, no redirect |
| Clean parameters | Filter/sort params (`?pieces=three_piece&sort=price`) are read only in the browser (ADR-018), so the server sends the unfiltered page and its canonical | Filter URLs' canonical has no filter params |

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
- Unknown product/collection/page number → `notFound()` → real **404**. No `loading.tsx` above `(shop)` routes: once streaming starts, a 404 or redirect loses its real status code.
- Changed slug → **permanent redirect** via `slug_redirect` (`permanentRedirect()` sends 308; search engines treat it like a 301).
- `/page/1` → **301** to the clean URL, set in `next.config` with `statusCode: 301`.
- Unpublished/archived product → 404 (or 410 for permanently removed).
- Errors → 500 page with no stack trace.

## 9. Reference-site workflow ("image to code")

Use references for ideas — layout rhythm, motion timing, interaction patterns — never copy their code, images, fonts, text or logos. Process: `reference-to-code` skill (screenshots at each breakpoint via Playwright MCP → describe structure and motion → rebuild with our tokens and components).

References collected so far (add more as you find them):

| Reference | What to study |
|---|---|
| davaris.gr | **Main reference** for look and motion: see §9.1 |
| ceciliebahnsen.com | Soft, feminine pacing for a clothing brand |
| almadalabel.com | Clean womenswear store, "shop the look" runway page |
| immersivebags.miumiu.com | Immersive 3D brand moment |
| heirest.com | 3D/interactive product view inside a real store |
| awwwards.com/websites/fashion | Ongoing inspiration (filter by GSAP, 3D, E-commerce) |

### 9.1 Design direction: davaris.gr

**This is the design direction for the brand, storefront and motion phases.** davaris.gr is a textile company, close to what we sell. It's studied for **look and motion only**, not structure: our pages stay as listed in §3, and this style applies across all of them. Never copy its code, images, text, font or logo, and never name it on the site. Studied on 2026-11-01 at 360, 768, 1280 and 1920 px.

| Aspect | What it does | How we adapt it |
|---|---|---|
| Layout rhythm | Calm, full-screen moments alternating with large areas of empty cream. Full-bleed media, then generous white space, then type | Same rhythm with `--spacing-section`. One idea per screen on Home; tighter on Shop and other working pages |
| Typography feel | Very large, tight headings, set against tiny labels. A wide sans at medium weight | Montserrat Light 300 at large `clamp()` sizes with tight leading (about 1), against our spaced-capital labels. No second font |
| Fabric photos | Cloth fills the frame: folds, texture and close-ups, with almost nothing on top | Let suits fill the frame, with text beside them rather than over them. **Don't blow photos up to full-bleed:** Lajwanti's are only 384–626 px wide. Full-bleed moments use the shader or ink, until better photos arrive (`docs/claude-code-playbook.md` §6) |
| Colour | Warm cream and dark brown, with an orange accent | Cream and ink only. No accent: hover states use ink and cream, and photos supply the colour |
| Menu | A floating side panel over the blurred page: large links, expandable groups, contact details at the bottom | Same idea with our links, WhatsApp first and small corners (`--radius-sm`). Solid backdrop on phones, because blur is slow. Focus trap, Esc closes |
| Header | Transparent over the hero, then a floating frosted bar on scroll, with the wordmark swapping to a small mark | Same behaviour with our logo rules: secondary, then simplified; submark on phones. Keep the header area light so the black logo never sits on dark cloth. A WhatsApp button stands where its call to action is |
| Hero | Full-screen draped cloth with a huge headline at the bottom left, rising line by line. The cloth is a **pre-rendered video**, and the page loads 1920×1080 video even on phones | Real-time shader cloth with no video or model: lighter, and it reacts to the cursor and scroll |
| Section transitions | The hero insets from the page edges on scroll. A small fabric card grows to fill the screen while pinned. Statement text fills word by word. Info cards stack | All four, with photos and shader instead of video, because video stays on product pages (§5.2). Filling words start at `--color-muted`, so they stay readable |
| Hover | Collection columns: the name changes colour and a short line and link appear in place of the plus. About 0.75 s, easing out | Same reveal for our three collection panels, with ink and cream inversion plus the image distortion in §6 |
| Page change | A full-screen cream cover with a small mark in the centre, then a full page load and reveal | A short cream cover with the MA submark, faded and never stretched. Client-side navigation keeps it faster, on cached pages |

**More motion than the reference.** It relies on video and scroll effects. We add:
- **Smooth scrolling** with Lenis on every page.
- **A live fabric hero** that responds to the cursor and scroll.
- **Text reveals:** lines rise from a mask, and words fill on scroll.
- **Image reveals:** clip-path reveals and small parallax on suit and collection images.
- **Hover effects:** WebGL distortion on collection panels, photo zoom on product cards, magnetic buttons, and animated link underlines.
- **Page transitions** between every page, plus a Flip from product card to product image.

**Across our pages:**

| Page | Style and motion |
|---|---|
| Home | The full set, including the 3D hero (§4) |
| Shop, Collection | Large heading reveal, card reveals with a short stagger, hover on cards. Filters stay instant |
| Product | Image reveal, sticky gallery beside the details, Flip from the card. Video follows §5.2. The WhatsApp button never waits on animation |
| About, Contact, How to Order, FAQ | Large type, word fill on the lead sentence, section reveals. FAQ answers expand smoothly |
| Search, Account, login and register | Same type and page transitions, with only light fades, because shoppers are working here |
| Privacy, Terms | Heading reveal only. Long text stays still |
| Admin | No motion direction applies: clean and fast (§3) |

**Fast on phones, and respectful of reduced motion:**
- Everything in §5.1 and §6 still applies: `transform` and `opacity` only, content visible without JavaScript, Lighthouse mobile ≥ 90, CLS < 0.1, and the poster as LCP.
- **Phones:** pinning, the hero inset and stacking cards turn into normal scrolling, with swipe for galleries, at most one scrubbed effect per screen, and no blur or cursor effects.
- **Page cover:** about 0.25 s in and 0.25 s out, and it never waits on slow data.
- **Reduced motion:** no smooth scroll, parallax, pinning, word fill, 3D or cover. Quick opacity fades at most.
- **Budgets:** 3D JS ≤ 250 kB, Home only. Other pages don't load Three.js.

**Don't take:** its orange, font, emblem, wording, photos, videos, page structure, or the look of any one section so closely that it could be mistaken for theirs.

### 9.2 References

Each reference has one job. The four Pakistani stores are studied for **shopping patterns only**, not look. **Their names appear only here and in the banned list (`docs/database.md` §9), which blocks them:** never put them on the website, in metadata, alt text or `catalog/`, and never copy their code, images, text or logos. Studied on 2026-11-01 at 360 and 1280 px: homepage, one collection and one product page each.

| Site | What we take | What we don't |
|---|---|---|
| davaris.gr | Look and motion (§9.1) | Its page structure |
| pk.khaadi.com | Per-piece details with fabric, finish and length. On phones: image first, name and price below, and a sticky action button. Clear path from fabric to 2 or 3 pieces | The same name on every suit, "Size: 3PC", a bottom app tab bar, a chat bubble over the grid |
| sobiawaseem.com | A short menu: new arrivals, seasons, collections. The design code as part of the suit's identity. A sticky action on phones | A WhatsApp link far down the page with no message, a banner pushing the grid down, sold-out badges filling the first screen |
| nishatlinen.com | One-tap shortcuts above the grid (print, embroidered, 2 piece, 3 piece) with a product count. Two photos beside a sticky details column on desktop. Each piece listed with its fabric and length | Long names cut off on phones, the action button below the fold with no sticky bar, a help bubble covering the title, instalment offers |
| sokamal.com | "What's included" and the fabric shown near the top of the product page | A sale popup over every page, abbreviations in piece details, a badge on every menu item |

**Patterns we adopt.** All four sell through a cart, and none puts WhatsApp in the buying area, so ordering here is deliberately different:

- **Menu:** short and collections-first: New arrivals, Dhanak, Khaddar, Lajwanti, All suits, How to Order, with Search close by, in the side panel from §9.1. No sale links or menu badges.
- **Grid:** 2 columns on phones and 4 on desktop, with the number of suits shown. No layout-switching buttons.
- **Quick filters:** a row of one-tap chips above the grid, such as `3 Piece`, `Embroidered` or `Floral Print`. They use only the values in `docs/catalog.md` §4 that a published suit has, and set the same browser filter (ADR-018). The row hides when it wouldn't narrow anything. Full filters open in a bottom sheet on phones and a sidebar on desktop.
- **Suit card:** photo, a small line such as `Embroidered · Dhanak`, the suit's own name, `3 Piece`, price and a wishlist heart. Tapping opens the product page: no add-to-cart.
- **Product page order:** photo; name, price and design code; WhatsApp, Call and Email; "What's included"; description; care, when there is any; "Also in this design". On desktop, the gallery sits beside a sticky details column.
- **"What's included":** one plain row per piece, with no abbreviations: `Shirt: Dhanak, embroidered, 3 m`. Length shows only when the owner has given it. State once that the suit is unstitched.
- **Easy to order:** on phones, a sticky WhatsApp bar stands where other shops put "Add to cart", and opens with the suit's name, design code and link filled in. A short line beneath it covers delivery, payment and reply time, from admin settings and never invented. An out-of-stock suit keeps its page, with the button asking about the suit instead.
- **Keep the path clear:** no popups, floating chat bubbles, countdowns or quantity pickers.
