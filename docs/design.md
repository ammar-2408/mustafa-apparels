# Design

The brand comes from the logo pack in `mustafa-apparels-logos/mustafa-apparels-logos/`. Everything visual is driven by design tokens, so components never hard-code colours or fonts.

## 1. Brand

### 1.1 Style

Minimal and editorial: an angular, high-contrast MA monogram over widely spaced thin capitals, on a white page with powder blue surfaces. The site stays calm so the suits' colours and embroidery carry the page. **Racing orange is a small accent only** (badges, hover underlines, the focus ring, small icons), never a large area or body text. The palette is the owner's (2026-11-04); it replaced the first cream-and-ink one. Overall look and motion direction: §9.1.

### 1.2 Tokens

Tokens live in `packages/config/tailwind/theme.css`, a Tailwind v4 `@theme static` block that each app's `apps/*/app/globals.css` imports right after Tailwind. It clears Tailwind's default colours, breakpoints, radii and shadows, so `bg-red-500` or `rounded-xl` produce nothing and only brand values exist. Every token is also a CSS variable on `:root`. Utilities follow the token names: `bg-bg`, `bg-primary`, `text-fg`, `text-muted`, `bg-action`, `text-action-fg`, `bg-accent`, `text-accent-text`, `decoration-accent`, `border-border-strong`, `text-error`.

Every colour in one place, with where each is used and a contrast table: `docs/brand-colours.md`.

| Token | Value | Use |
|---|---|---|
| `--color-bg`, `--color-surface` | `#FFFFFF` white | Page background, form fields, white cards |
| `--color-surface-soft` | `#EEF4F4` pale powder blue | **Photo boxes only**: behind suit photos in the gallery, cards and collection panels, so tall photos shown whole sit in a frame instead of floating on white (owner, 2026-11-06 design checkpoint). Ink text only on it |
| `--color-primary` / `--color-primary-fg` | `#A8C9C8` powder blue / `#111111` | **Large surfaces only**: header band, section backgrounds, cards, footer, admin sidebar / text on them (10.66:1). Never a text colour (1.77:1 on white) |
| `--color-fg` | `#111111` ink (the logo colour) | All text: 18.88:1 on white |
| `--color-muted` | `#4B5757` | Secondary text, **on white only** (7.50:1; 4.23:1 on powder blue fails) |
| `--color-action` / `--color-action-fg` | `#111111` / `#FFFFFF` | Main buttons: ink with white text |
| `--color-accent` / `--color-accent-fg` | `#F45B0B` racing orange / `#111111` | Badges ("New", sale) with **ink** text (5.71:1; white is only 3.31), hover underlines, the focus ring, small icons. 3.31:1 on white, so UI parts only, never body text |
| `--color-accent-text` | `#C34909` | Small orange text such as links, **on white only** (4.91:1) |
| `--color-border-strong` | `#5F6F6E` | Form field and control borders on white (5.27:1) |
| `--color-border` | `#D4E3E2` | Decorative lines only |
| `--color-error` / `--color-success` | `#A3271B` / `#2E6B3F` | Error and success text and borders, **on white only** (7.33:1 and 6.38:1) |

**Allowed pairs are enforced.** `packages/config/colour-pairs.ts` lists every allowed foreground/background pair, each one text (4.5:1), large text or UI (3:1).
- `tailwind-theme.test.mjs` checks each pair against WCAG 2.2 AA, makes sure every token has a role, and checks that the known-bad pairs stay out: powder blue, orange or accent text as text; muted, error or success on powder blue.
- `colour-usage.test.mjs` scans component class names, and fails on any `text-X` over a `bg-Y` (or the white page) that isn't in the list. It can't see a background set on a parent element, so keep a text colour and its background together where possible.
- To use a new pair, add it to `colour-pairs.ts` first.

Error and success are deep tones for text and borders on white, and never the only signal: pair them with words or an icon.

**Typography:** Montserrat only, via `next/font` (self-hosted).
| Use | Weight | Style |
|---|---|---|
| Headings | Light 300, or Bold 700 in the redesigned sections (home hero, Shop by Fabric, menu) | Fluid sizes with `clamp()` |
| Small labels, nav, buttons | Regular 400 | Uppercase, `letter-spacing: 0.4em` (reduce to about `0.2em` where text would wrap on phones) |
| Body | Regular 400 | Sentence case, no extra tracking |

Don't use Light 300 under about 20px, because it gets hard to read on phones. Load only weights 300, 400 and 700. Bold 700 is the owner's choice (2026-11-15, from their home and menu mockup): headings and button labels in the redesigned sections use it. Other pages keep Light headings until they are redesigned. The logo pack's readme suggests Light 300 for spaced capitals, but these labels are small, so Regular 400 is the deliberate choice here.

Each app loads the font in `app/fonts.ts` (`next/font/google`, served from our own domain, `display: swap`) and puts its `--font-montserrat` variable on `<html>`. The theme clears Tailwind's other font families and weights, so only `font-sans`, `font-light` (300), `font-normal` (400) and `font-bold` (700) exist and nothing is faux-bolded. The type scale replaces Tailwind's sizes:

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

**Focus ring:** the theme gives every `:focus-visible` element a 2px racing orange outline, 2px outside it (3.31:1 on white, 5.71:1 on ink). Orange is only 1.87:1 on powder blue, so inside any `bg-primary` element the ring turns ink (10.66:1) automatically.

**Links:** the `link` utility gives ink text with an underline that turns orange on hover. Use `text-accent-text` only where a link must be orange, and only on white.

**Shared primitives (`packages/ui`, both apps):**
- `Button` (`@mustafa/ui/button`): `primary` (ink with white text) or `secondary` (ink outline). Hover swaps ink and white. Orange never fills a button. The label is in spaced capitals (`caps-tight`, `caps` from `sm`), the button is 48px tall, and `type="button"` unless set. `buttonClass(variant)` gives links the same look, for WhatsApp, Call and Email.
- `Input` (`@mustafa/ui/input`): a visible `caps-tight` label, an optional hint, and an error tied to the field with `aria-describedby` and `aria-invalid`. The error sits in an `aria-live` region that is on the page from the start, so it is announced. The field is 48px tall with 16px text, so iOS doesn't zoom.
- `Textarea` (`@mustafa/ui/textarea`) and `Select` (`@mustafa/ui/select`, native, `options` + optional empty `placeholder` choice): the same label, hint and error wiring as `Input` (shared `FieldShell` / `useField` in `field.tsx`). `Textarea showCount` shows "12 / 200" against `maxLength`.
- `Checkbox` (`@mustafa/ui/checkbox`): box and label in one 44px row, optional hint.
- `Dialog` (`@mustafa/ui/dialog`): a native modal `<dialog>`. The browser traps focus, closes it on Esc and returns focus afterwards; the backdrop click and the 44px close button call `onClose`. It is named by its title, keeps the page gutter on phones and is 512px at most. While it is open, the page behind doesn't scroll. Pass `className` to make a side panel or bottom sheet.
- `Logo` (`@mustafa/ui/logo`): see §1.3 below.
- `FormError` (`@mustafa/ui/form-error`): the whole-form message, a `role="alert"` paragraph that is on the page from the start, hidden while empty.
- `LogoutButton` (`@mustafa/ui/logout-button`): takes the app's `signOut` and a `redirectTo` (default `/login`). Each app has a one-line client wrapper (`components/…/logout-button.tsx`) that binds its own `authClient`, so server pages can render it.

Radius: `--radius-sm: 2px` for small parts (badges, fields), `--radius-md: 8px` for buttons and `--radius-lg: 16px` for cards (the owner's mockups, 2026-11-15); `rounded-full` still works for round icons and dots. Nothing rounder.

**Buttons** (`buttonClass` in `packages/ui`): every button ends its hover the same way, on ink with white text, lifted 2px with `--shadow-soft`, and presses in to 98% (the theme's `lift` utility, both apps). Primary is ink already; secondary is an ink outline that fills. With reduced motion only the colours and shadow change. Shadows: `--shadow-soft` (the only shadow token), sparingly. Dark mode: not in v1, and `color-scheme: light` keeps form controls light.

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
| Desktop header | Secondary, black | 40 px (use 48 px from `md`, 64 px from `lg`, so its small "by Mustafa Ahmed" line stays readable) |
| Mobile header | Submark, black | 24 px (use 32 px) |
| Sticky header on scroll | Simplified, black | 28 px |
| Footer on pale powder blue | Primary, black | 120 px |
| About page, hero | Primary | 120 px |

**Component:** `apps/web/components/logo.tsx`. `<Logo variant colour height loading>` renders the file through `next/image` (unoptimized SVG) with the right `alt`. Its `width` and `height` attributes come from the file's own viewBox ratio, and CSS sets only the height. A height below the table's minimum is raised to it, and the default is the "use" size. `<HeaderLogo>` is the home link (`aria-label` below, at least 44px tall): the submark (32px) below `md`, the secondary logo at 48px from `md` (768px) and at 64px from `lg` (1024px), all loaded eagerly. The two secondary copies share one file, so it downloads once. Clear space is left to the layout around it.

Rules: keep clear space of at least a quarter of the monogram's height. Black on light backgrounds, white on dark. Never place the black logo on a dark or busy photo. Set one dimension in CSS, with `width` and `height` attributes to prevent layout shift.

**Text:** the logo reads "MA Apparels by Mustafa Ahmed", and the shop's public name is Mustafa Apparels.
- Primary and secondary `alt`: `MA Apparels by Mustafa Ahmed`
- Simplified and submark `alt`: `MA Apparels`
- Home link `aria-label`: `Mustafa Apparels home`
- Manifest `name` and `short_name`: `Mustafa Apparels`. The admin's are `Mustafa Apparels Admin` and `MA Admin`, so the owner can tell the two apart on a home screen
- `theme_color`: `#A8C9C8` (the browser bar matches the header band); `background_color`: `#FFFFFF` (the splash matches the page). The favicons and app icons from the logo pack still have a cream square; replace them when the owner supplies new files

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

**Admin shell** (`apps/admin/app/(panel)/layout.tsx`, every signed-in page): a powder blue (`bg-primary`, ink text) sidebar 15rem wide from `md`, sticky and full height, with the simplified black logo, the section links (Dashboard, Suits, Collections, Inquiries, Customers, Settings, Audit log; `aria-current="page"` on the current section and the pages under it, shown as a white pill), and the signed-in email with Log out at the foot. Below `md` it is a top bar with the submark and a Menu button (`aria-expanded`, `aria-controls`) that opens the same list; moving to another page closes it. The working area is white. The **dashboard** shows count tiles, each linked to its filtered list: Suits (published, drafts, needs price, archived) and Shop (new inquiries, customers, collections, with the hidden ones noted), from `core.dashboard.counts`.

**Collections** (`/collections`): one row per collection in shop order, with its suit count and a Hidden badge; drag by the handle or use the ↑ ↓ buttons (`components/sortable-list.tsx`, dnd-kit with pointer and keyboard sensors; every change saves at once), and Hide / Show per row. `/collections/new` and `/collections/[id]`: name, web address (filled from the name until edited; a rename keeps the old address as a redirect), description, search title and description. The edit page also has the **collection photo** (one image; Add / Replace / Remove; the old one is deleted from Cloudinary).

**Suits list** (`/suits`): a plain GET form (search by name, colour, fabric or design code with or without the hyphen; Status, default draft and published; Collection; Needs price), so filters live in the URL and Back works. A count line, then cards below `md` and a dense table from `md` (3:4 thumbnail or a "No photo" box, name, code, collection, price or an orange **Needs price** badge, status and open checks). 24 a page with Previous / Next. A bad URL value shows the unfiltered list. **New suit** opens the create form.

**Inquiries** (`/inquiries`): tabs New, Contacted, Closed with counts (`aria-current` on the open tab), 50 a page, newest first. Each card: name, date and time in Pakistan time, the suit asked about (linked to its admin page), the message as plain text with its line breaks, the phone and email, then **WhatsApp** (pre-filled greeting naming the suit), **Call** and **Email** buttons where a number or address exists, and the moves for its status (Mark contacted, Close, Back to new, Reopen).

**Customers** (`/customers`): read-only. A name or email search, a count, then cards below `md` and a table from `md`: name, email, joined date, inquiry count, and notes (email not verified, blocked). Customers only, never admins; no buttons that change an account.

**Settings** (`/settings`): one box per group, each with its own Save (Contact: shop name, WhatsApp, phone, email; Service area; Delivery; Payment; Returns; Reply note; Social links; Search defaults). Save sends only the changed keys and shows each refusal under its field ("Some changes were not saved"), or "Saved." / "Nothing changed.". No address or opening hours: the shop is online only.

**Audit log** (`/audit`): filters What (suits, collections, settings, inquiries) and Who (everyone in the log), 50 a page, newest first. Each entry: date and time, who (or "A removed account"), the action, a link to the record where one exists, and a **Before and after** disclosure showing the stored change as escaped text. Entries can't be edited or removed.

**Suit form** (`components/product-form.tsx`, drawn from `lib/product-fields.ts`): sections Basics, Price, Filters, Pieces, Colour, Description and care, Search engines, each a `fieldset` with a Light heading. Choices come from the taxonomy (a test fails if they drift); checkbox groups for Design and Dress category; comma lists for accent colours, motifs and related codes; one row per piece (include, fabric, finish, length in metres). The web address follows the name and design code until edited. No size fields. A sticky bar holds the form message and **Save as draft** (new) or **Save changes** (edit). `/suits/new` saves a draft and opens its edit page; the edit page shows the photos first, then the same form.

**Suit page** (`/suits/[id]`): the design code and name, then a **Status** box (the status in words; Publish / Unpublish, Archive or Restore as draft, Duplicate). A refused publish lists every reason, each a link to the field, the photos or the checks on the same page. Open `check:` items follow in an orange-edged box, each with **Cleared**. Then photos and videos, then the details form.

**Suit photos and videos** (`components/media-manager.tsx`, on `/suits/[id]`): a drop zone and file picker (`accept` limited to the six types). Each file is checked in the browser first (type, 10 MB / 50 MB, a video's 60 s), then uploads at once with a progress bar and waits for its alt text (3–200 characters, live count) and **Save**. Saved items sit in one column (two from `xl`, 1280 px, where each card has room for its text) in storefront order: drag handle and ↑ ↓ buttons, a 3:4 thumbnail with a **Main** badge on the first photo (orange, ink text) and a **Video Ns** badge, inline alt text saved on blur, **Make main** (moves the photo to the front) and **Delete** behind a confirm dialog. A suit with no photo says it needs one before publishing. Under a video: **Play preview** (the silent 720 px delivery version, `muted`, `playsInline`, `preload="none"`, with its poster), **Change poster** (upload a photo; JPEG, PNG or WebP) and, when a photo is set, **Use first frame**; a line says which poster is in use. In mock mode previews use Cloudinary's demo cloud, so they show their alt text.

**Wording:** the site calls products "suits" or "unstitched suits", never "dresses". It never mentions other brands (`docs/prd.md` §2).

**Filters:** volume style, dress category, fabric, design, season, outfit style, colour and price, from the fixed list in `docs/catalog.md` §4. Customers see the dress category filter labelled "Category". A filter value shows only when a published suit has it, and a filter with one value or none is hidden. With 30 suits, that keeps the bar short; on mobile, it's a bottom sheet. Colour swatches use `color_family`; the product page shows the fuller `main_color` name.

Filters and sort run in the browser, so pages stay static (ADR-018). The first use loads `/api/suits` once. The URL updates (`?fabric=dhanak&sort=price`), so it can be shared and Back works, and the filtered view has its own client-side paging. The server-rendered page always shows the unfiltered grid with real `/page/<n>` links, so it works without JavaScript and crawlers see every suit.

**The same design in another colour:** the product page shows a small "Also in this design" row, linking to the other colours (`related_design_codes`).

## 4. Home page structure (draft)

Motion for each section follows §9.1. Every section and the menu follow the owner's mockups (2026-11-15); the decoration is our own drawn flowers, leaves and waves.

1. **Hero** — the owner's `finalhero.png` (2026-11-15): centred on soft mint with soft colour sweeps in two corners and drawn leaf sprigs, no picture. The MA submark, "MUSTAFA APPARELS" between thin rules, the Bold headline (`text-hero`, second line deep orange), the paragraph naming the collections from admin (`collectionList()`: up to three, then "and more", also in the meta description), and two deep green buttons (`buttonClass("deep")`, `"deep-outline"`). At least one screen tall minus the navbar (fixed at 64, 80 and 96px), so nothing below shows on load (`e2e/web/home.spec.ts`).
2. **About** — the plain facts about the shop as one Bold sentence ("Mustafa Apparels is an online shop for women's unstitched suits in Pakistan."), its middle line in deep orange, the swash, one line on tailoring and WhatsApp, three short points (Women's Suits, Premium Fabrics, Order on WhatsApp), and a tailoring-table picture (`site/home/about-studio`, from the owner's "Crafted in Style" mockup) filling the right side top to bottom, like the hero. It replaces the old Statement.
3. **New arrivals** — a carousel of the newest suits (`components/carousel`): framed cards, arrows, dots, swipe and mouse drag.
4. **Explore Our Collections** — one card per active collection from admin, in the same carousel. A new collection appears with no code change.
5. **How to order** — the owner's "Mint How to Order" mockup (2026-11-15): three pale mint cards with a thin border, each with its icon in a deep green circle, "STEP n" with an orange underline, the Bold title, the text and a Bold link (collections, WhatsApp, delivery question on WhatsApp). On hover, or keyboard focus inside a card, a deep green layer rises from the bottom over 300ms and the text turns white (`.step-card` in `motion.css`; at once with reduced motion; none on phones, which have no hover).
6. Footer — pale powder blue with a wave, the logo, Shop / Help / Policies, Stay in Touch with WhatsApp, and true trust lines.

**Navbar** (every page, the owner's `nav.png`, 2026-11-15): powder blue with a soft wave and a drawn leaf; the secondary logo; from 1024px Home, a Collections list (every collection from admin, so the bar never grows; `components/site/main-nav.tsx`; styled as the owner's `dropdown.png`: white panel with a pointer, each row an orange floral icon in a pale peach circle, the name and a chevron, pale peach on hover and for the current page. Dhanak, Khaddar and Lajwanti have a lotus, a sprout and a four-petal flower; a new collection gets one of six floral drawings picked from its slug by `collectionIcon()`, the same everywhere) and All Suits, with the current page in Bold and an orange underline (orange text is too faint on powder blue); then search, account, WhatsApp and a heart for saved suits (`/account#saved`). No cart icon: the shop has no cart. Below 1024px the Menu button opens the side panel instead of the links. Heights are fixed (64, 80, 96px) so the hero can fill the rest of the first screen.

Removed on 2026-11-15 (owner): Shop by Fabric (it repeated the collections), the featured suit and the contact strip (the footer has WhatsApp). The home page now has no video.

## 5. Motion and video

**Already in place (2026-11-15, the owner's spec):** `apps/web/app/motion.css` holds CSS-only motion for the home hero, Shop by Fabric, the header controls and the menu: the headline rises 8px over 220ms; flower sprigs sway about 2° (desktop with a mouse only); buttons lift 2px with the arrow moving 4px, and press to 98%; fabric cards lift 4px with the photo at 1.025 and the icon turning 5°; header labels get a growing orange underline; the menu slides in from the right over 220ms with the backdrop fading on its own and rows 25ms apart. Only `translate`, `rotate`, `scale` and `opacity` move, hover needs `(hover: hover)`, and all of it is off with reduced motion (`e2e/web/motion.spec.ts`). Also: section headings and blocks (hero text, About, both carousels, each How to Order step, the footer columns) rise once when scrolled into view, 60ms apart through `--reveal-i` (`.reveal`, marked by `components/motion/reveal-on-view.tsx` in the `(shop)` layout, so the footer reveals on every public page; hidden only under `html.js`, so they show without JavaScript), carousel cards lift (suits 3px, collections 4px) with the photo at 1.025, the heart and carousel arrows grow to 1.05, and the current carousel dot grows. Phase 8 builds on this rather than replacing it.

### 5.1 Motion system (GSAP)

Principles: motion should feel **soft, fabric-like and premium** — never slow down a shopper.

| Token | Value |
|---|---|
| Durations | `fast 0.25s`, `base 0.6s`, `slow 1.1s`, `hero 1.6s` |
| Eases | `power3.out` (enter), `power2.inOut` (move), `expo.out` (hero), `none` (scrubbed scroll) |
| Stagger | 0.06–0.1s for grids, 0.02s for split characters |

Patterns: text line/char reveals (SplitText), word-by-word text fill on scroll, image clip-path reveals, scroll-scrubbed parallax (small: ≤ 15% movement), pinned horizontal galleries, stacking cards, Flip transitions for grid ↔ product image, magnetic buttons (desktop only), page transitions (a short powder blue cover with the MA submark, using the View Transitions API or a GSAP overlay). Where and how much: §9.1.

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

**Chosen concept: flowing fabric.** A cloth-like plane with a vertex-shader wave, reacting to cursor and scroll, in ink folds on white with soft powder blue light, with the MA monogram nearby. It suits a fabric business and fits the calm palette. It should read as real draped cloth, with large soft folds and light across them, rather than a flat wave (§9.1). It downloads **no model**, only shader code, because at Netlify's 20 credits per GB a 1.5 MB model would cost about 30 credits per 1,000 home visits.

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

Default titles: the storefront root layout sets `title: Mustafa Apparels` and the admin sets `Mustafa Apparels Admin` (template `%s | Mustafa Apparels Admin`), so no page is ever without a `<title>` (WCAG 2.4.2). Storefront pages still set their own through `buildMetadata()`.

How the helpers behave (unit-tested in `apps/web/lib/seo.test.ts`):
- `canonicalUrl(path)` lowercases the path, collapses repeated slashes, drops a trailing slash, query and hash, and joins it to `SITE_URL`. The home page is `https://mustafaapparels.com/`. It throws if given a full URL, so a canonical can't point off the site.
- `buildMetadata({ title, description, path, image?, noindex?, nofollow? })` returns an absolute title. It adds ` | Mustafa Apparels` only when the whole title fits in 60 characters and the name isn't already in it. A title still over 60, or a description over 160, is cut at the last word that fits, with trailing punctuation dropped and "…" added. Spaces and line breaks are tidied. Open Graph and Twitter repeat the same title, description and image (`DEFAULT_OG_IMAGE` unless `image` is given), with `og:url` = canonical. `noindex` gives `noindex, follow`, and `noindex` + `nofollow` gives `noindex, nofollow`. It doesn't pad short descriptions: the 120-character minimum is checked per page by the SEO E2E suite.

Default share image: `/og/og-default-1200x630.png` (`DEFAULT_OG_IMAGE` in `apps/web/lib/seo.ts`, alt `MA Apparels by Mustafa Ahmed`). It's the unchanged primary black logo centred on powder blue `#A8C9C8`, rendered from the SVG with Playwright when the palette changed (2026-11-04); nothing was redrawn or stretched. The logo pack's own `og-share-image-1200x630.png` has a cream background, so it stays in `public/brand/social/` unused. The root layout sets `metadataBase` from `SITE_URL`, plus the default `openGraph` (type `website`, site name, `en_PK`, this image) and `twitter` (`summary_large_image`), so every page shares it by absolute URL. A page's own `openGraph` replaces the layout's whole, so `buildMetadata()` repeats the image. `SITE_URL` is `NEXT_PUBLIC_SITE_URL` without a trailing slash, and the build fails rather than guess it. `e2e/seo/default-og-image.spec.ts` checks the tags in the raw server HTML. Collection and product pages use a generated image (`opengraph-image.tsx`, 1200×630), cached because each generation costs compute credits.

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
- Unknown product/collection/page number → `notFound()` → real **404**, on the first request too (classic ISR, ADR-021). The 404 is cached as well. No `loading.tsx` above `(shop)` routes: once streaming starts, a 404 or redirect loses its real status code.
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
| Layout rhythm | Calm, full-screen moments alternating with large areas of white and powder blue. Full-bleed media, then generous white space, then type | Same rhythm with `--spacing-section`. One idea per screen on Home; tighter on Shop and other working pages |
| Typography feel | Very large, tight headings, set against tiny labels. A wide sans at medium weight | Montserrat Light 300 at large `clamp()` sizes with tight leading (about 1), against our spaced-capital labels. No second font |
| Fabric photos | Cloth fills the frame: folds, texture and close-ups, with almost nothing on top | Let suits fill the frame, with text beside them rather than over them. **Don't blow photos up to full-bleed:** Lajwanti's are only 384–626 px wide. Full-bleed moments use the shader or ink, until better photos arrive (`docs/claude-code-playbook.md` §6) |
| Colour | Warm cream and dark brown, with an orange accent | White and powder blue with ink text; racing orange only as a small accent (badges, hover underlines, focus ring), and photos supply the colour |
| Menu | A floating side panel over the blurred page: large links, expandable groups, contact details at the bottom | Same idea with our links, WhatsApp first and small corners (`--radius-sm`). Solid backdrop on phones, because blur is slow. Focus trap, Esc closes |
| Header | Transparent over the hero, then a floating frosted bar on scroll, with the wordmark swapping to a small mark | Same behaviour with our logo rules: secondary, then simplified; submark on phones. Keep the header area light so the black logo never sits on dark cloth. A WhatsApp button stands where its call to action is |
| Hero | Full-screen draped cloth with a huge headline at the bottom left, rising line by line. The cloth is a **pre-rendered video**, and the page loads 1920×1080 video even on phones | Real-time shader cloth with no video or model: lighter, and it reacts to the cursor and scroll |
| Section transitions | The hero insets from the page edges on scroll. A small fabric card grows to fill the screen while pinned. Statement text fills word by word. Info cards stack | All four, with photos and shader instead of video, because video stays on product pages (§5.2). Filling words start at `--color-muted`, so they stay readable |
| Hover | Collection columns: the name changes colour and a short line and link appear in place of the plus. About 0.75 s, easing out | Same reveal for our three collection panels, with ink and white inversion plus the image distortion in §6 |
| Page change | A full-screen cream cover with a small mark in the centre, then a full page load and reveal | A short powder blue cover with the MA submark, faded and never stretched. Client-side navigation keeps it faster, on cached pages |

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

- **Header (as built, step 6.1):** powder blue band with `HeaderLogo`, then Search, Account, WhatsApp and Menu (icons with spaced-capital labels from `sm`). Once the band scrolls away, a fixed bar with the simplified logo and the same controls slides in (solid white on phones, frosted from `md`). Account is a plain link: no session read on cached pages. The footer is the powder blue band with the primary logo, Shop, Help and Policies columns, and Follow only when a social link is set.
- **Menu:** short and collections-first: New arrivals, Dhanak, Khaddar, Lajwanti, All suits, How to Order, with Search close by, in the side panel from §9.1. No sale links or menu badges.
- **Grid:** 2 columns on phones and 4 on desktop, with the number of suits shown. No layout-switching buttons.
- **Quick filters:** a row of one-tap chips above the grid, such as `3 Piece`, `Embroidered` or `Floral Print`. They use only the values in `docs/catalog.md` §4 that a published suit has, and set the same browser filter (ADR-018). The row hides when it wouldn't narrow anything. Full filters open in a bottom sheet on phones and a sidebar on desktop.
- **Suit card:** photo, a small line such as `Embroidered · Dhanak`, the suit's own name, `3 Piece`, price and a wishlist heart. Tapping opens the product page: no add-to-cart.
- **Product page order:** photo; name, price and design code; WhatsApp, Call and Email; "What's included"; description; care, when there is any; "Also in this design". On desktop, the gallery sits beside a sticky details column.
- **"What's included":** one plain row per piece, with no abbreviations: `Shirt: Dhanak, embroidered, 3 m`. Length shows only when the owner has given it. State once that the suit is unstitched.
- **Easy to order:** on phones, a sticky WhatsApp bar stands where other shops put "Add to cart", and opens with the suit's name, design code and link filled in. A short line beneath it covers delivery, payment and reply time, from admin settings and never invented. An out-of-stock suit keeps its page, with the button asking about the suit instead.
- **Keep the path clear:** no popups, floating chat bubbles, countdowns or quantity pickers.
