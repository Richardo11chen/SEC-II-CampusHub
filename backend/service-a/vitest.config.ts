import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', '../__tests__/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/service/**'],
      reporter: ['text', 'lcov', 'html'],
    },
  },
});
