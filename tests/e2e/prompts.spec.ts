// Writing a prompt: the intro, every chapter played by mouse and by keyboard only, its own progress key, the card tray
// (a closed card says why and does nothing; one polite read-out), the simulated label in chapter 5, the workbench's
// winning and losing prompts, "I'm not sure", reduced motion, the recap, axe and phone width (cards ≥ 44 px);
// the go-live checks: share images, home’s card.
import { test, expect, type Page } from '@playwright/test';
import { MODULES, moduleOf } from '../../src/lib/modules';
import { prWalker } from './prompts-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('prompts');
const NUMBER = MODULES.filter(m => m.status === 'live').findIndex(m => m.id === M.id) + 1;
const CHS = M.chapters.map(c => c.id),
  [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = CHS;
const at = (id: string) => new RegExp(`/prompts/${id}/$`);
async function walkAll(w: ReturnType<typeof prWalker>) {
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
// let a clipped card finish sliding first: axe can catch a strip mid-fade and report false contrast failures
const axe = async (page: Page) => {
  await page.waitForTimeout(500);
  expect(await serious(page)).toEqual([]);
};
test.setTimeout(240_000);

test('the intro shows the level, the chapters and the recorded note', async ({ page }) => {
  await page.goto('/prompts/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Writing a prompt`);
  await expect(page.locator('.hero .module-meta .level')).toHaveText('Beginner');
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('.band .note')).toContainText('Replies recorded from nvidia/nemotron-3-ultra-550b-a55b');
  await axe(page);
});

test('the recap names the module number', async ({ page }) => {
  await page.goto('/prompts/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Recap`);
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/prompts/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/prompts\.jpg$/);
  await page.goto(`/prompts/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/prompts-${CH1}\\.jpg$`),
  );
  await page.goto('/prompts/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/prompts-recap\.jpg$/);
  expect((await page.request.get('/og/prompts.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="prompts"] h4 a')).toHaveAttribute('href', '/prompts/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(prWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in prompts-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'evals-progress-v1': JSON.stringify({ done: ['01-it-worked-when-i-tried-it'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(prWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['prompts-progress-v1']).done).toEqual(CHS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('prompts');
});

test('a closed card says why and does nothing; one read-out names the grade', async ({ page }) => {
  const w = prWalker(page, 'mouse');
  await w.open(CH2);
  await expect(page.locator('.pr-stage [role="status"]')).toHaveCount(1);
  // the tray stays closed until the reader predicts
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await expect(page.locator('.pr-tray')).toHaveCount(0);
  await card(page)
    .getByRole('radio', { name: /^Clear task/ })
    .first()
    .click();
  const json = page.locator('button[data-card="json"]');
  await expect(json).toHaveAttribute('aria-disabled', 'true');
  await expect(json).toContainText('Opens in chapter 4.');
  await json.press('Enter'); // not click(): Playwright waits on an aria-disabled button
  await expect(json).toHaveAttribute('aria-pressed', 'false');
  await w.clip('clear');
  await expect(page.locator('.pr-said')).toContainText('Clipped Clear task.');
  await expect(page.locator('.pr-said')).toContainText('key fact in');
});

test('chapter 5 says its replies are simulated', async ({ page }) => {
  const w = prWalker(page, 'mouse');
  await w.open(CH5);
  await expect(page.locator('.tc-caption')).toContainText('Simulated (');
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await expect(page.locator('.pr-by').first()).toHaveText(/^Simulated \(/);
});

test('chapter 7: the start and a longer prompt that passes every ticket lose; trimming it wins', async ({ page }) => {
  const w = prWalker(page, 'mouse');
  await w.open(CH7);
  const c = card(page),
    score = c.locator('[data-best]');
  await expect(score).toHaveAttribute('data-best', '0');
  await expect(score).toHaveAttribute('data-all', '0');
  await w.clip('clear');
  await w.clip('two-examples');
  await w.clip('json');
  await expect(score).toHaveAttribute('data-all', '1');
  await expect(score).toHaveAttribute('data-best', '0');
  await expect(c).toContainText('Step 1 of');
  await w.clip('two-examples');
  await expect(c).toContainText('Step 2 of');
  await expect(score).toHaveAttribute('data-best', '1');
});

test('chapter 7: Show me applies a winner', async ({ page }) => {
  const w = prWalker(page, 'mouse');
  await w.open(CH7);
  await card(page).getByRole('button', { name: 'Show me' }).click();
  await expect(card(page)).toContainText('Step 2 of');
  await expect(card(page).locator('[data-best]')).toHaveAttribute('data-best', '1');
});

test('“I’m not sure” on the checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = prWalker(page, 'mouse');
  await w.open(CH6);
  await w.ch6(undefined, 'I’m not sure');
  await expect(card(page)).toContainText('Chapter complete');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('a clipped card is simply there, and every chapter plays through', async ({ page }) => {
    const w = prWalker(page, 'mouse');
    await w.open(CH3);
    await w.clip('one-example');
    await expect(page.locator('.pr-board [data-slot="examples"]').first()).toBeVisible();
    expect(await page.locator('.pr-board .dk-slide').count()).toBe(0);
    // walk from a clean slate: the saved run would reopen chapter 3 on its Predict step
    await page.evaluate(() => localStorage.clear());
    await walkAll(w);
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  await walkAll(prWalker(page, 'mouse'));
  await page.goto('/prompts/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('the cards are at least 44 px tall', async ({ page }) => {
    const w = prWalker(page, 'mouse');
    await w.open(CH7);
    for (const b of await page.locator('.pr-card').all())
      expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/prompts/', ...CHS.map(id => `/prompts/${id}/`), '/prompts/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      prWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
