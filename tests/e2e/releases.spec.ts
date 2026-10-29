// Shipping a release: the intro, every chapter played by mouse and by keyboard only, its own progress key, the rollout
// dial and the lever by keyboard alone with one polite read-out, the Errors tab, "I'm not sure", reduced motion (Next
// event, no animation), the recap, axe and phone width. The go-live adds the module's number, share images and home's
// card.
import { test, expect, type Page } from '@playwright/test';
import { MODULES, moduleOf } from '../../src/lib/modules';
import { releasesWalker } from './releases-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('releases');
const NUMBER = MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'releases') + 1;
const IDS = M.chapters.map(c => c.id);
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = IDS;
const at = (id: string) => new RegExp(`/releases/${id}/$`);
async function walkAll(w: ReturnType<typeof releasesWalker>) {
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

test('the intro shows the level, the author and the chapters', async ({ page }) => {
  await page.goto('/releases/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Intermediate');
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await page.getByRole('button', { name: 'Words' }).click();
  await expect(page.locator('.band .note.more')).toBeVisible();
  await axe(page);
});

test('its module number on the intro and the recap', async ({ page }) => {
  await page.goto('/releases/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Shipping a release`);
  await page.goto('/releases/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Recap`);
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/releases/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/releases\.jpg$/);
  await page.goto(`/releases/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/releases-${CH1}\\.jpg$`),
  );
  await page.goto('/releases/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/releases-recap\.jpg$/);
  expect((await page.request.get('/og/releases.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="releases"] h4 a')).toHaveAttribute('href', '/releases/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(releasesWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in releases-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(releasesWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['releases-progress-v1']).done).toEqual(IDS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('releases');
});

test('the dial, Pause and the lever by keyboard alone; the read-out speaks on actions, not ticks', async ({ page }) => {
  const w = releasesWalker(page, 'keyboard');
  await w.open(CH4);
  const dial = stage(page).getByRole('slider', { name: /^Share on the new version/ });
  const status = stage(page).getByRole('status');
  await expect(status).toHaveCount(1);
  await dial.focus();
  await dial.press('ArrowRight');
  await dial.press('ArrowRight');
  await expect(dial).toHaveAttribute('aria-valuetext', '5%');
  await expect(status).toContainText('dial set to 5%');
  await expect(page.locator('[data-prop="new"]')).toHaveAttribute('data-shoppers', '1');
  const said = await status.textContent();
  await stage(page).getByRole('button', { name: 'Step', exact: true }).press('Enter');
  await expect(status).toHaveText(said!);
  const play = stage(page).getByRole('button', { name: 'Play' });
  await play.press('Enter');
  await expect(status).toContainText('Playing from');
  await stage(page).getByRole('button', { name: 'Pause' }).press('Enter');
  await expect(status).toContainText('Paused at');
  await w.until(3);
  await card(page).getByRole('radio').first().press('Enter');
  await stage(page).getByRole('button', { name: 'Switch the flag off' }).press('Enter');
  await expect(status).toContainText('switching the flag off');
  await expect(dial).toBeDisabled();
  await axe(page);
});

test('the Errors tab draws the chart', async ({ page }) => {
  const w = releasesWalker(page, 'mouse');
  await w.open(CH6);
  await card(page).getByRole('radio').first().click();
  await w.until(3);
  await stage(page).getByRole('button', { name: 'Errors', exact: true }).click();
  await expect(stage(page).getByRole('img', { name: /^Failed checkouts by minute/ })).toBeVisible();
  await expect(stage(page).locator('[data-mark="back"]')).toHaveCount(1);
  await axe(page);
});

test('“I’m not sure” on a checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = releasesWalker(page, 'mouse');
  await w.open(CH2);
  const c = card(page);
  await c.getByRole('button', { name: /^Run the coupon/ }).click();
  await c.getByRole('radio').first().click();
  await c.getByRole('button', { name: /^Run the address/ }).click();
  await c.getByRole('radio', { name: 'I’m not sure' }).click();
  await expect(c).toContainText('Chapter complete');
  await expect(c.locator('.stamp.wrong')).toHaveCount(0);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('Next event replaces Play, nothing animates, and the chapters still play through', async ({ page }) => {
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
    const w = releasesWalker(page, 'mouse');
    await w.open(CH6);
    await card(page).getByRole('radio').first().click();
    await expect(stage(page).getByRole('button', { name: 'Play' })).toHaveCount(0);
    await stage(page).getByRole('button', { name: 'Next event' }).click();
    await expect(stage(page).locator('.rl-clock')).not.toHaveText('10:00');
    await still(page);
    await page.evaluate(() => localStorage.removeItem('releases-progress-v1'));
    await walkAll(releasesWalker(page, 'mouse', still));
  });
});

test('the recap asks from the finished chapter; with none done it says so', async ({ page }) => {
  const w = releasesWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/releases/recap/');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('releases-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
});

test('chapter 3 links to A/B testing’s luck chapter', async ({ page }) => {
  const w = releasesWalker(page, 'mouse');
  await w.open(CH3);
  await w.ch3();
  await expect(card(page).getByRole('link', { name: /how big a gap luck makes/ })).toHaveAttribute(
    'href',
    '/ab-testing/02-luck/',
  );
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/releases/', ...IDS.map(id => `/releases/${id}/`), '/releases/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      releasesWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
