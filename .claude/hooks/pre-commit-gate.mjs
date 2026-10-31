// PreToolUse (Bash): before any `git commit`, run lint, typecheck and unit tests.
// Exit 2 blocks the commit and sends the failure output back to Claude.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { readInput, run, block, root } from './lib.mjs';

const input = await readInput();
const command = input?.tool_input?.command ?? '';

// Only act on git commit commands.
if (!/(^|[;&|\s])git\s+commit(\s|$)/.test(command)) process.exit(0);

// Before the app exists (kit/docs-only commits), there is nothing to run.
const pkgPath = path.join(root, 'package.json');
if (!existsSync(pkgPath) || !existsSync(path.join(root, 'node_modules'))) process.exit(0);

// Skip when every changed file is documentation.
const status = run('git', ['status', '--porcelain', '-uall']);
const changed = (status.stdout || '')
  .split('\n')
  .filter(Boolean)
  .map((line) => line.slice(3).split(' -> ').pop().replace(/^"|"$/g, ''));
if (changed.length > 0 && changed.every((f) => f.startsWith('docs/') || f.endsWith('.md'))) {
  process.exit(0);
}

let scripts = {};
try {
  scripts = JSON.parse(readFileSync(pkgPath, 'utf8')).scripts ?? {};
} catch {
  process.exit(0);
}

// Run each check once its script exists (scripts are added during Phase 0).
for (const name of ['lint', 'typecheck', 'test']) {
  if (!scripts[name]) continue;
  const result = run('pnpm', [name]);
  if (result.status !== 0) {
    const output = `${result.stdout || ''}${result.stderr || ''}`.trim().split('\n').slice(-40).join('\n');
    block(`Commit blocked: "pnpm ${name}" failed. Fix it, re-run, then commit again.\n----- last 40 lines -----\n${output}`);
  }
}

process.exit(0);
