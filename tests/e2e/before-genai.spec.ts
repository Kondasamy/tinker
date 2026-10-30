// before-genai: the intro, every chapter played by mouse and by keyboard, the recap, axe and phone width.
// Add one walk per chapter to `play` as you write them.
import { test, expect, type Locator, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('before-genai');

async function play(page: Page, kb: boolean) {
  const card = page.getByRole('region', { name: 'Next step' });
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  await page.goto(`/before-genai/${M.chapters[0].id}/`);
  await page.locator('astro-island:not([ssr])').waitFor();
  await expect(card).toContainText('Step 1 of');
  await press(card.getByRole('button', { name: 'Send the question' }));
  await press(card.getByRole('radio', { name: 'What really happens' }));
  await press(card.getByRole('button', { name: 'Show the reply' }));
  await press(card.getByRole('radio', { name: 'The right answer' }));
  await expect(card).toContainText('Chapter complete');
  expect(await serious(page)).toEqual([]);
}

test('the intro shows the level and the chapters', async ({ page }) => {
  await page.goto('/before-genai/');
  await expect(page.locator('.hero .module-meta .level')).toHaveText(M.level);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  expect(await serious(page)).toEqual([]);
});

test('every chapter plays by mouse', async ({ page }) => {
  await play(page, false);
});
test('every chapter plays by keyboard only', async ({ page }) => {
  await play(page, true);
});

test('the recap asks from finished chapters', async ({ page }) => {
  await play(page, false);
  await page.goto('/before-genai/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await serious(page)).toEqual([]);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide', async ({ page }) => {
    for (const p of [`/before-genai/`, `/before-genai/${M.chapters[0].id}/`, `/before-genai/recap/`]) {
      await page.goto(p);
      await layoutHolds(page);
    }
  });
});
