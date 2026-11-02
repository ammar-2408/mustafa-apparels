// PreToolUse (Edit|Write, and Bash): block changes to secrets, the owner's raw stock media,
// committed migrations and the lockfile. Any error blocks the call rather than letting it through.
// Also reads NotebookEdit's notebook_path, for when that tool is added to the matcher.
// For Bash it finds the files a command writes: redirect targets, tee, sed -i, the destination of
// cp/mv, and the files given to rm, touch, truncate and PowerShell's write cmdlets. That's best
// effort: a path built from a variable, or a script that writes files itself, isn't seen
// (docs/auth-security.md §6).
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

/** Why a file may not be changed, or null if it may. */
function reasonFor(file) {
  const key = fileKey(file);
  const base = path.posix.basename(key);

  // Secrets: any .env file except the example.
  if (base !== '.env.example' && (base === '.env' || base.startsWith('.env.'))) {
    return 'env files hold secrets. Ask the user to change them, or edit .env.example instead.';
  }
  // Owner's original photos/videos are read-only source material.
  if (key === 'business data' || key.startsWith('business data/')) {
    return `"Business data/" holds the owner's original stock media. Read it, never change it; write outputs elsewhere.`;
  }
  // Lockfile is managed by pnpm only.
  if (base === 'pnpm-lock.yaml') {
    return 'never hand-edit the lockfile. Use pnpm add/remove.';
  }
  // Applied migrations are immutable once committed.
  if (/^packages\/db\/migrations\/.+\.sql$/.test(key) && isCommitted(key)) {
    return 'this migration is already committed. Create a new one with "pnpm db:generate" (see the db-change skill).';
  }
  return null;
}

/**
 * Splits a shell command into segments of words, with quotes removed, and collects
 * redirect targets. `2>&1` style duplications have no target.
 */
function parseCommand(command) {
  const segments = [];
  let words = [];
  let redirects = [];
  let word = '';
  let hasWord = false;
  let nextIsRedirect = false;

  const endWord = () => {
    if (!hasWord) return;
    if (nextIsRedirect) redirects.push(word);
    else words.push(word);
    nextIsRedirect = false;
    word = '';
    hasWord = false;
  };
  const endSegment = () => {
    endWord();
    if (words.length || redirects.length) segments.push({ words, redirects });
    words = [];
    redirects = [];
  };

  for (let i = 0; i < command.length; i++) {
    const char = command[i];
    if (char === "'" || char === '"') {
      const close = command.indexOf(char, i + 1);
      const end = close === -1 ? command.length : close;
      word += command.slice(i + 1, end);
      hasWord = true;
      i = end;
    } else if (/\s/.test(char)) {
      if (char === '\n') endSegment();
      else endWord();
    } else if (char === ';' || char === '|' || char === '&') {
      endSegment();
    } else if (char === '>') {
      // A number right before it is a file descriptor, not a word.
      if (/^\d+$/.test(word)) {
        word = '';
        hasWord = false;
      }
      endWord();
      if (command[i + 1] === '>') i += 1;
      if (command[i + 1] === '&') {
        // >&1, >&-: duplicates a descriptor and writes no file.
        i += 1;
        while (/[\d-]/.test(command[i + 1] ?? '')) i += 1;
      } else {
        nextIsRedirect = true;
      }
    } else if (char === '<') {
      endWord();
    } else {
      word += char;
      hasWord = true;
    }
  }
  endSegment();
  return segments;
}

const LAST_ARG = new Set(['cp', 'mv', 'install', 'ln', 'copy-item', 'move-item']);
const ALL_ARGS = new Set([
  'tee',
  'rm',
  'touch',
  'truncate',
  'shred',
  'unlink',
  'remove-item',
  'new-item',
  'set-content',
  'add-content',
  'clear-content',
  'out-file',
]);

/** The files a shell command would write, as far as the words show. */
function writeTargets(command) {
  const targets = [];
  for (const { words, redirects } of parseCommand(command)) {
    targets.push(...redirects);
    const name = path.posix.basename((words[0] ?? '').replaceAll('\\', '/')).toLowerCase();
    const args = words.slice(1).filter((arg) => !arg.startsWith('-'));
    const inPlace = words.some((arg) => /^-[a-z]*i/i.test(arg) || arg.startsWith('--in-place'));
    if (LAST_ARG.has(name) && args.length > 1) targets.push(args.at(-1));
    else if (ALL_ARGS.has(name) || (name === 'sed' && inPlace)) targets.push(...args);
  }
  return targets;
}

const input = await readInput();
if (input === null) {
  block('Blocked edit: could not read the hook input, so the target file is unknown.');
}

try {
  const command = input?.tool_input?.command;
  if (typeof command === 'string') {
    for (const target of writeTargets(command)) {
      const reason = reasonFor(target);
      if (reason) block(`Blocked shell write to ${target}: ${reason}`);
    }
    process.exit(0);
  }

  const file = input?.tool_input?.file_path ?? input?.tool_input?.notebook_path;
  if (!file) process.exit(0);
  const reason = reasonFor(file);
  if (reason) block(`Blocked edit to ${file}: ${reason}`);
} catch (error) {
  block(
    `Blocked edit: the protect-files hook failed (${error instanceof Error ? error.message : error}).`,
  );
}

process.exit(0);
