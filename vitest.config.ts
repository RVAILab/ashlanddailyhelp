import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    // Database tests start a PGlite instance each, which is slow on a busy machine.
    testTimeout: 20_000,
    hookTimeout: 20_000,
    projects: [
      {
        extends: true,
        test: {
          name: 'server',
          include: ['**/*.test.ts'],
          exclude: ['node_modules', 'legacy', 'e2e'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          include: ['**/*.test.tsx'],
          exclude: ['node_modules', 'legacy'],
          environment: 'happy-dom',
          setupFiles: ['test/setup-dom.ts'],
        },
      },
    ],
  },
})
