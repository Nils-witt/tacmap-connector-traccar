const tseslint = require('typescript-eslint');
const { defineConfig } = require('eslint/config');
const js = require('@eslint/js');

module.exports = defineConfig([
  { ignores: ['dist', 'node_modules', 'eslint.config.js'] },
  {
    files: ['src/**/*.{js,ts}'],
    extends: [js.configs.recommended],
    rules: {
      // 'no-console': 'warn'
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
      indent: ['error', 2],
    },
  },
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  tseslint.configs.stylistic,
]);
