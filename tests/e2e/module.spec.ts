// The whole module by mouse at desktop size; the walk itself lives in flow.ts.
import { test } from '@playwright/test';
import { walkModule } from './flow';

test.use({ viewport: { width: 1440, height: 900 } });
test.setTimeout(120_000);

test('full module: chapter 1 to the final challenge', async ({ page }) => {
  await walkModule(page, 'mouse');
});
