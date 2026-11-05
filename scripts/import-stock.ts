// `pnpm import:stock` (docs/catalog.md §6). Turns catalog/ into draft suits with no price.
//   --dry-run          validate and check files only; writes nothing
//   --stock-dir <dir>  instead of "Business data/Stock" (tests)
// "Business data/" is only ever read.
import { join, resolve } from 'node:path';

import { dryRun } from './import-stock/dry-run';

const ROOT = join(__dirname, '..');

export type Options = { dryRun: boolean; stockDir: string; catalogDir: string };

export function parseArgs(argv: string[]): Options {
  const value = (flag: string) => {
    const at = argv.indexOf(flag);
    return at >= 0 ? argv[at + 1] : undefined;
  };
  const known = new Set(['--dry-run', '--stock-dir', '--catalog-dir']);
  for (const [index, arg] of argv.entries()) {
    const isValue = index > 0 && ['--stock-dir', '--catalog-dir'].includes(argv[index - 1]!);
    if (!isValue && arg !== '--' && !known.has(arg)) throw new Error(`Unknown option ${arg}`);
  }
  return {
    dryRun: argv.includes('--dry-run'),
    stockDir: resolve(value('--stock-dir') ?? join(ROOT, 'Business data', 'Stock')),
    catalogDir: resolve(value('--catalog-dir') ?? join(ROOT, 'catalog')),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = await dryRun(options);
  console.log(report.lines.join('\n'));
  if (!report.ok) {
    process.exitCode = 1;
    return;
  }
  if (!options.dryRun) {
    console.error('\nThe real import arrives at step 5.5. Run with --dry-run for now.');
    process.exitCode = 1;
  }
}

if (require.main === module) {
  // scripts/ compiles as CommonJS, so no top-level await.
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
