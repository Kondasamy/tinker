// Module 8, Context engineering & memory: the intro, chapters 1–4 played by mouse and by keyboard only, its own
// progress key, the chapter 4 puzzle's "Show me", reduced motion, the recap, axe and phone width.
// Chapters 5–7 join the walk with U16.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { contextWalker } from './context-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('context');
const [CH1, CH2, CH3, CH4, CH5] = M.chapters.map(c => c.id);
const WRITTEN = [CH1, CH2, CH3, CH4];
const at = (id: string) => new RegExp(`/context/${id}/$`);
async function walkAll(w: ReturnType<typeof contextWalker>) {
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
  await page.goto('/context/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Intermediate');
  for (const id of ['rag', 'tool-calling']) await expect(meta.getByRole('link', { name: moduleOf(id).title, exact: true })).toHaveAttribute('href', `/${id}/`);
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Colorfigures' })).toHaveAttribute('href', 'https://april-zhu.com/colorfigures');
  await axe(page);
});

test('chapters 1–4 play by mouse, in order through the Next links, with axe clean at each check', async ({ page }) => {
  await walkAll(contextWalker(page, 'mouse', axe));
  await expect(card(page).getByRole('link', { name: /^Next:/ })).toHaveAttribute('href', `/context/${CH5}/`);
});

test('chapters 1–4 play by keyboard only, the chapter 4 puzzle included; progress lands in context-progress-v1 and no other module’s key', async ({ page }) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }) };
  await page.evaluate(o => { for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); }, OTHERS);
  await walkAll(contextWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['context-progress-v1']).done).toEqual(WRITTEN);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('context');
});

test('chapter 4: the stamp near the top breaks the cache; Show me gives one of the orders that work', async ({ page }) => {
  const w = contextWalker(page, 'mouse');
  await w.open(CH4);
  const c = card(page);
  await c.getByRole('button', { name: 'Send the conversation' }).click();
  await c.getByRole('radio', { name: /^Hits stop at the stamp/ }).click();
  await expect(c.getByRole('status').filter({ hasText: 'Cache hits' })).toContainText('BROKEN');
  await c.getByRole('button', { name: 'Show me' }).click();
  await expect(c).toContainText('Step 4 of');
  // the count is computed over every order (tests/unit/context-order.test.ts pins it); the engine can't load here
  await expect(c).toContainText(/one of \d+ that work/);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the picture holds still and the chapters still play through', async ({ page }) => {
    const w = contextWalker(page, 'mouse', async p => {
      await expect.poll(() => p.evaluate(() => document.querySelector('.stage')!.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length)).toBe(0);
    });
    await walkAll(w);
  });
});

test('the recap asks from the finished chapter', async ({ page }) => {
  const w = contextWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/context/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and chapters 1–4 play through there with axe clean', async ({ page }) => {
    for (const p of ['/context/', ...WRITTEN.map(id => `/context/${id}/`), '/context/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(contextWalker(page, 'mouse', async p => { await layoutHolds(p); await axe(p); }));
  });
});
