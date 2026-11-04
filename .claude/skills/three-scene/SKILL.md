---
name: three-scene
description: Project rules for 3D and WebGL with Three.js and React Three Fiber — the flowing-fabric shader hero with no downloaded model, lazy client islands with poster fallback, capability detection, performance budgets, disposal, shaders for image effects, and tests. Use for any 3D scene, WebGL effect, shader or canvas work, and if anyone suggests adding a .glb or other 3D model.
---

# 3D scenes (React Three Fiber)

Design direction and budgets: `docs/design.md` §6. Docs: `context7` MCP (three, @react-three/fiber, @react-three/drei).

**Chosen concept: flowing fabric.** A cloth-like plane with a vertex-shader wave, reacting to cursor and scroll, in ink folds on white with soft powder blue light, and the MA monogram nearby. It should read as real draped cloth, with large soft folds and light across them, filling the hero behind a large headline (`docs/design.md` §9.1). Keep the header area light, so the black logo never sits on dark cloth.

**No downloaded model (ADR-015).** The scene is shader code only: no `.glb`, no HDRI or environment map, no model loaders or decoders. At Netlify's 20 credits per GB, a 1.5 MB model would cost about 30 credits per 1,000 home visits. If a model is ever wanted, stop and ask: it needs a new ADR, must be served from Cloudinary and must stay ≤ 1.5 MB.

## Architecture
```
apps/web/components/three/
  HeroCanvasLazy.tsx    'use client' — next/dynamic with ssr: false lives here
  HeroCanvas.tsx        <Canvas> + <Suspense>
  FabricPlane.tsx       the cloth mesh + shader material
  ImageDistortion.tsx   WebGL hover effect for collection tiles and product photos
  useWebGLSupport.ts    capability + device detection
  shaders/*.glsl.ts     shader strings
```
`ssr: false` only works inside a Client Component, so the server page imports a small wrapper:
```tsx
// components/three/HeroCanvasLazy.tsx
'use client';
import dynamic from 'next/dynamic';
export const HeroCanvasLazy = dynamic(() => import('./HeroCanvas'), { ssr: false, loading: () => null });

// app/(shop)/page.tsx (server component, stays cached)
<section className="relative">
  <Image src={poster} alt="" priority fill sizes="100vw" />   {/* LCP + fallback */}
  <HeroCanvasLazy className="absolute inset-0" aria-hidden />
  <h1>…</h1>                                                    {/* real text, not in canvas */}
</section>
```

## Rules
1. **Never block content or LCP.** The poster image, with the same framing as the scene, is the LCP element; the canvas mounts after the page is interactive (`requestIdleCallback`) and only when in view (IntersectionObserver). Fade the canvas in over the poster. Serve the poster from Cloudinary (`brand/` folder), not `public/`, because Netlify bandwidth costs credits.
2. **Capability gate** (`useWebGLSupport`): render 3D only if WebGL is available AND not `prefers-reduced-motion` AND not Save-Data AND not a low-end device (`navigator.hardwareConcurrency <= 4`). Otherwise keep the poster, with a CSS animation.
3. **Budget**: hero 3D JS ≤ 250 kB gzipped, loaded on the home page only. Target 60 fps on desktop, ≥ 30 fps on mid-range phones.
4. **Renderer settings**: `dpr={[1, 2]}` (mobile `[1, 1.5]`), `gl={{ antialias: false, powerPreference: 'high-performance' }}`, `frameloop="demand"` when idle and `invalidate()` while the fabric is moving; pause when the tab is hidden or the canvas is off-screen.
5. **One canvas per page.** For several WebGL image effects use a single shared canvas (Drei `<View>` / scissor) instead of many contexts.
6. **Cleanup**: R3F disposes JSX-created objects; manually dispose anything created with `new` (geometries, materials, textures, render targets). Handle `webglcontextlost` → show poster.
7. **Interaction**: scroll-linked movement via GSAP ScrollTrigger driving refs and uniforms (not React state per frame); pointer effects only on `pointer: fine`.
8. **Accessibility**: canvas is decorative (`aria-hidden`), with a text equivalent nearby; all meaning is in HTML text. No flashing; respect reduced motion.
9. **Colours** are ink, white and powder blue, read from design tokens once on mount (`brand-mustafa` skill). No orange in the shader, and no dark mode.
10. **Logo**: the MA monogram is the official SVG in HTML next to the canvas. Never redraw, distort or recreate it in a shader.
11. **CSP** (`docs/auth-security.md` §3.2): `blob:` stays in `worker-src` and `img-src` only. Load Cloudinary textures with `TextureLoader`, which uses `img-src`: `connect-src` doesn't allow Cloudinary, so a `fetch`-based loader would be blocked.
12. **Stay cached.** An island adds no per-request work: the page around it stays static, with no nonce.

## Image distortion effect (works with admin-uploaded photos)
Plane mesh with the photo as a texture; fragment shader offsets UVs by a noise/ripple driven by a `uHover` uniform tweened with GSAP on pointer enter/leave. Desktop only; mobile shows a CSS scale.

## Tests
- Unit: `useWebGLSupport` decisions for each condition (mock `matchMedia`, `navigator`).
- E2E: with WebGL disabled (`--disable-webgl` / mocked) → poster visible, no errors; with reduced motion → no canvas; navigation away and back 3× → no "too many WebGL contexts" warnings; the home page requests no `.glb`, `.gltf` or `.hdr` file; no CSP violations.
- Performance: Lighthouse mobile on home ≥ 90, CLS < 0.1; LCP element is the poster; 3D chunk within budget; `chrome-devtools` MCP trace shows no long tasks > 200 ms from 3D init.
