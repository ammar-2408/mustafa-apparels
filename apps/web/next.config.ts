import { loadEnvFiles } from '@mustafa/config/env';
import { robotsHeaders } from '@mustafa/config/headers';
import type { NextConfig } from 'next';

loadEnvFiles();

const nextConfig: NextConfig = {
  headers: async () => robotsHeaders('web'),
};

export default nextConfig;
