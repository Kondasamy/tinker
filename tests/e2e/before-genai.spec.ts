// Before GenAI: the intro, chapters 1–3 played by mouse and by keyboard only (the keyword puzzle refuses a losing word
// first), its own progress key, "I'm not sure", reduced motion, the recap, axe and phone width.
// Chapters 4–8 join `walkAll` as they are written.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { bgWalker } from './before-genai-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('before-genai');
const CHS = M.chapters.map(c => c.id),
  [CH1, CH2, CH3] = CHS;
const PLAYED = [CH1, CH2, CH3];
const at = (id: string) => new RegExp(`/before-genai/${id}/$`);
async function walkAll(w: ReturnType<typeof bgWalker>) {
  await w.open(CH1);
  await w.ch1(at(CH2));
  await w.ch2(at(CH3));
  await w.ch3(); // chapter 4's page comes with U5
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

test('chapters 1–3 play by mouse, in order through the Next links, with axe clean at each check', async ({ page }) => {
  await walkAll(bgWalker(page, 'mouse', axe));
});

test('chapters 1–3 play by keyboard only; progress lands in before-genai-progress-v1', async ({ page }) => {
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

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('chapters 1–3 play through', async ({ page }) => {
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
  test('pages fit 390px wide, and chapters 1–3 play through there with axe clean', async ({ page }) => {
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
