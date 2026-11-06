import { loadEnvFiles } from '@mustafa/config/env';
import { robotsHeaders, webHeaders } from '@mustafa/config/headers';
import type { NextConfig } from 'next';

loadEnvFiles();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // ADR-021: cached by 'use cache' + cacheTag; per-request pages opt out with `instant = false`.
  cacheComponents: true,
  partialPrefetching: true,
  // Photos come from Cloudinary at each width (lib/image-loader.ts); logos are unoptimized SVGs.
  images: {
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
    // The srcset widths in docs/integrations.md; fewer widths, fewer Cloudinary transformations.
    deviceSizes: [320, 480, 640, 828, 1080, 1440, 1920],
    imageSizes: [160, 240],
  },
  // Security headers and Tier A's fixed CSP; Tier B pages get theirs from proxy.ts.
  headers: async () => [
    ...webHeaders({ dev: process.env.NODE_ENV === 'development' }),
    ...robotsHeaders('web'),
  ],
};

export default nextConfig;
