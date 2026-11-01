// Monorepo setup checks. Uses node:test until Vitest arrives in step 0.5.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';
import { getFileInfo } from 'prettier';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const readJson = (file) => JSON.parse(read(file));
const fromRoot = (file) => fileURLToPath(new URL(`../${file}`, import.meta.url));

const eslint = new ESLint({ cwd: fromRoot('') });
const prettierIgnores = async (file) => {
  const ignorePath = [fromRoot('.gitignore'), fromRoot('.prettierignore')];
  return (await getFileInfo(fromRoot(file), { ignorePath })).ignored;
};

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
  for (const entry of [
    'node_modules/',
    '.turbo/',
    'next-env.d.ts',
    '.env',
    '.env.*',
    '!.env.example',
    'Business data/',
  ]) {
    assert.ok(lines.includes(entry), `.gitignore is missing "${entry}"`);
  }
});

test('.gitattributes keeps YAML files on LF', () => {
  assert.ok(read('.gitattributes').split(/\r?\n/).includes('*.yaml text eol=lf'));
});

test('root ESLint applies a11y rules to UI code only', async () => {
  const rule = 'jsx-a11y/anchor-is-valid';
  for (const file of [
    'apps/web/app/page.tsx',
    'apps/admin/app/page.tsx',
    'packages/ui/button.tsx',
  ]) {
    const { rules } = await eslint.calculateConfigForFile(file);
    assert.ok(rules[rule], `${file} should have ${rule}`);
  }
  const { rules } = await eslint.calculateConfigForFile('scripts/x.mjs');
  assert.equal(rules[rule], undefined);
});

test('format hook leaves sorted imports in Prettier style', () => {
  const probe = 'scripts/hook-probe.tmp.mjs';
  writeFileSync(fromRoot(probe), "import { z, a } from './b.mjs';\nexport { a, z };\n");
  try {
    spawnSync(process.execPath, [fromRoot('.claude/hooks/format-file.mjs')], {
      cwd: fromRoot(''),
      env: { ...process.env, CLAUDE_PROJECT_DIR: fromRoot('') },
      input: JSON.stringify({ tool_input: { file_path: probe } }),
    });
    assert.equal(read(probe), "import { a, z } from './b.mjs';\nexport { a, z };\n");
  } finally {
    rmSync(fromRoot(probe));
  }
});

test('root ESLint looks for Next.js routes inside the apps', async () => {
  const { settings } = await eslint.calculateConfigForFile('apps/web/app/page.tsx');
  assert.deepEqual(settings.next.rootDir, ['apps/*/']);
});

const lintLinkToHome = (cwd) =>
  spawnSync(
    process.execPath,
    [
      fromRoot('node_modules/eslint/bin/eslint.js'),
      '--format',
      'json',
      '--stdin',
      '--stdin-filename',
      fromRoot('apps/web/app/link-probe.tsx'),
    ],
    {
      cwd: fromRoot(cwd),
      encoding: 'utf8',
      input: 'export const A = () => <a href="/">Home</a>;\n',
    },
  );

for (const [where, cwd] of [
  ['the repo root', ''],
  ['apps/web', 'apps/web'],
]) {
  test(`ESLint from ${where} flags a plain link to a page, with no missing-pages warning`, () => {
    const { stdout, stderr } = lintLinkToHome(cwd);
    assert.doesNotMatch(stdout + stderr, /Pages directory cannot be found/);
    const [{ messages }] = JSON.parse(stdout);
    assert.ok(messages.some((m) => m.ruleId === '@next/next/no-html-link-for-pages'));
  });
}

test('root ESLint ignores owner files and build output', async () => {
  for (const file of ['Business data/x.ts', 'apps/web/.next/x.js', '.claude/skills/x/y.mjs']) {
    assert.equal(await eslint.isPathIgnored(file), true, `${file} should be ignored`);
  }
  assert.equal(await eslint.isPathIgnored('.claude/hooks/lib.mjs'), false);
});

test('Prettier leaves docs, stock, owner files and generated files alone', async () => {
  const ignored = [
    'Business data/x.json',
    'docs/x.md',
    'AGENTS.md',
    'catalog/dhanak/x.md',
    '.claude/skills/x/y.mjs',
    'mustafa-apparels-logos/x.json',
    'pnpm-lock.yaml',
    'skills-lock.json',
  ];
  for (const file of ignored) {
    assert.equal(await prettierIgnores(file), true, `${file} should be ignored`);
  }
});

test('Prettier still formats code and config files', async () => {
  for (const file of [
    'scripts/x.mjs',
    '.claude/hooks/lib.mjs',
    '.github/workflows/ci.yml',
    'pnpm-workspace.yaml',
  ]) {
    assert.equal(await prettierIgnores(file), false, `${file} should be formatted`);
  }
});
