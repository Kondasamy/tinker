// Synthetic data: the intro, every chapter played by mouse and by keyboard only (waiting for Larkspur mini to load and
// write), its own progress key, the generation range by keyboard, chapter 6's locked prediction, a failed weights fetch
// and Retry, playing offline once loaded, the page staying responsive while a batch is written, the workbench's
// winners, "I'm not sure", reduced motion (no flip), the recap, axe and phone width.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { sdWalker } from './synthetic-data-flow';
import { serious, layoutHolds, offline, PHONE } from './helpers';

const M = moduleOf('synthetic-data');
const CHS = M.chapters.map(c => c.id),
  [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = CHS;
const at = (id: string) => new RegExp(`/synthetic-data/${id}/$`);
async function walkAll(w: ReturnType<typeof sdWalker>) {
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
  await page.goto('/synthetic-data/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Intermediate');
  await expect(meta.getByRole('link', { name: moduleOf('fine-tuning').title, exact: true })).toHaveAttribute(
    'href',
    '/fine-tuning/',
  );
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Colorfigures' })).toBeVisible();
  await expect(page.locator('.versus .reply')).toHaveCount(2);
  await axe(page);
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(sdWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in synthetic-data-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'fine-tuning-progress-v1': JSON.stringify({ done: ['01-three-levers'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(sdWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['synthetic-data-progress-v1']).done).toEqual(CHS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('synthetic-data');
});

test('chapter 5: the range moves the generation by keyboard, and the stack and read-out follow', async ({ page }) => {
  const w = sdWalker(page, 'keyboard');
  await w.open(CH5);
  await card(page)
    .getByRole('radio', { name: /^Worse each generation/ })
    .press('Space');
  const r = card(page).getByRole('slider', { name: 'Generation' });
  await r.focus();
  await r.press('ArrowRight');
  await r.press('ArrowRight');
  await expect(page.locator('.sd-readout')).toHaveAttribute('data-gen', '2');
  await expect(page.locator('.copier-room [data-lit="1"].copy')).toHaveAttribute('data-gen', '2');
  await axe(page);
});

test('chapter 6: the prediction locks once picked', async ({ page }) => {
  const w = sdWalker(page, 'mouse');
  await w.open(CH6);
  await card(page)
    .getByRole('radio', { name: /^Replace: each generation/ })
    .click();
  await expect(card(page).locator('fieldset[data-pick="replace"]').getByRole('radio').first()).toBeDisabled();
});

test('Larkspur mini failing to load shows Retry, and Retry recovers it', async ({ page }) => {
  let failed = 0;
  await page.route('**/data/lm/model.bin', route => (failed++ ? route.continue() : route.abort()));
  const w = sdWalker(page, 'mouse');
  await w.open(CH3);
  const retry = page.locator('.tc-frame').getByRole('button', { name: 'Retry' });
  await expect(retry).toBeVisible();
  await retry.click();
  await expect(card(page).getByRole('button', { name: /^Write twenty/ })).toBeEnabled({ timeout: 30_000 });
});

test('chapter 4 plays to the end offline once Larkspur mini has loaded', async ({ page }) => {
  const w = sdWalker(page, 'mouse');
  await w.open(CH4);
  await page.waitForFunction(() => performance.getEntriesByType('resource').some(e => e.name.endsWith('/model.bin')));
  await page.waitForLoadState('networkidle');
  await offline(page);
  await w.ch4();
});

test('the page keeps answering while a batch is written: no long main-thread task', async ({ page }) => {
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
  const w = sdWalker(page, 'mouse');
  await w.open(CH3);
  await page.waitForLoadState('networkidle');
  const write = card(page).getByRole('button', { name: /^Write twenty/ });
  await expect(write).toBeEnabled({ timeout: 30_000 });
  await page.evaluate(() => {
    (window as unknown as { longest: number }).longest = 0;
  });
  await write.click();
  await expect(card(page)).toContainText('Step 2 of', { timeout: 30_000 });
  const longest = await page.evaluate(() => (window as unknown as { longest: number }).longest);
  expect(longest).toBeLessThan(100);
});

test('chapter 7: copies only is not accepted; Show me applies one of the winners', async ({ page }) => {
  const w = sdWalker(page, 'mouse');
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
  const w = sdWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1(undefined, 'I’m not sure');
  await expect(card(page)).toContainText('Chapter complete');
  await expect(card(page).locator('.stamp.wrong')).toHaveCount(0);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the stack shows without the flip, and every chapter plays through', async ({ page }) => {
    await sdWalker(page, 'mouse').open(CH5);
    await expect(page.locator('.copier-room .sd-flip')).toHaveCount(0);
    await walkAll(sdWalker(page, 'mouse'));
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  const w = sdWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/synthetic-data/recap/');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/synthetic-data/', ...CHS.map(id => `/synthetic-data/${id}/`), '/synthetic-data/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      sdWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
