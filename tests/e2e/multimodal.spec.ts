// Module 16, Multimodal models: the intro, every chapter played by mouse and by keyboard only, its own progress key, the
// predict lock in chapter 2, the Patches view's text alternative and size range by keyboard, the workbench's best plans,
// "I'm not sure", reduced motion, the recap, axe and phone width. The go-live checks (kickers on home, share images, home's
// card and Continue) are added when the module goes live.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { mmWalker } from './multimodal-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('multimodal');
const CHS = M.chapters.map(c => c.id), [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = CHS;
const at = (id: string) => new RegExp(`/multimodal/${id}/$`);
async function walkAll(w: ReturnType<typeof mmWalker>) {
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
const axe = async (page: Page) => { await page.waitForTimeout(400); expect(await serious(page)).toEqual([]); };
test.setTimeout(150_000);

test('the intro shows the level, the prerequisite, the author, the chapters and the Colorfigures credit', async ({ page }) => {
  await page.goto('/multimodal/');
  const meta = page.locator('.hero .module-meta');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 16 · Multimodal');
  await expect(meta.locator('.level')).toHaveText('Intermediate');
  await expect(meta.getByRole('link', { name: moduleOf('tokens').title, exact: true })).toHaveAttribute('href', '/tokens/');
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Colorfigures' })).toBeVisible();
  await expect(page.locator('.versus .reply')).toHaveCount(2);
  await axe(page);
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({ page }) => {
  await walkAll(mmWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in multimodal-progress-v1 and no other module’s key', async ({ page }) => {
  await page.goto('/');
  const OTHERS = { 'tokens-progress-v1': JSON.stringify({ done: ['01-what-the-model-reads'], saved: {} }) };
  await page.evaluate(o => { for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); }, OTHERS);
  await walkAll(mmWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['multimodal-progress-v1']).done).toEqual(CHS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('multimodal');
});

test('chapter 2: the prediction locks before the reveal; the Patches view names size, count and reading as the size changes', async ({ page }) => {
  const w = mmWalker(page, 'keyboard');
  await w.open(CH2);
  const c = card(page);
  await c.getByRole('radio', { name: /^The total/ }).click();
  await expect(c.getByRole('radio', { name: /^The payment terms/ })).toBeDisabled();
  await expect(c).toContainText('You predicted: The total');
  const canvas = page.locator('.mm-patches canvas.mm-canvas');
  await expect(page.locator('.mm-patches')).toHaveAttribute('data-state', 'ready');
  await expect(canvas).toHaveAttribute('aria-label', /sent at 1236 × 1600 px: 45 × 58 patches, 2,610 image tokens/);
  const slider = c.getByRole('slider', { name: 'Size' });
  await slider.focus();
  await slider.press('ArrowLeft');
  await slider.press('ArrowLeft');
  await expect(slider).toHaveAttribute('aria-valuetext', /^800 px, [\d,]+ image tokens$/);
  await expect(canvas).toHaveAttribute('aria-label', /sent at 618 × 800 px.*the payment terms go first/);
  await expect(c.locator('.mm-reading tr[data-field="terms"] .stamp')).toHaveText('WRONG');
  await axe(page);
});

test('chapter 6: the sum check catches the misread total', async ({ page }) => {
  const w = mmWalker(page, 'mouse');
  await w.open(CH6);
  const c = card(page);
  await c.getByRole('button', { name: 'Read the fax with vision' }).click();
  await c.getByRole('button', { name: 'Check the lines add up' }).click();
  await expect(c.locator('[data-check]')).toHaveAttribute('data-check', 'fail');
  await expect(c.locator('[data-check]')).toContainText('$968.00');
  await expect(c.locator('[data-check]')).toContainText('$963.00');
});

test('chapter 7: vision at the largest size is not accepted; Show me applies one of the best plans', async ({ page }) => {
  const w = mmWalker(page, 'mouse');
  await w.open(CH7);
  const c = card(page), score = c.locator('[data-best]');
  await expect(score).toHaveAttribute('data-best', '0');
  await c.getByRole('button', { name: 'Show me' }).click();
  await expect(c).toContainText('Step 2 of');
  await expect(score).toHaveAttribute('data-best', '1');
  await expect(c).toContainText(/One of \d+ that work/);
});

test('“I’m not sure” on the checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = mmWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1(undefined, 'I’m not sure');
  await expect(card(page)).toContainText('Chapter complete');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('every chapter plays through', async ({ page }) => {
    await walkAll(mmWalker(page, 'mouse'));
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  await walkAll(mmWalker(page, 'mouse'));
  await page.goto('/multimodal/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/multimodal/', ...CHS.map(id => `/multimodal/${id}/`), '/multimodal/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(mmWalker(page, 'mouse', async p => { await layoutHolds(p); await axe(p); }));
  });
});
