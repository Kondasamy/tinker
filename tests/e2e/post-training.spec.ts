// Module 19, Post-training: the intro, every chapter played by mouse and by keyboard only, its own progress key,
// chapter 2's picks changing chapter 3's result, the weak grader gamed in chapter 6, the policy bars by keyboard, the
// workbench's Show me, "I'm not sure", reduced motion, the recap, axe and phone width.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { ptWalker } from './post-training-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('post-training');
const CHS = M.chapters.map(c => c.id),
  [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = CHS;
const at = (id: string) => new RegExp(`/post-training/${id}/$`);
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

test('the intro shows the level, the prerequisites, the author and the chapters', async ({ page }) => {
  await page.goto('/post-training/');
  const meta = page.locator('.hero .module-meta');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 19 · Post-training');
  await expect(meta.locator('.level')).toHaveText('Advanced');
  for (const id of ['fine-tuning', 'evals'])
    await expect(meta.getByRole('link', { name: moduleOf(id).title, exact: true })).toHaveAttribute('href', `/${id}/`);
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('.versus .reply')).toHaveCount(2);
  await axe(page);
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(ptWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in post-training-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'evals-progress-v1': JSON.stringify({ done: ['01-it-worked-when-i-tried-it'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(ptWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['post-training-progress-v1']).done).toEqual(CHS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('post-training');
});

test('chapter 1: the fine-tuned Larkspur mini signs off live, and the chapter links to Fine-tuning', async ({
  page,
}) => {
  const w = ptWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  const c = card(page);
  await expect(c).toContainText('AS YOU PREDICTED');
  await expect(c).toContainText('Larkspur team');
  await expect(c.getByRole('link', { name: 'Fine-tuning' })).toHaveAttribute('href', '/fine-tuning/');
});

test('the picks made in chapter 2 change chapter 3’s result', async ({ page }) => {
  const favourite = async (picks: string[]) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    const w = ptWalker(page, 'mouse');
    await w.open(CH2);
    await w.ch2(at(CH3), picks);
    await card(page).getByRole('button', { name: 'Train on your picks' }).click();
    await expect(card(page)).toContainText('Trained on your picks from chapter 2');
    return card(page).locator('[data-favourite]').getAttribute('data-favourite');
  };
  const a = await favourite(['A', 'B', 'A']),
    b = await favourite(['B', 'C', 'D']);
  expect(a).toBe('A');
  expect(b).not.toBe(a);
});

test('chapter 3 without chapter 2 trains on the team’s picks and says so', async ({ page }) => {
  const w = ptWalker(page, 'mouse');
  await w.open(CH3);
  await card(page).getByRole('button', { name: 'Train on your picks' }).click();
  await expect(card(page)).toContainText('these are the team’s picks');
});

test('chapter 6: the weak grader is gamed; the key-fact grader picks the right answer; the bars read by keyboard', async ({
  page,
}) => {
  const w = ptWalker(page, 'mouse');
  await w.open(CH6);
  const c = card(page);
  await c.getByRole('radio', { name: /^B, the right/ }).click();
  await c.getByRole('button', { name: /^Run \d+ rounds$/ }).click();
  await expect(c.locator('[data-winner]').first()).toHaveAttribute('data-winner', 'E');
  await expect(c).toContainText('NOT WHAT YOU PREDICTED');
  await page.getByRole('button', { name: 'Bars' }).click();
  const marks = page.locator('.pt-mark');
  await expect(marks).toHaveCount(5);
  await marks.first().focus();
  await page.keyboard.press('End');
  await expect(page.locator('.ft-readout')).toHaveText(
    /^Answer E: 10% before, \d+% after, reward 2 \(games the grader\)$/,
  );
  await axe(page);
  await c.getByRole('button', { name: 'Use the key-fact grader' }).click();
  await expect(c.locator('[data-winner]').last()).toHaveAttribute('data-winner', 'B');
});

test('chapter 7: the weak grader is not accepted; Show me applies one of the rule sets that work', async ({ page }) => {
  const w = ptWalker(page, 'mouse');
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
  await page.goto('/post-training/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 19 · Recap');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/post-training/', ...CHS.map(id => `/post-training/${id}/`), '/post-training/recap/']) {
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
