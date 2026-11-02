// `pnpm db:seed` (add `-- --e2e` for the demo suits). Uses the direct URL when set.
import { loadEnvFiles } from '@mustafa/config/env';

import { createDb } from '../client';
import { seed } from '../seed';

loadEnvFiles();

const url = (process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL)?.trim();

try {
  if (!url) throw new Error('DATABASE_URL_UNPOOLED or DATABASE_URL is missing');
  const db = createDb(url);
  try {
    const summary = await seed(db, {
      appEnv: process.env.APP_ENV,
      e2e: process.argv.includes('--e2e'),
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || undefined,
    });
    console.log(
      `Seeded ${summary.categories} collections, ${summary.settings} settings, ${summary.demoSuits} demo suits.`,
    );
  } finally {
    await db.$client.end();
  }
} catch (error) {
  console.error(`Seed failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
