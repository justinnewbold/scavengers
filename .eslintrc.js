// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: 'expo',
  ignorePatterns: ['/dist/*', '/web/*'],
  overrides: [
    {
      // Build/tooling scripts run under Node, not React Native, so they use
      // __dirname, Buffer, process etc. Without this they fail `no-undef`.
      files: ['scripts/**/*.js'],
      env: { node: true },
    },
  ],
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
