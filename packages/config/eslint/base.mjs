// Shared ESLint rules for every package. UI code adds ./next.mjs on top.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      '**/.next/**',
      '**/.netlify/**',
      '**/.open-next/**',
      '**/.turbo/**',
      '**/.vercel/**',
      '**/build/**',
      '**/coverage/**',
      '**/dist/**',
      '**/out/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/blob-report/**',
      '**/next-env.d.ts',
      '**/.playwright-mcp/**',
      '**/.claude/skills/**',
      '**/Business data/**',
      '**/catalog/**',
      '**/mustafa-apparels-logos/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: { globals: globals.node },
  },
  {
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  prettier,
];
