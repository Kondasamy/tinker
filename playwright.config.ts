import { defineConfig, devices } from '@playwright/test';

// E2E_PORT lets parallel worktrees run e2e side by side
const port = process.env.E2E_PORT ?? '4399';

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: `http://localhost:${port}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // own port + --ignore-lock: never reuse or collide with a background `astro preview` on 4321
    command: `DEV_PAGES=1 pnpm build && pnpm preview --port ${port} --ignore-lock`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    // the build is inside this budget; hosted CI runners build ~1,300 pages much slower than a laptop
    timeout: process.env.CI ? 600_000 : 120_000,
  },
});
