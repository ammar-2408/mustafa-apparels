// ESLint first, then Prettier: the same order as .claude/hooks/format-file.mjs.
// The globs must not overlap, or two tasks would edit one file at the same time.
export default {
  '*.{js,mjs,cjs,ts,tsx}': ['eslint --fix --no-warn-ignored --max-warnings 0', 'prettier --write'],
  '*.{json,md,yml,yaml,css}': 'prettier --write --ignore-unknown',
};
