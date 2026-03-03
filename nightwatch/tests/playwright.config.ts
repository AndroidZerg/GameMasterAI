import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: process.env.TARGET_URL || 'https://playgmg.com',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
