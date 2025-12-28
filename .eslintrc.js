// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: 'expo',
  ignorePatterns: ['/dist/*', '/web/*'],
  rules: {
    // Disable import/no-unresolved since TypeScript handles module resolution
    'import/no-unresolved': 'off',
    // Allow unused vars that start with underscore
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_'
    }],
  },
};
