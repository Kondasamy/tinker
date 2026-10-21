// Module 12, Small models: the intro, every chapter played by mouse and by keyboard only, the teacher and the student run
// live, its own progress key, "I'm not sure", reduced motion, the recap, axe, phone width, chapters 1 and 3 played
// offline once both weight sets are in, the frontier read by keyboard, and the puzzles' wrong answers held back.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { smWalker } from './small-models-flow';
import { serious, layoutHolds, offline, PHONE } from './helpers';

const M = moduleOf('small-models');
const CHS = M.chapters.map(c => c.id), [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = CHS;
const at = (id: string) => new RegExp(`/small-models/${id}/$`);
async function walkAll(w: ReturnType<typeof smWalker>) {
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
/** axe once the stage's fade-in has finished: mid-fade, the lit screen's text reads as washed out */
const axe = async (page: Page) => {
  await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity));
  expect(await serious(page)).toEqual([]);
};
const bothLoaded = (page: Page) => page.waitForFunction(() => ['model.bin', 'student.bin'].every(f =>
  performance.getEntriesByType('resource').some(e => e.name.endsWith('/data/lm/' + f))));
test.setTimeout(150_000);

test('the intro shows the level, the prerequisites, the author, the chapters and the Colorfigures credit', async ({ page }) => {
  await page.goto('/small-models/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Advanced');
  await expect(meta.getByRole('link', { name: moduleOf('fine-tuning').title, exact: true })).toHaveAttribute('href', '/fine-tuning/');
  await expect(meta.getByRole('link', { name: moduleOf('evals').title, exact: true })).toHaveAttribute('href', '/evals/');
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Colorfigures' })).toBeVisible();
  await expect(page.locator('.hero .kicker')).toHaveText('Module 12 · Small models');
  await axe(page);
});

test('the intro reads as pictures by default; Words unfolds the longer text', async ({ page }) => {
  await page.goto('/small-models/');
  const more = page.locator('.band .note.more');
  await expect(more).toBeHidden();
  await expect(page.locator('.versus .reply header .tag').first()).toHaveText('recorded answer');
  await page.getByRole('button', { name: 'Words' }).click();
  await expect(more).toBeVisible();
  await axe(page);
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({ page }) => {
  await walkAll(smWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in small-models-progress-v1 and no other module’s key', async ({ page }) => {
  await page.goto('/');
  const OTHERS = { 'fine-tuning-progress-v1': JSON.stringify({ done: ['01-three-ways'], saved: {} }) };
  await page.evaluate(o => { for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); }, OTHERS);
  await walkAll(smWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['small-models-progress-v1']).done).toEqual(CHS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('small-models');
});

test('chapter 1: fetches both weight sets on load, then plays offline; the top 5 is computed for both', async ({ page }) => {
  const failed: string[] = [];
  page.on('requestfailed', r => failed.push(r.url()));
  const w = smWalker(page, 'mouse');
  await w.open(CH1);
  await bothLoaded(page);
  await page.waitForLoadState('networkidle');
  await offline(page);
  const c = card(page);
  await c.getByRole('button', { name: 'Weigh both models' }).click();
  await expect(c.locator('[data-sizes] tbody tr')).toHaveCount(2);
  await c.getByRole('radio', { name: /^Mostly the same pieces/ }).click();
  await c.getByRole('button', { name: 'Ask both' }).click();
  await expect(c.locator('.sm-top tbody tr')).toHaveCount(5);
  await expect(c).toContainText('AS YOU PREDICTED');
  // a sentence where the two top picks differ
  await c.getByRole('button', { name: /customer success/ }).click();
  await expect(c.locator('.sm-top')).toHaveAttribute('data-same', '0');
  expect(failed).toEqual([]);
});

test('chapter 3: agreement over the held-out text is computed offline in the browser', async ({ page }) => {
  const w = smWalker(page, 'mouse');
  await w.open(CH3);
  await bothLoaded(page);
  await page.waitForLoadState('networkidle');
  await offline(page);
  await w.ch3();
  await expect(card(page).locator('[data-closeness] [data-total] td').nth(1)).toHaveText(/^\d+%$/);
});

test('chapter 5: the frontier reads out each threshold by keyboard', async ({ page }) => {
  const w = smWalker(page, 'mouse');
  await w.open(CH5);
  const readout = page.locator('.sm-frontier .ft-readout');
  await expect(readout).toContainText('up below 0:');
  await page.locator('.sm-frontier .ft-mark[tabindex="0"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(readout).toContainText('up below 0.5:');
  await page.keyboard.press('End');
  await expect(readout).toContainText('All large');
});

test('chapter 6: a threshold the gate holds is not accepted; the cheapest that ships is', async ({ page }) => {
  const w = smWalker(page, 'mouse');
  await w.open(CH6);
  const c = card(page);
  await c.getByRole('button', { name: 'Run all-large through the gate' }).click();
  await c.getByRole('radio', { name: /^Yes: a threshold that sends/ }).click();
  const slider = c.getByRole('slider');
  await slider.fill('4');
  await expect(c.locator('[data-ship]').last()).toHaveAttribute('data-ship', '0');
  await expect(c).toContainText('Step 3 of');
  await slider.fill('6');
  await expect(c.locator('[data-ship]').last()).toHaveAttribute('data-ship', '1');
  await expect(c).toContainText('Step 3 of');     // ships, but not the cheapest
  await slider.fill('5');
  await expect(c).toContainText('Step 4 of');
});

test('chapter 7: the starting policy is not the best; Show me lands on a winning one', async ({ page }) => {
  const w = smWalker(page, 'mouse');
  await w.open(CH7);
  const c = card(page), score = c.locator('[data-score]');
  await expect(score).toHaveAttribute('data-best', '0');
  await c.getByRole('button', { name: 'Show me' }).click();
  await expect(c).toContainText('Step 2 of');
  await expect(score).toHaveAttribute('data-best', '1');
});

test('“I’m not sure” on the checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = smWalker(page, 'mouse');
  await w.open(CH4);
  await w.ch4(undefined, 'I’m not sure');
  await expect(card(page)).toContainText('Chapter complete');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('every chapter plays through', async ({ page }) => {
    await walkAll(smWalker(page, 'mouse'));
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  await walkAll(smWalker(page, 'mouse'));
  await page.goto('/small-models/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.hero .kicker')).toHaveText('Module 12 · Recap');
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/small-models/', ...CHS.map(id => `/small-models/${id}/`), '/small-models/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(smWalker(page, 'mouse', async p => { await layoutHolds(p); await axe(p); }));
  });
});
