// PreToolUse (Bash): before any `git commit`, run lint, typecheck and unit tests.
// Exit 2 blocks the commit and sends the failure output back to Claude.
// Any error blocks the commit rather than letting it through unchecked.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { block, readInput, root, run } from './lib.mjs';

// `git commit`, also with global options before it (`git -C dir commit`, `git --no-pager commit`),
// a path or quotes around git, or inside `(...)` and `$(...)`. Not `git commit-tree`.
const ARG = String.raw`(?:"[^"]*"|'[^']*'|\S+)`;
const OPTION = String.raw`(?:-[Cc]\s+${ARG}|--?[\w-]+(?:=${ARG})?)`;
const GIT_COMMIT = new RegExp(
  String.raw`(?:^|[\s;&|(\x60'"/\\])git(?:\.exe)?["']?(?:\s+${OPTION})*\s+commit(?=$|[\s;&|)\x60'"])`,
);
// --no-verify as an argument of that same git commit, not inside a quoted message or heredoc.
const NO_VERIFY = new RegExp(`${GIT_COMMIT.source}[^;&|\\n]*?\\s--no-verify(?=$|[\\s;&|)])`);
const withoutQuotes = (text) => text.replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, '""');

// Stay under the hook's 300 s timeout: a hook killed by Claude Code doesn't block.
const deadline = Date.now() + (Number(process.env.PRE_COMMIT_GATE_TIMEOUT_MS) || 280_000);

const input = await readInput();
if (input === null) block('Blocked: could not read the hook input, so the command is unknown.');

try {
  const command = input?.tool_input?.command ?? '';
  if (!GIT_COMMIT.test(command)) process.exit(0);

  if (NO_VERIFY.test(withoutQuotes(command))) {
    block('Commit blocked: never use --no-verify. Fix what the git hooks report instead.');
  }

  // Before the app exists (kit/docs-only commits), there is nothing to run.
  const pkgPath = path.join(root, 'package.json');
  if (!existsSync(pkgPath) || !existsSync(path.join(root, 'node_modules'))) process.exit(0);

  // Skip when every changed file is under docs/. Other Markdown (AGENTS.md, catalog/, agents)
  // is read by tests. Both sides of a rename count.
  const status = run('git', ['status', '--porcelain', '-uall']);
  const changed = (status.stdout || '')
    .split('\n')
    .filter(Boolean)
    .flatMap((line) => line.slice(3).split(' -> '))
    .map((f) => f.replace(/^"|"$/g, ''));
  if (changed.length > 0 && changed.every((f) => f.startsWith('docs/'))) process.exit(0);

  let scripts;
  try {
    scripts = JSON.parse(readFileSync(pkgPath, 'utf8')).scripts ?? {};
  } catch (error) {
    block(`Commit blocked: could not read package.json (${error.message}).`);
  }

  // Run each check once its script exists (scripts are added during Phase 0).
  for (const name of ['lint', 'typecheck', 'test']) {
    if (!scripts[name]) continue;
    const result = run('pnpm', [name], { timeout: Math.max(deadline - Date.now(), 1) });
    if (result.error?.code === 'ETIMEDOUT') {
      block(
        `Commit blocked: "pnpm ${name}" timed out before the hook's time limit. Run it yourself, then commit again.`,
      );
    }
    if (result.status !== 0) {
      const output = `${result.stdout || ''}${result.stderr || ''}`
        .trim()
        .split('\n')
        .slice(-40)
        .join('\n');
      block(
        `Commit blocked: "pnpm ${name}" failed. Fix it, re-run, then commit again.\n----- last 40 lines -----\n${output}`,
      );
    }
  }
} catch (error) {
  block(`Commit blocked: the pre-commit gate failed (${error.message}).`);
}

process.exit(0);
