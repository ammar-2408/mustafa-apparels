---
name: product-media
description: Mustafa Apparels stock workflow — turn the owner's collection file, photos and videos in "Business data/" into per-suit files in catalog/, import them as drafts, and leave prices to the owner. Covers brand checks on every photo and video, the suit file format, filter values, alt text and adding a collection. Use whenever the user adds, reviews or changes stock, photos, videos, suit details, alt text, filter values, catalog/ or scripts/import-stock.ts, even if they only say "I added new suits".
---

# Product media

Source of truth: `docs/catalog.md`. If this skill and that doc disagree, the doc wins, so fix the skill. Also: `docs/design.md` §5.2 (video on the page), `docs/integrations.md` (Cloudinary), `docs/database.md` §9 (banned names).

```
Business data/Stock/<Collection>/  →  catalog/<collection>/          →  pnpm import:stock  →  draft in admin  →  owner clears check:, sets price, publishes
  collection .md, photos, videos       _collection.md, <design-id>.md
```

## Limits that never bend

- **`Business data/` is read-only.** Never write, move or rename anything there.
- **Raw media never enters git.** `catalog/` holds text only. Never use `git add -f`, and never copy media, frames or screenshots into the repo. Save frames only to the OS temp folder.
- **Only what `catalog/` lists gets uploaded.** Anything uploaded can be reached at a public URL, so media showing another brand stays out of the catalog completely.
- **No prices.** `price:` stays empty and `status:` stays `draft`. The owner sets prices in admin.
- **Never name another brand, or copy text from posters or videos**, anywhere in `catalog/`. That includes `check:` and "Left out" notes: write "another brand's logo", because the validator scans every file. If a new brand appears, tell the owner in your reply and add it to `banned-terms.ts` and `docs/database.md` §9.
- **Unsure? Add a `check:`.** Never present a guess as fact. Every `check:` must be cleared before that suit is published.

## 1. Read the collection file

It gives what every suit in the volume shares: volume style, fabric, piece details, design type, season. It never gives colours. Files differ in format and can have gaps, so ask the owner about anything missing. A file that's only a list of options confirms nothing about this volume. Keep the complete values in `catalog/<collection>/_collection.md`, noting the owner and date for anything the source file doesn't say.

## 2. Check every photo and video

**Photos:** open each one with Read. **Videos:** make contact sheets:

1. Run `node .claude/skills/product-media/scripts/contact-sheet.mjs` in the background from the repo root, once per collection.
2. With the `playwright` MCP, open `http://127.0.0.1:4178/?dir=<Collection>` and wait for "ALL DONE". The script then exits by itself.
3. Get the page text with `browser_evaluate` (`document.body.innerText`). Each line gives the duration, dimensions and sheet path. Read every sheet.

Each sheet has 8 frames in time order: 5 spread through the video, plus 3 s, 1 s and 0.1 s before the end. **Look hardest at the last frames:** on `Laj1vid.mp4`, the end card shows at 0.1 s but not at 1 s. A sheet is still only a sample, so `_collection.md` must say each video should be watched once before publishing. A video marked `FAILED` hasn't been checked, so leave it out and tell the owner.

| Found | Do |
|---|---|
| Another brand's logo, name or text panel in a photo | Leave it out. List it under "Left out" in `_collection.md` and tell the owner |
| Poster border or leftovers a crop can remove | Keep, set `crop`, add `check:` |
| Poster decoration a crop can't remove without cutting the suit or model, such as a small printed flower in a corner. Look at all four corners, and if you can't tell decoration from scenery, treat it as decoration | Keep, add `check:` for the owner to retouch or replace |
| Another company's logo in the scene, such as a car badge | Keep, add `check:`. The owner decides |
| Photo that's small or soft compared with the others | Keep, add `check:` to review sharpness or replace it |
| Video with another brand's logo or end card, at any point | Leave it out, as for photos. It can return once re-exported without that part |
| Video with burned-in captions or borders | Keep, add `check:` |
| Video that doesn't match the photo (colour, print) | Keep, add `check:` |
| Photo over 10 MB or not JPEG/PNG/WebP; video over 50 MB or 60 s, or not MP4/MOV/WebM | It can't be uploaded. Leave it out and tell the owner |

## 3. Group into suits and write the files

File names vary in case, type and pattern, so list exact names and rely on no pattern. One file per suit. Several photos can belong to one suit, with the main image first, and the main image is always a photo. The same design in another colour is a separate suit: link them both ways in `also_in_this_design`. Ask when unsure.

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
design: [Embroidered]
season: Winter
outfit_style: Traditional Suit
main_color: Black
color_family: Black
accent_colors: [Beige]
motifs: [diamond neckline panel, small flower sprigs, large floral dupatta]
photos:
  - file: Dhanak/dhnk1.jpeg
    alt: "Model wearing a black 3-piece Dhanak suit with a beige embroidered diamond panel down the front, a black floral printed dupatta and plain black trousers"
    crop: { x: 84, y: 58, width: 1256, height: 2300 }
videos: []
also_in_this_design: []
check:
  - "Video left out: dhnk1-VID.mp4 ends on a card showing another brand's logo. It can return if re-exported without that card"
---
A black unstitched 3-piece Dhanak suit for winter. The embroidered shirt has a beige diamond panel down the front, with a floral printed dupatta and plain dyed trousers.
```

- **`design_id`:** `<PREFIX>-<two digits>`, with the number from the file name. Shown to customers. Never reuse or change one.
- **`name`:** `<Main colour> [detail] <Embroidered or Printed> <Fabric> <N>-Piece Suit`, unique. Add a detail word only when the name would otherwise clash. **`slug`:** lowercase, hyphens, ends with the design ID.
- **From the photo:** `main_color` (descriptive name), `color_family` (filter value), `accent_colors`, `motifs`.
- **`design`:** the collection's allowed values, plus the print type you can see. A Lajwanti suit is `[All-Over Print, Floral Print]`.
- **`piece_details`:** from the collection file. `finish` is free text, so "Printed" is fine here. Leave out any key the file doesn't give.
- **`outfit_style`:** leave empty unless the collection file gives one. The customer's tailor decides the cut.
- **`photos`:** `file`, `alt`, optional `crop`. **`videos`:** `file` and `alt` only, or `[]`. **`file`:** relative to `Business data/Stock/`. **`crop`:** pixels, applied in memory before upload.
- **`alt`, photos and videos:** written by looking at that file, 3–200 characters. Describe the suit: colour, pieces, print, work. Never the person's identity, and never a brand.
- **Body:** 1–2 short sentences in your own words, using only what's visible or in the collection file. No claims about softness, warmth, quality or stock unless the owner confirmed them. Tone: `brand-mustafa` skill.

`_collection.md` has the shared values as frontmatter, a note on where each came from, a "Suits" table (design ID, photo, video, main colour) and a "Left out" list with reasons. Copy the shape of `catalog/dhanak/_collection.md`.

## Filter values (`docs/catalog.md` §4)

| Field | Allowed values | Per suit |
|---|---|---|
| `volume_style` | 2 Piece, 3 Piece | One |
| `dress_categories` | Unstitched Suits, Casual Wear, Daily Wear, Semi-Formal Wear, Formal Wear, Festive Wear | Many |
| `fabric` | Dhanak, Lawn, Cotton, Linen, Khaddar, Cambric, Marina, Chiffon, Silk, Organza, Jacquard | One |
| `design` | All-Over Print, Digital Print, Floral Print, Geometric Print, Block Print, Embroidered, Plain, Woven / Jacquard, Embellished | Many |
| `season` | Summer, Winter, All-Season | One |
| `outfit_style` | Straight Suit, A-Line Suit, Kurta Set, Frock Style, Traditional Suit | One |
| `color_family` | Black, Grey, White, Beige, Brown, Red, Maroon, Pink, Purple, Blue, Teal, Green, Yellow, Orange | One |

- **Only assign what's confirmed.** Every suit is just `Unstitched Suits` until the owner adds occasions.
- **"Printed" isn't a `design` value.** Use the print type you can see: Floral, Geometric or All-Over. Digital and Block Print can't be told from a photo, so only the owner can set them.
- **There are no sizes.** Suits are unstitched.
- **A value not in this table:** stop and ask. Adding one means updating `docs/catalog.md` §4 and the validator in `packages/validators` in the same commit.

## 4. Import

Commit the text files with `docs: add <Collection> catalog`. Then run `pnpm import:stock --dry-run`, followed by `pnpm import:stock`. The script arrives at steps 5.4–5.5 of `docs/project-implementation.md`: until `scripts/import-stock.ts` exists, stop after the commit and say the import is still to come.

Re-running creates no duplicates and never overwrites a price or an admin edit. Finish with a table per collection: suits found, photos per suit, and anything the owner must fix or confirm, including everything left out.

## On the site (for code work)

- Video goes on product pages only, plus at most one featured suit on the home page. **Never in grids:** Cloudinary's free plan is about 25 GB of shared capacity a month.
- In the gallery, video comes after the main image, so it's never the LCP element. Poster first, `preload="none"`, muted, delivered with `ac_none`. Full rules: `docs/design.md` §5.2.
- Media is served from Cloudinary, never `public/`. Imports go to `products/imported/<design-id>/`. Limits and URLs: `docs/integrations.md`.

## Add a new collection

1. **Owner:** creates `Business data/Stock/<Name>/` with photos, videos and one collection `.md` file (volume style, fabric, piece details, design type, season; no colours).
2. Follow steps 1–3 above. Pick a new 3-letter prefix (existing: DHN, KDR, LAJ) and create `catalog/<name>/`.
3. Add the collection in admin or the seed, then step 4.
4. **Owner:** clears `check:` items, sets prices, publishes. No deploy needed.

**New photos for an existing collection:** the same, from step 2, with the next free numbers. **Replacing a photo:** update the file name in the suit's file, remove its `check:`, re-import.
