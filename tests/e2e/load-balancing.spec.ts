// Load balancing: the intro, every chapter played by mouse and by keyboard only, its own progress key, chapter 4's gray
// server passing its health check, the board's p99 marker and its percentiles as text, Replay, "I'm not sure", reduced
// motion (a run shows its end at once), the recap, axe and phone width; the go-live checks: the module's number on its
// intro and recap, its share images and home's card.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf, moduleNumber } from '../../src/lib/modules';
import { SERVERS } from '../../src/lib/load-balancing/sim';
import { loadBalancingWalker } from './load-balancing-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('load-balancing');
const NUMBER = moduleNumber(moduleOf('load-balancing'));
const IDS = M.chapters.map(c => c.id);
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = IDS;
const at = (id: string) => new RegExp(`/load-balancing/${id}/$`);
async function walkAll(w: ReturnType<typeof loadBalancingWalker>) {
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
  await page.goto('/load-balancing/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Intermediate');
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await page.getByRole('button', { name: 'Words' }).click();
  await expect(page.locator('.band .note.more')).toBeVisible();
  await axe(page);
});

test('its module number on the intro and the recap', async ({ page }) => {
  await page.goto('/load-balancing/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Load balancing`);
  await page.goto('/load-balancing/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Recap`);
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/load-balancing/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/load-balancing\.jpg$/);
  await page.goto(`/load-balancing/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/load-balancing-${CH1}\\.jpg$`),
  );
  await page.goto('/load-balancing/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /\/og\/load-balancing-recap\.jpg$/,
  );
  expect((await page.request.get('/og/load-balancing.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="load-balancing"] h4 a')).toHaveAttribute('href', '/load-balancing/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(loadBalancingWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in load-balancing-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(loadBalancingWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['load-balancing-progress-v1']).done).toEqual(IDS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('load-balancing');
});

test('chapter 4: the dead server is pulled, the gray one passes its check and keeps its turn', async ({ page }) => {
  const w = loadBalancingWalker(page, 'mouse');
  await w.open(CH4);
  const c = card(page);
  await c.getByRole('button', { name: 'Run the sale' }).click();
  await c.getByRole('slider', { name: /^Health checks/ }).fill('3');
  await c.getByRole('slider', { name: /^Health checks/ }).fill('1');
  await c.getByRole('radio').nth(1).click();
  await c.getByRole('button', { name: `Make ${SERVERS[3].name} slow but answering` }).click();
  await expect(page.locator('.lb-readout')).toHaveAttribute('data-done', '1', { timeout: 10_000 });
  await expect(page.locator('[data-prop="cedar"]')).toHaveAttribute('data-pulled', '1');
  await expect(page.locator('[data-prop="dogwood"]')).toHaveAttribute('data-state', 'gray');
  await expect(page.locator('[data-prop="dogwood"] .lamp')).toHaveAttribute('data-check', 'pass');
  await axe(page);
});

test('the board fills, its p99 marker matches the read-out, and Replay plays the run again', async ({ page }) => {
  const w = loadBalancingWalker(page, 'mouse');
  await w.open(CH6);
  await card(page).getByRole('button', { name: 'Run the sale' }).click();
  const readout = page.locator('.lb-readout');
  await expect(readout).toHaveAttribute('data-done', '1', { timeout: 10_000 });
  const p99 = await page.locator('.lb-marker').getAttribute('data-p99');
  await expect(readout).toContainText(`p99 ${Number(p99).toLocaleString('en-US')} ms`);
  await page.getByRole('button', { name: 'Replay' }).click();
  await expect(readout).toHaveAttribute('data-done', '0');
  await expect(readout).toHaveAttribute('data-done', '1', { timeout: 10_000 });
  await axe(page);
});

test('“I’m not sure” on a checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = loadBalancingWalker(page, 'mouse');
  await w.open(CH1);
  const c = card(page);
  await c.getByRole('button', { name: 'Run the morning' }).click();
  await c.getByRole('radio').first().click();
  await c.getByRole('button', { name: 'Run the sale' }).click();
  await c.getByRole('button', { name: 'Run the sale on four' }).click();
  await c.getByRole('radio', { name: 'I’m not sure' }).click();
  await expect(c).toContainText('Chapter complete');
  await expect(c.locator('.stamp.wrong')).toHaveCount(0);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('every run shows its final board at once (well inside the 2.4 s it plays for), and the chapters play through', async ({
    page,
  }) => {
    await walkAll(
      loadBalancingWalker(page, 'mouse', async p => {
        await expect(p.locator('.lb-readout')).toHaveAttribute('data-done', '1', { timeout: 500 });
      }),
    );
    await expect(page.locator('.lb-readout')).toContainText(/^p50 [\d,]+ ms, p99 [\d,]+ ms/);
  });
});

test('the recap asks from the finished chapter; with none done it says so', async ({ page }) => {
  const w = loadBalancingWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/load-balancing/recap/');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('load-balancing-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/load-balancing/', ...IDS.map(id => `/load-balancing/${id}/`), '/load-balancing/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      loadBalancingWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
