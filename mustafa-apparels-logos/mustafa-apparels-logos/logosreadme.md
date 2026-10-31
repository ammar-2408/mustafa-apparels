# Mustafa Apparels logo pack

Brand: **MA Apparels by Mustafa Ahmed**, a women's unstitched clothing brand.
This folder holds every official logo file. Use these files as they are. Do not redraw, stretch, recolour or add effects (shadows, gradients, outlines) to them.

## Folder structure

```
mustafa-apparels-logos/
├── logosreadme.md          this file
├── svg/                    vector logos, use these on the website
├── png/                    transparent PNGs, 2400 px wide, for social media and images
├── pdf/                    vector PDFs, for printing
├── favicon/                browser tab and app icons
└── social/                 ready-made profile picture and link-share image
```

## The four logos

| Logo | File name stem | Layout | Use it for |
|---|---|---|---|
| Primary | `mustafa-apparels-primary-*` | MA monogram on top, APPARELS, short line, BY MUSTAFA AHMED, all centred | Main brand logo: hero section, about page, footer, packaging, print |
| Secondary | `mustafa-apparels-secondary-*` | Horizontal: monogram, thin divider, APPARELS over BY MUSTAFA AHMED | Desktop website header, banners, shop signage, wide spaces |
| Simplified | `mustafa-apparels-simplified-*` | Small monogram next to APPARELS on one line | Compact spaces: sticky header on scroll, invoices, labels, email signature |
| Submark | `mustafa-apparels-submark-*` | MA monogram alone | Mobile header, favicon, profile pictures, clothing tags, stamps, watermarks |

Each logo comes in two colours:

- `-black` (#111111): for light backgrounds (cream, white, light photos)
- `-white` (#FFFFFF): for dark backgrounds (dark footer, dark photos, overlays)

PDF files are black only, for printing.

## Files

### svg/ (website)
- `mustafa-apparels-primary-black.svg`, `mustafa-apparels-primary-white.svg`
- `mustafa-apparels-secondary-black.svg`, `mustafa-apparels-secondary-white.svg`
- `mustafa-apparels-simplified-black.svg`, `mustafa-apparels-simplified-white.svg`
- `mustafa-apparels-submark-black.svg`, `mustafa-apparels-submark-white.svg`

All text is converted to outlines, so the SVGs need no fonts and look identical everywhere. Each SVG has a `viewBox`, so it scales cleanly with CSS width or height.

### png/ (social media, images)
Same eight names as svg/, ending in `.png`. Transparent background, 2400 px wide.

### pdf/ (print)
- `mustafa-apparels-primary-black.pdf`
- `mustafa-apparels-secondary-black.pdf`
- `mustafa-apparels-simplified-black.pdf`
- `mustafa-apparels-submark-black.pdf`

### favicon/
| File | Size | Purpose |
|---|---|---|
| `favicon.svg` | vector | Modern browsers |
| `favicon.ico` | 16, 32, 48 px | Older browsers |
| `favicon-32.png` | 32 × 32 | PNG fallback |
| `apple-touch-icon-180.png` | 180 × 180, cream background | iPhone and iPad home screen |
| `icon-192.png` | 192 × 192, cream background | Android and web app manifest |
| `icon-512.png` | 512 × 512, cream background | Web app manifest, splash |

### social/
| File | Size | Purpose |
|---|---|---|
| `profile-picture-1080.png` | 1080 × 1080, cream background | Instagram, Facebook, WhatsApp Business profile picture |
| `og-share-image-1200x630.png` | 1200 × 630, cream background | Preview image when the website link is shared (Open Graph) |

## Brand colours

| Name | Hex | Use |
|---|---|---|
| Ink black | `#111111` | Logo, headings, main text |
| Cream | `#FAF7EC` | Main background |
| White | `#FFFFFF` | Alternative background, white logo version |

## Brand font

- **Montserrat** (Google Fonts), Light 300 for headings and spaced capitals, Regular 400 for body text.
- The logo itself uses Montserrat with very wide letter spacing (about 0.4 to 0.55em). Match that spacing for small uppercase labels on the site, for example `letter-spacing: 0.4em; text-transform: uppercase;`.

## Usage rules

1. Keep clear space around every logo of at least one quarter of the MA monogram's height. Nothing (text, edges, images) should enter that space.
2. Minimum sizes on screen: submark 24 px tall, simplified 28 px tall, secondary 40 px tall, primary 120 px tall. Below those sizes, switch to the submark.
3. Use the black version on light backgrounds and the white version on dark backgrounds. Never place the black logo on a dark or busy photo.
4. Do not stretch, rotate, recolour, outline, add shadows or rearrange the parts of a logo.
5. Always set only one dimension in CSS (width or height) and let the other follow, so the logo keeps its proportions.

## Website implementation (for Claude Code)

Copy this folder into the site's public or static directory, for example `public/brand/` in Next.js or Vite, so the files are served at `/brand/...`.

### Head tags

```html
<link rel="icon" href="/brand/favicon/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/brand/favicon/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/brand/favicon/apple-touch-icon-180.png">
<meta name="theme-color" content="#FAF7EC">

<meta property="og:image" content="https://YOUR-DOMAIN/brand/social/og-share-image-1200x630.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
```

Replace `YOUR-DOMAIN` with the live domain. Open Graph images need an absolute URL.

### Web app manifest (optional)

```json
{
  "name": "MA Apparels",
  "short_name": "MA Apparels",
  "icons": [
    { "src": "/brand/favicon/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/brand/favicon/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "#FAF7EC",
  "background_color": "#FAF7EC",
  "display": "standalone"
}
```

### Responsive header logo

Secondary logo on desktop, submark on mobile:

```html
<a href="/" class="site-logo" aria-label="MA Apparels home">
  <img src="/brand/svg/mustafa-apparels-secondary-black.svg" alt="MA Apparels by Mustafa Ahmed" class="logo-desktop">
  <img src="/brand/svg/mustafa-apparels-submark-black.svg" alt="MA Apparels" class="logo-mobile">
</a>
```

```css
.site-logo img { display: block; width: auto; }
.logo-desktop { height: 48px; }
.logo-mobile { height: 32px; display: none; }

@media (max-width: 768px) {
  .logo-desktop { display: none; }
  .logo-mobile { display: block; }
}
```

### Footer on a dark background

```html
<img src="/brand/svg/mustafa-apparels-primary-white.svg" alt="MA Apparels by Mustafa Ahmed" style="height: 140px; width: auto;">
```

### Alt text

- Primary and secondary: `MA Apparels by Mustafa Ahmed`
- Simplified and submark: `MA Apparels`
- When the logo is inside a link to the homepage, give the link `aria-label="MA Apparels home"`.

### Performance notes

- Prefer the SVG files on the website. They are small and sharp on every screen.
- Use PNGs only where SVG is not supported (some email clients and social platforms).
- Add `width` and `height` attributes (or fixed CSS height) to logo images to avoid layout shift.
