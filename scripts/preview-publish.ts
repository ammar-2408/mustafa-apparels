// `pnpm preview:publish --confirm-host=<host>`: local preview data for the storefront.
// Gives every imported draft suit a placeholder price, clears its checks and publishes it, so the
// pages show real photos. It goes through core, so the real publish rules run.
// Dev database only: real prices and publishing happen in the production admin (step 5.7).
import { join } from 'node:path';

import { loadEnvFiles } from '@mustafa/config/env';
import type { Actor } from '@mustafa/core/audit';
import * as products from '@mustafa/core/products';
import type { Database } from '@mustafa/db/client';
import { createDb } from '@mustafa/db/client';
import { product } from '@mustafa/db/schema';
import { and, asc, isNotNull, isNull } from 'drizzle-orm';

import { importActor } from './import-stock/run';

export const PLACEHOLDER_PRICE = 4999;

const ROOT = join(__dirname, '..');

// Neon gives the pooled and direct endpoints the same host apart from `-pooler`.
export function databaseHost(url: string) {
  return new URL(url).hostname.replace('-pooler', '').toLowerCase();
}

// Refuses anything but your local dev database, and needs its host typed back.
export function devTarget(env: Record<string, string | undefined>, argv: string[]) {
  if (argv.includes('--production')) throw new Error('preview:publish never runs on production.');
  if (env.APP_ENV !== 'development') {
    throw new Error(`APP_ENV must be development (it is ${env.APP_ENV ?? 'unset'}).`);
  }
  const url = (env.DATABASE_URL_UNPOOLED || env.DATABASE_URL)?.trim();
  if (!url) throw new Error('DATABASE_URL is missing from .env.local');
  const host = databaseHost(url);
  for (const name of ['IMPORT_DATABASE_URL', 'E2E_DATABASE_URL'] as const) {
    const other = env[name]?.trim();
    if (other && databaseHost(other) === host) {
      throw new Error(`DATABASE_URL is the same database as ${name}: refusing.`);
    }
  }
  const confirm = argv.find((arg) => arg.startsWith('--confirm-host='))?.split('=')[1];
  if (!confirm || confirm.toLowerCase().replace('-pooler', '') !== host) {
    throw new Error(
      `Run again with --confirm-host=${host} once you are sure it is the dev branch.`,
    );
  }
  return { url, host };
}

export type PreviewReport = { published: string[]; skipped: { code: string; reason: string }[] };

// Imported suits only (import_key set), and only drafts: a price you already set is kept.
export async function publishPreview(db: Database, actor: Actor): Promise<PreviewReport> {
  const rows = await db
    .select()
    .from(product)
    .where(and(isNotNull(product.importKey), isNull(product.deletedAt)))
    .orderBy(asc(product.designCode));
  const report: PreviewReport = { published: [], skipped: [] };
  for (const row of rows) {
    const code = row.designCode ?? row.slug;
    if (row.status !== 'draft') {
      report.skipped.push({ code, reason: `already ${row.status}` });
      continue;
    }
    try {
      if (row.price === null) {
        await products.update(db, { id: row.id, price: PLACEHOLDER_PRICE }, actor);
      }
      for (const check of products.openChecks(row.attributes)) {
        await products.clearCheck(db, { id: row.id, check }, actor);
      }
      await products.setStatus(db, { id: row.id, status: 'published' }, actor);
      report.published.push(code);
    } catch (error) {
      report.skipped.push({ code, reason: error instanceof Error ? error.message : String(error) });
    }
  }
  return report;
}

async function main() {
  loadEnvFiles(join(ROOT, 'apps', 'admin'));
  const target = devTarget(process.env, process.argv.slice(2));
  console.log(`Publishing preview data on ${target.host}.`);
  const db = createDb(target.url);
  try {
    const report = await publishPreview(db, await importActor(db, process.env.SEED_ADMIN_EMAIL));
    console.log(`Published ${report.published.length}: ${report.published.join(', ')}`);
    for (const skip of report.skipped) console.log(`Skipped ${skip.code}: ${skip.reason}`);
  } finally {
    await db.$client.end();
  }
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
