import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: import.meta.dirname,
    include: ['test/**/*.spec.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/**/index.ts'],
      reportsDirectory: '../../coverage/domain',
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
    },
  },
});
