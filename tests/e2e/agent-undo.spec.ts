// agent-undo: the intro, all seven chapters played by their twin controls (mouse and keyboard alone), the car tapped and
// a station dragged in the picture (and a drop off the track snapping back), reduced motion, axe with the stage zoomed
// and not, the recap, and phone width.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import {
  axeAcrossZoom,
  chapterPlayer,
  choose,
  chooseByKeys,
  layoutHolds,
  noSideScroll,
  PHONE,
  serious,
  type Mode,
} from './helpers';

const M = moduleOf('agent-undo');
const at = (n: number) => `/agent-undo/${M.chapters[n].id}/`;
const stageSvg = (page: Page) => page.locator('.stage svg[role="img"]').first();
const status = (page: Page) => page.locator('.au-status');
test.setTimeout(120_000);

/** Every chapter, played by the twin controls only (never the SVG). */
async function playAll(page: Page, mode: Mode) {
  const p = chapterPlayer(page, mode);
  const run = (name = 'Run') => p.btn(name, true);
  const next = (n: number) => new RegExp(at(n));
  await p.play(
    at(0),
    [() => p.opt(/^Half done/), () => run(), () => p.btn('See what still stands'), () => p.opt(/^Half booked/)],
    next(1),
  );
  await p.play(
    at(1),
    [
      () => run(),
      () => p.opt(/^It redoes all three/),
      () => run('Restart'),
      () => p.btn('See what the restart did'),
      async () => {
        await p.btn('Save points');
        await run();
      },
      () => p.opt(/^Read the log/),
    ],
    next(2),
  );
  await p.play(
    at(2),
    [
      async () => {
        const box = p.card.getByRole('combobox', { name: 'Opposite for the refund' });
        await (mode === 'keyboard' ? chooseByKeys : choose)(box, { label: 'Charge the $89 back' });
        await p.btn(/^Set$/);
      },
      () => p.opt(/^Newest first/),
      () => run(),
      () => p.btn('See the undo order'),
      () => p.opt(/^Cancel the booking/),
    ],
    next(3),
  );
  await p.play(
    at(3),
    [
      () => run(),
      () => run('Take it back'),
      () => p.opt(/^Send a second letter/),
      () => run('Send a second letter'),
      () => p.btn('See what Ana received'),
      () => p.opt(/^Post a correction/),
    ],
    next(4),
  );
  await p.play(
    at(4),
    [
      () => p.opt(/^At the top/),
      () => run('Move Post box up'),
      () => run(),
      () => p.btn('See the post box'),
      () => p.opt(/^Texting the ticket/),
    ],
    next(5),
  );
  await p.play(
    at(5),
    [
      () => run(),
      () => p.opt(/^Two refunds/),
      () => run('Retry'),
      () => p.btn('See what the bank did'),
      async () => {
        await p.btn(/^Key$/);
        await run();
      },
      () => p.opt(/^One booking/),
    ],
    next(6),
  );
  await p.play(at(6), [
    () => run('Run all failures'),
    () => p.opt(/^Move the post box/),
    async () => {
      for (const s of ['Stock opposite', 'Refund opposite', 'Courier opposite', 'Save points', /^Key$/]) await p.btn(s);
      await run('Move Post box up');
      await run('Run all failures');
    },
    () => p.btn('See the best setup'),
  ]);
  expect(await serious(page)).toEqual([]);
}

/** The centre of an in-picture target, in page pixels. */
async function centre(page: Page, part: string) {
  const b = await page.locator(`[data-hit="${part}"] rect`).boundingBox();
  if (!b) throw new Error(`no target ${part}`);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
async function drag(page: Page, part: string, to: { x: number; y: number }) {
  const from = await centre(page, part);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++)
    await page.mouse.move(from.x + ((to.x - from.x) * i) / 8, from.y + ((to.y - from.y) * i) / 8);
  await page.mouse.up();
}

test('the intro shows the level and the chapters', async ({ page }) => {
  await page.goto('/agent-undo/');
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

test('tapping the car in the picture runs the return', async ({ page }) => {
  const p = chapterPlayer(page);
  await p.open(at(0));
  await p.opt(/^Half done/);
  await p.step(2);
  const c = await centre(page, 'tap:car');
  await page.mouse.click(c.x, c.y);
  await p.step(3);
  await expect(stageSvg(page).locator('[data-station="courier"][data-mark="failed"]')).toHaveCount(1);
});

test('dragging the post box up the hill reorders it; off the track, it snaps back', async ({ page }) => {
  const p = chapterPlayer(page);
  await p.open(at(4));
  await p.opt(/^At the top/);
  await p.step(2);
  // off the track: refused, nothing moves
  const board = await stageSvg(page).boundingBox();
  await drag(page, 'station:email', { x: board!.x + board!.width * 0.92, y: board!.y + board!.height * 0.9 });
  await expect(status(page)).toHaveText(/Drop the station on one of the four stops/);
  await expect(stageSvg(page).locator('[data-station="email"]')).toHaveAttribute('data-slot', '2');
  // onto the top stop: the post box moves up past the courier
  await drag(page, 'station:email', await centre(page, 'slot:3'));
  await p.step(3);
  await expect(stageSvg(page).locator('[data-station="email"]')).toHaveAttribute('data-slot', '3');
});

test('with reduced motion the end state shows at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const p = chapterPlayer(page);
  await p.open(at(0));
  await p.opt(/^Half done/);
  await p.btn('Run', true);
  // no waiting: the very next frame is the end state, with nothing in flight
  expect(await stageSvg(page).locator('[data-station="courier"][data-mark="failed"]').count()).toBe(1);
  expect(await stageSvg(page).locator('[data-car="courier"]').count()).toBe(1);
  expect(await stageSvg(page).locator('.iso-moving').count()).toBe(0);
});

test('axe passes with the stage zoomed and not, and the close-up never resizes it', async ({ page }) => {
  const p = chapterPlayer(page);
  await p.open(at(0));
  await p.opt(/^Half done/);
  await p.step(2);
  await axeAcrossZoom(page, async () => {
    await p.btn('Run', true);
    await p.step(3);
    await page.waitForTimeout(2200);
  });
  // a wide close-up (refund to courier): only the stations inside it keep their pills
  await expect(stageSvg(page).locator('.block-tag')).toHaveCount(3);
});

test('the recap asks from finished chapters', async ({ page }) => {
  await playAll(page, 'mouse');
  await page.goto('/agent-undo/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await serious(page)).toEqual([]);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and the twin controls are at least 44 px', async ({ page }) => {
    for (const path of ['/agent-undo/', ...M.chapters.map((_, i) => at(i)), '/agent-undo/recap/']) {
      await page.goto(path);
      await layoutHolds(page);
      await noSideScroll(page);
    }
    await page.goto(at(4));
    await page.locator('astro-island:not([ssr])').first().waitFor();
    const stage = page.getByRole('region', { name: 'Scene' });
    for (const c of [
      stage.getByRole('button', { name: 'Run' }),
      stage.getByRole('button', { name: 'Move Post box up' }),
    ])
      expect((await c.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
});
