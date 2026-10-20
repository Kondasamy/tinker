// Module 4, Evals: the intro, chapter 1 played by mouse and by keyboard only, its own progress key, "I'm not sure",
// reduced motion, the suite's Preparing state, the recap, home's live card and Continue, axe and phone width.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import ch3 from '../../data/questions/ch3.json' with { type: 'json' };
import ch4 from '../../data/questions/ch4.json' with { type: 'json' };
import ch5 from '../../data/questions/ch5.json' with { type: 'json' };
import ch6 from '../../data/questions/ch6.json' with { type: 'json' };

// the test set in suite order (src/lib/evals/suite.ts QUESTIONS; that module needs Vite, so the specs read the files)
const QUESTIONS = [...ch3, ...ch4, ...ch5, ...ch6];
import { brokenQ, evalWalker } from './evals-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('evals'), CH1 = M.chapters[0].id;
const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const axe = async (page: Page) => expect(await serious(page)).toEqual([]);

const at = (text: string) => QUESTIONS.findIndex(q => text.includes(q.query));

test('the intro shows the level, the prerequisite, the author, the chapters and the Colorfigures credit', async ({ page }) => {
  await page.goto('/evals/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Intermediate');
  await expect(meta.getByRole('link', { name: 'RAG', exact: true })).toHaveAttribute('href', '/rag/');
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Colorfigures' })).toBeVisible();
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://explain.kondasamy.com/og/evals.jpg');
  await axe(page);
});

test('home lists Evals under Intermediate as a live card linking to its intro', async ({ page }) => {
  await page.goto('/');
  const live = page.locator('[data-level="Intermediate"] .module[data-module="evals"]');
  await expect(live.getByRole('link', { name: /Evals/ }).first()).toHaveAttribute('href', '/evals/');
  await expect(page.locator('.roadmap[data-module="evals"]')).toHaveCount(0);
});

test('chapter 1 plays by mouse, with axe clean at each check', async ({ page }) => {
  const w = evalWalker(page, 'mouse', axe);
  await w.open(CH1);
  await w.ch1(/\/evals\/recap\/$/);
});

test('chapter 1 plays by keyboard only; progress lands in evals-progress-v1 and RAG’s key is untouched', async ({ page }) => {
  await page.goto('/');
  const RAG = JSON.stringify({ done: ['01-history'], saved: {} });
  await page.evaluate(v => localStorage.setItem('rag-progress-v1', v), RAG);
  const w = evalWalker(page, 'keyboard');
  await w.open(CH1);
  await w.ch1();
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['evals-progress-v1']).done).toEqual([CH1]);
  expect(store['rag-progress-v1']).toBe(RAG);
  expect(store['tinker-last-module']).toBe('evals');
});

test('home Continue resumes Evals once it was played last', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { localStorage.setItem('evals-progress-v1', JSON.stringify({ done: [], saved: {} })); localStorage.setItem('tinker-last-module', 'evals'); });
  await page.reload();
  await expect(page.locator('[data-continue]')).toHaveAttribute('href', /^\/evals\//);
});

test('the stage says Preparing until the suite loads, then shows the bench', async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(r => { release = r; });
  await page.route('**/data/index/**', async route => { await held; await route.continue(); });
  await page.goto(`/evals/${CH1}/`);
  await page.locator('astro-island:not([ssr])').waitFor();
  await expect(page.locator('.ev-wait[data-state="preparing"]')).toBeVisible();
  await expect(card(page).getByRole('button', { name: /^Try:/ })).toHaveCount(0);
  release();
  await expect(page.locator('.ev-wait')).toHaveCount(0);
  await expect(page.locator('.stage svg').first()).toBeVisible();
  await expect(card(page).getByRole('button', { name: /^Try:/ })).toHaveCount(2);
});

test('the tried questions are ones v2 fixes; the regression shows only after the whole set runs', async ({ page }) => {
  const w = evalWalker(page, 'mouse');
  await w.open(CH1);
  const c = card(page), caption = page.locator('.tc-caption');
  const tries = c.getByRole('button', { name: /^Try:/ });
  const tried = [at((await tries.nth(0).textContent())!), at((await tries.nth(1).textContent())!)];
  await tries.nth(0).click();
  await tries.nth(1).click();
  await expect(caption).toContainText('2 of 2 passed');
  await page.getByRole('button', { name: /^Results/ }).click();
  await expect(page.locator('.ev-grid .cell')).toHaveCount(0);
  await c.getByRole('radio', { name: /^Better on every question/ }).click();
  await c.getByRole('button', { name: /^Run all/ }).click();
  const grid = page.locator('.ev-grid-wide');
  await expect(grid.locator('.cell')).toHaveCount(QUESTIONS.length * 2);
  // both tried questions failed on v1 and pass on v2
  for (const q of tried) await expect(grid.locator(`.cell[aria-label="Q${q + 1}, v2: passed, was failing"]`)).toHaveCount(1);
  // the caption's scores are the grid's
  const label = (await grid.getAttribute('aria-label'))!;
  const [, a, b] = /v1 passed (\d+), v2 passed (\d+)/.exec(label)!;
  await expect(caption).toContainText(`v1 passed ${a}; v2 passed ${b}`);
  const broken = await brokenQ(page);
  expect(tried).not.toContain(broken);
  await expect(c).toContainText('NOT WHAT YOU PREDICTED');
  // a fixed question is not the answer; three misses bring the hint, and Show me finds it
  const fix = tried[0];
  for (let i = 0; i < 3; i++) await c.getByRole('button', { name: `Q${fix + 1}: ${QUESTIONS[fix].query}` }).click();
  await expect(c.locator('.tc-status')).toContainText('a fix, not a regression');
  await expect(c.locator('.hint')).toBeVisible();
  await c.getByRole('button', { name: 'Show me' }).click();
  await expect(c).toContainText('Step 5 of');
  await expect(c).toContainText(QUESTIONS[broken].query);
});

test('“I’m not sure” on the checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = evalWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1(undefined, 'I’m not sure');
  const fb = card(page).locator('.quiz .feedback');
  await expect(fb).toContainText('The answer: Run the whole test set');
  await expect(fb).not.toContainText('NOT QUITE');
  await expect(card(page).locator('.hint')).toHaveCount(0);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the picture holds still and the chapter still plays through', async ({ page }) => {
    const w = evalWalker(page, 'mouse', async p => {
      // a 0.01 ms transition on a just-pressed tab can still be in its first frame: poll until it settles
      await expect.poll(() => p.evaluate(() => document.querySelector('.stage')!.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length)).toBe(0);
    });
    await w.open(CH1);
    await w.ch1();
  });
});

test('the recap asks from the finished chapter; with none done it says so', async ({ page }) => {
  const w = evalWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1(/\/evals\/recap\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('evals-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start chapter 1 →' })).toHaveAttribute('href', `/evals/${CH1}/`);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and chapter 1 plays through there with axe clean', async ({ page }) => {
    for (const p of ['/evals/', `/evals/${CH1}/`, '/evals/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    const w = evalWalker(page, 'mouse', async p => { await layoutHolds(p); await axe(p); });
    await w.open(CH1);
    await w.ch1();
  });
});
