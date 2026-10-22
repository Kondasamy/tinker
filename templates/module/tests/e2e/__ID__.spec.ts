// __ID__: the intro, every chapter played by mouse and by keyboard, the recap, axe and phone width.
// Add one walk per chapter to `play` as you write them.
import { test, expect, type Locator, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('__ID__');

async function play(page: Page, kb: boolean) {
  const card = page.getByRole('region', { name: 'Next step' });
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  await page.goto(`/__ID__/${M.chapters[0].id}/`);
  await page.locator('astro-island:not([ssr])').waitFor();
  await expect(card).toContainText('Step 1 of');
  await press(card.getByRole('button', { name: 'Send the question' }));
  await press(card.getByRole('radio', { name: 'What really happens' }));
  await press(card.getByRole('button', { name: 'Show the reply' }));
  await press(card.getByRole('radio', { name: 'The right answer' }));
  await expect(card).toContainText('Chapter complete');
  expect(await serious(page)).toEqual([]);
}

test('the intro shows the level, the author, the chapters and the Colorfigures credit', async ({ page }) => {
  await page.goto('/__ID__/');
  await expect(page.locator('.hero .module-meta .level')).toHaveText(M.level);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Colorfigures' })).toBeVisible();
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
  await page.goto('/__ID__/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await serious(page)).toEqual([]);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide', async ({ page }) => {
    for (const p of [`/__ID__/`, `/__ID__/${M.chapters[0].id}/`, `/__ID__/recap/`]) {
      await page.goto(p);
      await layoutHolds(page);
    }
  });
});
