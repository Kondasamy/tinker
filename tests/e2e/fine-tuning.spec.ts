// Module 9, Fine-tuning vs prompting: the intro, chapters 1–4 played by mouse and by keyboard only, live replies from
// Larkspur mini, its own progress key, "I'm not sure", reduced motion, the recap, axe and phone width.
// U21 adds chapters 5–7 to the walk.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { ftWalker } from './fine-tuning-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('fine-tuning');
const [CH1, CH2, CH3, CH4] = M.chapters.map(c => c.id);
const at = (id: string) => new RegExp(`/fine-tuning/${id}/$`);
async function walkAll(w: ReturnType<typeof ftWalker>) {
  await w.open(CH1);
  await w.ch1(at(CH2));
  await w.ch2(at(CH3));
  await w.ch3(at(CH4));
  await w.ch4();
}
const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const axe = async (page: Page) => expect(await serious(page)).toEqual([]);
test.setTimeout(120_000);

test('the intro shows the level, the prerequisites, the author, the chapters and the Colorfigures credit', async ({ page }) => {
  await page.goto('/fine-tuning/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Advanced');
  await expect(meta.getByRole('link', { name: moduleOf('evals').title, exact: true })).toHaveAttribute('href', '/evals/');
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Colorfigures' })).toBeVisible();
  await axe(page);
});

test('chapters 1–4 play by mouse, in order through the Next links, with axe clean at each check', async ({ page }) => {
  await walkAll(ftWalker(page, 'mouse', axe));
});

test('chapters 1–4 play by keyboard only; progress lands in fine-tuning-progress-v1 and no other module’s key', async ({ page }) => {
  await page.goto('/');
  const OTHERS = { 'evals-progress-v1': JSON.stringify({ done: ['01-it-worked-when-i-tried-it'], saved: {} }) };
  await page.evaluate(o => { for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); }, OTHERS);
  await walkAll(ftWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['fine-tuning-progress-v1']).done).toEqual([CH1, CH2, CH3, CH4]);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('fine-tuning');
});

test('chapter 2: the base model never signs off and the fine-tuned copy does, generated in the browser', async ({ page }) => {
  const w = ftWalker(page, 'mouse');
  await w.open(CH2);
  const c = card(page);
  await c.getByRole('button', { name: 'Ask the base model' }).click();
  await expect(c.locator('.ft-answer').first()).not.toContainText('Larkspur team');
  await c.getByRole('radio', { name: /^A reply that ends/ }).click();
  await c.getByRole('button', { name: 'Swap in the fine-tuned weights' }).click();
  await expect(c.locator('.ft-answer')).toHaveCount(2);
  await expect(c.locator('.ft-answer').nth(0)).not.toContainText('Larkspur team');
  await expect(c.locator('.ft-answer').nth(1)).toContainText('Cheers, the Larkspur team');
  await expect(c).toContainText('AS YOU PREDICTED');
});

test('chapter 4: the fine-tuned version fails the new price and RAG passes it', async ({ page }) => {
  const w = ftWalker(page, 'mouse');
  await w.open(CH4);
  const c = card(page);
  await c.getByRole('button', { name: 'Read the price update' }).click();
  await c.getByRole('radio', { name: /^Both give the new price/ }).click();
  await c.getByRole('button', { name: /^Ask both/ }).click();
  await expect(c).toContainText('NOT WHAT YOU PREDICTED');
  await expect(c.locator('.ft-answer[data-version="finetuned"] .stamp').first()).toHaveText('FAIL');
  await expect(c.locator('.ft-answer[data-version="rag"] .stamp').first()).toHaveText('PASS');
  await expect(c.locator('.ft-answer').filter({ hasText: 'recorded answer' })).toHaveCount(2);
});

test('“I’m not sure” on the checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = ftWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1(undefined, 'I’m not sure');
  await expect(card(page)).toContainText('Chapter complete');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('chapters 1–4 play through', async ({ page }) => {
    await walkAll(ftWalker(page, 'mouse'));
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  await walkAll(ftWalker(page, 'mouse'));
  await page.goto('/fine-tuning/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and chapters 1–4 play through there with axe clean', async ({ page }) => {
    for (const p of ['/fine-tuning/', ...[CH1, CH2, CH3, CH4].map(id => `/fine-tuning/${id}/`), '/fine-tuning/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(ftWalker(page, 'mouse', async p => { await layoutHolds(p); await axe(p); }));
  });
});
