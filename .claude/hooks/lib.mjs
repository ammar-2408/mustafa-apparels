// Shared helpers for the Claude Code hooks. Cross-platform (Windows, macOS, Linux), no jq needed.
import { spawnSync } from 'node:child_process';
import path from 'node:path';

export const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();

/** Read the hook's JSON input from stdin. Returns null if it can't be parsed. */
export async function readInput() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    return null;
  }
}

/** Path relative to the project root, always with forward slashes. */
export function relPath(file) {
  return path.relative(root, path.resolve(root, file)).split(path.sep).join('/');
}

/**
 * Run a command in the project root. On Windows, tools like pnpm are .cmd shims,
 * so they need a shell; arguments with spaces are quoted.
 */
export function run(cmd, args = [], { timeout } = {}) {
  if (process.platform === 'win32') {
    const line = [cmd, ...args.map((a) => (/[\s&()^|<>]/.test(a) ? `"${a}"` : a))].join(' ');
    return spawnSync(line, { cwd: root, shell: true, encoding: 'utf8', timeout });
  }
  return spawnSync(cmd, args, { cwd: root, encoding: 'utf8', timeout });
}

/** Block the tool call: message goes back to Claude, exit code 2. */
export function block(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}
