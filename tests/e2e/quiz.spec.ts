// Predict, reveal and checkpoint feedback on the /dev/quiz/ fixture (U3: AE2, AE3).
import { test, expect, type Page } from '@playwright/test';

const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const opt = (page: Page, name: string | RegExp) => card(page).getByRole('radio', { name });

test.beforeEach(async ({ page }) => {
  await page.goto('/dev/quiz/');
  await page.locator('astro-island:not([ssr])').waitFor();
  await expect(card(page)).toContainText('Step 1 of 3');
});

async function toQuiz(page: Page) {
  await opt(page, '2').click();
  await card(page).getByRole('button', { name: 'Show what happens' }).click();
  await expect(card(page)).toContainText('Step 3 of 3');
}

test('a prediction locks on the first pick and the reveal compares it (AE2)', async ({ page }) => {
  await expect(page.getByRole('figure')).not.toContainText('2 of 6');   // neutral stage before the reveal
  await opt(page, 'All 6').click();
  await expect(card(page)).toContainText('Step 2 of 3');
  await expect(card(page)).toContainText('You predicted: All 6');
  await expect(card(page)).not.toContainText(/RIGHT|NOT QUITE/);
  await opt(page, 'None').click({ force: true });                                       // ignored
  await expect(opt(page, 'All 6')).toHaveAttribute('aria-checked', 'true');
  await expect(opt(page, 'None')).toHaveAttribute('aria-checked', 'false');
  await expect(card(page)).toContainText('You predicted: All 6');

  await page.reload();
  await page.locator('astro-island:not([ssr])').waitFor();
  await expect(card(page)).toContainText('You predicted: All 6');         // the lock survives a reload
  await opt(page, 'None').click({ force: true });
  await expect(opt(page, 'All 6')).toHaveAttribute('aria-checked', 'true');

  await card(page).getByRole('button', { name: 'Show what happens' }).click();
  await expect(card(page)).toContainText('NOT WHAT YOU PREDICTED');
  await expect(card(page)).toContainText('What happened: 2');
  await expect(page.getByRole('figure')).toContainText('2 of 6');
});

test('a wrong pick shows that option’s why line, and focus moves to the feedback', async ({ page }) => {
  await toQuiz(page);
  await opt(page, 'They are summarised for free').click();
  const fb = card(page).locator('.quiz .feedback');
  await expect(fb).toContainText('NOT QUITE');
  await expect(fb).toContainText('Nothing summarises for free');
  await expect(fb).not.toContainText('That gap is what retrieval fills');
  await expect(fb).toBeFocused();
  await expect(fb).toHaveAttribute('aria-live', 'polite');
  await expect(card(page)).toContainText('Step 3 of 3');
});

test('“I’m not sure” shows the answer with no NOT QUITE stamp, is no miss, and advances (AE3)', async ({ page }) => {
  await toQuiz(page);
  await opt(page, 'The model reads them later').click();
  await opt(page, 'The model reads them later').click();                 // two misses: one more would bring the hint
  await opt(page, 'I’m not sure').click();
  const fb = card(page).locator('.quiz .feedback');
  await expect(fb).toContainText('The answer: The model never sees them');
  await expect(fb).toContainText('That gap is what retrieval fills');
  await expect(fb).not.toContainText('NOT QUITE');
  await expect(card(page).locator('.hint')).toHaveCount(0);
  await expect(card(page)).toContainText('Chapter complete');
});

test('options are a radio group the arrow keys move through', async ({ page }) => {
  await toQuiz(page);
  await opt(page, 'The model reads them later').focus();
  await page.keyboard.press('ArrowDown');
  await expect(opt(page, 'The model never sees them')).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect(opt(page, 'I’m not sure')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(card(page)).toContainText('Chapter complete');
});
