// Watermarks and made-by-AI: the intro, every chapter played by mouse and by keyboard only, its own progress key, the
// lamp (a range and Light all, one read-out), the reword path, the print's findings, the workbench's best setting,
// "I'm not sure", reduced motion, the recap, axe and phone width. The go-live checks: share images, home’s card.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf, moduleNumber } from '../../src/lib/modules';
import pinned from '../../data/watermarks/pinned.json' with { type: 'json' };
import { wmWalker } from './watermarks-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('watermarks');
const NUMBER = moduleNumber(M);
const CHS = M.chapters.map(c => c.id),
  [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = CHS;
const at = (id: string) => new RegExp(`/watermarks/${id}/$`);
async function walkAll(w: ReturnType<typeof wmWalker>) {
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

test('the intro shows the level, the author, the chapters and the module number', async ({ page }) => {
  await page.goto('/watermarks/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Watermarks and made-by-AI`);
  await expect(page.locator('.hero .module-meta .level')).toHaveText('Intermediate');
  await expect(page.locator('.topbar').getByRole('link', { name: M.author.name })).toHaveAttribute(
    'href',
    M.author.url,
  );
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await axe(page);
});

test('the recap names the module number', async ({ page }) => {
  await page.goto('/watermarks/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Recap`);
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/watermarks/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/watermarks\.jpg$/);
  await page.goto(`/watermarks/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/watermarks-${CH1}\\.jpg$`),
  );
  await page.goto('/watermarks/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/watermarks-recap\.jpg$/);
  expect((await page.request.get('/og/watermarks.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="watermarks"] h4 a')).toHaveAttribute('href', '/watermarks/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(wmWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in watermarks-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'transformers-progress-v1': JSON.stringify({ done: ['01-one-token-at-a-time'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(wmWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['watermarks-progress-v1']).done).toEqual(CHS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('watermarks');
});

test('chapter 2: the lamp lights only its window; Light all reads out the checker’s count', async ({ page }) => {
  const w = wmWalker(page, 'mouse');
  await w.open(CH2);
  await expect(page.locator('.wm-stage [role="status"]')).toHaveCount(1);
  await page.getByRole('slider', { name: 'Lamp' }).fill('4');
  await expect(page.locator('[data-lit="1"]')).toHaveCount(16);
  await expect(page.locator('.wm-said')).toContainText('Tokens 5–12 and 37–44');
  await page.getByRole('button', { name: 'Light all' }).click();
  await expect(page.locator('[data-lit="1"]')).toHaveCount(pinned.reply.ids.length);
  await expect(page.locator('.wm-said')).toContainText(`z ${pinned.reply.z.toFixed(2)}, marked`);
});

test('chapter 5: a swap re-scores the reply; Show me pulls it under the line', async ({ page }) => {
  const w = wmWalker(page, 'mouse');
  await w.open(CH5);
  await card(page)
    .getByRole('radio', { name: /^About/ })
    .first()
    .click();
  await card(page).getByRole('button', { name: 'Show me' }).click();
  await expect(card(page)).toContainText('Step 3 of');
  await page.getByRole('button', { name: 'Strip', exact: true }).click();
  await expect(page.locator('.wm-meter')).toHaveAttribute('data-z', pinned.rewording.washed.z.toFixed(4));
});

test('chapter 7: the start is not accepted; Show me applies the best setting', async ({ page }) => {
  const w = wmWalker(page, 'mouse');
  await w.open(CH7);
  const c = card(page),
    score = c.locator('[data-best]');
  await expect(score).toHaveAttribute('data-best', '0');
  await c.getByRole('button', { name: 'Show me' }).click();
  await expect(c).toContainText('Step 2 of');
  await expect(score).toHaveAttribute('data-best', '1');
  await expect(page.locator('.tc-caption')).toContainText('written live', { timeout: 30_000 });
});

test('“I’m not sure” on the checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = wmWalker(page, 'mouse');
  await w.open(CH6);
  await w.ch6(undefined, 'I’m not sure');
  await expect(card(page)).toContainText('Chapter complete');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the lamp lights the whole page at once', async ({ page }) => {
    const w = wmWalker(page, 'mouse');
    await w.open(CH2);
    await expect(page.locator('[data-lit="1"]')).toHaveCount(pinned.reply.ids.length);
  });
  test('every chapter plays through', async ({ page }) => {
    await walkAll(wmWalker(page, 'mouse'));
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  await walkAll(wmWalker(page, 'mouse'));
  await page.goto('/watermarks/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/watermarks/', ...CHS.map(id => `/watermarks/${id}/`), '/watermarks/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      wmWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
