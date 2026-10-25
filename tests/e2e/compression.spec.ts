// Compression: the intro, every chapter played by mouse and by keyboard only, its own progress key, chapter 3's merge
// puzzle (a wrong pair refused with the rule, solved by keyboard alone), real gzip measured in the browser near its
// reference, "I'm not sure", reduced motion, the recap, axe and phone width; the module's number on its intro and recap.
import { test, expect, type Page } from '@playwright/test';
import pinned from '../../data/compression/pinned.json' with { type: 'json' };
import { MODULES } from '../../src/lib/modules';
import { COMPRESSION_MODULE as M } from '../../src/content/compression/module';
import { compressionWalker } from './compression-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const NUMBER = MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'compression') + 1;
const IDS = M.chapters.map(c => c.id);
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = IDS;
const at = (id: string) => new RegExp(`/compression/${id}/$`);
async function walkAll(w: ReturnType<typeof compressionWalker>) {
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
  await page.goto('/compression/');
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

test('its module number on the intro and the recap', async ({ page }) => {
  await page.goto('/compression/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Compression`);
  await page.goto('/compression/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Recap`);
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(compressionWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in compression-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(compressionWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['compression-progress-v1']).done).toEqual(IDS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('compression');
});

test('chapter 3: a wrong pair is refused with the rule, a right one merges onto a tray', async ({ page }) => {
  const w = compressionWalker(page, 'mouse');
  await w.open(CH3);
  const c = card(page);
  await c.getByRole('radio').first().click();
  const piles = c.getByRole('option');
  const n = await piles.count();
  // the heaviest pile is last in the list's order by weight: "l" weighs the most
  const heaviest = await piles.filter({ hasText: /^l/ }).first().getAttribute('id');
  await w.mergePair(0, Number(heaviest!.split('-').at(-1)));
  await expect(c.locator('.cz-said')).toContainText('merge the two lightest piles');
  await expect(piles).toHaveCount(n);
  await w.mergePair(0, 1);
  await expect(piles).toHaveCount(n - 1);
  await expect(page.locator('.stage [data-kind="merged"], .stage [data-lit]')).not.toHaveCount(0);
  await axe(page);
});

test('chapter 4: real gzip is measured here, near its reference', async ({ page }) => {
  const w = compressionWalker(page, 'mouse');
  await w.open(CH4);
  const c = card(page);
  await c.getByRole('radio').first().click();
  for (const name of [/^Pointers ·/, /^Short codes ·/, /^Both ·/]) await c.getByRole('radio', { name }).check();
  await c.getByRole('button', { name: 'Measure real gzip' }).click();
  const line = c.locator('.cz-gzip');
  await expect(line).toContainText('measured here');
  const n = Number(await line.getAttribute('data-gzip'));
  expect(Math.abs(n - pinned.gzip.price) / pinned.gzip.price).toBeLessThanOrEqual(0.15);
});

test('“I’m not sure” on a checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = compressionWalker(page, 'mouse');
  await w.open(CH5);
  const c = card(page);
  await c.getByRole('radio').first().click();
  await c.getByRole('button', { name: 'Pack the random file' }).click();
  await c.getByRole('button', { name: 'Pack the packed price list' }).click();
  await c.getByRole('radio', { name: 'I’m not sure' }).click();
  await expect(c).toContainText('Chapter complete');
  await expect(c.locator('.stamp.wrong')).toHaveCount(0);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the picture holds still and the chapters still play through', async ({ page }) => {
    const w = compressionWalker(page, 'mouse', async p => {
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
  const w = compressionWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/compression/recap/');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('compression-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/compression/', ...IDS.map(id => `/compression/${id}/`), '/compression/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      compressionWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
