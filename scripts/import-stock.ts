// `pnpm import:stock` (docs/catalog.md §6). Turns catalog/ into draft suits with no price.
//   --dry-run            validate and check files only; writes nothing
//   --max-credits <n>    refuse to start if the uploads would use more Cloudinary credits (default 3)
//   --production         required with IMPORT_DATABASE_URL (any database but your local one)
//   --stock-dir <dir>    instead of "Business data/Stock" (tests)
//   --catalog-dir <dir>  instead of catalog/ (tests)
// "Business data/" is only ever read. It prints names and counts, never a URL with a password.
import { join, resolve } from 'node:path';

import { loadEnvFiles } from '@mustafa/config/env';
import type { MediaConfig } from '@mustafa/core/integrations/media';
import { createDb } from '@mustafa/db/client';

import { dryRun } from './import-stock/dry-run';
import { importActor, type ImportReport, importStock } from './import-stock/run';
import { liveUploader } from './import-stock/uploader';

const ROOT = join(__dirname, '..');

export type Options = {
  dryRun: boolean;
  production: boolean;
  maxCredits: number;
  stockDir: string;
  catalogDir: string;
};

const VALUE_FLAGS = ['--stock-dir', '--catalog-dir', '--max-credits'];
const FLAGS = ['--dry-run', '--production', ...VALUE_FLAGS];

export function parseArgs(argv: string[]): Options {
  const value = (flag: string) => {
    const at = argv.indexOf(flag);
    if (at < 0) return undefined;
    const given = argv[at + 1];
    if (given === undefined || given.startsWith('--')) throw new Error(`${flag} needs a value`);
    return given;
  };
  for (const [index, arg] of argv.entries()) {
    const isValue = index > 0 && VALUE_FLAGS.includes(argv[index - 1]!);
    if (!isValue && arg !== '--' && !FLAGS.includes(arg)) throw new Error(`Unknown option ${arg}`);
  }
  const maxCredits = Number(value('--max-credits') ?? 3);
  if (!Number.isFinite(maxCredits) || maxCredits < 0)
    throw new Error('--max-credits takes a number');
  return {
    dryRun: argv.includes('--dry-run'),
    production: argv.includes('--production'),
    maxCredits,
    stockDir: resolve(value('--stock-dir') ?? join(ROOT, 'Business data', 'Stock')),
    catalogDir: resolve(value('--catalog-dir') ?? join(ROOT, 'catalog')),
  };
}

// Your local database (.env.local) by default. Any other, such as production at step 10.3, must
// come in IMPORT_DATABASE_URL together with --production, so it can't be hit by accident.
export function targetDatabase(env: Record<string, string | undefined>, production: boolean) {
  const other = env.IMPORT_DATABASE_URL?.trim();
  if (other && !production) {
    throw new Error('IMPORT_DATABASE_URL is set: add --production to import into that database.');
  }
  if (production && !other) {
    throw new Error('--production needs IMPORT_DATABASE_URL (the production database URL).');
  }
  if (other) return { url: other, label: 'the database in IMPORT_DATABASE_URL (production)' };
  const local = (env.DATABASE_URL_UNPOOLED || env.DATABASE_URL)?.trim();
  if (!local) throw new Error('DATABASE_URL is missing from .env.local');
  if (env.APP_ENV === 'production') {
    throw new Error('APP_ENV is production: use IMPORT_DATABASE_URL with --production instead.');
  }
  return { url: local, label: 'your local database (DATABASE_URL, the Neon dev branch)' };
}

function printReport(report: ImportReport) {
  console.log('\nSuit     Result     Uploaded  Reused  Open checks  Changed / kept');
  for (const suit of report.suits) {
    const detail = [
      suit.changed.length ? `changed ${suit.changed.join(', ')}` : '',
      suit.keptEdits.length ? `kept your edits to ${suit.keptEdits.join(', ')}` : '',
      ...suit.notes,
    ]
      .filter(Boolean)
      .join('; ');
    console.log(
      `${suit.designId.padEnd(8)} ${suit.outcome.padEnd(10)} ${String(suit.uploaded).padEnd(9)} ${String(suit.reused).padEnd(7)} ${String(suit.openChecks.length).padEnd(12)} ${detail}`,
    );
  }
  console.log(
    `\n${report.uploaded} uploaded, ${report.reused} reused. Every new suit is a draft with no price.`,
  );
  if (report.unused.length > 0) {
    console.log(
      `No longer used by these suits (kept in Cloudinary, delete by hand if no database uses them): ${report.unused.join(', ')}`,
    );
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const checked = await dryRun(options);
  console.log(checked.lines.join('\n'));
  if (!checked.ok || options.dryRun) {
    if (!checked.ok) process.exitCode = 1;
    return;
  }

  // The same env files the admin reads: its own .env.local, then the root one.
  loadEnvFiles(join(ROOT, 'apps', 'admin'));
  const target = targetDatabase(process.env, options.production);
  const mediaConfig: MediaConfig = {
    mode: 'live',
    appEnv: process.env.APP_ENV ?? 'development',
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  };
  console.log(`\nImporting into ${target.label}.`);
  const db = createDb(target.url);
  try {
    const report = await importStock({
      db,
      suits: checked.catalog.suits,
      stockDir: options.stockDir,
      uploader: liveUploader(mediaConfig),
      mediaConfig,
      actor: await importActor(db, process.env.SEED_ADMIN_EMAIL),
      maxCredits: options.maxCredits,
      log: (line) => console.log(line),
    });
    printReport(report);
  } finally {
    await db.$client.end();
  }
}

if (require.main === module) {
  // scripts/ compiles as CommonJS, so no top-level await.
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
