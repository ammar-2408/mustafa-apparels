# Brand colours

Every colour the storefront, admin, emails and share images use, as of the end of Phase 6 (2026-11-15). Use this file as the starting point for the redesign.

- **Source of truth:** `packages/config/tailwind/theme.css`. Tailwind's own colours are cleared, so a colour that isn't a token there can't be used in a class.
- **Allowed text and background pairs:** `packages/config/colour-pairs.ts`. Tests check each pair against WCAG 2.2 AA.
- **Rules and reasons:** `docs/design.md` §1.2.

## 1. The palette

| Token | Hex | Name | What it's for | Where you see it |
|---|---|---|---|---|
| `bg` | `#FFFFFF` | White | The page | Every page background |
| `surface` | `#FFFFFF` | White | Cards, form fields, dialogs | Inquiry form, login and register fields, filter sheet, zoom dialog |
| `surface-soft` | `#EEF4F4` | Pale powder blue | The frame behind suit photos (chosen at the design checkpoint) | Product cards, the suit gallery, "Photo coming soon" boxes, home new arrivals |
| `fg` | `#111111` | Ink | All body text and headings; the logo colour | Everywhere |
| `muted` | `#4B5757` | Slate grey | Secondary text, on white only | Breadcrumbs, "3 Piece" lines, suit counts, form hints |
| `primary` | `#A8C9C8` | Powder blue | Large surfaces only, never text | Header band, footer, home hero, "How to order" band, admin sidebar, browser bar on phones, share image |
| `primary-fg` | `#111111` | Ink | Text on powder blue | Header links, footer links, hero headline |
| `action` | `#111111` | Ink | Main buttons | "See all suits", "WhatsApp us", "Send" |
| `action-fg` | `#FFFFFF` | White | Main button labels | Text on the ink buttons |
| `accent` | `#F45B0B` | Racing orange | Small accents only: badges, hover underlines, the focus ring, small icons | Stock badge on cards and the suit page (e.g. "Out of stock"), link underline on hover, keyboard focus outline, admin "Needs price" badge |
| `accent-fg` | `#111111` | Ink | Text on orange | Text inside orange badges |
| `accent-text` | `#C34909` | Deep orange | Small orange text, on white only (the brighter orange is too faint for text) | Orange text links and labels |
| `border-strong` | `#5F6F6E` | Grey green | Borders people need to see | Form field edges, filter chips, the Sort box, outline buttons |
| `border` | `#D4E3E2` | Pale blue grey | Decorative lines only | Dividers, table rows, section rules |
| `error` | `#A3271B` | Brick red | Error messages and invalid fields | "Couldn't save that", field errors, the error page |
| `success` | `#2E6B3F` | Forest green | Success messages | "Saved" notes on the account page |

### See-through versions

These are made from the tokens above, not new colours.

| Class | Made from | Where |
|---|---|---|
| `bg-fg/40` | Ink at 40% | Behind an open dialog, and behind the side menu on phones |
| `bg-fg/30` + blur | Ink at 30%, blurred | Behind the side menu from tablet width up |
| `shadow-soft` | Ink at 4% and 12% | Floating header after scrolling, dialogs |

## 2. Colours outside the tokens

These places can't read CSS variables, so they repeat the hex values. Change them by hand when a token changes.

| Where | File | Colours |
|---|---|---|
| Phone browser bar and home-screen app | `packages/config/brand.ts` | `#A8C9C8` theme, `#FFFFFF` splash |
| Account and inquiry emails | `packages/core/integrations/email-templates.ts` | `#FFFFFF` page, `#111111` text and button, `#A8C9C8` top band, `#4B5757` small print |
| Default share image | `apps/web/public/og/og-default-1200x630.png` | Black logo on `#A8C9C8` (an image: make it again from the SVG) |
| Generated share images (collections, suits) | Not built yet (step 7.4) | Will need the tokens as hex |
| Logo files | `mustafa-apparels-logos/` | Black `#111111` or white `#FFFFFF` only. Never recolour the logo |

**Not a site colour:** the logo pack's old favicons and share image still have a cream square (`#FAF7EC`), left over from the first palette. They are waiting for new files from the owner (`docs/design.md` §1.3).

**Product colours:** the Colour filter shows names only (Black, Maroon, Teal and so on, `docs/catalog.md` §4). It has no colour swatches, so the suits' own colours add nothing to this list.

## 3. Contrast

The table gives each text colour's contrast against each background. Normal text needs **4.5**; large text (24px, or 18.66px Light), icons and borders need **3**. Any pair below 4.5 is fine for borders and icons only, if it reaches 3. Any pair below 3 is not allowed at all.

| Colour | on White | on Pale powder blue | on Powder blue | on Ink |
|---|---|---|---|---|
| Ink `#111111` | 18.88 | 16.98 | 10.66 | – |
| Slate grey `#4B5757` | 7.50 | 6.74 | 4.23 ✗ | 2.52 ✗ |
| Deep orange `#C34909` | 4.91 | 4.41 ✗ | 2.77 ✗ | 3.85 ✗ |
| Racing orange `#F45B0B` | 3.31 (icons only) | 2.97 ✗ | 1.87 ✗ | 5.71 |
| Grey green `#5F6F6E` | 5.27 | 4.74 | 2.97 ✗ | 3.58 |
| Brick red `#A3271B` | 7.33 | 6.59 | 4.14 ✗ | 2.57 ✗ |
| Forest green `#2E6B3F` | 6.38 | 5.74 | 3.60 ✗ | 2.96 ✗ |
| Powder blue `#A8C9C8` | 1.77 ✗ | 1.59 ✗ | – | 10.66 |
| White `#FFFFFF` | – | – | 1.77 ✗ | 18.88 |

**What the table means for the redesign:**
- **On powder blue, use ink only.** Grey, orange, red and green text all fail there.
- **Orange on white is for icons, underlines and the focus ring, never words.** Use deep orange for orange words.
- **Badge text on orange is ink, not white.** White on orange is 3.31, too low for small text.
- **Keyboard focus on powder blue is ink.** The orange ring is too faint there.

## 4. Exceptions the owner approved (2026-11-15)

From the owner's home and menu mockup:

- **Deep orange as large headline text** on pale powder blue (4.41): the second line of the home hero headline only. Small orange text still goes on white only.
- **Slate grey text on pale powder blue** (6.74): taglines on the Shop by Fabric cards.
- **Deep orange icons and lines** on white and on pale powder blue: card icons, the Explore underline, the lotus ornament and the swash under "New Arrivals" in the menu.
- **Bold 700** joins Light 300 and Regular 400 (`docs/design.md` §1.2).

## 5. Changing a colour

1. Change the token in `packages/config/tailwind/theme.css`.
2. Update the hex copies in section 2 of this file: `brand.ts`, the email template, and the share images.
3. If a new pairing is needed, add it to `packages/config/colour-pairs.ts`. The build fails if it doesn't reach its minimum contrast.
4. Update `docs/design.md` §1.2 and this file in the same commit.
