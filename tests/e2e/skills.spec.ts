// skills: the intro, all seven chapters played by their twin controls (mouse and keyboard alone), the ticket dragged onto the
// carousel in the picture, reduced motion, axe with the stage zoomed and not, the recap, and phone width.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { LABELS, requestOf, SKILLS } from '../../src/lib/skills/skills';
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

const M = moduleOf('skills');
const at = (n: number) => `/skills/${M.chapters[n].id}/`;
const stageSvg = (page: Page) => page.locator('.stage svg[role="img"]').first();
const ticketBox = (page: Page) => page.getByRole('combobox', { name: 'Ticket' });
const status = (page: Page) => page.locator('.sk-status');

/** Every chapter, played by the twin controls only (never the SVG). */
async function playAll(page: Page, mode: Mode) {
  const p = chapterPlayer(page, mode);
  const pickTicket = (id: string) =>
    mode === 'keyboard'
      ? chooseByKeys(ticketBox(page), { label: requestOf(id).text })
      : choose(ticketBox(page), { label: requestOf(id).text });
  const ask = async (id?: string) => {
    if (id) await pickTicket(id);
    await p.btn('Ask', true);
  };
  await p.play(
    at(0),
    [
      () => ask(),
      () => p.opt(/^It is buried/),
      () => p.btn('Find the refund rule'),
      () => ask('print-label'),
      () => p.opt(/^All 30 pages/),
    ],
    new RegExp(at(1)),
  );
  await p.play(
    at(1),
    [
      () => ask(),
      () => p.opt(/^Every label, plus/),
      () => p.btn('Count the words'),
      async () => {
        await ask('swap-boots');
        await ask('tiles');
      },
      () => p.opt(/^All 50 labels/),
    ],
    new RegExp(at(2)),
  );
  const pickIn = (box: ReturnType<Page['getByRole']>, label: string) =>
    (mode === 'keyboard' ? chooseByKeys : choose)(box, { label });
  await p.play(
    at(2),
    [
      () => ask(),
      () => p.opt(/^A description saying/),
      async () => {
        await pickIn(p.card.getByRole('combobox'), LABELS.warranty);
        await ask();
      },
      () => p.btn('See why it opened'),
      () => p.opt(/^A description of what it does/),
    ],
    new RegExp(at(3)),
  );
  await p.play(
    at(3),
    [
      () => ask(),
      () => p.opt(/^Only its short answer/),
      () => p.btn('Run the script'),
      () => p.btn('Count the words'),
      () => p.opt(/^Only what the script prints/),
    ],
    new RegExp(at(4)),
  );
  await p.play(
    at(4),
    [
      () => ask(),
      () => p.opt(/^Sharpen Damaged/),
      async () => {
        await pickIn(p.card.getByRole('combobox'), LABELS.damaged);
        await ask();
      },
      () => p.btn('See why it moved'),
      () => ask('tiles'),
      () => p.opt(/^Rewrite both labels/),
    ],
    new RegExp(at(5)),
  );
  await p.play(
    at(5),
    [
      () => p.opt(/^Instructions that tell/),
      () => p.btn('Read it first'),
      () => p.btn('Show the hidden page'),
      () => p.btn('Refuse it'),
      () => p.opt(/^Read every file/),
    ],
    new RegExp(at(6)),
  );
  await p.play(at(6), [
    () => p.btn('Run all tickets'),
    () => p.opt(/^Short labels/),
    async () => {
      const boxes = p.card.getByRole('combobox');
      for (const [i, k] of SKILLS.entries()) await pickIn(boxes.nth(i), k.label);
      await p.btn('Run all tickets');
    },
    () => p.btn('See the winning set'),
    () => p.opt(/^Labels overlap/),
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
  const from = await centre(page, 'ticket');
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++)
    await page.mouse.move(from.x + ((to.x - from.x) * i) / 8, from.y + ((to.y - from.y) * i) / 8);
  await page.mouse.up();
}

test('the intro shows the level and the chapters', async ({ page }) => {
  await page.goto('/skills/');
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

test('dragging the ticket onto the carousel opens the matching binder; off it, the ticket snaps back', async ({
  page,
}) => {
  await page.goto(at(1));
  await page.locator('astro-island:not([ssr])').first().waitFor();
  // off the carousel: refused, nothing opens
  const board = await stageSvg(page).boundingBox();
  await drag(page, { x: board!.x + board!.width * 0.85, y: board!.y + board!.height * 0.75 });
  await expect(status(page)).toHaveText(/Drop the ticket on the carousel/);
  await expect(stageSvg(page).locator('[data-at="desk"]')).toHaveCount(0);
  await expect(stageSvg(page).locator('[data-ticket]')).toHaveCount(1); // back on the tray
  // onto the carousel: the refund binder swings out and opens
  await drag(page, await centre(page, 'carousel'));
  await expect(status(page)).toHaveText(/turned to Refunds/);
  await expect(stageSvg(page).locator('[data-binder="refunds"][data-at="desk"][data-open="1"]')).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Next step' })).toContainText('Step 2 of');
});

test('with reduced motion the end state shows at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(at(0));
  await page.locator('astro-island:not([ssr])').first().waitFor();
  await page.getByRole('region', { name: 'Scene' }).getByRole('button', { name: 'Ask' }).click();
  // no waiting: the very next frame is the end state, with nothing in flight
  expect(await stageSvg(page).locator('[data-at="desk"]').count()).toBe(6);
  expect(await stageSvg(page).locator('.iso-moving').count()).toBe(0);
});

test('axe passes with the stage zoomed and not, and the close-up never resizes it', async ({ page }) => {
  const p = chapterPlayer(page);
  await p.open(at(1));
  await p.btn('Ask', true);
  await p.step(2);
  await axeAcrossZoom(page, async () => {
    await p.opt(/^Every label, plus/);
    await p.step(3);
    await page.waitForTimeout(800);
  });
  // zoomed, only the close-up part's pill shows
  await expect(stageSvg(page).locator('.block-tag')).toHaveCount(1);
});

test('the recap asks from finished chapters', async ({ page }) => {
  await playAll(page, 'mouse');
  await page.goto('/skills/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await serious(page)).toEqual([]);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and the twin controls are at least 44 px', async ({ page }) => {
    for (const path of ['/skills/', ...M.chapters.map((_, i) => at(i)), '/skills/recap/']) {
      await page.goto(path);
      await layoutHolds(page);
      await noSideScroll(page);
    }
    await page.goto(at(1));
    await page.locator('astro-island:not([ssr])').first().waitFor();
    for (const c of [ticketBox(page), page.getByRole('region', { name: 'Scene' }).getByRole('button', { name: 'Ask' })])
      expect((await c.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
  test('a close-up step brings the stage, above the card, into view', async ({ page }) => {
    const p = chapterPlayer(page);
    await p.open(at(1));
    await p.btn('Ask', true);
    await p.step(2);
    await p.opt(/^Every label, plus/);
    await p.step(3);
    await expect(stageSvg(page)).toBeInViewport();
  });
});
