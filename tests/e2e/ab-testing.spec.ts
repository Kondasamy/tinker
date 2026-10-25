// A/B testing: the intro, every chapter played by mouse and by keyboard only, its own progress key, chapter 4's peek
// declaring a win the full run does not keep, the result chart read with the arrow keys, "I'm not sure", reduced
// motion, the recap, axe and phone width; the go-live checks: Module 24 kickers and share images, home's card.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { END, PEEK, abWalker } from './ab-testing-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('ab-testing');
const IDS = M.chapters.map(c => c.id);
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = IDS;
const at = (id: string) => new RegExp(`/ab-testing/${id}/$`);
async function walkAll(w: ReturnType<typeof abWalker>) {
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
test.setTimeout(180_000);

test('the intro shows the level, the author, the chapters and the Colorfigures credit', async ({ page }) => {
  await page.goto('/ab-testing/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Beginner');
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Colorfigures' })).toHaveAttribute(
    'href',
    'https://april-zhu.com/colorfigures',
  );
  await page.getByRole('button', { name: 'Words' }).click();
  await expect(page.locator('.band .note.more')).toBeVisible();
  await axe(page);
});

test('Module 24 on the intro and the recap', async ({ page }) => {
  await page.goto('/ab-testing/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 24 · A/B testing');
  await page.goto('/ab-testing/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 24 · Recap');
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/ab-testing/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/ab-testing\.jpg$/);
  await page.goto(`/ab-testing/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/ab-testing-${CH1}\\.jpg$`),
  );
  await page.goto('/ab-testing/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/ab-testing-recap\.jpg$/);
  expect((await page.request.get('/og/ab-testing.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="ab-testing"] h4 a')).toHaveAttribute('href', '/ab-testing/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(abWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in ab-testing-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(abWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['ab-testing-progress-v1']).done).toEqual(IDS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('ab-testing');
});

test('chapter 4: the peek declares a win that the full run does not keep', async ({ page }) => {
  const w = abWalker(page, 'mouse');
  await w.open(CH4);
  const c = card(page),
    board = page.locator('[data-prop="scoreboard"]');
  await c.getByRole('slider', { name: /^Day:/ }).fill(String(PEEK.t));
  await expect(board).toHaveAttribute('data-tone', 'win');
  await expect(page.locator('.tc-caption')).toContainText('a significant lead');
  await c.getByRole('radio', { name: /^No winner/ }).click();
  await c.getByRole('slider', { name: /^Day:/ }).fill(String(END));
  await expect(board).toHaveAttribute('data-tone', 'none');
  await expect(c).toContainText('Step 4 of');
  await axe(page);
});

test('“I’m not sure” on a checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = abWalker(page, 'mouse');
  await w.open(CH1);
  const c = card(page);
  await c.getByRole('button', { name: 'Run day 1' }).click();
  await c.getByRole('radio').first().click();
  await c.getByRole('button', { name: /^Run all/ }).click();
  await c.getByRole('button', { name: 'Open the Result tab' }).click();
  await c.getByRole('radio', { name: 'I’m not sure' }).click();
  await expect(c).toContainText('Chapter complete');
  await expect(c.locator('.stamp.wrong')).toHaveCount(0);
});

test('the result chart reads each day with the arrow keys', async ({ page }) => {
  const w = abWalker(page, 'mouse');
  await w.open(CH7);
  await page.getByRole('button', { name: 'Result', exact: true }).click();
  const days = page.getByRole('list', { name: /^Result chart/ });
  await days.locator('[role="listitem"]').first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.ab-readout')).toContainText(/^Day 2: B − A in buying = [+−]\d\.\d points; interval/);
  await page.keyboard.press('End');
  await expect(page.locator('.ab-readout')).toContainText(/^Day 14:/);
  await axe(page);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the picture holds still and the chapters still play through', async ({ page }) => {
    const w = abWalker(page, 'mouse', async p => {
      await expect
        .poll(() =>
          p.evaluate(
            () =>
              document
                .querySelector('.stage')!
                .getAnimations({ subtree: true })
                .filter(a => a.playState === 'running').length,
          ),
        )
        .toBe(0);
    });
    await walkAll(w);
  });
});

test('the recap asks from the finished chapter; with none done it says so', async ({ page }) => {
  const w = abWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/ab-testing/recap/');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('ab-testing-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/ab-testing/', ...IDS.map(id => `/ab-testing/${id}/`), '/ab-testing/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      abWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
