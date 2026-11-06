import { loadEnvFiles } from '@mustafa/config/env';
import { robotsHeaders, webHeaders } from '@mustafa/config/headers';
import type { NextConfig } from 'next';

loadEnvFiles();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // ADR-021: cached by 'use cache' + cacheTag; per-request pages opt out with `instant = false`.
  cacheComponents: true,
  partialPrefetching: true,
  // Security headers and Tier A's fixed CSP; Tier B pages get theirs from proxy.ts.
  headers: async () => [
    ...webHeaders({ dev: process.env.NODE_ENV === 'development' }),
    ...robotsHeaders('web'),
  ],
};

export default nextConfig;
