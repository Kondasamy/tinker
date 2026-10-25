// Diffusion language models: the intro, every chapter played by mouse and by keyboard only, its own progress key, the
// fill strip read by arrow keys, chapter 4's reply changing with tokens a pass, a failed weights fetch and Retry,
// playing offline once loaded, the page staying responsive while the frame fills, the workbench's best plans, "I'm not
// sure", reduced motion, the recap, axe and phone width; the go-live checks: kickers, share images, home's card.
import { test, expect, type Page } from '@playwright/test';
import { MODULES, moduleOf } from '../../src/lib/modules';
import { dlWalker } from './diffusion-llms-flow';
import { serious, layoutHolds, offline, PHONE } from './helpers';

const M = moduleOf('diffusion-llms');
const NUM = MODULES.filter(m => m.status === 'live').indexOf(M) + 1;
const CHS = M.chapters.map(c => c.id),
  [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = CHS;
const at = (id: string) => new RegExp(`/diffusion-llms/${id}/$`);
async function walkAll(w: ReturnType<typeof dlWalker>) {
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
  await page.goto('/diffusion-llms/');
  const meta = page.locator('.hero .module-meta');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUM} · Diffusion LMs`);
  await expect(meta.locator('.level')).toHaveText('Advanced');
  for (const id of ['diffusion', 'transformers'])
    await expect(meta.getByRole('link', { name: moduleOf(id).title, exact: true })).toHaveAttribute('href', `/${id}/`);
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Colorfigures' })).toBeVisible();
  await expect(page.locator('.versus .reply')).toHaveCount(2);
  await axe(page);
});

test('the recap’s kicker carries the module number', async ({ page }) => {
  await page.goto('/diffusion-llms/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUM} · Recap`);
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/diffusion-llms/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/diffusion-llms\.jpg$/);
  await page.goto(`/diffusion-llms/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/diffusion-llms-${CH1}\\.jpg$`),
  );
  await page.goto('/diffusion-llms/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /\/og\/diffusion-llms-recap\.jpg$/,
  );
  expect((await page.request.get('/og/diffusion-llms.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="diffusion-llms"] h4 a')).toHaveAttribute('href', '/diffusion-llms/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(dlWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in diffusion-llms-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'diffusion-progress-v1': JSON.stringify({ done: ['01-noise-to-picture'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(dlWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['diffusion-llms-progress-v1']).done).toEqual(CHS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('diffusion-llms');
});

test('chapter 3: the strip’s arrow keys read each slot and each pass', async ({ page }) => {
  const w = dlWalker(page, 'keyboard');
  await w.open(CH3);
  const c = card(page);
  await c.getByRole('radio', { name: /surest guesses/ }).press('Enter');
  await c.getByRole('button', { name: /^Fill it: Random/ }).press('Enter');
  await expect(c).toContainText('Step 3 of', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Strip' }).click();
  const marks = page.locator('.dl-mark'),
    out = page.locator('.dl-readout');
  await expect(marks).toHaveCount(16 * 4);
  await expect(out).toContainText(/^Pass 4, slot 1:/);
  await page.locator('.dl-mark[tabindex="0"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(out).toContainText(/^Pass 4, slot 2:/);
  await page.keyboard.press('ArrowUp');
  await expect(out).toContainText(/^Pass 3, slot 2:/);
  await page.keyboard.press('Home');
  await expect(out).toContainText(/^Pass 3, slot 1:/);
  await axe(page);
});

test('chapter 4: the reply at 16 tokens a pass differs from the one at 1', async ({ page }) => {
  const w = dlWalker(page, 'mouse');
  await w.open(CH4);
  await w.ch4();
  const c = card(page),
    one = await c.locator('tr[data-k="1"]').getAttribute('data-reply'),
    all = await c.locator('tr[data-k="16"]').getAttribute('data-reply');
  expect(one).toBeTruthy();
  expect(all).not.toBe(one);
});

test('a masked model that fails to load shows Retry, and Retry recovers it', async ({ page }) => {
  let failed = false;
  await page.route('**/data/diffusion-llms/mlm.bin', route => {
    if (failed) return route.continue();
    failed = true;
    return route.abort();
  });
  const w = dlWalker(page, 'mouse');
  await w.open(CH3);
  const c = card(page);
  await c.getByRole('radio', { name: /surest guesses/ }).click();
  await c.getByRole('button', { name: /^Fill it: Random/ }).click();
  const retry = page.locator('.tc-frame').getByRole('button', { name: 'Retry' });
  await expect(retry).toBeVisible();
  await retry.click();
  await expect(c).toContainText('Step 3 of', { timeout: 30_000 });
});

test('chapter 5 plays to the end offline once the masked model has loaded', async ({ page }) => {
  const w = dlWalker(page, 'mouse');
  await w.open(CH5);
  await page.waitForFunction(() => performance.getEntriesByType('resource').some(e => e.name.endsWith('/mlm.bin')));
  await page.waitForLoadState('networkidle');
  await offline(page);
  await w.ch5();
});

test('the page keeps answering while the frame fills: no long main-thread task', async ({ page }) => {
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
  const w = dlWalker(page, 'mouse');
  await w.open(CH4);
  await page.waitForLoadState('networkidle');
  const c = card(page);
  await c.getByRole('radio', { name: /^Faster, but/ }).click();
  await page.evaluate(() => {
    (window as unknown as { longest: number }).longest = 0;
  });
  await c.getByRole('button', { name: /^Fill: / }).click();
  await expect(page.locator('.tc-caption')).toContainText(/pass \d+ of 16/);
  await expect(c.locator('tr[data-k="1"]')).toBeVisible({ timeout: 30_000 });
  const longest = await page.evaluate(() => (window as unknown as { longest: number }).longest);
  expect(longest).toBeLessThan(100);
});

test('chapter 7: the vendor’s default is not accepted; Show me applies one of the best plans', async ({ page }) => {
  const w = dlWalker(page, 'mouse');
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
  const w = dlWalker(page, 'mouse');
  await w.open(CH6);
  await w.ch6(undefined, 'I’m not sure');
  await expect(card(page)).toContainText('Chapter complete');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('a fill shows only its end', async ({ page }) => {
    await dlWalker(page, 'mouse').open(CH4);
    await page.waitForLoadState('networkidle');
    const c = card(page);
    await c.getByRole('radio', { name: /^Faster, but/ }).click();
    await c.getByRole('button', { name: /^Fill: / }).click();
    await expect(page.locator('.tc-caption')).toContainText('pass 16 of 16', { timeout: 2_000 });
  });
  test('every chapter plays through', async ({ page }) => {
    await walkAll(dlWalker(page, 'mouse'));
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  await walkAll(dlWalker(page, 'mouse'));
  await page.goto('/diffusion-llms/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/diffusion-llms/', ...CHS.map(id => `/diffusion-llms/${id}/`), '/diffusion-llms/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      dlWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
