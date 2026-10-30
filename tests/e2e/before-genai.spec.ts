// Before GenAI: the intro, chapters 1–8 played by mouse and by keyboard only (the keyword puzzle refuses a losing word
// first), its own progress key, "I'm not sure", Larkspur mini failing to load once and Retry, each go-deeper link,
// chapters 7–8 in the unrecorded state too, the RAG hand-off and home's Continue after it, reduced motion, the recap, axe
// and phone width.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { bgWalker } from './before-genai-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('before-genai');
const CHS = M.chapters.map(c => c.id),
  [CH1, CH2, CH3, CH4, CH5, CH6, CH7, CH8] = CHS;
const PLAYED = CHS;
const at = (id: string) => new RegExp(`/before-genai/${id}/$`);
async function walkAll(w: ReturnType<typeof bgWalker>) {
  await w.open(CH1);
  await w.ch1(at(CH2));
  await w.ch2(at(CH3));
  await w.ch3(at(CH4));
  await w.ch4(at(CH5));
  await w.ch5(at(CH6));
  await w.ch6(at(CH7));
  await w.ch7(at(CH8));
  await w.ch8(/\/before-genai\/recap\/$/);
}
const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
// let the stage's fade finish first: axe can catch a figure mid-fade and report false contrast failures
const axe = async (page: Page) => {
  await page.waitForTimeout(400);
  expect(await serious(page)).toEqual([]);
};
test.setTimeout(180_000);

test('the intro shows the level and the chapters', async ({ page }) => {
  await page.goto('/before-genai/');
  await expect(page.locator('.hero .module-meta .level')).toHaveText(M.level);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await axe(page);
});

test('chapters 1–8 play by mouse, in order through the Next links, with axe clean at each check', async ({ page }) => {
  await walkAll(bgWalker(page, 'mouse', axe));
});

test('chapters 1–8 play by keyboard only; progress lands in before-genai-progress-v1', async ({ page }) => {
  await walkAll(bgWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['before-genai-progress-v1']).done).toEqual(PLAYED);
});

test('“I’m not sure” on the checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = bgWalker(page, 'mouse');
  await w.open(CH3);
  await w.ch3(undefined, 'I’m not sure');
  await expect(card(page)).toContainText('Chapter complete');
});

test('chapter 4: Larkspur mini fails to load once, Retry recovers it, and the chapter plays on', async ({ page }) => {
  let fail = true;
  await page.route('**/data/lm/model.bin', r => (fail ? r.abort() : r.continue()));
  const w = bgWalker(page, 'mouse');
  await w.open(CH4);
  await card(page).getByRole('radio', { name: '“days”' }).click();
  const retry = card(page).getByRole('button', { name: 'Retry' });
  await expect(retry).toBeVisible({ timeout: 15_000 });
  await expect(card(page).getByRole('alert')).toContainText('Couldn’t load Larkspur mini');
  fail = false;
  await retry.click();
  await card(page).getByRole('button', { name: 'Run Larkspur mini', exact: true }).click();
  await expect(card(page)).toContainText('Step 3 of');
  await card(page)
    .getByRole('radio', { name: /^It adds its guess/ })
    .click();
  await expect(card(page)).toContainText('Chapter complete');
});

test('chapter 4’s go-deeper link opens Transformers chapter 1', async ({ page }) => {
  const w = bgWalker(page, 'mouse');
  await w.open(CH4);
  await w.ch4();
  const ch = moduleOf('transformers').chapters[0];
  await card(page).getByRole('link', { name: ch.title }).click();
  await expect(page).toHaveURL(new RegExp(`/transformers/${ch.id}/$`));
});

test('chapter 8 hands the reader to RAG’s intro, and home’s Continue points there', async ({ page }) => {
  await walkAll(bgWalker(page, 'mouse'));
  await page.goto(`/before-genai/${CH8}/`);
  await card(page)
    .getByRole('link', { name: moduleOf('rag').title })
    .click();
  await expect(page).toHaveURL(/\/rag\/$/);
  await page.goto('/');
  await expect(page.locator('[data-continue]')).toHaveAttribute('href', '/rag/');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('chapters 1–8 play through', async ({ page }) => {
    await walkAll(bgWalker(page, 'mouse'));
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  await walkAll(bgWalker(page, 'mouse'));
  await page.goto('/before-genai/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and chapters 1–8 play through there with axe clean', async ({ page }) => {
    for (const p of ['/before-genai/', ...PLAYED.map(id => `/before-genai/${id}/`), '/before-genai/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      bgWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
