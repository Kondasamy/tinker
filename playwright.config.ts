import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://localhost:4399' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // own port + --ignore-lock: never reuse or collide with a background `astro preview` on 4321
    command: 'npm run build && npm run preview -- --port 4399 --ignore-lock',
    url: 'http://localhost:4399',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
