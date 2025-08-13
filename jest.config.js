const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './'
});

// Enhanced Jest configuration for GNUS Dashboard
const customJestConfig = {
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  setupFiles: ['<rootDir>/__tests__/utils/jest.polyfills.js'],

  // Test environment
  testEnvironment: 'jest-environment-jsdom',

  // Module name mapping for cleaner imports
  moduleNameMapper: {
    // Application aliases
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/pages/(.*)$': '<rootDir>/pages/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/functions/(.*)$': '<rootDir>/functions/$1',
    '^@/context/(.*)$': '<rootDir>/context/$1',
    '^@/sub-components/(.*)$': '<rootDir>/sub-components/$1',
    '^@/widgets/(.*)$': '<rootDir>/widgets/$1',
    '^@/layouts/(.*)$': '<rootDir>/layouts/$1',
    '^@/store/(.*)$': '<rootDir>/store/$1',
    '^@/styles/(.*)$': '<rootDir>/styles/$1',
    '^@/data/(.*)$': '<rootDir>/data/$1',

    // Test utilities
    '^@/test-utils$': '<rootDir>/__tests__/utils',
    '^@/test-mocks$': '<rootDir>/__tests__/mocks',

    // Static assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__tests__/mocks/fileMock.js'
  },

  // Test patterns
  testMatch: [
    '<rootDir>/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/**/*.{test,spec}.{js,jsx,ts,tsx}'
  ],

  // Exclude utility files and mocks from test discovery
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/__tests__/utils/testSetup.js',
    '<rootDir>/__tests__/utils/testPatterns.js',
    '<rootDir>/__tests__/utils/mockFactory.js',
    '<rootDir>/__tests__/utils/e2eTestBase.js',
    '<rootDir>/__tests__/utils/componentHelpers.js',
    '<rootDir>/__tests__/utils/testData.js',
    '<rootDir>/__tests__/utils/index.js',
    '<rootDir>/__tests__/utils/jest.polyfills.js',
    '<rootDir>/__tests__/utils/apiHelpers.js',
    '<rootDir>/__tests__/mocks/',
    '<rootDir>/__tests__/README.md'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'pages/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'functions/**/*.{js,jsx,ts,tsx}',
    'context/**/*.{js,jsx,ts,tsx}',
    'sub-components/**/*.{js,jsx,ts,tsx}',
    'widgets/**/*.{js,jsx,ts,tsx}',
    'layouts/**/*.{js,jsx,ts,tsx}',
    'store/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/cypress/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Test timeout
  testTimeout: 10000,

  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }]
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Verbose output for debugging
  verbose: false,

  // Error handling
  errorOnDeprecated: true,

  // Watch plugins for better development experience (disabled for now)
  // watchPlugins: [
  //   'jest-watch-typeahead/filename',
  //   'jest-watch-typeahead/testname'
  // ]
};

module.exports = createJestConfig(customJestConfig);