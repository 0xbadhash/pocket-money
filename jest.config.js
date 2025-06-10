// jest.config.js
export default {
  preset: 'ts-jest', // Reverted to standard ts-jest preset
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['./jest.setup.ts'], // Point to the new setup file (now .ts)
  moduleNameMapper: {
    '\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\.(gif|ttf|eot|svg|png)$': '<rootDir>/__mocks__/fileMock.js',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { // Standard transform for .ts/.tsx files
      tsconfig: 'tsconfig.jest.json', // Use dedicated tsconfig for Jest
      diagnostics: {
        ignoreCodes: ['TS6133'], // Ignore 'React' is declared but its value is never read.
      },
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'], // Reverted
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
