// Recap page and warm-up (U4: R11, R13, R14, AE4). The selection runs over a fixture bank on /dev/recap and /dev/warmup,
// since RAG's own bank is filled in U5; the tests on RAG's real pages that need questions switch on once it has some.
import { test, expect, type Page } from '@playwright/test';
import { serious } from './helpers';
import { RECALL } from '../../src/content/rag/recall';

const KEY = 'rag-progress-v1', H = 3600_000;
const CH1 = '01-history', CH2 = '02-why-not-stuff-it';

/** Seed RAG progress (finish times as hours ago, results as [id, right, unsure, hours ago]), then open `path`. */
async function open(page: Page, path: string, done: Record<string, number> = {}, recall: [string, boolean, boolean, number][] = []) {
  await page.goto('/');
  await page.evaluate(({ KEY, done, recall, H }) => {
    const now = Date.now();
    localStorage.setItem(KEY, JSON.stringify({
      done: Object.keys(done), saved: {},
      at: Object.fromEntries(Object.entries(done).map(([k, h]) => [k, now - h * H])),
      recall: Object.fromEntries(recall.map(([id, right, unsure, h]) => [id, { right, unsure, at: now - h * H }])),
    }));
  }, { KEY, done, recall, H });
  await page.goto(path);
  // hydrated (an island with nothing due renders nothing, so wait for it attached, not visible); the home page has none
  if (path !== '/') await page.locator('astro-island:not([ssr])').first().waitFor({ state: 'attached' });
}

const question = (page: Page) => page.locator('.recap legend');
const count = (page: Page) => page.locator('.recap .count');
const next = (page: Page) => page.getByRole('button', { name: /^(Next question|See how you did) →$/ });

async function answer(page: Page, option: string | RegExp) {
  await page.getByRole('radio', { name: option, exact: true }).click();
  await next(page).click();
}

test.describe('recap', () => {
  test('AE4: with no chapters done it says so and links to chapter 1, with no questions', async ({ page }) => {
    for (const path of ['/rag/recap/', '/dev/recap/']) {
      await open(page, path);
      await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Start chapter 1 →' })).toHaveAttribute('href', `/rag/${CH1}/`);
      await expect(page.getByRole('radiogroup')).toHaveCount(0);
    }
  });

  test('with chapters 1 and 2 done, only their items are asked; the summary comes after the last answer', async ({ page }) => {
    await open(page, '/dev/recap/', { [CH1]: 1, [CH2]: 1 });
    const asked: string[] = [];
    for (let i = 0; i < 4; i++) {
      await expect(count(page)).toHaveText(`Question ${i + 1} of 4`);
      await expect(page.getByText('How you did')).toHaveCount(0);
      const q = await question(page).innerText();
      asked.push(q.split(':')[0]);
      // first right, second wrong, then not sure, then right
      const pick = [0, 1, 2, 0][i];
      await page.getByRole('radio').nth(pick).click();
      if (pick === 1) await expect(page.locator('.recap .feedback')).toContainText('NOT QUITE');
      await next(page).click();
    }
    expect(asked.sort()).toEqual(['Fixture h-1', 'Fixture h-pin', 'Fixture w-1', 'Fixture w-2']);
    await expect(page.getByRole('heading', { name: 'How you did' })).toBeFocused();
    const tally = page.locator('.tally');
    await expect(tally).toContainText('2right');
    await expect(tally).toContainText('1not sure');
    await expect(tally).toContainText('1missed');
    await expect(page.locator('.missed a')).toHaveCount(1);
    await expect(page.locator('.missed a')).toHaveAttribute('href', /^\/rag\/0[12]-[\w-]+\/$/);
    const stored = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).recall, KEY);
    expect(Object.keys(stored).sort()).toEqual(['h-1', 'h-pin', 'w-1', 'w-2']);
  });

  test('reloading mid-recap keeps the order and the position; a finished run says so, and Retake starts again', async ({ page }) => {
    await open(page, '/dev/recap/', { [CH1]: 1 });
    const first = await question(page).innerText();
    await answer(page, /^(The host|No)$/);
    const second = await question(page).innerText();
    await page.reload();
    await page.locator('astro-island:not([ssr])').first().waitFor();
    await expect(count(page)).toHaveText('Question 2 of 2');
    await expect(question(page)).toHaveText(second);
    expect(second).not.toBe(first);
    await answer(page, /^(The host|No)$/);
    await expect(page.getByRole('heading', { name: 'All 2 answers right. You remembered every one.' })).toBeVisible();
    await expect(page.locator('.missed')).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading', { name: /All 2 answers right/ })).toBeVisible();
    await page.getByRole('button', { name: 'Retake in a new order' }).click();
    await expect(count(page)).toHaveText('Question 1 of 2');
    await expect(count(page)).toBeFocused();
  });

  test('a saved attempt whose items left the bank is discarded and reseeded', async ({ page }) => {
    await open(page, '/dev/recap/', { [CH1]: 1 });
    await page.evaluate(k => {
      const p = JSON.parse(localStorage.getItem(k)!);
      localStorage.setItem(k, JSON.stringify({ ...p, recap: { seed: 1, ids: ['retired-item', 'h-1'], pos: 1 } }));
    }, KEY);
    await page.reload();
    await expect(count(page)).toHaveText('Question 1 of 2');
  });

  test('can be finished with the keyboard alone', async ({ page }) => {
    await open(page, '/dev/recap/', { [CH1]: 1 });
    for (let i = 0; i < 2; i++) {
      await page.keyboard.press('Tab');                 // first option (from the page, or from the focused count)
      await expect(page.getByRole('radio').first()).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('.recap .feedback')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(next(page)).toBeFocused();
      await page.keyboard.press('Enter');
    }
    await expect(page.getByRole('heading', { name: /All 2 answers right/ })).toBeFocused();
  });

  test('with reduced motion, feedback shows at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, '/dev/recap/', { [CH1]: 1 });
    await page.getByRole('radio', { name: 'I’m not sure' }).click();
    await expect(page.locator('.recap .feedback')).toContainText('The answer:', { timeout: 200 });
    await expect(page.locator('.recap .feedback')).not.toContainText('NOT QUITE');
  });

  test('the recap page has its own share image, passes axe and fits a phone', async ({ page, request }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, '/rag/recap/');
    const og = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(og).toBe('https://tinker.kondasamy.com/og/rag-recap.jpg');
    expect((await request.get('/og/rag-recap.jpg')).status()).toBe(200);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    expect(await serious(page)).toEqual([]);
    await open(page, '/dev/recap/', { [CH1]: 1 });
    await page.getByRole('radio').nth(1).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    expect(await serious(page, '.recap')).toEqual([]);
  });

  test('the module intro and the last chapter link to the recap', async ({ page }) => {
    await page.goto('/rag/');
    await expect(page.getByRole('link', { name: /^Recap:/ })).toHaveAttribute('href', '/rag/recap/');
  });
});

test.describe('warm-up', () => {
  const warm = (page: Page) => page.locator('.warmup');

  test('shows for a chapter finished 21 hours ago: at most three items, missed first, collapsed until started', async ({ page }) => {
    await open(page, '/dev/warmup/', { [CH1]: 21, [CH2]: 21 }, [['w-2', false, false, 25], ['h-pin', true, false, 25]]);
    await expect(warm(page)).toContainText('3 quick questions from chapters you finished');
    await expect(page.getByRole('radiogroup')).toHaveCount(0);                  // collapsed
    await expect(page.getByRole('link', { name: 'Skip to chapter 3 →' })).toHaveAttribute('href', '/rag/03-what-is-rag/');
    await page.getByRole('button', { name: 'Start the warm-up' }).click();
    await expect(count(page)).toBeFocused();
    await expect(question(page)).toContainText('Fixture w-2');                  // the missed one first
    await answer(page, 'No');
    await answer(page, 'No');
    await answer(page, 'No');
    await expect(warm(page).getByRole('heading', { name: /All 3 answers right/ })).toBeFocused();
    await expect(page.getByRole('link', { name: 'Continue: chapter 3 →' })).toBeVisible();
    await page.reload();                                                          // one warm-up per return: nothing due now
    await page.locator('astro-island:not([ssr])').first().waitFor({ state: 'attached' });
    await expect(warm(page)).toHaveCount(0);
  });

  test('a pinned item the reader has not mastered is always in it', async ({ page }) => {
    await open(page, '/dev/warmup/', { [CH1]: 21, [CH2]: 21 }, [['w-1', false, false, 25], ['w-2', false, false, 25], ['h-pin', false, false, 25]]);
    await page.getByRole('button', { name: 'Start the warm-up' }).click();
    await expect(question(page)).toContainText('Fixture h-pin');
  });

  test('none for a chapter finished 2 hours ago, nor on a first visit', async ({ page }) => {
    await open(page, '/dev/warmup/', { [CH1]: 2 });
    await expect(page.locator('h1')).toBeVisible();
    await expect(warm(page)).toHaveCount(0);
    await open(page, '/dev/warmup/');
    await expect(warm(page)).toHaveCount(0);
    await open(page, '/rag/');
    await expect(warm(page)).toHaveCount(0);
  });

  test('skipping leaves it for the next visit', async ({ page }) => {
    await open(page, '/dev/warmup/', { [CH1]: 21 });
    await page.getByRole('link', { name: 'Skip to chapter 2 →' }).click();
    await expect(page).toHaveURL(/\/rag\/02-why-not-stuff-it\/$/);
    await page.goto('/dev/warmup/');
    await expect(warm(page)).toContainText('2 quick questions');
  });

  test('#warmup opens it at once', async ({ page }) => {
    await open(page, '/dev/warmup/#warmup', { [CH1]: 21 });
    await expect(page.getByRole('radiogroup')).toHaveCount(1);
    await expect(count(page)).toBeFocused();
  });

  test.describe('on RAG’s own pages', () => {
    const chapter = RECALL[0].chapter;

    test('home Continue goes through the warm-up when one is due, and the intro’s Continue does not change', async ({ page }) => {
      await open(page, '/', { [chapter]: 21 });
      const go = page.locator('[data-continue]');
      await expect(go).toHaveAttribute('href', '/rag/#warmup');
      await go.click();
      await expect(page.getByRole('radiogroup')).toHaveCount(1);
      const cta = page.locator('.hero [data-cta]');
      const before = await cta.getAttribute('href');
      await page.getByRole('link', { name: /^Skip to chapter/ }).click();
      await page.goto('/rag/');
      await expect(page.locator('.hero [data-cta]')).toHaveAttribute('href', before!);
      await open(page, '/', { [chapter]: 2 });
      await expect(go).not.toHaveAttribute('href', '/rag/#warmup');
    });
  });
});
