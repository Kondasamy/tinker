// Rate limits: the intro, every chapter played by mouse and by keyboard only, its own progress key, the flood
// button held by pointer and by Space, Send 10 and the first 429 read-out, the Requests chart, "I'm not sure", reduced
// motion (no hold button, Send 10 still plays), the recap, axe and phone width. The go-live adds the module's number,
// share images and home's card.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf, moduleNumber } from '../../src/lib/modules';
import { rateWalker } from './rate-limits-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('rate-limits');
const NUMBER = moduleNumber(moduleOf('rate-limits'));
const IDS = M.chapters.map(c => c.id);
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = IDS;
const at = (id: string) => new RegExp(`/rate-limits/${id}/$`);
async function walkAll(w: ReturnType<typeof rateWalker>) {
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
const axe = async (page: Page) => expect(await serious(page)).toEqual([]);
test.setTimeout(240_000);

test('the intro shows the level and the chapters', async ({ page }) => {
  await page.goto('/rate-limits/');
  await expect(page.locator('.hero .module-meta .level')).toHaveText('Beginner');
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await page.getByRole('button', { name: 'Words' }).click();
  await expect(page.locator('.band .note.more')).toBeVisible();
  await axe(page);
});

test('its module number on the intro and the recap', async ({ page }) => {
  await page.goto('/rate-limits/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Rate limits`);
  await page.goto('/rate-limits/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Recap`);
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/rate-limits/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/rate-limits\.jpg$/);
  await page.goto(`/rate-limits/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/rate-limits-${CH1}\\.jpg$`),
  );
  await page.goto('/rate-limits/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/rate-limits-recap\.jpg$/);
  expect((await page.request.get('/og/rate-limits.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="rate-limits"] h4 a')).toHaveAttribute('href', '/rate-limits/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(rateWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in rate-limits-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(rateWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['rate-limits-progress-v1']).done).toEqual(IDS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('rate-limits');
});

test('chapter 3: holding the flood button sends requests until released; the first 429 is announced once', async ({
  page,
}) => {
  const w = rateWalker(page, 'mouse');
  await w.open(CH3);
  const hold = stage(page).getByRole('button', { name: 'Hold to flood' }),
    said = stage(page).getByRole('status');
  await hold.hover();
  await page.mouse.down();
  await page.waitForTimeout(900);
  await page.mouse.up();
  await expect(said).toContainText('First 429');
  const n = Number((await said.textContent())!.match(/Sent (\d+)/)![1]);
  expect(n).toBeGreaterThan(10);
  // released: nothing more is sent
  await page.waitForTimeout(300);
  await expect(said).toContainText(`Sent ${n}:`);
  await w.send10();
  await expect(said).not.toContainText('First 429');
  await expect(said).toContainText('Sent 10:');
  await axe(page);
});

test('chapter 3: Space held on the flood button floods too, and the step moves on', async ({ page }) => {
  const w = rateWalker(page, 'keyboard');
  await w.open(CH3);
  const hold = stage(page).getByRole('button', { name: 'Hold to flood' });
  await hold.focus();
  await page.keyboard.down(' ');
  await page.waitForTimeout(800);
  await page.keyboard.up(' ');
  await expect(stage(page).getByRole('status')).toContainText(/Sent \d+:/);
  await expect(card(page)).toContainText('Step 2 of');
});

test('the Requests tab draws a chart of served and turned away', async ({ page }) => {
  const w = rateWalker(page, 'mouse');
  await w.open(CH1);
  await w.time(20_000);
  await page.getByRole('button', { name: 'Requests', exact: true }).click();
  const chart = page.getByRole('img', { name: /^Requests each second/ });
  await expect(chart).toBeVisible();
  await expect(chart).toHaveAttribute('aria-label', /failed at a fallen server/);
  await axe(page);
});

test('“I’m not sure” on a checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = rateWalker(page, 'mouse');
  await w.open(CH2);
  const c = card(page);
  await w.time(59_000);
  await c.getByRole('radio').first().click();
  await w.time(61_000);
  await c.getByRole('button', { name: 'Open the Requests tab' }).click();
  await c.getByRole('radio', { name: 'I’m not sure' }).click();
  await expect(c).toContainText('Chapter complete');
  await expect(c.locator('.stamp.wrong')).toHaveCount(0);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('no hold button; Send 10 still floods, nothing animates, and the chapters play through', async ({ page }) => {
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
    const w = rateWalker(page, 'mouse');
    await w.open(CH3);
    await expect(stage(page).getByRole('button', { name: 'Hold to flood' })).toHaveCount(0);
    await w.send10();
    await w.send10();
    await expect(stage(page).getByRole('status')).toContainText('First 429');
    await still(page);
    await page.evaluate(() => localStorage.removeItem('rate-limits-progress-v1'));
    await walkAll(rateWalker(page, 'mouse', still));
  });
});

test('the recap asks from the finished chapter; with none done it says so', async ({ page }) => {
  const w = rateWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/rate-limits/recap/');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('rate-limits-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/rate-limits/', ...IDS.map(id => `/rate-limits/${id}/`), '/rate-limits/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      rateWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
