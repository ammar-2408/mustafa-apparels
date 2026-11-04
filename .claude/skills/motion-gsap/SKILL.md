---
name: motion-gsap
description: Project rules for GSAP animation in Next.js — useGSAP cleanup, ScrollTrigger with Lenis, SplitText reveals, Flip and page transitions, gsap.matchMedia breakpoints, reduced motion, performance and tests. Use for any animation, scroll effect, hover effect or page transition. Load the official greensock gsap-skills too for API details.
---

# Motion with GSAP (project rules)

API reference: the official **gsap-skills** (install via CLAUDE.md registry) and `context7` MCP. Design tokens and patterns: `docs/design.md` §5.1.

Motion should feel **soft, fabric-like and premium**, and never slow a shopper down. Product video has its own rules: `docs/design.md` §5.2.

**Direction: read `docs/design.md` §9.1 first.** It sets how much motion each page gets. The site should have more motion than the reference there, using these rules to stay fast on phones.

## Setup (once, `apps/web/components/motion/gsap.ts`)
```ts
'use client';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, Flip);
gsap.defaults({ ease: 'power3.out', duration: 0.6 });
export { gsap, ScrollTrigger, SplitText, Flip, useGSAP };
```
All GSAP plugins are free to use. Import from this module only.

## Rules
1. **Client islands only.** Files with GSAP start with `'use client'`. Server components render the full content; motion enhances it.
2. **Always `useGSAP` with a scope** — never raw `useEffect` for GSAP:
   ```tsx
   const root = useRef<HTMLDivElement>(null);
   useGSAP(() => {
     const mm = gsap.matchMedia();
     mm.add({ motion: '(prefers-reduced-motion: no-preference)', reduce: '(prefers-reduced-motion: reduce)', desktop: '(min-width: 1024px)' }, (ctx) => {
       const { motion, desktop } = ctx.conditions!;
       if (!motion) { gsap.set('.reveal', { autoAlpha: 1 }); return; }
       gsap.from('.reveal', { autoAlpha: 0, y: 40, stagger: 0.08, scrollTrigger: { trigger: root.current, start: 'top 80%' } });
       if (desktop) { /* pinning, parallax, magnetic effects — desktop only */ }
     });
   }, { scope: root });
   ```
3. **Reduced motion** = no movement, no parallax, no pinning, no smooth scroll; quick opacity fades at most.
4. **No-JS safe**: hidden start states only under `html.js` (class added by an inline script in `<head>`); otherwise content must be visible. Use `autoAlpha`, not `opacity` alone. That inline script must work with the CSP on cached pages (`docs/auth-security.md` §3.2): it can't use a nonce, and it would be blocked if step 3.9 adopts SRI with `script-src 'self'`.
5. **Animate `transform`/`opacity`** (and `clip-path` sparingly). Never animate width/height/top/left/margin.
6. **SplitText**: split after fonts load (`document.fonts.ready`), use `autoSplit`/revert on resize, keep `aria-label` with the full text on the parent so screen readers read normal text.
7. **Lenis + ScrollTrigger**: one Lenis instance in a provider; `lenis.on('scroll', ScrollTrigger.update)`; drive Lenis from `gsap.ticker`; disable for reduced motion and on touch devices if it hurts native feel.
8. **Route changes**: `ScrollTrigger.refresh()` after the new page's images load; `useGSAP` scope cleanup kills old triggers. Test: trigger count doesn't grow across navigations.
9. **Pinning** only on `lg+`; mobile uses native horizontal scroll-snap carousels instead of pinned sections.
10. **Page transitions** between every page: a short powder blue cover with the official MA submark, about 0.25 s in and 0.25 s out, and it never waits on slow data. Fade the submark; never stretch or redraw it. None with reduced motion. Prefer View Transitions (React `<ViewTransition>` / CSS) with a GSAP fallback overlay; Flip for card → product hero image.
11. **Performance**: ≤ 1 scrubbed effect per viewport on mobile; no pinning, stacking cards or `backdrop-filter` blur on phones; parallax movement ≤ 15%; `will-change` only during animation; images in animated sections have explicit width/height (no CLS).
12. **Tokens** (`docs/design.md` §5.1): durations `fast 0.25`, `base 0.6`, `slow 1.1`, `hero 1.6`; eases `power3.out` (enter), `power2.inOut` (move), `expo.out` (hero), `none` (scrubbed scroll); stagger 0.06–0.1 for grids, 0.02 for split characters.
13. **Stay cached**: motion runs only on the client. It adds no per-request work to the page around it.

## Reusable components (build these, then reuse)
`<Reveal>` (fade/slide on scroll) · `<SplitHeading>` · `<WordFill>` (words go from `--color-muted` to ink on scroll) · `<ImageReveal>` (clip-path) · `<StackingCards>` (desktop only) · `<Parallax strength>` · `<HorizontalGallery>` (pinned desktop / snap mobile) · `<MagneticButton>` (pointer:fine only) · `<PageTransition>`.

## Tests for every motion change
- Component test: renders content visible when `matchMedia('(prefers-reduced-motion: reduce)')` matches.
- E2E (`e2e/web/motion.spec.ts`): with `reducedMotion: 'reduce'` content visible immediately; with JS disabled content visible; ScrollTrigger count stable after 3 navigations; no console errors.
- Lighthouse: CLS < 0.1 and Performance ≥ 90 mobile on pages with motion.
