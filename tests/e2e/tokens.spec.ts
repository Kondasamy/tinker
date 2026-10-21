// Module 6, Tokens & embeddings: the intro, chapters 1–3 played by mouse and by keyboard only, each chapter's own
// checks, its own progress key, "I'm not sure", reduced motion, the recap, axe and phone width.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { tokensWalker } from './tokens-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('tokens');
const [CH1, CH2, CH3, CH4] = M.chapters.map(c => c.id);
const at = (id: string) => new RegExp(`/tokens/${id}/$`);
/** Walk every written chapter in order, following each "Next" link; chapter 3's points at chapter 4 (written in U6). */
async function walkAll(w: ReturnType<typeof tokensWalker>, page: Page) {
  await w.open(CH1);
  await w.ch1(at(CH2));
  await w.ch2(at(CH3));
  await w.ch3();
  await expect(card(page).getByRole('link', { name: /^Next:/ })).toHaveAttribute('href', `/tokens/${CH4}/`);
}
const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const axe = async (page: Page) => expect(await serious(page)).toEqual([]);
test.setTimeout(90_000);

test('the intro shows the level, the author, the chapters and the Colorfigures credit', async ({ page }) => {
  await page.goto('/tokens/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Beginner');
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Colorfigures' })).toBeVisible();
  await axe(page);
});

test('chapters 1–3 play by mouse, in order through the Next links, with axe clean at each check', async ({ page }) => {
  await walkAll(tokensWalker(page, 'mouse', axe), page);
});

test('chapters 1–3 play by keyboard only; progress lands in tokens-progress-v1 and no other module’s key', async ({ page }) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }), 'guardrails-progress-v1': JSON.stringify({ done: ['01-data-or-instructions'], saved: {} }) };
  await page.evaluate(o => { for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); }, OTHERS);
  await walkAll(tokensWalker(page, 'keyboard'), page);
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['tokens-progress-v1']).done).toEqual([CH1, CH2, CH3]);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('tokens');
});

test('chapter 1: the count stays hidden until the prediction locks; typed text is counted live and shown as text', async ({ page }) => {
  const w = tokensWalker(page, 'mouse');
  await w.open(CH1);
  const c = card(page), counts = page.getByTestId('token-counts');
  await expect(counts).toHaveText(/^0 tokens/);
  await expect(c.getByRole('button', { name: 'Feed the sentence to the tokenizer' })).toHaveCount(0);
  await c.getByRole('radio', { name: /^Exactly \d+: one token per word/ }).click();
  await c.getByRole('button', { name: 'Feed the sentence to the tokenizer' }).click();
  await expect(c).toContainText('NOT WHAT YOU PREDICTED');
  await expect(counts).not.toHaveText(/^0 tokens/);
  await c.getByLabel('Your text').fill('<script>alert(1)</script>');
  await expect(counts).toContainText('1 word');
  await c.getByRole('button', { name: 'Count my text' }).click();
  await expect(c.locator('[data-mine]')).toContainText('tokens per word');
  await page.locator('.tc-tabs').getByRole('button', { name: /^Tokens/ }).click();
  await expect(page.locator('.tk-row li').first()).toBeVisible();
  await axe(page);
});

test('chapter 2: the first merge on screen is the one the reveal names', async ({ page }) => {
  const w = tokensWalker(page, 'mouse');
  await w.open(CH2);
  const c = card(page);
  await c.getByRole('button', { name: 'Cut it into bytes' }).click();
  await c.getByRole('radio').first().click();
  await expect(c.locator('[data-merge="0"]')).toContainText('one per byte');
  await c.getByRole('button', { name: 'Next merge' }).click();
  const happened = await c.locator('.feedback p').filter({ hasText: 'What happened:' }).innerText();
  const pair = happened.replace('What happened: ', '').split(', found')[0];
  await expect(c.locator('[data-merge="1"]')).toContainText(`Merge 1 of`);
  await expect(c.locator('[data-merge="1"]')).toContainText(pair);
});

test('chapter 3: the meter shows the rule, the recorded tokenizers and the site’s in-sample count, then a dated price', async ({ page }) => {
  const w = tokensWalker(page, 'mouse');
  await w.open(CH3);
  const c = card(page);
  await c.getByRole('radio', { name: /^The rule matches/ }).click();
  await c.getByRole('button', { name: 'Count the documents' }).click();
  const rows = c.locator('table[data-meter] tbody tr');
  await expect(rows).toHaveCount(4);
  await expect(rows.last()).toContainText('in-sample');
  await c.getByRole('button', { name: 'Price the documents' }).click();
  await expect(c.locator('table[data-meter] thead')).toContainText('Cost to send once');
  await expect(c).toContainText(/checked \d{4}-\d{2}-\d{2}/);
  await expect(c.getByRole('link', { name: /^RAG chapter 2/ })).toHaveAttribute('href', '/rag/02-why-not-stuff-it/');
});

test('“I’m not sure” on each checkpoint reveals the answer and is no miss', async ({ page }) => {
  const w = tokensWalker(page, 'mouse');
  for (const [id, play] of [[CH1, w.ch1], [CH2, w.ch2], [CH3, w.ch3]] as const) {
    await w.open(id);
    await play(undefined, 'I’m not sure');
    const fb = card(page).locator('.quiz .feedback');
    await expect(fb).toContainText('The answer:');
    await expect(fb).not.toContainText('NOT QUITE');
  }
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the picture holds still and the chapters still play through', async ({ page }) => {
    const w = tokensWalker(page, 'mouse', async p => {
      await expect.poll(() => p.evaluate(() => document.querySelector('.stage')!.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length)).toBe(0);
    });
    await walkAll(w, page);
  });
});

test('the recap asks from the finished chapter; with none done it says so', async ({ page }) => {
  const w = tokensWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/tokens/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('tokens-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and chapters 1–3 play through there with axe clean', async ({ page }) => {
    for (const p of ['/tokens/', `/tokens/${CH1}/`, `/tokens/${CH2}/`, `/tokens/${CH3}/`, '/tokens/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(tokensWalker(page, 'mouse', async p => { await layoutHolds(p); await axe(p); }), page);
  });
});
