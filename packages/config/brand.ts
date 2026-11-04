// Favicons, theme colour and web app manifest for both apps (docs/design.md §1.3).
// Fixed values, so they add no per-request work. The files are in each app's public/ folder.
import type { Metadata, MetadataRoute, Viewport } from 'next';

import type { App } from './env.ts';

// --color-primary and --color-bg in tailwind/theme.css: a powder blue browser bar like the
// header band, and a white splash like the page.
const THEME = '#a8c9c8';
const BACKGROUND = '#ffffff';

export const brandIcons = {
  icon: [
    // A fixed size, not "any", so Chrome prefers the SVG.
    { url: '/favicon.ico', sizes: '32x32' },
    { url: '/brand/favicon/favicon.svg', type: 'image/svg+xml' },
  ],
  apple: [{ url: '/brand/favicon/apple-touch-icon-180.png', sizes: '180x180' }],
} satisfies Metadata['icons'];

export const brandViewport = { themeColor: THEME } satisfies Viewport;

// The admin gets its own name so the owner can tell the two apart on a phone's home screen.
const NAMES: Record<App, Pick<MetadataRoute.Manifest, 'name' | 'short_name'>> = {
  web: { name: 'Mustafa Apparels', short_name: 'Mustafa Apparels' },
  admin: { name: 'Mustafa Apparels Admin', short_name: 'MA Admin' },
};

export function brandManifest(app: App): MetadataRoute.Manifest {
  return {
    ...NAMES[app],
    id: '/',
    start_url: '/',
    display: 'standalone',
    theme_color: THEME,
    background_color: BACKGROUND,
    // Not "maskable": the monogram's corners reach past the safe circle.
    icons: [
      { src: '/brand/favicon/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/favicon/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
