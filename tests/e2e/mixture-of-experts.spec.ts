// Mixture of experts: the intro, every chapter played by mouse and by keyboard only, its own progress key, chapter 4's
// override by keyboard (a third room unchecks the oldest, Use router restores), a failed weights fetch and Retry,
// playing offline once loaded, the workbench's Show me, "I'm not sure", reduced motion, the recap, axe and phone width
// (targets of 44 px). The go-live adds the module's number, share images and home's card.
import { test, expect, type Page } from '@playwright/test';
import { MODULES, moduleOf } from '../../src/lib/modules';
import PINNED from '../../data/mixture-of-experts/pinned.json' with { type: 'json' };
import { moeWalker } from './mixture-of-experts-flow';
import { serious, layoutHolds, offline, PHONE } from './helpers';

const M = moduleOf('mixture-of-experts');
const NUMBER = MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'mixture-of-experts') + 1;
const CHS = M.chapters.map(c => c.id),
  [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = CHS;
const at = (id: string) => new RegExp(`/mixture-of-experts/${id}/$`);
async function walkAll(w: ReturnType<typeof moeWalker>) {
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
const stage = (page: Page) => page.getByRole('region', { name: 'Scene' });
// let the stage's fade finish first: axe can catch a figure mid-fade and report false contrast failures
const axe = async (page: Page) => {
  await page.waitForTimeout(400);
  expect(await serious(page)).toEqual([]);
};
test.setTimeout(240_000);

test('the intro shows the level, the prerequisite, the author and the chapters', async ({ page }) => {
  await page.goto('/mixture-of-experts/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Advanced');
  await expect(meta.getByRole('link', { name: moduleOf('transformers').title, exact: true })).toHaveAttribute(
    'href',
    '/transformers/',
  );
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('.versus .reply')).toHaveCount(2);
  await axe(page);
});

test('its module number on the intro and the recap', async ({ page }) => {
  await page.goto('/mixture-of-experts/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Mixture of experts`);
  await page.goto('/mixture-of-experts/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Recap`);
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/mixture-of-experts/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/mixture-of-experts\.jpg$/);
  await page.goto(`/mixture-of-experts/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/mixture-of-experts-${CH1}\\.jpg$`),
  );
  await page.goto('/mixture-of-experts/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /\/og\/mixture-of-experts-recap\.jpg$/,
  );
  expect((await page.request.get('/og/mixture-of-experts.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="mixture-of-experts"] h4 a')).toHaveAttribute(
    'href',
    '/mixture-of-experts/',
  );
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(moeWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in mixture-of-experts-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'transformers-progress-v1': JSON.stringify({ done: ['01-one-token-at-a-time'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(moeWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['mixture-of-experts-progress-v1']).done).toEqual(CHS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('mixture-of-experts');
});

test('chapter 4 by keyboard: the override lights the chosen rooms, a third unchecks the oldest, Use router restores', async ({
  page,
}) => {
  const w = moeWalker(page, 'keyboard');
  await w.open(CH4);
  await w.ready();
  const strip = stage(page).locator('.me-strip input[type="radio"]');
  await strip.last().press('Space');
  await card(page)
    .getByRole('radio', { name: /^It can change/ })
    .press('Enter');
  const [a, b] = PINNED.override.experts;
  const box = (e: number) => stage(page).getByRole('checkbox', { name: `Room ${e + 1}`, exact: true });
  await box(a).press('Space');
  await box(b).press('Space');
  await expect(card(page)).toContainText('Step 4 of');
  for (const e of [a, b]) await expect(page.locator(`[data-room="${e + 1}"][data-lit="1"]`)).toHaveCount(2);
  await expect(page.locator('[data-forced="1"]')).toHaveCount(2);
  const third = [0, 1, 2, 3, 4, 5, 6, 7].find(e => e !== a && e !== b)!;
  await box(third).press('Space');
  await expect(box(a)).not.toBeChecked();
  await expect(box(b)).toBeChecked();
  await expect(stage(page).locator('.me-said')).toContainText('unchecked');
  await stage(page).getByRole('button', { name: 'Use router' }).press('Enter');
  await expect(page.locator('[data-forced="1"]')).toHaveCount(0);
  await expect(card(page)).toContainText('Step 5 of');
  await axe(page);
});

test('weights that fail to load leave the controls off with a status line; Retry recovers them', async ({ page }) => {
  let failed = false;
  await page.route('**/data/mixture-of-experts/moe.bin', route => {
    if (failed) return route.continue();
    failed = true;
    return route.abort();
  });
  const w = moeWalker(page, 'mouse');
  await w.open(CH2);
  const status = stage(page).locator('.me-status');
  await expect(status).toHaveAttribute('data-state', 'failed');
  await expect(stage(page).locator('.me-strip input').first()).toBeDisabled();
  await stage(page).getByRole('button', { name: 'Retry' }).click();
  await w.ready();
  await expect(stage(page).locator('.me-strip input').first()).toBeEnabled();
});

test('chapter 5 plays to the end offline once the weights have loaded', async ({ page }) => {
  const w = moeWalker(page, 'mouse');
  await w.open(CH5);
  await w.ready();
  await page.waitForLoadState('networkidle');
  await offline(page);
  await w.ch5();
});

test('chapter 7: the start is not accepted; Show me applies one of the best plans', async ({ page }) => {
  const w = moeWalker(page, 'mouse');
  await w.open(CH7);
  const c = card(page),
    score = c.locator('[data-best]');
  await expect(score).toHaveAttribute('data-best', '0');
  await c.getByRole('button', { name: 'Show me' }).click();
  await expect(c).toContainText('Step 2 of');
  await expect(score).toHaveAttribute('data-best', '1');
  await expect(c).toContainText(/One of \d+ plans that work/);
});

test('“I’m not sure” on the checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = moeWalker(page, 'mouse');
  await w.open(CH6);
  await w.ch6(undefined, 'I’m not sure');
  await expect(card(page)).toContainText('Chapter complete');
  await expect(card(page).locator('.stamp.wrong')).toHaveCount(0);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('nothing moves on the stage, and the chapters still play through', async ({ page }) => {
    const still = async (p: Page) => {
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
    };
    await walkAll(moeWalker(page, 'mouse', still));
  });
});

test('the recap asks from the finished chapter; with none done it says so', async ({ page }) => {
  const w = moeWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/mixture-of-experts/recap/');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('mixture-of-experts-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, targets are 44 px, and every chapter plays through there with axe clean', async ({
    page,
  }) => {
    for (const p of [
      '/mixture-of-experts/',
      ...CHS.map(id => `/mixture-of-experts/${id}/`),
      '/mixture-of-experts/recap/',
    ]) {
      await page.goto(p);
      await layoutHolds(page);
    }
    const w = moeWalker(page, 'mouse');
    await w.open(CH4);
    await w.ready();
    await stage(page).locator('.me-strip input[type="radio"]').last().click();
    await card(page)
      .getByRole('radio', { name: /^It can change/ })
      .click();
    for (const l of await stage(page).locator('.me-rooms label, .me-strip label').all()) {
      const r = (await l.boundingBox())!;
      expect(r.height).toBeGreaterThanOrEqual(44);
      expect(r.width).toBeGreaterThanOrEqual(44);
    }
    await page.evaluate(() => localStorage.removeItem('mixture-of-experts-progress-v1'));
    await walkAll(
      moeWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
