import { test, expect, type Page } from '@playwright/test';

const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const pick = (page: Page, k: number) => card(page).getByRole('button', { name: `${k}K` });

// runs on the /dev/runner/ fixture; nav marks on a real chapter are covered in ch7.spec.ts
test.beforeEach(async ({ page }) => {
  await page.goto('/dev/runner/');
  await page.locator('astro-island:not([ssr])').waitFor(); // hydrated
  await expect(card(page)).toContainText('Step 1 of 2');
});

test('shows only the current step control, then advances when solved', async ({ page }) => {
  await expect(card(page).getByRole('group', { name: 'What happens to the pages that do not fit?' })).toHaveCount(0);
  await pick(page, 8).click();
  await expect(card(page)).toContainText('Step 1 of 2');
  await pick(page, 32).click();
  await expect(card(page)).toContainText('Step 2 of 2');
  await expect(pick(page, 32)).toHaveCount(0);
  // step 2 opens the drawer on its own
  await expect(page.getByRole('complementary', { name: 'What the model sees' })).toBeVisible();
});

test('hint appears after 3 failed attempts', async ({ page }) => {
  const hint = card(page).getByRole('status');
  await pick(page, 8).click();
  await pick(page, 16).click();
  await expect(hint).toHaveCount(0);
  await pick(page, 4).click();
  await expect(hint).toContainText('Hint:');
});

test('reset restores the step start; back returns to the previous step', async ({ page }) => {
  await pick(page, 16).click();
  await expect(pick(page, 16)).toHaveAttribute('aria-pressed', 'true');
  await card(page).getByRole('button', { name: 'Reset this step' }).click();
  await expect(pick(page, 4)).toHaveAttribute('aria-pressed', 'true');

  await pick(page, 32).click();
  await expect(card(page)).toContainText('Step 2 of 2');
  await card(page).getByRole('button', { name: '← Back' }).click();
  await expect(card(page)).toContainText('Step 1 of 2');
  await expect(pick(page, 4)).toHaveAttribute('aria-pressed', 'true');
});

test('inspect opens the drawer without changing the step; Escape closes it', async ({ page }) => {
  await card(page).getByRole('button', { name: 'Inspect' }).click();
  const drawer = page.getByRole('complementary', { name: 'What the model sees' });
  await expect(drawer).toBeVisible();
  await expect(card(page)).toContainText('Step 1 of 2');
  await expect(pick(page, 4)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
});

test('finishing completes the run; progress survives reload', async ({ page }) => {
  await pick(page, 32).click();
  await card(page).getByRole('radio', { name: 'The model reads them later' }).click();
  await expect(card(page)).toContainText('NOT QUITE');
  await card(page).getByRole('radio', { name: 'The model never sees them' }).click();
  await expect(card(page)).toContainText('RIGHT');
  await expect(card(page)).toContainText('Chapter complete');
  await expect(card(page).getByRole('link', { name: /Next:/ })).toHaveCount(0);

  await page.goto('/dev/runner/');
  await expect(card(page)).toContainText('Chapter complete');
});

test('works by keyboard alone', async ({ page }) => {
  await pick(page, 32).focus();
  await page.keyboard.press('Enter');
  await expect(card(page)).toContainText('Step 2 of 2');
});
