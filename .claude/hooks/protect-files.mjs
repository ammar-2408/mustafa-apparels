// PreToolUse (Edit|Write): block edits to secrets, the owner's raw stock media,
// committed migrations and the lockfile. Any error blocks the edit rather than letting it through.
// Also reads NotebookEdit's notebook_path, for when that tool is added to the matcher.
import path from 'node:path';

import { block, readInput, root, run } from './lib.mjs';

/**
 * The file Windows would actually open, relative to the project root, in lower case with
 * forward slashes. NTFS ignores case and trailing dots and spaces, and reads `name::$DATA`
 * as `name`, so every spelling of a protected file gives the same key. Lower case on every
 * OS keeps the rules the same in CI.
 */
function fileKey(file) {
  const plain = file.replaceAll('\\', '/').replace(/^\/\/\?\//, '');
  return path
    .relative(root, path.resolve(root, plain))
    .split(path.sep)
    .map((part) => (part === '..' ? part : part.replace(/:.*$/, '').replace(/[. ]+$/, '')))
    .join('/')
    .toLowerCase();
}

function isCommitted(key) {
  const result = run('git', ['ls-files', '-z', '--', 'packages/db/migrations']);
  if (result.status !== 0) return false;
  return result.stdout.split('\0').some((tracked) => tracked.toLowerCase() === key);
}

const input = await readInput();
if (input === null) {
  block('Blocked edit: could not read the hook input, so the target file is unknown.');
}

try {
  const file = input?.tool_input?.file_path ?? input?.tool_input?.notebook_path;
  if (!file) process.exit(0);

  const key = fileKey(file);
  const base = path.posix.basename(key);

  // Secrets: any .env file except the example.
  if (base !== '.env.example' && (base === '.env' || base.startsWith('.env.'))) {
    block(
      `Blocked edit to ${file}: env files hold secrets. Ask the user to change them, or edit .env.example instead.`,
    );
  }

  // Owner's original photos/videos are read-only source material.
  if (key === 'business data' || key.startsWith('business data/')) {
    block(
      `Blocked edit to ${file}: "Business data/" holds the owner's original stock media. Read it, never change it; write outputs elsewhere.`,
    );
  }

  // Lockfile is managed by pnpm only.
  if (base === 'pnpm-lock.yaml') {
    block(`Blocked edit to ${file}: never hand-edit the lockfile. Use pnpm add/remove.`);
  }

  // Applied migrations are immutable once committed.
  if (/^packages\/db\/migrations\/.+\.sql$/.test(key) && isCommitted(key)) {
    block(
      `Blocked edit to ${file}: this migration is already committed. Create a new one with "pnpm db:generate" (see the db-change skill).`,
    );
  }
} catch (error) {
  block(
    `Blocked edit: the protect-files hook failed (${error instanceof Error ? error.message : error}).`,
  );
}

process.exit(0);
