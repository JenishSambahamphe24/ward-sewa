import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/**/*.test.ts'],
          exclude: [...configDefaults.exclude, 'test/integration/**'],
        },
      },
      {
        test: {
          name: 'integration',
          include: ['test/integration/**/*.test.ts'],
          globalSetup: ['test/integration/support/global-setup.ts'],
          // Files share one database, so run them one at a time.
          poolOptions: { forks: { singleFork: true } },
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
