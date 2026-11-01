---
name: brand-mustafa
description: Mustafa Apparels brand rules — logo files and usage, colour tokens, Montserrat type, spacing and shape, and the tone for product descriptions and other customer-facing text. Use whenever building or styling UI in apps/web or apps/admin, placing the logo, choosing a colour or font, or writing suit descriptions, collection text or any words customers read, even for a small component or a one-line copy change.
---

# Brand: Mustafa Apparels

Source of truth: `docs/design.md` §1. If this skill and that doc disagree, the doc wins, so fix the skill.

**Style:** monochrome, minimal, editorial. The site stays quiet so the suits' colours and embroidery carry the page. **There is no accent colour; product photos supply the colour.** No dark mode in v1. Admin uses the same tokens.

## Colour tokens

Components use tokens, never hard-coded colours. Tokens live in `packages/config/tailwind` and `apps/*/app/globals.css`.

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#FAF7EC` cream | Main background |
| `--color-surface` | `#FFFFFF` | Cards, forms |
| `--color-fg` | `#111111` ink | Headings, main text |
| `--color-muted` | `#5C584E` | Secondary text |
| `--color-accent` / `--color-accent-fg` | `#111111` / `#FAF7EC` | Primary buttons and links / text on them |
| `--color-border-strong` | `#8A8578` | Form fields, UI borders |
| `--color-border` | `#D9D3C3` | Decorative lines only: too faint (1.39:1) for anything that must be seen |
| `--color-inverse-bg` / `--color-inverse-muted` | `#111111` / `#BDB7A6` | Footer and dark sections / secondary text on them |

Only ink, cream and white are official; the rest are derived. Error and success colours are chosen and contrast-tested at step 1.2. Contrast must reach 4.5:1 for text and 3:1 for large text and UI.

## Type: Montserrat only

Self-hosted through `next/font`. Load only weights 300 and 400.

| Use | Weight | Style |
|---|---|---|
| Headings | Light 300 | Fluid sizes with `clamp()` |
| Small labels, nav, buttons | Regular 400 | Uppercase, `letter-spacing: 0.4em` (about `0.2em` where it would wrap on phones) |
| Body | Regular 400 | Sentence case, no extra tracking |

Don't use Light 300 under about 20px: it gets hard to read on phones.

## Spacing and shape

- The docs set no custom spacing scale, so use Tailwind's default scale and avoid one-off values.
- Max content width: 1440px at `2xl`, 1760px at `4xl`. Layout per breakpoint: `docs/design.md` §2.
- Touch targets are at least 44×44px. Respect safe areas with `env(safe-area-inset-*)`.
- Radius is small or none (`--radius-sm: 2px`), to match the logo's angular shapes. Use `--shadow-soft` sparingly.

## Logo

Source: `mustafa-apparels-logos/mustafa-apparels-logos/`. Which files go in which app: `docs/design.md` §1.3. **Use the files as they are:** never redraw, stretch, recolour or add effects.

| Place | Logo | Minimum height |
|---|---|---|
| Desktop header | Secondary, black | 40px (use 48px) |
| Mobile header | Submark, black | 24px (use 32px) |
| Sticky header on scroll | Simplified, black | 28px |
| Footer on ink | Primary, white | 120px (use 140px) |
| About page, hero | Primary | 120px |

- Black on light backgrounds, white on dark. Never put the black logo on a dark or busy photo.
- Clear space: at least a quarter of the monogram's height.
- Set one dimension in CSS, with `width` and `height` attributes to prevent layout shift.

| Text | Value |
|---|---|
| Public name, manifest `name` and `short_name` | `Mustafa Apparels` |
| Primary and secondary `alt` | `MA Apparels by Mustafa Ahmed` |
| Simplified and submark `alt` | `MA Apparels` |
| Home link `aria-label` | `Mustafa Apparels home` |
| `theme_color`, `background_color` | `#FAF7EC` |

## Tone for product descriptions

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
