import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
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
