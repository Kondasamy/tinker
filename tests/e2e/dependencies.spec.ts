// Dependencies: the intro, every chapter played by mouse and by keyboard only, its own progress key, the pull-a-crate
// mechanic by keyboard (arrow keys between crates, the version drop-down, Pull) with its one polite read-out, the tree,
// "I'm not sure", reduced motion (crates recolour without toppling), the recap, axe and phone width. The go-live adds
// the module's number, share images and home's card.
import { test, expect, type Page } from '@playwright/test';
import { MODULES, moduleOf } from '../../src/lib/modules';
import { dependenciesWalker } from './dependencies-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('dependencies');
const NUMBER = MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'dependencies') + 1;
const IDS = M.chapters.map(c => c.id);
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = IDS;
const at = (id: string) => new RegExp(`/dependencies/${id}/$`);
async function walkAll(w: ReturnType<typeof dependenciesWalker>) {
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
  await page.goto('/dependencies/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Intermediate');
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await page.getByRole('button', { name: 'Words' }).click();
  await expect(page.locator('.band .note.more')).toBeVisible();
  await axe(page);
});

test('its module number on the intro and the recap', async ({ page }) => {
  await page.goto('/dependencies/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Dependencies`);
  await page.goto('/dependencies/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Recap`);
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/dependencies/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/dependencies\.jpg$/);
  await page.goto(`/dependencies/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/dependencies-${CH1}\\.jpg$`),
  );
  await page.goto('/dependencies/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/dependencies-recap\.jpg$/);
  expect((await page.request.get('/og/dependencies.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="dependencies"] h4 a')).toHaveAttribute('href', '/dependencies/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(dependenciesWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in dependencies-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(dependenciesWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['dependencies-progress-v1']).done).toEqual(IDS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('dependencies');
});

test('pull a crate by keyboard: arrow keys between crates, Pull, one polite read-out naming what broke', async ({
  page,
}) => {
  const w = dependenciesWalker(page, 'keyboard');
  await w.open(CH1);
  await card(page).getByRole('radio').nth(1).press('Enter');
  await card(page).getByRole('button', { name: 'Install' }).press('Enter');
  const bar = stage(page).getByRole('toolbar', { name: 'Crates' });
  const first = bar.getByRole('button').first();
  await first.focus();
  await first.press('ArrowRight');
  await expect(bar.getByRole('button').nth(1)).toBeFocused();
  const name = (await bar.getByRole('button').nth(1).textContent())!;
  await page.keyboard.press('Enter');
  await stage(page)
    .getByRole('button', { name: `Pull ${name}` })
    .press('Enter');
  const status = stage(page).locator('[role="status"]');
  await expect(status).toHaveCount(1);
  await expect(status).toHaveAttribute('aria-live', 'polite');
  await expect(status).toContainText(`Pulled ${name}. Broken:`);
  await expect(page.locator(`[data-pulled="${name}"]`)).toHaveCount(1);
  await expect(card(page)).toContainText('Step 4 of');
  await axe(page);
});

test('the Tree tab is a list in a focusable region', async ({ page }) => {
  const w = dependenciesWalker(page, 'mouse');
  await w.open(CH3);
  await page.getByRole('button', { name: 'Tree', exact: true }).click();
  const region = page.getByRole('region', { name: 'Tree' });
  await expect(region.locator('li[data-path="cartwheel/tidystr"]')).toBeVisible();
  await region.focus();
  await expect(region).toBeFocused();
  await axe(page);
});

test('“I’m not sure” on a checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = dependenciesWalker(page, 'mouse');
  await w.open(CH4);
  const c = card(page);
  await c.getByRole('radio').first().click();
  await c.getByRole('button', { name: /^Install on day/ }).click();
  await c.getByRole('checkbox', { name: 'Lockfile' }).click();
  await c.getByRole('radio', { name: 'I’m not sure' }).click();
  await expect(c).toContainText('Chapter complete');
  await expect(c.locator('.stamp.wrong')).toHaveCount(0);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('pulled crates’ dependants recolour and carry planks without toppling; the chapters still play', async ({
    page,
  }) => {
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
    const w = dependenciesWalker(page, 'mouse');
    await w.open(CH1);
    await card(page).getByRole('radio').nth(1).click();
    await card(page).getByRole('button', { name: 'Install' }).click();
    await w.pull();
    await expect(page.locator('[data-fell="1"]').first()).toBeAttached();
    await expect(page.locator('[data-broken="1"] .planks').first()).toBeAttached();
    await still(page);
    await page.evaluate(() => localStorage.removeItem('dependencies-progress-v1'));
    await walkAll(dependenciesWalker(page, 'mouse', still));
  });
});

test('the recap asks from the finished chapter; with none done it says so', async ({ page }) => {
  const w = dependenciesWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/dependencies/recap/');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('dependencies-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/dependencies/', ...IDS.map(id => `/dependencies/${id}/`), '/dependencies/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      dependenciesWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
