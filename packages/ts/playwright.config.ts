import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './bench',
  testMatch: '**/*.spec.ts',
  fullyParallel: false, // benchmarks must not contend
  workers: 1,
  reporter: 'list',
  timeout: 5 * 60_000,
  use: {
    baseURL: 'http://localhost:5180',
    headless: true,
    launchOptions: {
      // --enable-precise-memory-info lets performance.memory return real values instead of bucketed.
      // --js-flags=--expose-gc would expose window.gc() if we ever want forced GC between runs.
      args: ['--enable-precise-memory-info'],
    },
  },
  webServer: {
    command: 'npx vite --config bench/vite.config.ts',
    port: 5180,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
