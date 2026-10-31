// PostToolUse (Edit|Write): format and lint-fix the file Claude just edited.
// Never blocks; real lint errors are caught by `pnpm verify` and the commit gate.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { readInput, relPath, run, root } from './lib.mjs';

const input = await readInput();
const file = input?.tool_input?.file_path;
if (!file) process.exit(0);

// Nothing to run until dependencies are installed (early setup).
if (!existsSync(path.join(root, 'node_modules'))) process.exit(0);

const rel = relPath(file);
if (!existsSync(path.join(root, rel))) process.exit(0);
if (/(^|\/)(node_modules|\.next|dist|migrations)\//.test(rel) || rel.startsWith('Business data/')) {
  process.exit(0);
}

const ext = path.extname(rel).toLowerCase();
const code = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const other = ['.json', '.md', '.css', '.yml', '.yaml', '.html'];

if (code.includes(ext) || other.includes(ext)) {
  run('pnpm', ['exec', 'prettier', '--write', rel]);
}
if (code.includes(ext)) {
  run('pnpm', ['exec', 'eslint', '--fix', rel]);
}

process.exit(0);
