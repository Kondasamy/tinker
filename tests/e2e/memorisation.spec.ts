// What a model remembers: the intro, every chapter played by mouse and by keyboard only (waiting for the canary model),
// its own progress key, the ranking column by keyboard with its read-out, a filter-only policy leaking on the
// workbench, a failed weights fetch and Retry, "I'm not sure", reduced motion (no rise), the recap, axe and phone
// width. The go-live adds the module's number, share images and home's card.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf, moduleNumber } from '../../src/lib/modules';
import { memWalker } from './memorisation-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('memorisation');
const NUMBER = moduleNumber(moduleOf('memorisation'));
const CHS = M.chapters.map(c => c.id),
  [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = CHS;
const at = (id: string) => new RegExp(`/memorisation/${id}/$`);
async function walkAll(w: ReturnType<typeof memWalker>) {
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
  await page.goto('/memorisation/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Intermediate');
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('.versus .reply')).toHaveCount(2);
  await axe(page);
});

test('its module number on the intro and the recap', async ({ page }) => {
  await page.goto('/memorisation/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · What a model remembers`);
  await page.goto('/memorisation/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Recap`);
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/memorisation/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/memorisation\.jpg$/);
  await page.goto(`/memorisation/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/memorisation-${CH1}\\.jpg$`),
  );
  await page.goto('/memorisation/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/memorisation-recap\.jpg$/);
  expect((await page.request.get('/og/memorisation.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="memorisation"] h4 a')).toHaveAttribute('href', '/memorisation/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(memWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in memorisation-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'pre-training-progress-v1': JSON.stringify({ done: ['01-before-training'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(memWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['memorisation-progress-v1']).done).toEqual(CHS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('memorisation');
});

test('chapter 4: the keyboard moves the copies, the true ball takes its rank, and the read-out says it', async ({
  page,
}) => {
  const w = memWalker(page, 'keyboard');
  await w.open(CH4);
  await card(page)
    .getByRole('radio', { name: /^Near the top/ })
    .press('Space');
  const once = card(page).getByRole('radio', { name: /^1 copy/ });
  await once.focus();
  await once.press('Space');
  const out = page.getByRole('status').filter({ hasText: /rank \d+ of 201/ });
  await expect(out).toContainText('all 10,000: rank 81', { timeout: 30_000 });
  await expect(page.locator('.recital-desk .truth')).toHaveAttribute('data-slot', '2');
  await once.press('ArrowRight');
  await expect(page.locator('.recital-desk .truth')).toHaveAttribute('data-slot', '1', { timeout: 30_000 });
  await axe(page);
});

test('chapter 7: a filter alone still leaks; Show me applies one of the winners', async ({ page }) => {
  const w = memWalker(page, 'mouse');
  await w.open(CH7);
  const c = card(page),
    score = c.locator('[data-best]');
  await c.getByRole('checkbox', { name: 'Output filter on replies' }).click();
  await expect(score).toHaveAttribute('data-best', '0');
  await expect(c.locator('[data-leaked]')).not.toHaveAttribute('data-leaked', '0');
  await expect(c).toContainText('one digit at a time');
  await c.getByRole('button', { name: 'Show me' }).click();
  await expect(c).toContainText('Step 2 of');
  await expect(score).toHaveAttribute('data-best', '1');
});

test('the canary model failing to load shows Retry, and Retry recovers it', async ({ page }) => {
  let failed = 0;
  await page.route('**/data/memorisation/canary.bin', route => (failed++ ? route.continue() : route.abort()));
  const w = memWalker(page, 'mouse');
  await w.open(CH3);
  const retry = page.locator('.tc-frame').getByRole('button', { name: 'Retry' });
  await expect(retry).toBeVisible();
  await retry.click();
  await card(page)
    .getByRole('radio', { name: /^Only the ones/ })
    .click();
  await expect(card(page).getByRole('button', { name: 'Ask', exact: true })).toBeAttached({ timeout: 30_000 });
});

test('“I’m not sure” on the checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = memWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1(undefined, 'I’m not sure');
  await expect(card(page)).toContainText('Chapter complete');
  await expect(card(page).locator('.stamp.wrong')).toHaveCount(0);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the true ball is drawn where it ends, without the rise, and every chapter plays through', async ({ page }) => {
    const w = memWalker(page, 'mouse');
    await w.open(CH4);
    await card(page)
      .getByRole('radio', { name: /^Near the top/ })
      .click();
    await card(page)
      .getByRole('radio', { name: /^64 copies/ })
      .click();
    await expect(page.locator('.recital-desk .truth')).toHaveCount(1, { timeout: 30_000 });
    await expect(page.locator('.recital-desk .mem-rise')).toHaveCount(0);
    await walkAll(memWalker(page, 'mouse'));
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  const w = memWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/memorisation/recap/');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/memorisation/', ...CHS.map(id => `/memorisation/${id}/`), '/memorisation/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      memWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
