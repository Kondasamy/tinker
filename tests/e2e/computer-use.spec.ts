// Computer use: the intro, every chapter played by mouse and by keyboard only, its own progress key, click-to-predict on
// the Screen view (a keyboard pick locks like a mouse pick), chapter 2's wrong button on both the picture and the screen,
// the workbench's best policy, "I'm not sure", reduced motion, the recap, axe and phone width; the go-live checks:
// Module 31 kickers and share images, home's card.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { cuWalker } from './computer-use-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('computer-use');
const CHS = M.chapters.map(c => c.id),
  [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = CHS;
const at = (id: string) => new RegExp(`/computer-use/${id}/$`);
async function walkAll(w: ReturnType<typeof cuWalker>) {
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
// let the stage's fade finish first: axe can catch a figure mid-fade and report false contrast failures
const axe = async (page: Page) => {
  await page.waitForTimeout(400);
  expect(await serious(page)).toEqual([]);
};
test.setTimeout(240_000);

test('the intro shows the level, the prerequisites, the author, the chapters and the Colorfigures credit', async ({
  page,
}) => {
  await page.goto('/computer-use/');
  const meta = page.locator('.hero .module-meta');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 31 · Computer use');
  await expect(meta.locator('.level')).toHaveText('Advanced');
  for (const id of M.prereqs)
    await expect(meta.getByRole('link', { name: moduleOf(id).title, exact: true })).toHaveAttribute('href', `/${id}/`);
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Colorfigures' })).toBeVisible();
  await expect(page.locator('.versus .reply')).toHaveCount(2);
  await axe(page);
});

test('Module 31 on the recap', async ({ page }) => {
  await page.goto('/computer-use/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 31 · Recap');
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/computer-use/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/computer-use\.jpg$/);
  await page.goto(`/computer-use/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/computer-use-${CH1}\\.jpg$`),
  );
  await page.goto('/computer-use/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/computer-use-recap\.jpg$/);
  expect((await page.request.get('/og/computer-use.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="computer-use"] h4 a')).toHaveAttribute('href', '/computer-use/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(cuWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in computer-use-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'agents-progress-v1': JSON.stringify({ done: ['01-the-loop'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(cuWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['computer-use-progress-v1']).done).toEqual(CHS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('computer-use');
});

test('chapter 1: a keyboard prediction locks, and stays beside what the agent clicked', async ({ page }) => {
  const w = cuWalker(page, 'keyboard');
  await w.open(CH1);
  await w.predict('tile-orders');
  // the other targets are locked once a pick is made
  await expect(page.locator('.cu-target[data-target="tile-signout"]')).toBeDisabled();
  await card(page)
    .getByRole('button', { name: /^Carry out the click/ })
    .press('Enter');
  await expect(card(page).locator('.feedback')).toContainText('AS YOU PREDICTED');
  await expect(card(page).locator('.feedback')).toContainText('You predicted: Past orders');
});

test('chapter 2: the wrong button shows on the picture and on the Screen view', async ({ page }) => {
  const w = cuWalker(page, 'mouse');
  await w.open(CH2);
  await w.predict('tile-signout');
  await card(page)
    .getByRole('button', { name: /^Carry out the click/ })
    .click();
  await page.getByRole('button', { name: 'Picture' }).click();
  await expect(page.locator('[data-outcome]')).toHaveAttribute('data-outcome', 'ok');
  await expect(page.locator('.tc-caption')).toContainText('It lands on Sign out');
  await page.getByRole('button', { name: 'Screen' }).click();
  await expect(page.locator('.cu-hit')).toBeVisible();
  await expect(page.locator('.cu-aim')).toBeVisible();
  await expect(page.locator('.cu-readout')).toContainText('host clicked');
  await axe(page);
});

test('chapter 7: the start policy is not accepted; Show me applies one of the best', async ({ page }) => {
  const w = cuWalker(page, 'mouse');
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
  const w = cuWalker(page, 'mouse');
  await w.open(CH6);
  await w.ch6(undefined, 'I’m not sure');
  await expect(card(page)).toContainText('Chapter complete');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('every chapter plays through', async ({ page }) => {
    await walkAll(cuWalker(page, 'mouse'));
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  await walkAll(cuWalker(page, 'mouse'));
  await page.goto('/computer-use/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/computer-use/', ...CHS.map(id => `/computer-use/${id}/`), '/computer-use/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      cuWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
  test('prediction targets are at least 44 px and the Reorder links merge', async ({ page }) => {
    const w = cuWalker(page, 'mouse');
    await w.open(CH3);
    const t = page.locator('.cu-target');
    for (const b of await t.all()) {
      const box = (await b.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await expect(t).toHaveCount(1);
  });
});
