import { loadEnvFiles } from '@mustafa/config/env';
import { robotsHeaders, securityHeaders } from '@mustafa/config/headers';
import type { NextConfig } from 'next';

loadEnvFiles();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The CSP comes from proxy.ts, with a nonce on every page.
  headers: async () => [
    { source: '/:path*', headers: securityHeaders() },
    ...robotsHeaders('admin'),
  ],
};

export default nextConfig;
