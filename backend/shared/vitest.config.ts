import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/utils/**', 'src/middleware/**'],
      reporter: ['text', 'lcov', 'html'],
      thresholds: { lines: 60, functions: 60 },
    },
  },
});
