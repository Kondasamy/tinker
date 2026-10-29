// Module 8, Context engineering & memory: the intro, every chapter played by mouse and by keyboard only, its own
// progress key, the chapter 4 and 7 puzzles' "Show me", reduced motion, the recap, axe and phone width; the go-live
// checks: Module 8 kickers and share images, home's card and Continue, the warm-up and the Pictures / Words switch.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { contextWalker } from './context-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('context');
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = M.chapters.map(c => c.id);
const ALL = M.chapters.map(c => c.id);
const at = (id: string) => new RegExp(`/context/${id}/$`);
async function walkAll(w: ReturnType<typeof contextWalker>) {
  await w.open(CH1);
  await w.ch1(at(CH2));
  await w.ch2(at(CH3));
  await w.ch3(at(CH4));
  await w.ch4(at(CH5));
  await w.ch5(at(CH6));
  await w.ch6(at(CH7));
  await w.ch7(/\/context\/recap\/$/);
}
const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const axe = async (page: Page) => expect(await serious(page)).toEqual([]);
test.setTimeout(120_000);

test('the intro shows the level, the prerequisites, the author and the chapters', async ({ page }) => {
  await page.goto('/context/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Intermediate');
  for (const id of ['rag', 'tool-calling'])
    await expect(meta.getByRole('link', { name: moduleOf(id).title, exact: true })).toHaveAttribute('href', `/${id}/`);
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await axe(page);
});

test('Module 8 on the intro, the recap and home, with their own share images; home Continue resumes it', async ({
  page,
}) => {
  await page.goto('/context/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 8 · Context');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/context\.jpg$/);
  await page.goto('/context/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 8 · Recap');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/context-recap\.jpg$/);
  await page.goto('/');
  await expect(page.locator('.module[data-module="context"] h4 a')).toHaveAttribute('href', '/context/');
  await page.evaluate(() => {
    localStorage.setItem('context-progress-v1', JSON.stringify({ done: [], saved: {} }));
    localStorage.setItem('tinker-last-module', 'context');
  });
  await page.reload();
  await expect(page.locator('[data-continue]')).toHaveAttribute('href', /^\/context\//);
});

test('the warm-up shows on the intro 21 hours after a chapter, with a skip link; not 2 hours after', async ({
  page,
}) => {
  const seed = async (hours: number) => {
    await page.goto('/');
    await page.evaluate(
      ({ done, at }) =>
        localStorage.setItem(
          'context-progress-v1',
          JSON.stringify({ done, saved: {}, at: Object.fromEntries(done.map(id => [id, at])) }),
        ),
      { done: [CH1], at: Date.now() - hours * 3600_000 },
    );
    await page.goto('/context/');
    await page.locator('astro-island:not([ssr])').first().waitFor({ state: 'attached' });
  };
  await seed(21);
  await expect(page.locator('.warmup')).toContainText('from chapters you finished');
  await expect(page.getByRole('link', { name: 'Skip to chapter 2 →' })).toHaveAttribute('href', `/context/${CH2}/`);
  await axe(page);
  await seed(2);
  await expect(page.locator('.warmup')).toHaveCount(0);
});

test('the intro reads as pictures by default; Words unfolds the longer text', async ({ page }) => {
  await page.goto('/context/');
  const more = page.locator('.band .note.more');
  await expect(more).toBeHidden();
  await page.getByRole('button', { name: 'Words' }).click();
  await expect(more).toBeVisible();
  await axe(page);
});

test('every chapter plays by mouse, in order through the Next links to the recap, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(contextWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only, the chapter 4 and 7 puzzles included; progress lands in context-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(contextWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['context-progress-v1']).done).toEqual(ALL);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('context');
});

test('chapter 4: the stamp near the top breaks the cache; Show me gives one of the orders that work', async ({
  page,
}) => {
  const w = contextWalker(page, 'mouse');
  await w.open(CH4);
  const c = card(page);
  await c.getByRole('button', { name: 'Send the conversation' }).click();
  await c.getByRole('radio', { name: /^Hits stop at the stamp/ }).click();
  await expect(c.getByRole('status').filter({ hasText: 'Cache hits' })).toContainText('BROKEN');
  await c.getByRole('button', { name: 'Show me' }).click();
  await expect(c).toContainText('Step 4 of');
  // the count is computed over every order (tests/unit/context-order.test.ts pins it); the engine can't load here
  await expect(c).toContainText(/one of \d+ that work/);
});

test('chapter 7: the readout leads with the cost against stuffing everything; Show me gives a policy that works', async ({
  page,
}) => {
  const w = contextWalker(page, 'mouse');
  await w.open(CH7);
  const c = card(page);
  await c.getByRole('button', { name: 'Run the policy' }).click();
  await expect(c.locator('.cx-headline')).toContainText('100%');
  await c.getByRole('radio', { name: /^Search when needed, instead/ }).click();
  await expect(c.locator('.cx-headline')).toContainText('BROKEN');
  await c.getByRole('button', { name: 'Show me' }).click();
  await expect(c).toContainText('Step 4 of');
  await expect(c.locator('[data-solved]')).toHaveAttribute('data-solved', '1');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the picture holds still and the chapters still play through', async ({ page }) => {
    const w = contextWalker(page, 'mouse', async p => {
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

test('the recap asks from the finished chapter', async ({ page }) => {
  const w = contextWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/context/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/context/', ...ALL.map(id => `/context/${id}/`), '/context/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      contextWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
