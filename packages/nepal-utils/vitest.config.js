import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      include: ['src/**'],
      thresholds: { lines: 95, branches: 90, functions: 100 },
    },
  },
});
