// R24 at phone size (and R27 for module 2) (390 × 844, touch): every chapter completes, the canvas is view-and-tweak (no drag),
// the drawer never covers the step's controls, and the page never scrolls sideways.
import { test, expect } from '@playwright/test';
import { walkModule } from './flow';
import { walkToolCalling } from './tool-calling-flow';
import { PHONE, layoutHolds } from './helpers';

test.use(PHONE);
test.setTimeout(180_000);

test('every chapter completes at phone size', async ({ page }) => {
  await walkModule(page, 'mouse', layoutHolds);
});

test('module 2: every chapter completes at phone size', async ({ page }) => {
  await walkToolCalling(page, 'mouse', layoutHolds);
});

test('the phone canvas is view-and-tweak: no drag or wiring, tapping a block tunes it', async ({ page }) => {
  await page.goto('/rag/07-sandbox/');
  await page.locator('astro-island:not([ssr])').waitFor();
  await page.getByRole('button', { name: 'Open the workbench' }).tap();
  const card = page.getByRole('region', { name: 'Next step' });
  await expect(card).toContainText('Step 2 of');
  await expect(page.getByText('On a small screen the workbench is view-and-tweak')).toBeVisible();
  await expect(page.locator('svg.editable, [data-port], [data-edge]')).toHaveCount(0);
  await page.locator('[data-block="retriever"]').tap();
  const settings = card.getByRole('region', { name: 'Block settings' });
  await expect(settings.getByRole('slider', { name: /Top-k/ })).toBeVisible();
  await expect(settings.getByText('Connect to…')).toHaveCount(0);
  await layoutHolds(page);
});
