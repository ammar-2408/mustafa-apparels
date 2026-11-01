// Types, scopes and the summary limit come from .claude/skills/ship-change/SKILL.md.
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'test',
        'refactor',
        'perf',
        'style',
        'docs',
        'chore',
        'ci',
        'build',
        'revert',
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'web',
        'admin',
        'db',
        'core',
        'auth',
        'ui',
        'validators',
        'config',
        'catalog',
        'seo',
        'motion',
        '3d',
        'e2e',
        'deps',
      ],
    ],
    'subject-max-length': [2, 'always', 72],
  },
};
