// The admin's Cloudinary settings (docs/integrations.md). Server-only: the API secret never
// reaches the browser, and the storefront never has it (packages/config/env.ts refuses it there).
import 'server-only';

import { getEnv } from '@mustafa/config/env';
import type { MediaConfig } from '@mustafa/core/integrations/media';

export function mediaConfig(): MediaConfig {
  const env = getEnv('admin');
  return {
    mode: env.INTEGRATIONS_MODE,
    appEnv: env.APP_ENV,
    cloudName: env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
  };
}

// The mock upload route and store exist only for local runs and CI, never on a hosted site.
export function mockUploadsAllowed(config = mediaConfig()) {
  return config.mode === 'mock' && (config.appEnv === 'development' || config.appEnv === 'test');
}
