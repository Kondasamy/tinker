// Interpretability: the intro, every chapter played by mouse and by keyboard only, its own progress key, reduced
// motion, the recap, axe and phone width; pulling the word-start fuse changes the shown top 5; the Lens tab waits for
// Larkspur mini; chapter 3 plays offline; the go-live checks: Module 20 kickers and share images, home's card.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { interpretabilityWalker } from './interpretability-flow';
import { serious, layoutHolds, offline, PHONE } from './helpers';

const M = moduleOf('interpretability');
const IDS = M.chapters.map(c => c.id);
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = IDS;
const at = (id: string) => new RegExp(`/interpretability/${id}/$`);
async function walkAll(w: ReturnType<typeof interpretabilityWalker>) {
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
test.setTimeout(150_000);

test('the intro shows the level, the prerequisite, the author, the chapters and the Colorfigures credit', async ({
  page,
}) => {
  await page.goto('/interpretability/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Advanced');
  await expect(meta.getByRole('link', { name: 'Transformer architecture' })).toHaveAttribute('href', '/transformers/');
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Colorfigures' })).toHaveAttribute(
    'href',
    'https://april-zhu.com/colorfigures',
  );
  await axe(page);
});

test('Module 20 on the intro and the recap', async ({ page }) => {
  await page.goto('/interpretability/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 20 · Interpretability');
  await page.goto('/interpretability/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 20 · Recap');
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/interpretability/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/interpretability\.jpg$/);
  await page.goto(`/interpretability/${IDS[0]}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/interpretability-${IDS[0]}\\.jpg$`),
  );
  await page.goto('/interpretability/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /\/og\/interpretability-recap\.jpg$/,
  );
  expect((await page.request.get('/og/interpretability.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="interpretability"] h4 a')).toHaveAttribute(
    'href',
    '/interpretability/',
  );
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(interpretabilityWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in interpretability-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'transformers-progress-v1': JSON.stringify({ done: ['01-one-token-at-a-time'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(interpretabilityWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['interpretability-progress-v1']).done).toEqual(IDS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('interpretability');
});

test('chapter 2: pulling the word-start fuse changes the shown top 5 and darkens its fuse', async ({ page }) => {
  const w = interpretabilityWalker(page, 'mouse');
  await w.open(CH2);
  const c = card(page),
    top = c.locator('.ip-top');
  await expect(top).toHaveAttribute('data-in', '1');
  await expect(page.locator('.stage [data-fuse="h0-0"][data-pulled]')).toHaveCount(0);
  await c.getByRole('button', { name: 'Layer 1, head 1', exact: true }).click();
  await expect(top).toHaveAttribute('data-in', '0');
  await expect(page.locator('.stage [data-fuse="h0-0"][data-pulled]')).toHaveCount(1);
  await expect(page.locator('.stage [data-lit="1"]')).toHaveCount(0);
});

test('chapter 3: the Lens tab waits for Larkspur mini, and its grid moves with the arrow keys', async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(r => {
    release = r;
  });
  await page.route('**/data/lm/model.bin', async r => {
    await held;
    await r.continue();
  });
  await page.goto(`/interpretability/${CH3}/`);
  await page.locator('astro-island:not([ssr])').waitFor();
  await expect(page.locator('.ip-stage[data-model="loading"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lens', exact: true })).toBeDisabled();
  release();
  await expect(page.locator('.ip-stage[data-model="ready"]')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Lens', exact: true }).click();
  // step 2 holds the picture while the prediction is open; the reveal opens the lens
  const c = card(page);
  await c.getByRole('radio', { name: /^After block 1$/ }).click();
  await c.getByRole('button', { name: 'Show the lens' }).click();
  const cell = page.locator('.ip-lens [role="gridcell"][tabindex="0"]');
  await cell.focus();
  await expect(page.locator('.ip-readout')).toContainText('Output, guess 1');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.ip-readout')).toContainText('Output, guess 2');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.ip-readout')).toContainText('After block 1, guess 2');
  await axe(page);
});

test('chapter 3 plays to the end offline once Larkspur mini has loaded', async ({ page }) => {
  const failed: string[] = [];
  page.on('requestfailed', r => failed.push(r.url()));
  const w = interpretabilityWalker(page, 'mouse');
  await w.open(CH3);
  await page.waitForLoadState('networkidle');
  await offline(page);
  await w.ch3();
  expect(failed).toEqual([]);
});

test('“I’m not sure” on a checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = interpretabilityWalker(page, 'mouse');
  await w.open(CH6);
  const c = card(page);
  await c.getByRole('button', { name: 'Layer 1, neuron 3' }).click();
  await c.getByRole('radio').first().click();
  await c.getByRole('button', { name: 'Count them' }).click();
  await c.getByRole('button', { name: 'Layer 1, neuron 69' }).click();
  await c.getByRole('button', { name: 'Layer 2, neuron 64' }).click();
  await c.getByRole('radio', { name: 'I’m not sure' }).click();
  await expect(c).toContainText('Chapter complete');
  await expect(c.locator('.stamp.wrong')).toHaveCount(0);
});

test('chapter 7: Show me lands on a set that works, named one of several', async ({ page }) => {
  const w = interpretabilityWalker(page, 'mouse');
  await w.open(CH7);
  const c = card(page);
  await page.getByRole('button', { name: 'Show me' }).click();
  await expect(c).toContainText('Step 2 of');
  await page.getByRole('button', { name: '← Back' }).click();
  await expect(c.locator('[data-keeps]')).toHaveAttribute('data-keeps', '1');
  await expect(c.locator('[data-win]')).toHaveAttribute('data-win', '0');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the picture holds still and the chapters still play through', async ({ page }) => {
    const w = interpretabilityWalker(page, 'mouse', async p => {
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
  const w = interpretabilityWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/interpretability/recap/');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('interpretability-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/interpretability/', ...IDS.map(id => `/interpretability/${id}/`), '/interpretability/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      interpretabilityWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
