import { loadEnvFiles } from '@mustafa/config/env';
import { robotsHeaders, webHeaders } from '@mustafa/config/headers';
import type { NextConfig } from 'next';

loadEnvFiles();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Photos come from Cloudinary at each width (lib/image-loader.ts); logos are unoptimized SVGs.
  images: {
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
    // The srcset widths in docs/integrations.md; fewer widths, fewer Cloudinary transformations.
    deviceSizes: [320, 480, 640, 828, 1080, 1440, 1920],
    imageSizes: [160, 240],
  },
  // Security headers and Tier A's fixed CSP; Tier B pages get theirs from proxy.ts.
  // Page 1 of a list has no /page/1 URL (ADR-017): a permanent 301 to the clean URL.
  redirects: async () => [
    { source: '/shop/page/1', destination: '/shop', statusCode: 301 },
    // Search is a box in the navbar now (owner, 2026-11-22), so the old page's address goes to
    // All Suits.
    { source: '/search', destination: '/shop', statusCode: 301 },
    {
      source: '/collections/:slug/page/1',
      destination: '/collections/:slug',
      statusCode: 301,
    },
  ],
  headers: async () => [
    ...webHeaders({ dev: process.env.NODE_ENV === 'development' }),
    ...robotsHeaders('web'),
  ],
};

export default nextConfig;
