// Choosing a model: the intro, every chapter played by mouse and by keyboard only, its own progress key, the poise
// ranges (each moves its own poise; one read-out says where the beam tips), the workbench's losing start and Show me,
// "I'm not sure", reduced motion, the recap, axe and phone width (ranges ≥ 44 px);
// the go-live checks: share images, home's card.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf, moduleNumber } from '../../src/lib/modules';
import { cmWalker } from './choosing-models-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('choosing-models');
const NUMBER = moduleNumber(M);
const CHS = M.chapters.map(c => c.id),
  [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = CHS;
const at = (id: string) => new RegExp(`/choosing-models/${id}/$`);
async function walkAll(w: ReturnType<typeof cmWalker>) {
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
// let the beam's swing finish first
const axe = async (page: Page) => {
  await page.waitForTimeout(400);
  expect(await serious(page)).toEqual([]);
};
test.setTimeout(480_000);

test('the intro shows the level, the chapters and the hand-set note', async ({ page }) => {
  await page.goto('/choosing-models/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Choosing a model`);
  await expect(page.locator('.hero .module-meta .level')).toHaveText('Beginner');
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('.band .note')).toContainText('Hand-set');
  await axe(page);
});

test('the recap names the module number', async ({ page }) => {
  await page.goto('/choosing-models/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Recap`);
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/choosing-models/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/choosing-models\.jpg$/);
  await page.goto(`/choosing-models/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/choosing-models-${CH1}\\.jpg$`),
  );
  expect((await page.request.get('/og/choosing-models.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="choosing-models"] h4 a')).toHaveAttribute(
    'href',
    '/choosing-models/',
  );
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(cmWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in choosing-models-progress-v1 and no other key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'evals-progress-v1': JSON.stringify({ done: ['01-it-worked-when-i-tried-it'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(cmWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['choosing-models-progress-v1']).done).toEqual(CHS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('choosing-models');
});

test('each poise moves alone; the beam tips and one read-out says where', async ({ page }) => {
  const w = cmWalker(page, 'mouse');
  // the workbench: moving Support's poises doesn't finish the step, so the read-out stays
  await w.open(CH7);
  await expect(page.locator('.cm-stage [role="status"]')).toHaveCount(1);
  await expect(page.locator('[data-part="beam"]')).toHaveAttribute('data-winner', 'A');
  await w.poise('cost', 3);
  await expect(page.getByRole('slider', { name: 'Quality' })).toHaveValue('4');
  await expect(page.locator('[data-poise="cost"]')).toHaveAttribute('data-weight', '3');
  await expect(page.locator('[data-part="beam"]')).toHaveAttribute('data-winner', 'C');
  await expect(page.locator('.cm-said')).toContainText('Tips to Machine C');
});

test('chapter 7: the start is not accepted; Show me serves every team', async ({ page }) => {
  const w = cmWalker(page, 'mouse');
  await w.open(CH7);
  const c = card(page),
    score = c.locator('[data-best]');
  await expect(score).toHaveAttribute('data-best', '0');
  await c.getByRole('button', { name: 'Show me' }).click();
  await expect(c).toContainText('Step 2 of');
  await expect(score).toHaveAttribute('data-best', '1');
});

test('“I’m not sure” on the checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = cmWalker(page, 'mouse');
  await w.open(CH6);
  await w.ch6(undefined, 'I’m not sure');
  await expect(card(page)).toContainText('Chapter complete');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the beam shows its final tilt at once, and every chapter plays through', async ({ page }) => {
    const w = cmWalker(page, 'mouse');
    // the workbench, so the poise move leaves no finished step behind for the walk
    await w.open(CH7);
    await w.poise('cost', 4);
    // no swing: the very next frame has the final heading
    await expect(page.locator('[data-part="beam"]')).toHaveAttribute('data-winner', 'C');
    const t = await page.locator('[data-part="beam"]').getAttribute('data-tilt');
    await page.waitForTimeout(600);
    expect(await page.locator('[data-part="beam"]').getAttribute('data-tilt')).toBe(t);
    await walkAll(w);
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  await walkAll(cmWalker(page, 'mouse'));
  await page.goto('/choosing-models/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('the poise ranges are at least 44 px tall', async ({ page }) => {
    const w = cmWalker(page, 'mouse');
    await w.open(CH7);
    for (const n of ['Quality', 'Cost', 'Wait'])
      expect((await page.getByRole('slider', { name: n }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/choosing-models/', ...CHS.map(id => `/choosing-models/${id}/`), '/choosing-models/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      cmWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
