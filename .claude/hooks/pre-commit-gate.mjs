// PreToolUse (Bash): a light guard on `git commit`. It only refuses `--no-verify`.
// It does not run lint, typecheck or tests: `ship-change` runs `pnpm verify` once, and
// Husky (lint-staged + typecheck) and CI check again.
// Exit 2 blocks the commit. Any error blocks it rather than letting it through unchecked.
import { block, readInput } from './lib.mjs';

// `git commit`, also with global options before it (`git -C dir commit`, `git --no-pager commit`),
// a path or quotes around git, or inside `(...)` and `$(...)`. Not `git commit-tree`.
const ARG = String.raw`(?:"[^"]*"|'[^']*'|\S+)`;
const OPTION = String.raw`(?:-[Cc]\s+${ARG}|--?[\w-]+(?:=${ARG})?)`;
const GIT_COMMIT = new RegExp(
  String.raw`(?:^|[\s;&|(\x60'"/\\])git(?:\.exe)?["']?(?:\s+${OPTION})*\s+commit(?=$|[\s;&|)\x60'"])`,
);
// --no-verify as an argument of that same git commit, not inside a quoted message or heredoc.
const NO_VERIFY = new RegExp(`${GIT_COMMIT.source}[^;&|\\n]*?\\s--no-verify(?=$|[\\s;&|)])`);
// Quoted text is dropped, but not a quoted `"git"`, which is still the command.
const withoutQuotes = (text) =>
  text
    .replace(/(^|[\s;&|(`])["']git(\.exe)?["']/g, '$1git$2')
    .replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, '""');

const input = await readInput();
if (input === null) block('Blocked: could not read the hook input, so the command is unknown.');

try {
  const command = input?.tool_input?.command ?? '';
  if (GIT_COMMIT.test(command) && NO_VERIFY.test(withoutQuotes(command))) {
    block('Commit blocked: never use --no-verify. Fix what the git hooks report instead.');
  }
} catch (error) {
  block(`Commit blocked: the pre-commit gate failed (${error.message}).`);
}

process.exit(0);
