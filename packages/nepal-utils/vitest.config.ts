import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/types.ts'],
      thresholds: { lines: 95, branches: 90, functions: 100 },
    },
  },
});
