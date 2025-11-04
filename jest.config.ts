import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/setup.ts'],
  moduleNameMapper: {
    '@config/(.*)': '<rootDir>/src/config/$1',
    '@libs/(.*)': '<rootDir>/src/libs/$1',
    '@common/(.*)': '<rootDir>/src/common/$1',
    '@modules/(.*)': '<rootDir>/src/modules/$1',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/app.ts',
    '!src/config/*.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text-summary', 'lcov'],
};

export default config;
