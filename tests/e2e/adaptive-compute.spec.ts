// adaptive-compute: the intro, all seven chapters played by their twin controls (mouse and keyboard alone), a valve turned
// and a hose dragged in the picture, a missed drop refused, reduced motion, axe with the stage zoomed and not, the
// recap, and phone width.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { OPTS, type Opt } from '../../src/lib/adaptive-compute/effort';
import { axeAcrossZoom, chapterPlayer, layoutHolds, noSideScroll, PHONE, serious, type Mode } from './helpers';

const M = moduleOf('adaptive-compute');
const at = (n: number) => `/adaptive-compute/${M.chapters[n].id}/`;
const stageSvg = (page: Page) => page.locator('.stage svg[role="img"]').first();
const status = (page: Page) => page.locator('.ac-status');
const slider = (page: Page, kind: string) => page.getByRole('slider', { name: `${kind} valve` });

/** Every chapter, played by the twin controls only (never the SVG). */
async function playAll(page: Page, mode: Mode) {
  const p = chapterPlayer(page, mode);
  const valve = async (kind: string, to: Opt) => {
    const s = slider(page, kind);
    if (mode === 'mouse') return s.fill(String(OPTS.indexOf(to)));
    await s.focus();
    await s.press('Home');
    for (let i = 0; i < OPTS.indexOf(to); i++) await s.press('ArrowRight');
  };
  await p.play(
    at(0),
    [
      () => p.opt(/^The tower runs dry/),
      () => p.btn('Run the day', true),
      () => p.btn('See the tower'),
      () => p.btn('Shut every valve', true),
      () => p.opt(/^The seniors/),
    ],
    new RegExp(at(1)),
  );
  await p.play(
    at(1),
    [
      () => p.opt(/^Still wrong/),
      () => valve('Stock', 'think'),
      () => p.btn('See the stock valve'),
      () => valve('Puzzles', 'think'),
      () => p.opt(/^The bill goes up/),
    ],
    new RegExp(at(2)),
  );
  await p.play(
    at(2),
    [
      () => p.opt(/^All right, and cheaper/),
      () => valve('Stock', 'lookup'),
      () => p.btn('See the library wheel'),
      () => valve('Puzzles', 'lookup'),
      () => p.opt(/^Looking the rate/),
    ],
    new RegExp(at(3)),
  );
  await p.play(
    at(3),
    [
      () => p.opt(/^A second pass/),
      () => valve('Totals', 'check'),
      () => p.btn('See the sieve'),
      () => valve('Everyday', 'check'),
      () => p.opt(/^On the invoices/),
    ],
    new RegExp(at(4)),
  );
  await p.play(
    at(4),
    [
      () => p.opt(/^The big model/),
      () => valve('Warranty', 'think'),
      () => valve('Warranty', 'big'),
      () => p.btn('See the big model'),
      () => p.opt(/^A bigger model, for/),
    ],
    new RegExp(at(5)),
  );
  await p.play(
    at(5),
    [
      () => p.btn('Run the day', true),
      () => p.opt(/^About 20%/),
      () => p.btn('Sort each question', true),
      () => p.btn('See the tower'),
      () => p.opt(/^A cheap first pass/),
    ],
    new RegExp(at(6)),
  );
  await p.play(at(6), [
    async () => {
      for (const [k, o] of [
        ['Puzzles', 'think'],
        ['Stock', 'lookup'],
        ['Totals', 'check'],
        ['Warranty', 'big'],
      ] as const)
        await valve(k, o);
    },
    () => p.opt(/^Per kind of request/),
  ]);
  expect(await serious(page)).toEqual([]);
}

/** The centre of an in-picture target, in page pixels. */
async function centre(page: Page, part: string) {
  const b = await page.locator(`[data-hit="${part}"] rect`).boundingBox();
  if (!b) throw new Error(`no target ${part}`);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++)
    await page.mouse.move(from.x + ((to.x - from.x) * i) / 8, from.y + ((to.y - from.y) * i) / 8);
  await page.mouse.up();
}
/** Chapter 2, at the step that turns the stock valve. */
async function toStockStep(page: Page) {
  const p = chapterPlayer(page);
  await p.open(at(1));
  await p.opt(/^Still wrong/);
  await p.step(2);
  await page.waitForTimeout(300);
}

test('the intro shows the level and the chapters', async ({ page }) => {
  await page.goto('/adaptive-compute/');
  await expect(page.locator('.hero .module-meta .level')).toHaveText(M.level);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  expect(await serious(page)).toEqual([]);
});

test('chapters play by mouse on the twin controls', async ({ page }) => {
  await playAll(page, 'mouse');
});
test('chapters play by keyboard alone', async ({ page }) => {
  await playAll(page, 'keyboard');
});

test('tapping a valve wheel turns it one notch, to the thinking wheel', async ({ page }) => {
  await toStockStep(page);
  const c = await centre(page, 'valve:stock');
  await page.mouse.click(c.x, c.y);
  await expect(stageSvg(page).locator('[data-valve="stock"][data-to="think"]')).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Next step' })).toContainText('Step 3 of');
});

test('a hose dropped off the mills snaps back; dropped on the thinking wheel, it feeds it', async ({ page }) => {
  await toStockStep(page);
  const box = (await stageSvg(page).boundingBox())!;
  await drag(page, await centre(page, 'valve:stock'), { x: box.x + box.width * 0.12, y: box.y + box.height * 0.9 });
  await expect(status(page)).toHaveText(/Drop the stock hose on a mill/);
  await expect(stageSvg(page).locator('[data-valve="stock"][data-to="straight"]')).toHaveCount(1);
  await drag(page, await centre(page, 'valve:stock'), await centre(page, 'mill:think'));
  await expect(stageSvg(page).locator('[data-valve="stock"][data-to="think"]')).toHaveCount(1);
  await page.waitForTimeout(1300);
  await expect(stageSvg(page).locator('[data-mill="think"][data-wet="1"]')).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Next step' })).toContainText('Step 3 of');
});

test('with reduced motion the end state shows at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const p = chapterPlayer(page);
  await p.open(at(0));
  await p.opt(/^The tower runs dry/);
  await p.btn('Run the day', true);
  // no waiting: the very next frame is the end state, with nothing in flight
  expect(await stageSvg(page).locator('[data-part="tower"][data-dry="1"]').count()).toBe(1);
  expect(await stageSvg(page).locator('.iso-moving').count()).toBe(0);
});

test('axe passes with the stage zoomed and not, and the close-up never resizes it', async ({ page }) => {
  const p = chapterPlayer(page);
  await p.open(at(2));
  await p.opt(/^All right, and cheaper/);
  await p.step(2);
  await axeAcrossZoom(page, async () => {
    await slider(page, 'Stock').fill(String(OPTS.indexOf('lookup')));
    await p.step(3);
  });
  // zoomed, only the close-up part's pill shows
  await expect(stageSvg(page).locator('.block-tag')).toHaveCount(1);
});

test('the recap asks from finished chapters', async ({ page }) => {
  await playAll(page, 'mouse');
  await page.goto('/adaptive-compute/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await serious(page)).toEqual([]);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and the twin controls are at least 44 px', async ({ page }) => {
    for (const path of ['/adaptive-compute/', ...M.chapters.map((_, i) => at(i)), '/adaptive-compute/recap/']) {
      await page.goto(path);
      await layoutHolds(page);
      await noSideScroll(page);
    }
    await page.goto(at(6));
    await page.locator('astro-island:not([ssr])').first().waitFor();
    for (const k of ['Everyday', 'Puzzles', 'Stock', 'Totals', 'Warranty'])
      expect((await slider(page, k).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.goto(at(0));
    await page.locator('astro-island:not([ssr])').first().waitFor();
    await page
      .getByRole('region', { name: 'Next step' })
      .getByRole('radio', { name: /^The tower runs dry/ })
      .click();
    const run = page.getByRole('region', { name: 'Scene' }).getByRole('button', { name: 'Run the day' });
    expect((await run.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
  test('a close-up step brings the stage, above the card, into view', async ({ page }) => {
    const p = chapterPlayer(page);
    await p.open(at(0));
    await p.opt(/^The tower runs dry/);
    await p.btn('Run the day', true);
    await p.step(3);
    await expect(stageSvg(page)).toBeInViewport();
  });
});
