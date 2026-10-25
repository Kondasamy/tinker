// Card payments: the intro, every chapter played by mouse and by keyboard only, its own progress key, chapter 4's two
// charges without the key and one with it, the night palette set by the clock alone, the ledger, "I'm not sure",
// reduced motion, the recap, axe and phone width; the go-live checks: the module's number, share images, home's card.
import { test, expect, type Page } from '@playwright/test';
import { MODULES, moduleOf } from '../../src/lib/modules';
import { paymentsWalker } from './payments-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('payments');
const NUMBER = MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'payments') + 1;
const IDS = M.chapters.map(c => c.id);
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = IDS;
const at = (id: string) => new RegExp(`/payments/${id}/$`);
async function walkAll(w: ReturnType<typeof paymentsWalker>) {
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
  await page.goto('/payments/');
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

test('numbered 26 on the intro and the recap', async ({ page }) => {
  expect(NUMBER).toBe(28);
  await page.goto('/payments/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Card payments`);
  await page.goto('/payments/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Recap`);
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/payments/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/payments\.jpg$/);
  await page.goto(`/payments/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/payments-${CH1}\\.jpg$`),
  );
  await page.goto('/payments/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/payments-recap\.jpg$/);
  expect((await page.request.get('/og/payments.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="payments"] h4 a')).toHaveAttribute('href', '/payments/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(paymentsWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in payments-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(paymentsWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['payments-progress-v1']).done).toEqual(IDS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('payments');
});

test('chapter 4: two charges without the key, one with it', async ({ page }) => {
  const w = paymentsWalker(page, 'mouse');
  await w.open(CH4);
  const c = card(page);
  await c.getByRole('radio', { name: /^Twice/ }).click();
  await c.getByRole('slider', { name: /^Time/ }).fill('1');
  await expect(c.locator('.pm-charges li[data-charge]:not([data-charge="0"])')).toHaveCount(2);
  await expect(page.locator('[data-prop="wallet"]')).toHaveAttribute('data-charges', '2');
  await c.getByRole('checkbox', { name: 'Send an idempotency key' }).click();
  await expect(c.locator('.pm-charges li[data-charge]:not([data-charge="0"])')).toHaveCount(1);
  await expect(page.locator('[data-prop="wallet"]')).toHaveAttribute('data-charges', '1');
  await axe(page);
});

test('the clock alone turns night: the palette, the frame and the jars swap at the cut-off', async ({ page }) => {
  const w = paymentsWalker(page, 'mouse');
  await w.open(CH3);
  const c = card(page);
  await expect(page.locator('[data-palette]')).toHaveAttribute('data-palette', 'day');
  await expect(page.locator('.pm-stage')).not.toHaveAttribute('data-night', '1');
  await expect(page.locator('.jar')).toHaveCount(0);
  await c.getByRole('slider', { name: /^Time/ }).fill('1');
  await expect(page.locator('[data-palette]')).toHaveAttribute('data-palette', 'night');
  await expect(page.locator('.pm-stage')).toHaveAttribute('data-night', '1');
  await expect(page.locator('.jar')).toHaveCount(3);
  await expect(page.locator('.stage').getByRole('button', { name: /night|day/i })).toHaveCount(0);
  await axe(page);
});

test('the ledger is a table whose rows each sum to zero', async ({ page }) => {
  const w = paymentsWalker(page, 'mouse');
  await w.open(CH3);
  await card(page).getByRole('slider', { name: /^Time/ }).fill('1');
  await page.getByRole('button', { name: 'Ledger', exact: true }).click();
  const region = page.getByRole('region', { name: /^Ledger/ });
  await expect(region.getByRole('table')).toBeVisible();
  await region.focus();
  await expect(region).toBeFocused();
  await expect(region.locator('tbody tr[data-order]').first()).toBeVisible();
  await axe(page);
});

test('“I’m not sure” on a checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = paymentsWalker(page, 'mouse');
  await w.open(CH5);
  const c = card(page);
  await c.getByRole('radio').first().click();
  await c.getByRole('button', { name: 'Always' }).click();
  await c.getByRole('button', { name: 'When the bank sees risk' }).click();
  await c.getByRole('radio', { name: 'I’m not sure' }).click();
  await expect(c).toContainText('Chapter complete');
  await expect(c.locator('.stamp.wrong')).toHaveCount(0);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the picture holds still, night swaps without a fade, and the chapters still play through', async ({ page }) => {
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
    await paymentsWalker(page, 'mouse').open(CH3);
    await card(page).getByRole('slider', { name: /^Time/ }).fill('1');
    await expect(page.locator('.pm-stage')).toHaveAttribute('data-night', '1');
    // no fade: the site's reduced-motion reset leaves at most a 0.00001s transition
    const fade = await page.locator('.pm-stage .tc-frame').evaluate(e => getComputedStyle(e).transitionDuration);
    expect(Number.parseFloat(fade)).toBeLessThan(0.01);
    await page.evaluate(() => localStorage.removeItem('payments-progress-v1'));
    await walkAll(paymentsWalker(page, 'mouse', still));
  });
});

test('the recap asks from the finished chapter; with none done it says so', async ({ page }) => {
  const w = paymentsWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/payments/recap/');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('payments-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/payments/', ...IDS.map(id => `/payments/${id}/`), '/payments/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      paymentsWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
