// Diffusion models: the intro, every chapter played by mouse and by keyboard only, its own progress key, the strip read
// by arrow keys, chapter 4's copies against new dots, the page staying responsive while dots develop, the workbench's
// best plans, "I'm not sure", reduced motion, the recap, axe and phone width; the go-live checks: Module 25 kickers and
// share images, home's card.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { dfWalker } from './diffusion-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('diffusion');
const CHS = M.chapters.map(c => c.id),
  [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = CHS;
const at = (id: string) => new RegExp(`/diffusion/${id}/$`);
async function walkAll(w: ReturnType<typeof dfWalker>) {
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

test('the intro shows the level, the prerequisite, the author, the chapters and the Colorfigures credit', async ({
  page,
}) => {
  await page.goto('/diffusion/');
  const meta = page.locator('.hero .module-meta');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 25 · Diffusion');
  await expect(meta.locator('.level')).toHaveText('Intermediate');
  await expect(meta.getByRole('link', { name: moduleOf('multimodal').title, exact: true })).toHaveAttribute(
    'href',
    '/multimodal/',
  );
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Colorfigures' })).toBeVisible();
  await expect(page.locator('.versus .reply')).toHaveCount(2);
  await axe(page);
});

test('Module 25 on the recap', async ({ page }) => {
  await page.goto('/diffusion/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 25 · Recap');
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/diffusion/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/diffusion\.jpg$/);
  await page.goto(`/diffusion/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/diffusion-${CH1}\\.jpg$`),
  );
  await page.goto('/diffusion/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/diffusion-recap\.jpg$/);
  expect((await page.request.get('/og/diffusion.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="diffusion"] h4 a')).toHaveAttribute('href', '/diffusion/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(dfWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in diffusion-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'multimodal-progress-v1': JSON.stringify({ done: ['01-a-picture-is-tokens'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(dfWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['diffusion-progress-v1']).done).toEqual(CHS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('diffusion');
});

test('chapter 1: the strip’s arrow keys read each step, noise to picture', async ({ page }) => {
  const w = dfWalker(page, 'keyboard');
  await w.open(CH1);
  await w.ch1();
  await page.getByRole('button', { name: 'Strip' }).click();
  const marks = page.locator('.df-mark'),
    out = page.locator('.df-readout');
  await expect(marks).toHaveCount(6);
  await expect(out).toContainText(/^Step 50 of 50: nearest hinge/);
  await marks.last().focus();
  await page.keyboard.press('Home');
  await expect(out).toContainText(/^Pure noise/);
  await page.keyboard.press('ArrowRight');
  await expect(out).toContainText(/^Step 10 of 50/);
  await expect(marks.nth(1)).toBeFocused();
  await axe(page);
});

test('chapter 4: the ideal denoiser’s dots sit on its training points; the learned one’s fall between them', async ({
  page,
}) => {
  const w = dfWalker(page, 'mouse');
  await w.open(CH4);
  const c = card(page);
  await c.getByRole('radio', { name: /^Its \d+ training points/ }).click();
  await c.getByRole('button', { name: 'Run the ideal denoiser' }).click();
  await c.getByRole('button', { name: 'Run the learned denoiser' }).click();
  const ideal = c.locator('tr[data-run="ideal"]'),
    learned = c.locator('tr[data-run="learned"]');
  await expect(learned).toBeVisible({ timeout: 30_000 });
  expect(Number(await ideal.getAttribute('data-rings'))).toBeGreaterThanOrEqual(285);
  expect(Number(await learned.getAttribute('data-rings'))).toBeLessThan(60);
  expect(Number(await learned.getAttribute('data-outline'))).toBeGreaterThanOrEqual(270);
  await expect(page.locator('.tc-caption')).toContainText('The learned denoiser');
});

test('the page keeps answering while the learned dots develop: no long main-thread task', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { longest: number }).longest = 0;
    new PerformanceObserver(list => {
      for (const e of list.getEntries())
        (window as unknown as { longest: number }).longest = Math.max(
          (window as unknown as { longest: number }).longest,
          e.duration,
        );
    }).observe({ type: 'longtask', buffered: false });
  });
  const w = dfWalker(page, 'mouse');
  await w.open(CH3);
  const c = card(page);
  await c.getByRole('radio', { name: /^Which way, and how far/ }).click();
  await page.evaluate(() => {
    (window as unknown as { longest: number }).longest = 0;
  });
  await c.getByRole('button', { name: /^Develop \d+ dots/ }).click();
  // mid-run the reader can still switch tabs and the caption keeps moving
  await expect(page.locator('.tc-caption')).toContainText(/Developing: step \d+ of 50/);
  await expect(c).toContainText('Step 3 of', { timeout: 30_000 });
  const longest = await page.evaluate(() => (window as unknown as { longest: number }).longest);
  // a frame's work is capped at 8 ms; the render on top stays well under a tenth of a second
  expect(longest).toBeLessThan(100);
});

test('chapter 7: the most of everything is not accepted; Show me applies one of the best plans', async ({ page }) => {
  const w = dfWalker(page, 'mouse');
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
  const w = dfWalker(page, 'mouse');
  await w.open(CH6);
  await w.ch6(undefined, 'I’m not sure');
  await expect(card(page)).toContainText('Chapter complete');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the developed picture shows at once', async ({ page }) => {
    await dfWalker(page, 'mouse').open(CH1);
    const c = card(page);
    await c.getByRole('radio', { name: /^All at once/ }).click();
    await c.getByRole('slider', { name: 'Noise' }).fill('5');
    await c.getByRole('button', { name: /^Develop: \d+ steps/ }).click();
    await expect(page.locator('.tc-caption')).toContainText('Developed in 50 steps: nearest hinge', { timeout: 500 });
  });
  test('every chapter plays through', async ({ page }) => {
    await walkAll(dfWalker(page, 'mouse'));
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  await walkAll(dfWalker(page, 'mouse'));
  await page.goto('/diffusion/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/diffusion/', ...CHS.map(id => `/diffusion/${id}/`), '/diffusion/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      dfWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
