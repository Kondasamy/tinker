// Module 18, Pre-training: the intro, every chapter played by mouse and by keyboard only, checkpoints fetched on demand
// and run live, its own progress key, a failed checkpoint fetch and Retry, "I'm not sure", reduced motion, the recap,
// axe and phone width. The go-live adds the Module 18 kicker on home, the share images and home's card.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { ptWalker } from './pre-training-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('pre-training');
const CHS = M.chapters.map(c => c.id),
  [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = CHS;
const at = (id: string) => new RegExp(`/pre-training/${id}/$`);
async function walkAll(w: ReturnType<typeof ptWalker>) {
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
const axe = async (page: Page) => expect(await serious(page)).toEqual([]);
test.setTimeout(120_000);

test('the intro shows the level and the chapters', async ({ page }) => {
  await page.goto('/pre-training/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Intermediate');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 18 · Pre-training');
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await axe(page);
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(ptWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in pre-training-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'tokens-progress-v1': JSON.stringify({ done: [], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(ptWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['pre-training-progress-v1']).done).toEqual(CHS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('pre-training');
});

test('chapter 2: the first and the last checkpoint finish the prompt differently, run in the browser', async ({
  page,
}) => {
  const w = ptWalker(page, 'mouse');
  await w.open(CH2);
  const c = card(page);
  await c.getByRole('radio', { name: /^With words that read like/ }).click();
  const said = c.locator('.pt-says strong');
  await expect(said).toHaveCount(1);
  const first = await said.textContent();
  await w.slide(c.getByRole('slider'), 'end');
  await expect(c).toContainText('Step 3 of');
  await expect(said).not.toHaveText(first ?? '');
  await expect(c.locator('.pt-says .lbl')).toContainText('Step 3000');
});

test('a checkpoint that fails to load shows Retry, and Retry recovers it', async ({ page }) => {
  let failed = false;
  await page.route('**/data/pre-training/ckpt-3000.bin', route => {
    if (failed) return route.continue();
    failed = true;
    return route.abort();
  });
  const w = ptWalker(page, 'mouse');
  await w.open(CH2);
  const c = card(page);
  await c.getByRole('radio', { name: /^With words that read like/ }).click();
  await w.slide(c.getByRole('slider'), 'end');
  const retry = page.locator('.tc-frame').getByRole('button', { name: 'Retry' });
  await expect(retry).toBeVisible();
  await retry.click();
  await expect(page.locator('.tc-frame svg').first()).toBeVisible();
  await expect(c).toContainText('Step 3 of');
});

test('chapter 7: a plan short of the best is not accepted; Show me gives one of the plans that work', async ({
  page,
}) => {
  const w = ptWalker(page, 'mouse');
  await w.open(CH7);
  const c = card(page),
    score = c.locator('[data-score]');
  await expect(score).toHaveAttribute('data-best', '0');
  await expect(c.locator('tr[data-chosen="1"] .note')).toContainText('step');
  await c.getByRole('button', { name: 'Show me' }).click();
  await expect(c).toContainText('Step 2 of');
  await expect(score).toHaveAttribute('data-best', '1');
});

test('“I’m not sure” on the checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = ptWalker(page, 'mouse');
  await w.open(CH5);
  await w.ch5(undefined, 'I’m not sure');
  await expect(card(page)).toContainText('Chapter complete');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('every chapter plays through', async ({ page }) => {
    await walkAll(ptWalker(page, 'mouse'));
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  await walkAll(ptWalker(page, 'mouse'));
  await page.goto('/pre-training/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 18 · Recap');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/pre-training/', ...CHS.map(id => `/pre-training/${id}/`), '/pre-training/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      ptWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
