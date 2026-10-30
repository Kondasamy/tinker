// Bias and fairness: the intro, every chapter played by mouse and by keyboard only, its own progress key, the bar
// ranges (linked in chapters 1–4, split from 5, one read-out), the workbench's winning and losing settings, "I'm not
// sure", reduced motion, the recap, axe and phone width (ranges ≥ 44 px);
// the go-live checks: share images, home’s card.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf, moduleNumber } from '../../src/lib/modules';
import { REGION_NAMES } from '../../src/lib/fairness/story';
import { BENCH_BARS } from '../../src/lib/fairness/workbench';
import { frWalker } from './fairness-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('fairness');
const NUMBER = moduleNumber(M);
const CHS = M.chapters.map(c => c.id),
  [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = CHS;
const at = (id: string) => new RegExp(`/fairness/${id}/$`);
async function walkAll(w: ReturnType<typeof frWalker>) {
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
const slider = (page: Page, r: 'A' | 'B') => page.getByRole('slider', { name: `${REGION_NAMES[r]} bar` });
// let the stage's walk-through finish first: axe can catch a figure mid-fade and report false contrast failures
const axe = async (page: Page) => {
  await page.waitForTimeout(400);
  expect(await serious(page)).toEqual([]);
};
test.setTimeout(240_000);

test('the intro shows the level, the chapters and the hand-made note', async ({ page }) => {
  await page.goto('/fairness/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Bias and fairness`);
  await expect(page.locator('.hero .module-meta .level')).toHaveText('Intermediate');
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('.band .note')).toContainText('Made-up applicants');
  await axe(page);
});

test('the recap names the module number', async ({ page }) => {
  await page.goto('/fairness/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Recap`);
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/fairness/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/fairness\.jpg$/);
  await page.goto(`/fairness/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/fairness-${CH1}\\.jpg$`),
  );
  await page.goto('/fairness/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/fairness-recap\.jpg$/);
  expect((await page.request.get('/og/fairness.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="fairness"] h4 a')).toHaveAttribute('href', '/fairness/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(frWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in fairness-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'calibration-progress-v1': JSON.stringify({ done: ['01-what-70-should-mean'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(frWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['fairness-progress-v1']).done).toEqual(CHS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('fairness');
});

test('chapters 1–4 link the bars; from chapter 5 they move apart; one read-out says the new split', async ({
  page,
}) => {
  const w = frWalker(page, 'mouse');
  await w.open(CH2);
  await expect(page.locator('.fr-stage [role="status"]')).toHaveCount(1);
  await slider(page, 'A').fill('10');
  await expect(slider(page, 'B')).toHaveValue('10');
  await expect(page.locator('.fr-said')).toContainText(`${REGION_NAMES.B} at 0.30`);
  await w.open(CH5);
  await slider(page, 'B').fill('10');
  await expect(slider(page, 'A')).toHaveValue('30');
  await expect(page.locator('.fr-said')).toContainText(`${REGION_NAMES.A} at 0.50`);
});

test('chapter 7: the start and a rule-breaking setting are not accepted; Show me applies a winner', async ({
  page,
}) => {
  const w = frWalker(page, 'mouse');
  await w.open(CH7);
  const c = card(page),
    score = c.locator('[data-best]');
  await expect(score).toHaveAttribute('data-best', '0');
  // every field, no fix, one high bar for both: the gap breaks the rule
  await w.bar('A', 0.7, BENCH_BARS);
  await w.bar('B', 0.7, BENCH_BARS);
  await expect(score).toHaveAttribute('data-ok', '0');
  await expect(c).toContainText('Step 1 of');
  await c.getByRole('button', { name: 'Show me' }).click();
  await expect(c).toContainText('Step 2 of');
  await expect(score).toHaveAttribute('data-best', '1');
});

test('“I’m not sure” on the checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = frWalker(page, 'mouse');
  await w.open(CH6);
  await w.ch6(undefined, 'I’m not sure');
  await expect(card(page)).toContainText('Chapter complete');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the final split shows at once, and every chapter plays through', async ({ page }) => {
    const w = frWalker(page, 'mouse');
    await w.open(CH1);
    await expect(page.locator('.fr-gate')).toBeVisible();
    // no walk-through: nobody is left in the queue the moment the stage opens
    expect(await page.locator('.fr-gate .applicant[data-past="0"]').count()).toBe(0);
    await walkAll(w);
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  await walkAll(frWalker(page, 'mouse'));
  await page.goto('/fairness/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('the bar ranges are at least 44 px tall', async ({ page }) => {
    const w = frWalker(page, 'mouse');
    await w.open(CH5);
    for (const r of ['A', 'B'] as const)
      expect((await slider(page, r).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/fairness/', ...CHS.map(id => `/fairness/${id}/`), '/fairness/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      frWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
