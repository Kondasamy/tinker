// Caching & CDNs: the intro, every chapter played by mouse and by keyboard only, its own progress key, chapter 5's
// depot overloaded without coalescing and calm with it, the timeline read with the arrow keys, "I'm not sure", reduced
// motion, the recap, axe and phone width; the go-live checks: Module 21 kickers and share images, home's card.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { MOMENTS } from '../../src/lib/caching/sim';
import { cachingWalker } from './caching-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('caching');
const IDS = M.chapters.map(c => c.id);
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = IDS;
const at = (id: string) => new RegExp(`/caching/${id}/$`);
async function walkAll(w: ReturnType<typeof cachingWalker>) {
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

test('the intro shows the level and the chapters', async ({ page }) => {
  await page.goto('/caching/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Beginner');
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await page.getByRole('button', { name: 'Words' }).click();
  await expect(page.locator('.band .note.more')).toBeVisible();
  await axe(page);
});

test('Module 21 on the intro and the recap', async ({ page }) => {
  await page.goto('/caching/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 21 · Caching & CDNs');
  await page.goto('/caching/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 21 · Recap');
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/caching/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/caching\.jpg$/);
  await page.goto(`/caching/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/caching-${CH1}\\.jpg$`),
  );
  await page.goto('/caching/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/caching-recap\.jpg$/);
  expect((await page.request.get('/og/caching.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="caching"] h4 a')).toHaveAttribute('href', '/caching/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(cachingWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in caching-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(cachingWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['caching-progress-v1']).done).toEqual(IDS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('caching');
});

test('chapter 5: the depot is overloaded at the sale without coalescing, and calm with it', async ({ page }) => {
  const w = cachingWalker(page, 'mouse');
  await w.open(CH5);
  const c = card(page);
  await c.getByRole('slider', { name: /^Time of day/ }).fill(String(MOMENTS.sale));
  await expect(page.locator('[data-prop="trips"]')).toHaveAttribute('data-overloaded', '1');
  await expect(page.locator('.tc-caption')).toContainText('depot overloaded');
  await c.getByRole('radio', { name: /^About one per item/ }).click();
  await c.getByRole('button', { name: 'Request coalescing' }).click();
  await expect(page.locator('[data-prop="trips"]')).toHaveAttribute('data-overloaded', '0');
  await expect(page.locator('.tc-caption')).not.toContainText('overloaded');
  await axe(page);
});

test('“I’m not sure” on a checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = cachingWalker(page, 'mouse');
  await w.open(CH1);
  const c = card(page);
  await c.getByRole('button', { name: 'Send one from North' }).click();
  await c.getByRole('radio').first().click();
  await c.getByRole('button', { name: 'Send one from West' }).click();
  await c.getByRole('button', { name: 'Open the Timeline tab' }).click();
  await c.getByRole('radio', { name: 'I’m not sure' }).click();
  await expect(c).toContainText('Chapter complete');
  await expect(c.locator('.stamp.wrong')).toHaveCount(0);
});

test('the timeline reads each quarter hour with the arrow keys', async ({ page }) => {
  const w = cachingWalker(page, 'mouse');
  await w.open(CH4);
  await page.getByRole('button', { name: 'Timeline', exact: true }).click();
  const cols = page.getByRole('list', { name: /^Cache timeline/ });
  await cols.locator('[role="listitem"]').first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.ca-readout')).toContainText(/^08:15\. North: \d+ requests?, \d+ from the shelf/);
  await page.keyboard.press('End');
  await expect(page.locator('.ca-readout')).toContainText(/^19:45\./);
  await axe(page);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the picture holds still and the chapters still play through', async ({ page }) => {
    const w = cachingWalker(page, 'mouse', async p => {
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
  const w = cachingWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/caching/recap/');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('caching-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/caching/', ...IDS.map(id => `/caching/${id}/`), '/caching/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      cachingWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
