import { defineConfig } from '@playwright/test';

const port = 4173;

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results/playwright',
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `PLAYWRIGHT_PORT=${port} node e2e/start-with-mock-backend.mjs`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: { viewport: { width: 1440, height: 1000 }, hasTouch: false },
    },
    {
      name: 'mobile-chrome',
      use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
    },
    {
      name: 'wide-touch-chrome',
      use: { viewport: { width: 1280, height: 900 }, hasTouch: true },
    },
  ],
});
