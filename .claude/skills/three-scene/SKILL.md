---
name: three-scene
description: Project rules for 3D and WebGL with Three.js and React Three Fiber — lazy client islands with poster fallback, capability detection, performance budgets, model optimization, disposal, shaders for image effects, and tests. Use for any 3D scene, WebGL effect, shader or .glb model work.
---

# 3D scenes (React Three Fiber)

Design direction and budgets: `docs/design.md` §6. Docs: `context7` MCP (three, @react-three/fiber, @react-three/drei).

## Architecture
```
components/three/
  HeroCanvas.tsx        'use client' — dynamic import target; <Canvas> + <Suspense>
  HeroScene.tsx         the scene graph
  ImageDistortion.tsx   WebGL hover effect for product/category images
  useWebGLSupport.ts    capability + device detection
  shaders/*.glsl.ts     shader strings
```
Usage in a server component page:
```tsx
const HeroCanvas = dynamic(() => import('@/components/three/HeroCanvas'), { ssr: false, loading: () => null });
<section className="relative">
  <Image src={poster} alt="" priority fill sizes="100vw" />   {/* LCP + fallback */}
  <HeroCanvas className="absolute inset-0" aria-hidden />
  <h1>…</h1>                                                    {/* real text, not in canvas */}
</section>
```

## Rules
1. **Never block content or LCP.** The poster image is the LCP element; the canvas mounts after the page is interactive (`requestIdleCallback`) and only when in view (IntersectionObserver). Fade the canvas in over the poster.
2. **Capability gate** (`useWebGLSupport`): render 3D only if WebGL2 is available AND not `prefers-reduced-motion` AND not Save-Data AND not a low-end device (`hardwareConcurrency <= 4` or `deviceMemory <= 4`). Otherwise keep the poster (+ optional CSS animation).
3. **Budgets**: hero 3D JS ≤ 250 kB gzipped (home page only); model ≤ 1.5 MB; textures KTX2/WebP, max 2048px; target 60 fps desktop, ≥ 30 fps mid phones.
4. **Model pipeline**: optimize `.glb` with `gltf-transform` (`optimize --compress meshopt` or draco, texture resize/webp/ktx2); load with Drei `useGLTF` + preload; set up the decoder paths locally (no third-party CDN, CSP).
5. **Renderer settings**: `dpr={[1, 2]}` (mobile `[1, 1.5]`), `gl={{ antialias: false, powerPreference: 'high-performance' }}` + post AA only if needed, `frameloop="demand"` for static scenes and `invalidate()` on interaction; pause when tab hidden or canvas off-screen.
6. **One canvas per page.** For several WebGL image effects use a single shared canvas (Drei `<View>` / scissor) instead of many contexts.
7. **Cleanup**: R3F disposes JSX-created objects; manually dispose anything created with `new` (geometries, materials, textures, render targets). Handle `webglcontextlost` → show poster.
8. **Interaction**: scroll-linked camera/rotation via GSAP ScrollTrigger driving refs (not React state per frame); pointer effects only on `pointer: fine`.
9. **Accessibility**: canvas is decorative (`aria-hidden`); all meaning is in HTML text. No flashing; respect reduced motion.
10. **Colours** come from design tokens (read CSS variables once on mount) so the theme change in Phase 6 updates the scene.

## Image distortion effect (works with admin-uploaded photos)
Plane mesh with the product texture; fragment shader offsets UVs by a noise/ripple driven by a `uHover` uniform tweened with GSAP on pointer enter/leave. Desktop only; mobile shows a CSS scale.

## Tests
- Unit: `useWebGLSupport` decisions for each condition (mock `matchMedia`, `navigator`).
- E2E: with WebGL disabled (`--disable-webgl` / mocked) → poster visible, no errors; with reduced motion → no canvas; navigation away and back 3× → no "too many WebGL contexts" warnings.
- Performance: Lighthouse mobile on home ≥ 90; LCP element is the poster; `chrome-devtools` MCP trace shows no long tasks > 200 ms from 3D init.
