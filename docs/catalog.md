# Catalog

How suits get from the owner's folders onto the site, and the fixed list of filter values. **Read this before touching stock, the import script or product filters.**

```
Business data/Stock/<Collection>/        catalog/<collection>/          Admin panel        Storefront
  collection .md file          ──►         _collection.md      ──►       draft suit   ──►   published suit
  photos and videos                        <design-id>.md      import    owner sets        once it has a price,
  (git-ignored, read-only)                 (in git)                      the price         main image and alt text
```

## 1. The rules

- **`Business data/` is read-only and stays out of git.** Never write, move, rename or save anything there, including screenshots. Only the import script reads it.
- **`catalog/` is the source of truth for each suit's details.** It's in git, so it can be reviewed and re-imported.
- **Prices are never in `catalog/`.** `price:` stays empty and the suit imports as a draft. The owner sets the price in admin.
- **Mark anything unsure with `check:`.** Never guess and present it as fact. Every `check:` must be cleared before that suit is published.
- **Never name another fashion brand**, and never copy text from posters or videos (`docs/database.md` §9).

## 2. Collection file (`Business data/Stock/<Collection>/*.md`)

The owner writes one per collection. It gives what's shared by every suit in that volume: volume style, fabric, piece details, design type and season. **It never gives colours, because they differ per suit.**

Files can differ in format and may be missing values, as today's are:

| Collection | Source file | What it gives | Filled in by the owner on 2026-11-01 |
|---|---|---|---|
| Dhanak | `dhanakdetails.md` | 3 Piece, Premium, Dhanak, Embroidered + Printed, pieces, Traditional Suit | Season: Winter |
| Khaddar | `khaddardetails.md` | 3 Piece, Premium, Khaddar, Embroidered + Printed, pieces | Season: Winter |
| Lajwanti | `lajwantidetails.md` | Options list only | 2 Piece, shirt + trouser, Premium, Dhanak, All-Over Print, Winter |

Because `Business data/` can't be edited, the complete values are kept in `catalog/<collection>/_collection.md`. That file also lists any media left out, and why.

## 3. Suit file (`catalog/<collection>/<design-id>.md`)

One file per suit. Several photos can belong to one suit; list them all in `photos:`, with the main image first.

```markdown
---
design_id: DHN-01
collection: dhanak
status: draft
price:
name: Black Embroidered Dhanak 3-Piece Suit
slug: black-embroidered-dhanak-3-piece-dhn-01
volume_style: 3 Piece
dress_categories: [Unstitched Suits]
collection_type: Premium
fabric: Dhanak
piece_details:
  - { piece: shirt, fabric: Dhanak, finish: Embroidered }
  - { piece: dupatta, fabric: Dhanak, finish: Printed }
  - { piece: trouser, finish: Plain dyed }
design: [Embroidered, Geometric Print]
season: Winter
outfit_style: Traditional Suit
main_color: Black
color_family: Black
accent_colors: [Beige]
motifs: [diamond neckline panel, small flower sprigs, large floral dupatta]
photos:
  - file: Dhanak/dhnk1.jpeg
    alt: Model wearing a black 3-piece Dhanak suit ...
    crop: { x: 84, y: 58, width: 1256, height: 2300 }
videos: []
also_in_this_design: []
check:
  - Video left out because it ends on a card with another brand's logo
---
Short description in plain English.
```

| Field | Source | Notes |
|---|---|---|
| `design_id` | Assigned | `<PREFIX>-<two digits>`: DHN, KDR, LAJ. Number comes from the file name. Shown to customers. Never reuse one |
| `collection` | Folder | Lowercase folder name; matches the collection slug |
| `status` | Fixed | Always `draft` here. Publishing happens in admin |
| `price` | Empty | Set in admin |
| `name` | Photo + collection file | `<Main colour> [detail] <Embroidered or Printed> <Fabric> <N>-Piece Suit`. Must be unique |
| `slug` | From `name` + ID | Lowercase, hyphens, ends with the design ID |
| `volume_style`, `dress_categories`, `collection_type`, `fabric`, `piece_details`, `season`, `outfit_style` | Collection file | `outfit_style` is optional. These are unstitched, so the tailor decides the cut: leave it empty unless the collection file gives one. Khaddar and Lajwanti are empty by the owner's decision |
| `design` | Collection file + photo | See §4. The print type is read from the photo |
| `main_color`, `color_family`, `accent_colors`, `motifs` | Photo | `main_color` is the descriptive name shown on the page. `color_family` is the filter value (§4) |
| `photos[].file`, `videos[].file` | Folder | Relative to `Business data/Stock/` |
| `photos[].alt`, `videos[].alt` | Photo | Written by looking at it. Describes the suit, never the person's identity, and names no brand |
| `photos[].crop` | Optional | Pixels. Applied locally before upload |
| `also_in_this_design` | Photo | Other design IDs: same design in another colour. Each is still a separate suit with its own price |
| `check` | You | Anything unsure, or anything the owner must decide |
| Body | Photo + collection file | 1–2 short sentences in simple, warm English, in your own words. Only what's visible or in the collection file. No claims about softness, warmth, quality or stock unless the owner confirmed them |

## 4. Filter taxonomy

These are the only allowed values. They come from the owner's options list. A filter or value appears on the site **only when at least one published suit has it**, so shoppers never see empty options.

| Filter | Field | Allowed values | Per suit |
|---|---|---|---|
| Collection | `category_id` | Dhanak, Khaddar, Lajwanti; admin can add more | One |
| Volume style | `pieces` | 2 Piece, 3 Piece | One |
| Dress category | `dress_categories` | Unstitched Suits, Casual Wear, Daily Wear, Semi-Formal Wear, Formal Wear, Festive Wear | Many |
| Fabric | `fabric` | Dhanak, Lawn, Cotton, Linen, Khaddar, Cambric, Marina, Chiffon, Silk, Organza, Jacquard | One |
| Design | `design` | All-Over Print, Digital Print, Floral Print, Geometric Print, Block Print, Embroidered, Plain, Woven / Jacquard, Embellished | Many |
| Season | `season` | Summer, Winter, All-Season | One |
| Outfit style | `outfit_style` | Straight Suit, A-Line Suit, Kurta Set, Frock Style, Traditional Suit | One |
| Colour | `color_family` | Black, Grey, White, Beige, Brown, Red, Maroon, Pink, Purple, Blue, Teal, Green, Yellow, Orange | One |
| Price | `price` | Bands: under 4,000; 4,000–6,000; 6,000–8,000; 8,000–10,000; over 10,000 (PKR) | Set in admin |

Notes:
- **Only assign what's confirmed.** The options are what the shop *can* use, not claims about every suit. Every suit today is just `Unstitched Suits` until the owner adds occasions such as Formal Wear.
- **"Printed" isn't an allowed value.** The collection files say "Printed", so use the print type you can see: Floral, Geometric or All-Over. Digital and Block Print can't be told from a photo, so only the owner can set them.
- **`piece_details`:** 3 Piece is shirt + trouser + dupatta. 2 Piece is shirt + trouser or shirt + dupatta, as stated for that product.
- **`collection_type`** (Premium) is a display tag, not a filter.
- **Lajwanti's fabric is Dhanak**, so the Fabric filter and a "dhanak" search include it.
- **Adding a value** means updating this table and the validator in `packages/validators`, in the same commit.

## 5. Photo and video rules

These are the product-media rules. The `product-media` skill is built from this section.

**Before a file goes in the catalog, open it:**

| Found | Do |
|---|---|
| Another brand's logo, name or text panel in a photo | Leave it out of the catalog. List it in `_collection.md` under "Left out" and tell the owner |
| Poster border or leftovers that a crop can remove | Keep, set `crop`, add `check:` |
| Poster decoration a crop can't remove without cutting the suit or model | Keep, add `check:` for the owner to retouch or replace |
| Another company's logo in the scene, such as a car badge | Keep, add `check:`. The owner decides |
| Video with another brand's logo or end card, at any point | Leave it out, as for photos. It can return once re-exported without that part |
| Video with burned-in captions or borders | Keep, add `check:` |
| Video that doesn't match the photo (colour, print) | Keep, add `check:` |

**Checking videos:** look at several moments, including the very end, because end cards are easy to miss. The `product-media` skill has a script that builds these contact sheets in a browser. Save frames only outside the repo and outside `Business data/`.

**File names today:** `dhnk1.jpeg` + `dhnk1-VID.mp4`; `KDR-1.jpeg` + `KDR-1-VID.mp4`; `Laj2.jpeg` + `Laj2vid.mp4` or `laj5vid.mp4`; and `Laj1.png`. Case, type and pattern differ, so `catalog/` lists exact file names and nothing relies on a pattern.

**Limits and delivery:** photos JPEG, PNG or WebP up to 10 MB; videos MP4, MOV or WebM up to 50 MB and 60 seconds. Delivery rules: `docs/integrations.md` and `docs/design.md` §5.2.

**The main image is always a photo**, listed first in `photos:`.

**Photos are taller than the 3:4 display box** (about 0.4 to 0.6 width to height). See `docs/design.md` §2.

## 6. Import (`pnpm import:stock`)

Script: `scripts/import-stock.ts`. Built in Phase 5 of `docs/project-implementation.md`.

1. Reads every `catalog/<collection>/*.md` and validates it with Zod, including the taxonomy and banned names.
2. Checks that every listed file exists in `Business data/Stock/`, and reports files in the folder that no suit lists and `_collection.md` doesn't explain.
3. Crops photos in memory if `crop` is set, and uploads to `products/imported/<design-id>/`. Files on disk never change.
4. Creates or updates a **draft** with `import_key` = `design_id`. Re-running creates no duplicates and never overwrites a price or a change made in admin.

`--dry-run` does steps 1 and 2 and writes nothing.

**Then the owner:** clears each `check:` → sets the price in admin → publishes. The publish rules (`docs/database.md`) refuse a suit with no price, main image or alt text.

## 7. Add a new collection

For example, a new "Lawn" volume:

1. **Owner:** create `Business data/Stock/Lawn/`. Add the photos and videos, plus one collection `.md` file with volume style, fabric, piece details, design type and season. No colours.
2. **Claude Code:** read the file, and ask about anything missing.
3. Open every photo and sample every video, using the rules in §5. Group photos into suits, and ask when unsure.
4. Pick a new 3-letter prefix, such as `LWN`. Create `catalog/lawn/_collection.md` and one file per suit. Price stays empty.
5. If a value isn't in §4, stop and ask. Add it to the table and validator first.
6. Add the collection in admin, or to the seed.
7. Commit: `docs: add Lawn catalog`.
8. `pnpm import:stock --dry-run`, then `pnpm import:stock`.
9. **Owner:** clear `check:` items, set prices, publish. No deploy needed.

**New photos for an existing collection:** the same steps from 3, with the next free numbers. **Replacing a photo:** update the file name in the suit's file, remove its `check:`, re-import.

Playbook prompt: "Add new stock later" in `docs/claude-code-playbook.md` §5.
