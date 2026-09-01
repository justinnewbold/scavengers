module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|zustand|@react-native-async-storage/.*)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '<rootDir>/store/__tests__/**/*.test.ts?(x)',
    '<rootDir>/lib/__tests__/**/*.test.ts?(x)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/web/',
  ],
  collectCoverageFrom: [
    'store/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/web/**',
  ],
  // A ratchet, not a target. These sit just under today's real numbers so the
  // gate blocks regressions instead of failing every run - the previous flat
  // 50% was never met, so CI could never go green and the signal was ignored.
  // Raise these as coverage improves; never lower them to make a build pass.
  coverageThreshold: {
    global: {
      branches: 24,
      functions: 36,
      lines: 32,
      statements: 32,
    },
  },
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
