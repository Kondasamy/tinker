// multi-agent: the intro, all seven chapters played by their twin controls (mouse and keyboard alone), a cord dragged
// from the board's coil onto a desk in the picture (and an illegal drop refused), reduced motion, axe with the stage
// zoomed and not, the recap, and phone width.
import { test, expect, type Locator, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { axeAcrossZoom, chapterPlayer, choose, layoutHolds, noSideScroll, PHONE, serious, type Mode } from './helpers';

const M = moduleOf('multi-agent');
const at = (n: number) => `/multi-agent/${M.chapters[n].id}/`;
const stageSvg = (page: Page) => page.locator('.stage svg[role="img"]').first();
const status = (page: Page) => page.locator('.ma-status');

/** Every chapter, played by the twin controls only (never the SVG). */
async function playAll(page: Page, mode: Mode) {
  const p = chapterPlayer(page, mode);
  const radio = async (legend: string, name: string | RegExp) => {
    const r = p.stage.getByRole('group', { name: legend }).getByRole('radio', { name });
    if (mode === 'keyboard') {
      await r.focus();
      await r.press('Space');
    } else await r.click();
  };
  const runJob = () => p.btn('Run', true);
  await p.play(
    at(0),
    [() => p.opt(/^They are never read/), runJob, () => p.btn('See the floor'), () => p.opt(/^It summarises only/)],
    new RegExp(at(1)),
  );
  await p.play(
    at(1),
    [
      () => radio('Helpers', '3'),
      () => p.opt(/^It goes up/),
      runJob,
      () => p.btn('Read the meter'),
      () => p.opt(/^Faster and fuller/),
    ],
    new RegExp(at(2)),
  );
  await p.play(
    at(2),
    [
      runJob,
      () => p.opt(/^Its brief never said/),
      async () => {
        await radio('Brief', 'Detailed');
        await runJob();
      },
      () => p.btn('Look at desk 2'),
      () => p.opt(/^Briefs that split/),
    ],
    new RegExp(at(3)),
  );
  await p.play(
    at(3),
    [() => p.opt(/^It bounces back/), runJob, () => p.btn('Look at the ports'), () => p.opt(/^Send it back/)],
    new RegExp(at(4)),
  );
  await p.play(
    at(4),
    [
      runJob,
      () => p.opt(/^A timeout: after a while/),
      async () => {
        await radio('Timeout', 'On');
        await runJob();
      },
      () => p.btn('Look at the timer'),
      () => p.opt(/^A timeout, so one gives way/),
    ],
    new RegExp(at(5)),
  );
  await p.play(
    at(5),
    [
      runJob,
      () => p.opt(/^A check of each reply/),
      async () => {
        await radio('Check replies', 'On');
        await runJob();
      },
      () => p.btn('Look at port 2'),
      () => p.opt(/^Every time, against the source/),
    ],
    new RegExp(at(6)),
  );
  await p.play(at(6), [
    async () => {
      const job = p.stage.getByRole('combobox', { name: 'Job' });
      // the report: three helpers, detailed, checked
      await radio('Helpers', '3');
      await radio('Brief', 'Detailed');
      await radio('Check replies', 'On');
      // the euro list and the quote: the lead alone, checked
      for (const name of ['Euro price list', 'Four-supplier quote']) {
        await choose(job, { label: name });
        await radio('Helpers', '0');
        await radio('Check replies', 'On');
      }
    },
    () => p.opt(/^A few helpers with detailed briefs/),
  ]);
  expect(await serious(page)).toEqual([]);
}

/** The centre of an in-picture target, in page pixels. */
async function centre(page: Page, part: string) {
  const b = await page.locator(`[data-hit="${part}"] rect`).boundingBox();
  if (!b) throw new Error(`no target ${part}`);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
async function drag(page: Page, to: { x: number; y: number }) {
  const from = await centre(page, 'cord');
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++)
    await page.mouse.move(from.x + ((to.x - from.x) * i) / 8, from.y + ((to.y - from.y) * i) / 8);
  await page.mouse.up();
}
const cords = (svg: Locator) => svg.locator('[data-cord]:not([data-laying])');

test('the intro shows the level and the chapters', async ({ page }) => {
  await page.goto('/multi-agent/');
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

test('dragging a cord onto a desk hires that helper; off the desks, it snaps back', async ({ page }) => {
  const p = chapterPlayer(page);
  await p.open(at(1));
  // off every desk: refused, no cord laid
  const board = await stageSvg(page).boundingBox();
  await drag(page, { x: board!.x + board!.width * 0.92, y: board!.y + board!.height * 0.15 });
  await expect(status(page)).toHaveText(/Drop the cord on a helper’s desk/);
  await expect(cords(stageSvg(page))).toHaveCount(0);
  // onto desk 4: its cord is laid, and the helper count follows
  await drag(page, await centre(page, 'desk4'));
  await expect(stageSvg(page).locator('[data-cord="4"]:not([data-laying])')).toHaveCount(1);
  await expect(p.stage.getByRole('group', { name: 'Helpers' }).getByRole('radio', { name: '1' })).toBeChecked();
  // the same desk again: refused
  await page.waitForTimeout(1300);
  await drag(page, await centre(page, 'desk4'));
  await expect(status(page)).toHaveText(/Desk 4 already has a cord/);
});

test('with reduced motion the end state shows at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const p = chapterPlayer(page);
  await p.open(at(3));
  await p.opt(/^It bounces back/);
  await p.btn('Run', true);
  // no waiting: the very next frame is the end state, with nothing in flight
  expect(await stageSvg(page).locator('[data-plug="bounced"]').count()).toBeGreaterThan(0);
  expect(await stageSvg(page).locator('.iso-moving').count()).toBe(0);
});

test('axe passes with the stage zoomed and not, and the close-up never resizes it', async ({ page }) => {
  const p = chapterPlayer(page);
  await p.open(at(0));
  await p.opt(/^They are never read/);
  await axeAcrossZoom(page, async () => {
    await p.btn('Run', true);
    await p.step(3);
  });
  // zoomed on the lead's desk and the report, only their pills show (the unread spill, the missing count)
  await expect(page.locator('.stage .iso-pills .block-tag')).toHaveCount(2);
});

test('the recap asks from finished chapters', async ({ page }) => {
  await playAll(page, 'mouse');
  await page.goto('/multi-agent/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await serious(page)).toEqual([]);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and the twin controls are at least 44 px', async ({ page }) => {
    for (const path of ['/multi-agent/', ...M.chapters.map((_, i) => at(i)), '/multi-agent/recap/']) {
      await page.goto(path);
      await layoutHolds(page);
      await noSideScroll(page);
    }
    const p = chapterPlayer(page);
    const big = async (c: Locator) => {
      await expect(c).toBeVisible();
      expect((await c.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    };
    // the workbench has no Run button (it scores as you set), so Run is checked on chapter 1
    await p.open(at(6));
    await big(p.stage.getByRole('combobox', { name: 'Job' }));
    await big(p.stage.getByRole('group', { name: 'Helpers' }).locator('label').first());
    await p.open(at(0));
    await big(p.stage.getByRole('button', { name: 'Run' }));
  });
  test('a close-up step brings the stage, above the card, into view', async ({ page }) => {
    const p = chapterPlayer(page);
    await p.open(at(0));
    await p.opt(/^They are never read/);
    await p.btn('Run', true);
    await p.step(3);
    await expect(stageSvg(page)).toBeInViewport();
  });
});
