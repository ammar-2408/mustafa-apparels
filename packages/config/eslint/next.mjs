// Added on top of ./base.mjs for apps and UI packages.
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import jsxA11y from 'eslint-plugin-jsx-a11y';

// Server env comes only from getEnv() in @mustafa/config/env, which validates it (docs/setup.md §6).
// NEXT_PUBLIC_* stay direct reads, because Next inlines them into the browser bundle.
const ALLOWED_ENV = /^(NEXT_PUBLIC_\w+|NEXT_RUNTIME|NODE_ENV)$/;

export default [
  ...nextCoreWebVitals,
  {
    files: ['**/*.{jsx,tsx}'],
    rules: jsxA11y.flatConfigs.recommended.rules,
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['**/next.config.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: `MemberExpression[object.name='process'][property.name='env']:not(MemberExpression[computed=false][property.name=${ALLOWED_ENV}] > .object)`,
          message: 'Read server env through getEnv() from @mustafa/config/env.',
        },
      ],
    },
  },
  // Stated, not detected: the repo root has no React, and the hooks lint from there.
  { settings: { react: { version: '19' } } },
];
