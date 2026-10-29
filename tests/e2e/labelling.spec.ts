// Who labels the data: the intro, every chapter played by mouse and by keyboard only, its own progress key, the sort
// control (number keys only while it has focus, one read-out, a filed ticket locked), the workbench's cheapest setup,
// "I'm not sure", reduced motion, the recap, axe and phone width (hole buttons ≥ 44 px). The go-live checks (share
// images, home card) join at go-live.
import { test, expect, type Page } from '@playwright/test';
import { MODULES, moduleOf } from '../../src/lib/modules';
import { lbWalker } from './labelling-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('labelling');
const NUMBER = MODULES.filter(m => m.status === 'live').findIndex(m => m.id === M.id) + 1;
const CHS = M.chapters.map(c => c.id),
  [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = CHS;
const at = (id: string) => new RegExp(`/labelling/${id}/$`);
async function walkAll(w: ReturnType<typeof lbWalker>) {
  await w.open(CH1);
  await w.ch1(at(CH2));
  await w.ch2(at(CH3));
  await w.ch3(at(CH4));
  await w.ch4(at(CH5));
  await w.ch5(at(CH6));
  await w.ch6(at(CH7));
  await w.ch7();
}
const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
// let the stage's fade finish first: axe can catch a figure mid-fade and report false contrast failures
const axe = async (page: Page) => {
  await page.waitForTimeout(400);
  expect(await serious(page)).toEqual([]);
};
test.setTimeout(240_000);

test('the intro shows the level and the chapters', async ({ page }) => {
  await page.goto('/labelling/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Who labels the data`);
  await expect(page.locator('.hero .module-meta .level')).toHaveText('Intermediate');
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await axe(page);
});

test('the recap names the module number', async ({ page }) => {
  await page.goto('/labelling/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Recap`);
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(lbWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in labelling-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'evals-progress-v1': JSON.stringify({ done: ['01-it-worked-when-i-tried-it'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(lbWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['labelling-progress-v1']).done).toEqual(CHS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('labelling');
});

test('chapter 1: number keys file only while the sort control has focus; one read-out; a filed ticket is locked', async ({
  page,
}) => {
  const w = lbWalker(page, 'keyboard');
  await w.open(CH1);
  await card(page)
    .getByRole('radio', { name: /^Three/ })
    .press('Enter');
  const group = card(page).getByRole('group', { name: 'Sort the ticket' }),
    said = page.locator('.lb-said');
  await expect(group).toBeVisible();
  await expect(page.locator('[role="status"].lb-said')).toHaveCount(1);
  await page.locator('body').press('1');
  await expect(said).toHaveText('');
  await group.focus();
  await page.keyboard.press('2');
  await expect(said).toContainText('You filed it under Return.');
  await expect(said).toContainText('Rosa: Return. Mira: Refund. Tom: Delivery.');
  await expect(group.getByRole('button', { name: /^1 / })).toBeDisabled();
  await page.keyboard.press('1');
  await expect(said).toContainText('You filed it under Return.');
  await expect(page.locator('.lb-rack .slip.drop')).toHaveCount(3);
});

test('chapter 7: the start is not accepted; Show me applies the cheapest setup', async ({ page }) => {
  const w = lbWalker(page, 'mouse');
  await w.open(CH7);
  const c = card(page),
    score = c.locator('[data-best]');
  await expect(score).toHaveAttribute('data-best', '0');
  await expect(score).toHaveAttribute('data-ok', '0');
  await c.getByRole('button', { name: 'Show me' }).click();
  await expect(c).toContainText('Step 2 of');
  await expect(score).toHaveAttribute('data-best', '1');
});

test('“I’m not sure” on the checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = lbWalker(page, 'mouse');
  await w.open(CH5);
  await w.ch5(undefined, 'I’m not sure');
  await expect(card(page)).toContainText('Chapter complete');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('slips appear in their holes without the drop', async ({ page }) => {
    const w = lbWalker(page, 'mouse');
    await w.open(CH1);
    await card(page)
      .getByRole('radio', { name: /^Three/ })
      .click();
    await w.file(2);
    // the three picks are drawn (the picture's words count them), none of them dropping
    await expect(page.locator('[aria-label*="Slips: 1 in Refund, 1 in Return, 1 in Delivery."]')).toHaveCount(1);
    await expect(page.locator('.lb-rack .slip.drop')).toHaveCount(0);
  });
  test('every chapter plays through', async ({ page }) => {
    await walkAll(lbWalker(page, 'mouse'));
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  await walkAll(lbWalker(page, 'mouse'));
  await page.goto('/labelling/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('the hole buttons are at least 44 px and file by touch', async ({ page }) => {
    const w = lbWalker(page, 'mouse');
    await w.open(CH1);
    await card(page)
      .getByRole('radio', { name: /^Three/ })
      .tap();
    const group = card(page).getByRole('group', { name: 'Sort the ticket' });
    for (const b of await group.getByRole('button').all()) {
      const box = (await b.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
    await group.getByRole('button', { name: /^2 / }).tap();
    await expect(page.locator('.lb-said')).toContainText('You filed it under');
  });
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/labelling/', ...CHS.map(id => `/labelling/${id}/`), '/labelling/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      lbWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
