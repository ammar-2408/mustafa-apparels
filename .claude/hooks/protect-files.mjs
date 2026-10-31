// PreToolUse (Edit|Write): block edits to secrets, the owner's raw stock media,
// committed migrations and the lockfile.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { readInput, relPath, run, block, root } from './lib.mjs';

const input = await readInput();
const file = input?.tool_input?.file_path;
if (!file) process.exit(0);

const rel = relPath(file);
const base = path.posix.basename(rel);

// Secrets: any .env file except the example.
if (base !== '.env.example' && (base === '.env' || base.startsWith('.env.'))) {
  block(`Blocked edit to ${rel}: env files hold secrets. Ask the user to change them, or edit .env.example instead.`);
}

// Owner's original photos/videos are read-only source material.
if (rel === 'Business data' || rel.startsWith('Business data/')) {
  block(`Blocked edit to ${rel}: "Business data/" holds the owner's original stock media. Read it, never change it; write outputs elsewhere.`);
}

// Lockfile is managed by pnpm only.
if (base === 'pnpm-lock.yaml') {
  block(`Blocked edit to ${rel}: never hand-edit the lockfile. Use pnpm add/remove.`);
}

// Applied migrations are immutable once committed.
if (/^packages\/db\/migrations\/.+\.sql$/.test(rel) && existsSync(path.join(root, '.git'))) {
  const tracked = run('git', ['ls-files', '--error-unmatch', rel]).status === 0;
  if (tracked) {
    block(`Blocked edit to ${rel}: this migration is already committed. Create a new one with "pnpm db:generate" (see the db-change skill).`);
  }
}

process.exit(0);
