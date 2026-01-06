module.exports = {
  root: true,
  extends: ['next/core-web-vitals', 'eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  settings: {
    react: { version: 'detect' },
  },
  rules: {},
};
