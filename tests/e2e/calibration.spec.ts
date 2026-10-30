// Calibration: the intro, every chapter played by mouse and by keyboard only, its own progress key, the diagram read by
// arrow keys, a weights fetch that fails and recovers with Retry, the held-out measurement offline once the weights are
// in, the page answering while it measures, the workbench's best plans, "I'm not sure", reduced motion, the recap, axe
// and phone width; the go-live checks: its module number, share images, home's card and the finder.
import { test, expect, type Page } from '@playwright/test';
import { MODULES, moduleOf } from '../../src/lib/modules';
import { cbWalker } from './calibration-flow';
import { serious, layoutHolds, offline, PHONE } from './helpers';

const M = moduleOf('calibration');
const N = MODULES.filter(m => m.status === 'live').indexOf(M);
const CHS = M.chapters.map(c => c.id),
  [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = CHS;
const at = (id: string) => new RegExp(`/calibration/${id}/$`);
async function walkAll(w: ReturnType<typeof cbWalker>) {
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

test('the intro shows the level and the chapters', async ({ page }) => {
  await page.goto('/calibration/');
  const meta = page.locator('.hero .module-meta');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${N} · Calibration`);
  await expect(meta.locator('.level')).toHaveText('Intermediate');
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('.versus .reply')).toHaveCount(2);
  await axe(page);
});

test(`Module ${N} on the recap`, async ({ page }) => {
  await page.goto('/calibration/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${N} · Recap`);
});

test('go-live: own share images, home’s card, and the finder finds it by a topic', async ({ page }) => {
  await page.goto('/calibration/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/calibration\.jpg$/);
  await page.goto(`/calibration/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/calibration-${CH1}\\.jpg$`),
  );
  await page.goto('/calibration/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/calibration-recap\.jpg$/);
  expect((await page.request.get('/og/calibration.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="calibration"] h4 a')).toHaveAttribute('href', '/calibration/');
  await page.fill('[name="q"]', 'temperature scaling');
  await expect(page.locator('.module[data-module="calibration"]')).toBeVisible();
  await expect(page.locator('.module[data-module="calibration"] [data-hit]')).toContainText('Temperature scaling');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(cbWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in calibration-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'evals-progress-v1': JSON.stringify({ done: ['01-it-worked-when-i-tried-it'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(cbWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['calibration-progress-v1']).done).toEqual(CHS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('calibration');
});

test('chapter 2: the reliability diagram’s arrow keys read each jar', async ({ page }) => {
  const w = cbWalker(page, 'keyboard');
  await w.open(CH2);
  await w.ch2();
  const marks = page.locator('.cb-mark'),
    out = page.locator('.cb-readout');
  await expect(marks).toHaveCount(10);
  await expect(out).toContainText(/^Stated \d+% \(90% to 100%\)/);
  await marks.last().focus();
  await page.keyboard.press('Home');
  await expect(out).toContainText(/^Stated \d+% \(0% to 10%\)/);
  await page.keyboard.press('ArrowRight');
  await expect(marks.nth(1)).toBeFocused();
  await expect(out).toContainText(/\(10% to 20%\)/);
  await axe(page);
});

test('a weights fetch that fails shows Retry, and Retry recovers it', async ({ page }) => {
  let fail = true;
  await page.route('**/data/lm/model.bin', r => (fail ? r.abort() : r.continue()));
  await page.goto(`/calibration/${CH2}/`);
  await page.locator('astro-island:not([ssr])').waitFor();
  const c = card(page);
  await c.getByRole('radio', { name: /^About nine times/ }).click();
  await c.getByRole('button', { name: 'Measure on held-out text' }).click();
  const stage = page.locator('.cb-stage');
  await expect(stage.locator('.cb-wait[data-state="failed"]')).toBeVisible({ timeout: 15_000 });
  await axe(page);
  fail = false;
  await stage.getByRole('button', { name: 'Retry' }).click();
  await expect(c).toContainText('Step 3 of', { timeout: 30_000 });
});

test('chapter 3: both weight sets load with the page, then the measurement runs offline', async ({ page }) => {
  const w = cbWalker(page, 'mouse');
  await w.open(CH3);
  await page.waitForLoadState('networkidle');
  await offline(page);
  await w.ch3();
  await expect(card(page).locator('[data-compare] tbody tr')).toHaveCount(2);
});

test('the page keeps answering while Larkspur mini reads the held-out text: no long main-thread task', async ({
  page,
}) => {
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
  const w = cbWalker(page, 'mouse');
  await w.open(CH2);
  await page.waitForLoadState('networkidle');
  const c = card(page);
  await c.getByRole('radio', { name: /^About nine times/ }).click();
  await page.evaluate(() => {
    (window as unknown as { longest: number }).longest = 0;
  });
  await c.getByRole('button', { name: 'Measure on held-out text' }).click();
  await expect(c).toContainText('Step 3 of', { timeout: 30_000 });
  const longest = await page.evaluate(() => (window as unknown as { longest: number }).longest);
  expect(longest).toBeLessThan(150);
});

test('chapter 7: the starting plan is not accepted; Show me applies one of the best plans', async ({ page }) => {
  const w = cbWalker(page, 'mouse');
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
  const w = cbWalker(page, 'mouse');
  await w.open(CH6);
  await w.ch6(undefined, 'I’m not sure');
  await expect(card(page)).toContainText('Chapter complete');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the marbles show settled at once', async ({ page }) => {
    await cbWalker(page, 'mouse').open(CH1);
    const c = card(page);
    await c.getByRole('radio', { name: /^Well under/ }).click();
    await c.getByRole('button', { name: 'Drop the marbles' }).click();
    const marble = page.locator('.booth .jm').first();
    await expect(marble).toBeAttached();
    expect(await marble.evaluate(e => getComputedStyle(e).animationName)).toBe('none');
  });
  test('every chapter plays through', async ({ page }) => {
    await walkAll(cbWalker(page, 'mouse'));
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  await walkAll(cbWalker(page, 'mouse'));
  await page.goto('/calibration/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/calibration/', ...CHS.map(id => `/calibration/${id}/`), '/calibration/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      cbWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
