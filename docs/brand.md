# Mustafa Apparels brand guide

How the website looks today (2026-11-22): every colour with where it appears, plus the type, logo, shapes and buttons that go with them. Use this file when designing a new page, briefing a designer or making printed or social material.

- **Source of truth for colours:** `packages/config/tailwind/theme.css`. Tailwind's own colours are switched off, so only these tokens can be used.
- **Allowed text and background pairs:** `packages/config/colour-pairs.ts`. Tests check each pair against WCAG 2.2 AA, and the build fails if one is too faint.
- **Design rules and reasons:** `docs/design.md`. Full contrast numbers for the first palette: `docs/brand-colours.md`.

## 1. The look in one line

Calm powder blue and white, ink-black type, a deep green for the main actions, and a small touch of orange. **The suits' photos bring the colour**, so the site itself stays quiet.

## 2. Colour palette

### Core colours

| Name | Hex | Token | Role |
|---|---|---|---|
| White | `#FFFFFF` | `bg`, `surface` | The page, cards, form fields, dialogs |
| Ink | `#111111` | `fg`, `action`, `primary-fg`, `accent-fg` | All text and headings, the logo, solid buttons |
| Powder blue | `#A8C9C8` | `primary` | The navbar band, large surfaces. **Never text** |
| Pale powder blue | `#EEF4F4` | `surface-soft` | Behind suit photos, the hero and How to Order backgrounds |
| Deeper teal | `#86AFAE` | `teal` | The footer only |
| Deep green | `#164A45` | `deep` | Every button (with the gloss), page titles, step numbers and icons, active filter chips |
| Gold line | `#C9A45C` | `gold` | A thin line along curved picture edges (sign-up and login). **Decoration only** |
| Emerald gloss | `#0AA383` | `gloss` | The shine at the top of every button, fading into deep green. **Never behind text** |
| Racing orange | `#F45B0B` | `accent` | Small accents: badges, underlines, the focus ring, short lines |
| Deep orange | `#C34909` | `accent-text` | Orange **words**: the coloured word in headings, links, the current page |

### Supporting colours

| Name | Hex | Token | Role |
|---|---|---|---|
| Slate grey | `#4B5757` | `muted` | Secondary text: taglines, breadcrumbs, "3 Piece", hints |
| Grey green | `#5F6F6E` | `border-strong` | Borders people must see: form fields, outline buttons, chips |
| Pale blue grey | `#D4E3E2` | `border` | Decorative lines only: dividers, card edges |
| Brick red | `#A3271B` | `error` | Error messages and invalid fields |
| Forest green | `#2E6B3F` | `success` | "Saved" and other success notes |
| White | `#FFFFFF` | `action-fg` | Labels on ink and deep green buttons |

### Tints made from the palette

These aren't new colours: they are the tokens above at part strength, so they always match.

| Looks like | Made from | Hex on white | Where |
|---|---|---|---|
| Peach tile | Racing orange at 10% (`bg-accent/10`) | `#FEEFE7` | Icon tiles on the About, FAQ and How to Order pages; the About points' circles; the icon circles in the Collections dropdown; its hover row |
| Peach wash | Racing orange at 5% (`from-accent/5`) | `#FEF7F3` | The home About section background |
| Mint fade | Pale powder blue into powder blue at 25% | – | The home hero and How to Order backgrounds |
| Soft green line | Deep green at 30–60% | – | The rules beside "MUSTAFA APPARELS" in the hero, the dashed line joining the How to Order steps |
| White glass | White at 60–90% | – | Cards over pictures, the outline WhatsApp button, number pills on the New Arrivals ring |
| Shade | Ink at 30–50% | – | Behind an open dialog or the side menu |
| Soft shadow | Ink at 4% and 12% (`shadow-soft`) | – | Cards, the navbar after scrolling, dialogs, round arrow buttons |

## 3. Where each colour appears

| Part of the site | Colours |
|---|---|
| **Navbar**, at the top and when scrolled | Powder blue band with a white wave, ink links, an orange underline under the current page, black logo |
| **Collections dropdown** | White panel, ink rows, peach icon circles with deep orange flower icons, peach hover |
| **Home hero** | Mint fade, ink headline with a deep orange second line, slate grey paragraph. Buttons: solid deep green ("See All Suits") and deep green outline ("WhatsApp Us"); on hover they fill with ink and deep green |
| **Home About** | Peach wash with soft leaves, ink headline with a deep orange middle line, a short orange line, peach icon circles |
| **New Arrivals ring** | White page, white-framed photo cards with ink number pills, black round arrows, ink outline "View Suit" button |
| **Explore Our Collections** | Pale powder blue photo frames, deep orange icons and underlines, slate grey taglines |
| **How to Order (home)** | Mint fade, white cards with deep green icon circles; on hover a card fills deep green with white text |
| **Footer** | Deeper teal, ink text and links, short orange underlines under the column headings (decoration only), black logo |
| **About, Contact, FAQ, How to Order pages** | Deep green serif title with a deep orange last word, orange lotus between orange lines, peach icon tiles, deep green number circles and buttons, a fabric picture inside a thin orange arch |
| **Privacy and Terms** (owner's NEWPRIVACY.png and NEWTERMS.png, 2026-11-22) | Deep green serif title, chevron breadcrumb, white `PolicyCard`s with a deep green lower edge, a raised peach icon tile and a short orange divider (Privacy two a row, Terms one); green embroidered fabric behind a curve with a thin gold line on the right (`site/pages/policy-fabric`), soft leaves at the top and a deep green wave edged in orange at the bottom left. The top is compact so the title area and the first cards show on the first screen; the fabric panel is one screen tall |
| **Collection pages** | Deep green serif title, white into pale powder blue background, deep green active filter chips, fabric picture fading in |
| **Suit cards and the suit page** | Pale powder blue photo frames, ink text, orange stock badge with ink text, ink price |
| **Sign-up and login** (owner's NEWSIGNUP.png and NEWLOGIN.png, 2026-11-22; `AuthShell`) | Peach wash; on large screens a photo of suits on a brass rail on the left, ending in a curve with a thin gold line; soft leaves top right and green embroidered fabric bottom right (`site/auth/*`). Like every hero, the whole card fits the first screen at any size: spacing and the title follow the screen height, Full Name and Email sit side by side from tablet width, and the logo is left out on phones and short screens, where the navbar logo sits just above. Our secondary logo, a deep green serif title with a deep orange last word and swash, and a white card whose fields have a Bold deep green label, an icon and rounder corners (`Input look="card"`, `icon`, `revealable` for the password eye) |
| **Forms** (inquiry, password pages) | White fields with grey green borders, an orange focus ring, brick red errors, forest green success notes |

## 4. Pairing rules

**Do**
- Use **ink** for text on powder blue, pale powder blue, teal and white.
- Use **deep orange** (`#C34909`) for orange words, and only on white or the peach wash. On the hero's pale powder blue, it's allowed for the big headline line only.
- Use **white** on ink and on deep green.
- Use **racing orange** (`#F45B0B`) for lines, badges, icons and the focus ring, never for words.
- Put **ink** text on orange badges, not white.
- Keep the **keyboard focus ring** ink on powder blue (orange is too faint there).

**Don't**
- Put grey, orange, red or green text on powder blue or teal. All of them fail.
- Use orange on the teal footer except as a short decorative line.
- Put deep orange on deep green, or ink on deep green (1.89).
- Use powder blue or the pale blue grey border colour as text.
- Recolour the logo.

### Contrast (WCAG 2.2 AA: 4.5 for text, 3 for large text and icons)

| Text colour | on White | on Pale powder blue | on Powder blue | on Teal | on Deep green | on Peach tile | on Peach wash |
|---|---|---|---|---|---|---|---|
| Ink | 18.88 | 16.98 | 10.66 | 7.87 | 1.89 ✗ | 16.83 | 17.82 |
| White | – | – | 1.77 ✗ | – | 10.0 | – | – |
| Slate grey | 7.50 | 6.74 | 4.23 ✗ | 3.13 ✗ | – | 6.68 | 7.08 |
| Deep green | 10.0 | 8.99 | – | – | – | 8.91 | 9.44 |
| Deep orange | 4.91 | 4.41 (large only) | 2.77 ✗ | 2.05 ✗ | ✗ | 4.38 (large only) | 4.63 |
| Racing orange | 3.31 (icons only) | 2.97 ✗ | 1.87 ✗ | 1.38 ✗ | 3.02 (lines only) | 2.95 ✗ | 3.12 (icons only) |

## 5. Type

| Font | Weights | Used for |
|---|---|---|
| **Montserrat** (`--font-sans`) | Light 300, Regular 400, Bold 700 | Everything: body text, the home headings and buttons in Bold, spaced capitals for small labels ("LATEST COLLECTION") |
| **DM Serif Display** (`--font-serif`) | Regular | Page titles and card headings on the About, Contact, FAQ, How to Order and collection pages. It loads only on those pages |

Sizes are tokens: `text-display`, `text-hero`, `text-h1`, `text-h2`, `text-h3`, `text-body-lg`, `text-body`, `text-small` and `text-label`. They scale with the screen, from phones to 2560px.

## 6. Logo

- **Files:** `apps/web/public/brand/svg/`. Variants are primary (stacked), secondary (side by side), simplified and submark, each in black or white only.
- **The website's copies** of the primary and secondary logos have no line under APPARELS, and a bigger, slightly bolder "BY MUSTAFA AHMED" (owner, 2026-11-17). The original pack in `mustafa-apparels-logos/` is unchanged.
- **Where:**
  - **Navbar:** secondary, black, 48px on phones up to 80px on large screens.
  - **Footer and About page:** primary, black, 120–140px.
  - **Home hero:** the submark.
- **Rules:** black on light backgrounds, white on dark ones, never on a busy photo. Never recolour, stretch, redraw or add effects.

## 7. Shape and depth

| Token | Value | Used for |
|---|---|---|
| `radius-sm` | 2px | Small badges, focus outlines |
| `radius-md` | 8px | Buttons, form fields, icon tiles |
| `radius-lg` | 16px | Cards, photo frames, panels |
| `rounded-full` | – | Icon circles, number circles, chips, round arrow buttons |
| `shadow-soft` | Ink at 4% + 12% | The only shadow. Use it sparingly |

Nothing is rounder than 16px, except full circles.

## 8. Buttons and interaction

| Button | Look | Hover |
|---|---|---|
| Every button (`primary` and `secondary` look the same, owner 2026-11-22) | The owner's `button-template.png`: a glossy pill, emerald at the top into deep green, a white Bold spaced-capital label, and a round white-to-mint button on the right holding a deep green arrow, or the button's own icon (WhatsApp, phone, mail). At least 56px tall | Lifts 3px with a deeper, softer shadow (220ms); a soft light sweeps across once (240ms); the round arrow pushes 4px right and grows to 1.05 (180ms). Pressing sinks it 1px to 98.5% (160ms), on touch too. With reduced motion nothing moves |
| Deep (home hero) | Deep green with white label | Ink fills in from the edge |
| Deep outline (home hero) | Deep green outline and label on white glass | Deep green fills in from the edge, label turns white |
| Round arrows (carousels, New Arrivals ring) | Ink circle with a white chevron | – |
| Filter chips | Pill, grey green outline on white glass, spaced capitals | Selected: deep green with a white label |

- **Building one:** `Button` adds the round arrow itself (`icon` swaps in another icon). A link styled with `buttonClass()` ends with `<ButtonCircle />` (`direction="back"` for Previous); `scripts/buttons.test.mjs` checks every one has it. The gloss and motion are in `packages/config/tailwind/buttons.css`, used by the storefront and the admin.
- **Cursor:** everything clickable (links, buttons, the Collections menu, FAQ questions, dropdowns, checkboxes) shows the hand; a disabled button shows "not allowed"; the carousels and the New Arrivals ring show the grab hand (`packages/config/tailwind/theme.css`, owner 2026-11-22).
- **Focus:** an orange ring on white, ink on powder blue.
- **Links:** ink, underlined; on hover the underline turns orange and thicker.
- **Reduced motion:** colours still change, but nothing moves.

## 9. Pictures

The site's own pictures are cut from the owner's mockups and kept on Cloudinary (`apps/web/lib/site-art.ts`), never in `public/`. They show embroidered fabric, a boutique and a tailoring table in warm creams, maroons and greens, so they sit well against powder blue, white and peach. Suit photos come from the catalogue.

## 10. Hex values outside the tokens

These places can't read the tokens, so they repeat the hex values. Change them by hand when a colour changes.

| Where | File | Colours |
|---|---|---|
| Phone browser bar and home-screen app | `packages/config/brand.ts` | `#A8C9C8` theme, `#FFFFFF` splash |
| Emails | `packages/core/integrations/email-templates.ts` | `#FFFFFF` page, `#111111` text and button, `#A8C9C8` top band, `#4B5757` small print |
| Default share image | `apps/web/public/og/og-default-1200x630.png` | Black logo on `#A8C9C8` (an image: make it again from the SVG) |

## 11. Changing a colour

1. Change the token in `packages/config/tailwind/theme.css`.
2. If it needs a new pairing, add it to `packages/config/colour-pairs.ts`; the build checks its contrast.
3. Update the hex copies in section 10.
4. Update this file and `docs/design.md` §1.2 in the same commit.
