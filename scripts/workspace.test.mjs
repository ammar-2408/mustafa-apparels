// Monorepo setup checks. Uses node:test until Vitest arrives in step 0.5.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const readJson = (file) => JSON.parse(read(file));

test('root package is private and pins the pnpm version CI uses', () => {
  const pkg = readJson('package.json');
  assert.equal(pkg.private, true);
  assert.equal(pkg.packageManager, 'pnpm@12.16.1');
});

test('.nvmrc pins Node 26', () => {
  assert.equal(read('.nvmrc').trim(), '26');
});

test('workspace includes apps and packages', () => {
  const workspace = read('pnpm-workspace.yaml');
  assert.match(workspace, /^\s*-\s*["']?apps\/\*["']?\s*$/m);
  assert.match(workspace, /^\s*-\s*["']?packages\/\*["']?\s*$/m);
});

for (const task of ['dev', 'build', 'lint', 'typecheck', 'test']) {
  test(`root "${task}" script runs the Turbo task of the same name`, () => {
    const { scripts } = readJson('package.json');
    assert.match(scripts[task] ?? '', new RegExp(`turbo run ${task}$`));
    assert.ok(readJson('turbo.json').tasks[task], `turbo.json has no "${task}" task`);
  });
}

test('dev is uncached and persistent', () => {
  const { dev } = readJson('turbo.json').tasks;
  assert.equal(dev.cache, false);
  assert.equal(dev.persistent, true);
});

test('build caches Next.js output but not its cache folder', () => {
  const { outputs } = readJson('turbo.json').tasks.build;
  assert.ok(outputs.includes('.next/**'));
  assert.ok(outputs.includes('!.next/cache/**'));
});

test('.gitignore keeps dependencies, Turbo cache, secrets and owner files out of git', () => {
  const lines = read('.gitignore').split(/\r?\n/);
  for (const entry of ['node_modules/', '.turbo/', '.env', '.env.*', '!.env.example', 'Business data/']) {
    assert.ok(lines.includes(entry), `.gitignore is missing "${entry}"`);
  }
});
