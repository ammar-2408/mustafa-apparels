---
name: brand-mustafa
description: Mustafa Apparels brand rules — logo files and usage, colour tokens, Montserrat type, spacing and shape, and the tone for product descriptions and other customer-facing text. Use whenever building or styling UI in apps/web or apps/admin, placing the logo, choosing a colour or font, or writing suit descriptions, collection text or any words customers read, even for a small component or a one-line copy change.
---

# Brand: Mustafa Apparels

Source of truth: `docs/design.md` §1. If this skill and that doc disagree, the doc wins, so fix the skill.

**Style:** minimal and editorial, on a white page with powder blue surfaces and ink text. The site stays calm so the suits' colours and embroidery carry the page. **Racing orange is a small accent only**: badges, hover underlines, the focus ring, small icons. No dark mode in v1. Admin uses the same tokens. (Owner's palette, 2026-11-04; it replaced cream and ink.)

**Direction for the storefront: `docs/design.md` §9.1.** Very large headings set against tiny spaced labels, cloth and suits filling the frame, and generous empty space, on every page. It's a reference for look and motion only: keep our colours, font, logo and pages.

## Colour tokens

Components use tokens, never hard-coded colours. Tokens live in `packages/config/tailwind/theme.css` (Tailwind v4 `@theme static`), imported by `apps/*/app/globals.css`. Tailwind's default colours, radii and shadows are cleared: use `bg-bg`, `bg-primary`, `text-fg`, `text-muted`, `bg-action`, `text-accent-text`, `border-border-strong`, `text-error` and so on.

| Token | Value | Use |
|---|---|---|
| `--color-bg`, `--color-surface` | `#FFFFFF` | Page, form fields, white cards |
| `--color-surface-soft` | `#EEF4F4` | Photo boxes only (gallery, cards, collection panels); ink text only on it |
| `--color-primary` / `--color-primary-fg` | `#A8C9C8` powder blue / `#111111` | Large surfaces only (header band, sections, cards, footer, admin sidebar) / text on them. Never text (1.77:1 on white) |
| `--color-teal` | `#86AFAE` | Footer background only; ink text only on it (orange and grey fail) |
| `--color-fg` | `#111111` ink | All text |
| `--color-muted` | `#4B5757` | Secondary text, on white only |
| `--color-action` / `--color-action-fg` | `#111111` / `#FFFFFF` | Main buttons: ink with white text |
| `--color-accent` / `--color-accent-fg` | `#F45B0B` racing orange / `#111111` | Badges with **ink** text, hover underlines, focus ring, small icons. Never body text (3.31:1) |
| `--color-accent-text` | `#C34909` | Small orange text such as links, on white only (4.91:1) |
| `--color-border-strong` | `#5F6F6E` | Form fields and UI borders on white |
| `--color-border` | `#D4E3E2` | Decorative lines only |
| `--color-error` / `--color-success` | `#A3271B` / `#2E6B3F` | Error and success, on white only; never the only signal |

**Only allowed pairs.** `packages/config/colour-pairs.ts` lists every allowed text/background and UI pair, and tests fail on any pair that misses WCAG AA, or on a component class pair not in the list. On powder blue, text is always ink. To use a new pair, add it there first. Links use the `link` utility: ink text, and the underline turns orange on hover.

## Type: Montserrat only

Self-hosted through `next/font`. Load only weights 300, 400 and 700.

| Use | Weight | Style |
|---|---|---|
| Headings | Light 300; Bold 700 in the redesigned sections (home hero, Shop by Fabric, menu) | Fluid sizes with `clamp()` |
| Small labels, nav, buttons | Regular 400 | Uppercase, `letter-spacing: 0.4em` (about `0.2em` where it would wrap on phones) |
| Body | Regular 400 | Sentence case, no extra tracking |

Don't use Light 300 under about 20px: it gets hard to read on phones.

Utilities (full table in `docs/design.md` §1.2): headings are `text-display`, `text-h1`, `text-h2` or `text-h3` with `font-light`; body is `text-body-lg`, `text-body` or `text-small`; spaced capitals are `caps` (0.4em) or `caps-tight` (0.2em), e.g. `caps-tight sm:caps`. Only `font-light`, `font-normal` and `font-bold` exist. Bold is for headings and button labels in the redesigned sections (owner, 2026-11-15). Every colour and its approved exceptions: `docs/brand-colours.md`.

## Spacing and shape

- Use Tailwind's 4px scale, limited to 4, 8, 12, 16, 24, 32, 48, 64, 96 and 128px, with no one-off values (`docs/design.md` §1.4).
- Tokens: `--spacing-gutter` (`px-gutter`) for page side padding, `--spacing-grid` (`gap-grid`) between product cards, `--spacing-section` (`py-section`) between page sections.
- Max content width: 1440px at `2xl` (`max-w-content`), 1760px at `4xl` (`max-w-content-wide`). Layout per breakpoint: `docs/design.md` §2.
- Touch targets are at least 44×44px. Respect safe areas with `env(safe-area-inset-*)`.
- Build with the shared primitives before writing new ones: `Button` / `buttonClass`, `Input`, `Dialog`, `Logo`, `FormError` and `LogoutButton` from `packages/ui` (`docs/design.md` §1.2). Every focused element gets the theme's orange focus ring, which turns ink inside a `bg-primary` element on its own (orange is too faint on powder blue).
- Radius: `rounded-sm` (2px) for small parts, `rounded-md` (8px) for buttons, `rounded-lg` (16px) for cards; nothing rounder. Use `--shadow-soft` sparingly. Every button hovers the same way through `buttonClass` (ink, lifted 2px): don't add hover colours to buttons by hand.

## Logo

Source: `mustafa-apparels-logos/mustafa-apparels-logos/`. Which files go in which app: `docs/design.md` §1.3. **Use the files as they are:** never redraw, stretch, recolour or add effects.

| Place | Logo | Minimum height |
|---|---|---|
| Desktop header | Secondary, black | 40px (use 48px from `md`, 64px from `lg`) |
| Mobile header | Submark, black | 24px (use 32px) |
| Sticky header on scroll | Simplified, black | 28px |
| Footer on pale powder blue | Primary, black | 120px |
| About page, hero | Primary | 120px |

- Black on light backgrounds, white on dark. Never put the black logo on a dark or busy photo.
- Clear space: at least a quarter of the monogram's height.
- Set one dimension in CSS, with `width` and `height` attributes to prevent layout shift.

| Text | Value |
|---|---|
| Public name, manifest `name` and `short_name` | `Mustafa Apparels` |
| Admin manifest `name` / `short_name` | `Mustafa Apparels Admin` / `MA Admin` |
| Primary and secondary `alt` | `MA Apparels by Mustafa Ahmed` |
| Simplified and submark `alt` | `MA Apparels` |
| Home link `aria-label` | `Mustafa Apparels home` |
| `theme_color` / `background_color` | `#A8C9C8` / `#FFFFFF` |

## Tone for product descriptions (`docs/design.md` §1.5)

Simple English, warm and friendly, as if a helpful shopkeeper were describing the suit. **1–2 short sentences** that name the fabric and the season, then say what you can see: the pieces, the print or embroidery, the colours.

"Warm" describes the voice, not the fabric. "For winter" is fine, because the season comes from the collection file. "Keeps you warm" is a claim, so it needs the owner's confirmation.

| Don't | Why | Do |
|---|---|---|
| Another brand's name, or "same as" or "inspired by" one | No permission (`docs/database.md` §9) | Describe the suit itself |
| Text from posters or videos, such as feature lists | Not ours to copy, and not verified | Your own words, from what's visible |
| "Soft", "breathable", "best quality", "in stock" | Unconfirmed claims | Only what's visible or in the collection file, unless the owner confirmed it |
| "Luxury", "best in Pakistan", invented reviews | Invented claims (`docs/seo-geo.md` §7) | Plain facts |
| "Dress", or any mention of sizes | They're unstitched suits | "Suit", "unstitched suit" |
| "Stunning, must-have masterpiece" | Hype, and hard to read | Short, plain words |

**Good:** "A grey unstitched 3-piece Khaddar suit for winter. Black round leaf clusters cover the shirt, with patterned cuffs, a printed dupatta and plain dyed trousers."

If the season is missing, leave it out of the text and add a `check:`, rather than guessing. There is no Urdu version: the owner decided this.
