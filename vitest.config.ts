import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    // Database tests start a PGlite instance each, which is slow on a busy machine.
    testTimeout: 20_000,
    hookTimeout: 20_000,
    globalSetup: ['test/global-setup.ts'],
    // Reported only, with no thresholds, until we know the baseline (npm run coverage).
    coverage: {
      provider: 'v8',
      include: ['app/**', 'server/**', 'workers/**', 'db/**'],
      exclude: ['**/*.test.{ts,tsx}', 'db/migrations/**'],
      reporter: ['text-summary', 'html'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'server',
          include: ['**/*.test.ts'],
          exclude: ['node_modules', 'legacy', 'e2e'],
          environment: 'node',
          setupFiles: ['test/no-network.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          include: ['**/*.test.tsx'],
          exclude: ['node_modules', 'legacy'],
          environment: 'happy-dom',
          setupFiles: ['test/no-network.ts', 'test/setup-dom.ts'],
        },
      },
    ],
  },
})
