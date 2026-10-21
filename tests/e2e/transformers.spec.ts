// Module 7, Transformer architecture: the intro, chapters 1–4 played by mouse and by keyboard only, its own progress
// key, reduced motion, the recap, axe and phone width. U11 adds chapters 5–7 and the offline walk; U12 the go-live
// checks (share images, home card, warm-up).
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { transformersWalker } from './transformers-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('transformers');
const [CH1, CH2, CH3, CH4] = M.chapters.map(c => c.id);
const at = (id: string) => new RegExp(`/transformers/${id}/$`);
/** Walk every written chapter in order, following each "Next" link. */
async function walkAll(w: ReturnType<typeof transformersWalker>) {
  await w.open(CH1);
  await w.ch1(at(CH2));
  await w.ch2(at(CH3));
  await w.ch3(at(CH4));
  await w.ch4();
}
const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const axe = async (page: Page) => expect(await serious(page)).toEqual([]);
test.setTimeout(120_000);

test('the intro shows the level, the prerequisite, the author, the chapters and the Colorfigures credit', async ({ page }) => {
  await page.goto('/transformers/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Advanced');
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Colorfigures' })).toHaveAttribute('href', 'https://april-zhu.com/colorfigures');
  await axe(page);
});

test('chapters 1–4 play by mouse, in order through the Next links, with axe clean at each check', async ({ page }) => {
  await walkAll(transformersWalker(page, 'mouse', axe));
});

test('chapters 1–4 play by keyboard only; progress lands in transformers-progress-v1 and no other module’s key', async ({ page }) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }) };
  await page.evaluate(o => { for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); }, OTHERS);
  await walkAll(transformersWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['transformers-progress-v1']).done).toEqual([CH1, CH2, CH3, CH4]);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('transformers');
});

test('chapter 1: the revealed answer is the bar’s top token, and each added token joins the prompt', async ({ page }) => {
  const w = transformersWalker(page, 'mouse');
  await w.open(CH1);
  const c = card(page);
  await c.getByRole('button', { name: /^Read “/ }).click();
  await c.getByRole('radio', { name: /^“hours”/ }).click();
  await c.getByRole('button', { name: 'Show the probabilities' }).click();
  await expect(c.locator('.feedback')).toContainText('NOT WHAT YOU PREDICTED');
  // the bar's first item is the outcome the reveal names
  const top = (await page.getByRole('list', { name: /Next-piece probabilities/ }).locator('[role="listitem"]').first().getAttribute('aria-label'))!;
  const piece = /^1\. ␣?(\S+):/.exec(top)![1];
  await expect(c.locator('.feedback')).toContainText(`What happened: “${piece}”`);
  await c.getByRole('button', { name: /^Add the likeliest token/ }).click();
  await expect(c.locator('.tc-status')).toContainText(`${piece}”`);
});

test('“I’m not sure” on a checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = transformersWalker(page, 'mouse');
  await w.open(CH2);
  const c = card(page);
  await c.getByRole('button', { name: /^Look up/ }).click();
  await c.getByRole('radio').first().click();
  await c.getByRole('button', { name: 'Show both copies' }).click();
  await c.getByRole('radio', { name: 'I’m not sure' }).click();
  await expect(c).toContainText('Chapter complete');
  await expect(c.locator('.stamp.wrong')).toHaveCount(0);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the picture holds still and the chapters still play through', async ({ page }) => {
    const w = transformersWalker(page, 'mouse', async p => {
      await expect.poll(() => p.evaluate(() => document.querySelector('.stage')!.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length)).toBe(0);
    });
    await walkAll(w);
  });
});

test('the recap asks from the finished chapter; with none done it says so', async ({ page }) => {
  const w = transformersWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/transformers/recap/');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('transformers-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and chapters 1–4 play through there with axe clean', async ({ page }) => {
    for (const p of ['/transformers/', ...[CH1, CH2, CH3, CH4].map(id => `/transformers/${id}/`), '/transformers/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(transformersWalker(page, 'mouse', async p => { await layoutHolds(p); await axe(p); }));
  });
});
