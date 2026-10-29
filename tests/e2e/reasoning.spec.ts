// Module 11, Reasoning models & thinking budgets: the intro, every chapter played by mouse and by keyboard only, its own
// progress key, the predict lock in chapter 4, the effort dial and chart by keyboard, the workbench's best plans,
// "I'm not sure", reduced motion, the recap, axe and phone width; the go-live checks: Module 11 kickers and share images,
// home's card and Continue.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { rsWalker } from './reasoning-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('reasoning');
const CHS = M.chapters.map(c => c.id),
  [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = CHS;
const at = (id: string) => new RegExp(`/reasoning/${id}/$`);
async function walkAll(w: ReturnType<typeof rsWalker>) {
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

test('the intro shows the level, the prerequisite, the author and the chapters', async ({ page }) => {
  await page.goto('/reasoning/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Intermediate');
  await expect(meta.getByRole('link', { name: moduleOf('evals').title, exact: true })).toHaveAttribute(
    'href',
    '/evals/',
  );
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('.versus .reply')).toHaveCount(2);
  await axe(page);
});

test('Module 11 on the intro, the recap and home, with their own share images; home Continue resumes it', async ({
  page,
}) => {
  await page.goto('/reasoning/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 11 · Reasoning');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/reasoning\.jpg$/);
  await page.goto('/reasoning/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 11 · Recap');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/reasoning-recap\.jpg$/);
  await page.goto('/');
  await expect(page.locator('.module[data-module="reasoning"] h4 a')).toHaveAttribute('href', '/reasoning/');
  await page.evaluate(() => {
    localStorage.setItem('reasoning-progress-v1', JSON.stringify({ done: [], saved: {} }));
    localStorage.setItem('tinker-last-module', 'reasoning');
  });
  await page.reload();
  await expect(page.locator('[data-continue]')).toHaveAttribute('href', /^\/reasoning\//);
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(rsWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in reasoning-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'evals-progress-v1': JSON.stringify({ done: ['01-it-worked-when-i-tried-it'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(rsWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['reasoning-progress-v1']).done).toEqual(CHS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('reasoning');
});

test('chapter 1: the quick answer fails and the thinking answer passes, the thinking shown under the stage', async ({
  page,
}) => {
  const w = rsWalker(page, 'mouse');
  await w.open(CH1);
  const c = card(page);
  await c.getByRole('button', { name: 'Answer now' }).click();
  await expect(page.locator('.rs-thinking')).toContainText('None: it answered at once.');
  await c.getByRole('radio', { name: /^A different answer/ }).click();
  await c.getByRole('button', { name: 'Think first, then answer' }).click();
  await expect(page.locator('.rs-thinking')).toContainText('per order line');
  await expect(c.locator('.rs-answer[data-effort="none"] .stamp').first()).toHaveText('WRONG');
  await expect(c.locator('.rs-answer[data-effort="medium"] .stamp').first()).toHaveText('RIGHT');
  await expect(c).toContainText('AS YOU PREDICTED');
});

test('chapter 3: the accuracy chart steps through effort levels by arrow key, the read-out naming accuracy and cost', async ({
  page,
}) => {
  const w = rsWalker(page, 'keyboard');
  await w.open(CH3);
  await w.ch3();
  await page.getByRole('button', { name: 'Accuracy' }).click();
  const marks = page.locator('.rs-mark');
  await expect(marks).toHaveCount(4);
  await marks.last().focus();
  await page.keyboard.press('Home');
  await expect(page.locator('.rs-readout')).toHaveText(
    /^Effort none: multi-step 1 of 6 right \(17%\), cost \d+ tokens$/,
  );
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.rs-readout')).toContainText('Effort low:');
  await axe(page);
});

test('chapter 4: the prediction locks before the reveal, and high effort gets the counts wrong', async ({ page }) => {
  const w = rsWalker(page, 'mouse');
  await w.open(CH4);
  const c = card(page);
  await c.getByRole('button', { name: 'Run at low effort' }).click();
  await c.getByRole('radio', { name: /^Yes: more thinking/ }).click();
  // the pick is locked: another option can't replace it
  await expect(c.getByRole('radio', { name: /^It gets worse/ })).toBeDisabled();
  await expect(c).toContainText('You predicted: Yes: more thinking');
  await c.getByRole('button', { name: 'Run at high effort' }).click();
  await expect(c).toContainText('NOT WHAT YOU PREDICTED');
  await expect(c.locator('.rs-answer[data-effort="high"] .stamp')).toHaveText(['WRONG', 'WRONG', 'WRONG']);
  await expect(c.locator('.tc-fact')).toContainText('Gema');
});

test('chapter 7: high everywhere is not accepted; Show me applies one of the best plans', async ({ page }) => {
  const w = rsWalker(page, 'mouse');
  await w.open(CH7);
  const c = card(page),
    score = c.locator('[data-best]');
  await expect(score).toHaveAttribute('data-best', '0');
  await c.getByRole('button', { name: 'Show me' }).click();
  await expect(c).toContainText('Step 2 of');
  await expect(score).toHaveAttribute('data-best', '1');
  await expect(c).toContainText(/One of \d+ that work/);
});

test('“I’m not sure” on the checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = rsWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1(undefined, 'I’m not sure');
  await expect(card(page)).toContainText('Chapter complete');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('every chapter plays through', async ({ page }) => {
    await walkAll(rsWalker(page, 'mouse'));
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  await walkAll(rsWalker(page, 'mouse'));
  await page.goto('/reasoning/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/reasoning/', ...CHS.map(id => `/reasoning/${id}/`), '/reasoning/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      rsWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
