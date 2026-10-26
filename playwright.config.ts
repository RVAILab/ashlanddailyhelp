import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
        // The browser resolves only localhost, so no journey reaches the network.
        launchOptions: { args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost'] },
      },
    },
  ],
  webServer: {
    command: 'npm run build && node e2e/offline-server.ts && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
