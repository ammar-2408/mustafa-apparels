---
name: reference-to-code
description: Turn a reference website, screenshot or screen recording into original UI for this shop ("image to code") — capture it at each breakpoint, break down layout, typography, motion and interactions, then rebuild with our tokens, components, GSAP and 3D rules without copying code or assets. Use when the user shares a URL, screenshot or video and says they like a design, animation or effect.
argument-hint: "[url or attached image] [what part you like]"
---

# Reference → original code

Ideas are free; code, images, fonts, logos and copy are not. We **study** references and **rebuild** originals.

## 1. Capture
- **URL**: with the `playwright` MCP, open it and take full-page screenshots at 360, 768, 1280, 1920 and 2560 widths. For motion, scroll slowly and capture frames at key points (start, mid, end of each animated section); note what triggers each change (load, scroll position, hover, click). Screenshots land in `.playwright-mcp/`, which is git-ignored. Never move them anywhere that's committed, or into `Business data/`.
- **Screenshot/video from the user**: read the image(s) directly. Ask for a short screen recording only if the motion is unclear.
- Optional: `chrome-devtools` MCP to see which libraries power it (e.g. GSAP, Lenis, Three.js) and timing/easing in the Performance panel. Use this to understand technique, not to copy source.

## 2. Break it down (write this in the reply before coding)
| Aspect | Notes |
|---|---|
| Layout | grid/columns per breakpoint, spacing rhythm, aspect ratios |
| Typography | scale, weight contrast, letter-spacing, case — map to Montserrat 300/400 only |
| Colour/mood | how contrast is used — map to *our* tokens: ink and cream, with no accent colour; photos supply the colour |
| Motion | trigger → property → duration → easing → stagger; scroll-scrubbed or time-based; pinning |
| Interaction | hover/tap states, cursor effects, transitions between pages |
| 3D/WebGL | what is real 3D vs. shader vs. video vs. CSS |
| Mobile behaviour | what changes or is removed on small screens |
| Why it works | the 1–2 ideas worth keeping |

## 3. Rebuild
- Use our components first (`<Reveal>`, `<SplitHeading>`, `<ImageReveal>`, `<HorizontalGallery>`, `<HeroCanvas>`…); extend them rather than writing one-offs.
- Follow `brand-mustafa`, `motion-gsap` and `three-scene` rules (tokens, logo, reduced motion, no-JS content, budgets).
- **Translate what doesn't fit this shop.** A reference's 3D model becomes a shader, because we download no model. Its video in a grid becomes a photo, because video stays on product pages (`docs/design.md` §5.2). Its cart or checkout becomes our WhatsApp inquiry. Public pages stay cached.
- Our own content: placeholder suit photos from our Cloudinary/seed data, our copy, our tokens. Never hotlink or download the reference's assets.
- Make it responsive across all breakpoints in `docs/design.md` §2 — references are often desktop-only; design the mobile version deliberately.

## 4. Check
- Side-by-side screenshots (reference vs ours) at 360/1280/1920/2560 via `playwright` MCP to confirm the *feeling* matches while the result is clearly original.
- Run the motion/a11y/responsive tests; Lighthouse mobile ≥ 90.
- Then `ship-change`.

## Never
- Copy-paste HTML/CSS/JS from the reference, its shaders, images, fonts, icons, logos or text.
- Recreate a brand's signature design so closely it could be mistaken for theirs.
- Name the reference brand in anything customers or search engines can see.
