// Added on top of ./base.mjs for apps and UI packages.
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  ...nextCoreWebVitals,
  {
    files: ['**/*.{jsx,tsx}'],
    rules: jsxA11y.flatConfigs.recommended.rules,
  },
  // Stated, not detected: the repo root has no React, and the hooks lint from there.
  { settings: { react: { version: '19' } } },
];
