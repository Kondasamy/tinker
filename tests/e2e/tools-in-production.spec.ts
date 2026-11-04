// Tools and MCP in production: the intro, every chapter played by its twin controls by mouse and by keyboard only, a
// tool dragged from its crate onto the board by pointer, an illegal drop snapping back with its reason, the reduced-
// motion end state at once, axe unzoomed and zoomed, the recap, and phone width (no side scroll, controls ≥ 44 px).
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { solve, TASKS } from '../../src/lib/tools-in-production/week';
import {
  axeAcrossZoom,
  chapterPlayer,
  choose,
  chooseByKeys,
  layoutHolds,
  type Mode,
  noSideScroll,
  PHONE,
  serious,
} from './helpers';

const M = moduleOf('tools-in-production');
const CH = M.chapters.map(c => c.id);
const at = (id: string) => new RegExp(`/tools-in-production/${id}/$`);
const path = (id: string) => `/tools-in-production/${id}/`;
test.setTimeout(180_000);

const BEST = solve().best;
const BEST_LINE = `${BEST.done} of ${TASKS} requests done, 0 leaks`;
const STOCK = 'Is the cordless drill in stock at the north warehouse?';

/** every chapter, in order, through its Next links */
async function playAll(page: Page, mode: Mode) {
  const c = chapterPlayer(page, mode);
  const kb = mode === 'keyboard';
  const sw = (server: string, name: string) =>
    c.press(c.card.getByRole('group', { name: server }).getByRole('button', { name, exact: true }));
  await c.open(path(CH[0]));
  for (const m of [
    () => c.btn('Hang', true),
    () => c.opt(/^It can reach/),
    () => c.btn('Ask'),
    () => c.btn('See what it picked'),
    () => c.opt(/^Every definition rides/),
  ])
    await m();
  await c.finish(at(CH[1]));
  await c.step(1);
  for (const m of [
    () => c.btn('Ask', true),
    () => c.opt(/^A small slice/),
    async () => {
      const box = c.stage.getByRole('combobox', { name: 'Request' });
      await (kb ? chooseByKeys(box, { label: STOCK }) : choose(box, { label: STOCK }));
      await c.btn('Ask', true);
    },
    () => c.btn('Count the tokens'),
    () => c.opt(/^The search tool, then/),
  ])
    await m();
  await c.finish(at(CH[2]));
  await c.step(1);
  for (const m of [
    () => c.btn('Next morning'),
    () => c.opt(/^It no longer fits/),
    () => c.btn('Hang', true),
    () => c.btn('See why it doesn’t fit'),
    () => c.opt(/^Nothing: it uses/),
  ])
    await m();
  await c.finish(at(CH[3]));
  await c.step(1);
  for (const m of [
    () => c.btn('Pin QuickPost'),
    () => c.btn('Next morning'),
    () => c.opt(/^It is held back/),
    () => c.btn('Hang', true),
    () => c.btn('See what the pin did'),
    () => c.opt(/^The print no longer/),
  ])
    await m();
  await c.finish(at(CH[4]));
  await c.step(1);
  for (const m of [
    () => c.btn('Read the description'),
    () => c.opt(/^Follow them/),
    () => c.btn('Hang', true),
    () => c.btn('See what it did'),
    () => c.btn('Stop trusting DocShelf'),
    () => c.opt(/^No: the pin only/),
  ])
    await m();
  await c.finish(at(CH[5]));
  await c.step(1);
  for (const m of [
    () => c.btn('Replay at the Order desk'),
    () => c.opt(/^Refused/),
    () => c.btn('Sign in per server'),
    () => c.btn('Replay at the Order desk'),
    () => c.btn('See why it was refused'),
    () => c.opt(/^Mail and files/),
  ])
    await m();
  await c.finish(at(CH[6]));
  await c.step(1);
  await c.btn('Run the week');
  await c.opt(/^DocShelf/);
  await sw('DocShelf', 'Trust');
  await sw('QuickPost', 'Pin');
  for (const s of ['Stockroom', 'Order desk', 'QuickPost']) await sw(s, 'Load when needed');
  await c.btn('Run the week');
  await expect(c.card).toContainText(BEST_LINE);
  await c.btn('See the best week');
  await c.finish();
}

test('the intro shows the level and the chapters', async ({ page }) => {
  await page.goto('/tools-in-production/');
  await expect(page.locator('.hero .module-meta .level')).toHaveText(M.level);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  expect(await serious(page)).toEqual([]);
});

test('every chapter plays by its twin controls, by mouse', async ({ page }) => {
  await playAll(page, 'mouse');
});
test('every chapter plays by keyboard only', async ({ page }) => {
  await playAll(page, 'keyboard');
});

/** the centre of a hit target in the picture */
const centre = async (page: Page, part: string) => {
  const b = (await page.locator(`[data-hit="${part}"] rect`).boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 6 });
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up();
}

test('a tool drags from its crate onto the board in the picture', async ({ page }) => {
  const c = chapterPlayer(page);
  await c.open(path(CH[2]));
  await c.btn('Next morning');
  await c.opt(/^It no longer fits/);
  await page.waitForTimeout(1300); // the overnight motion lands; targets are inert while it moves
  await drag(page, await centre(page, 'crate:quickpost'), await centre(page, 'board'));
  await c.step(4);
  await expect(page.locator('[data-hung="quickpost.book_courier"][data-fit="0"]')).toHaveCount(1, { timeout: 3000 });
});

test('a tool dropped off the board snaps back, and the status line says why', async ({ page }) => {
  const c = chapterPlayer(page);
  await c.open(path(CH[0]));
  const crate = await centre(page, 'crate:stockroom');
  const frame = (await page.locator('.stage .tc-frame').boundingBox())!;
  await drag(page, crate, { x: frame.x + 12, y: frame.y + frame.height - 12 });
  await expect(c.stage.getByRole('status')).toHaveText('Drop the tool on the board to hang it.');
  await expect(c.card).toContainText('Step 1 of');
  await expect(page.locator('[data-hung]')).toHaveCount(0);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the end state shows at once', async ({ page }) => {
    const c = chapterPlayer(page);
    await c.open(path(CH[0]));
    await c.btn('Hang', true);
    await expect(page.locator('[data-hung]')).toHaveCount(12, { timeout: 150 });
    await expect(page.locator('.iso-moving *')).toHaveCount(0);
  });
});

test('axe passes on the stage, unzoomed and closed in', async ({ page }) => {
  const c = chapterPlayer(page);
  await c.open(path(CH[0]));
  await c.btn('Hang', true);
  await c.opt(/^It can reach/);
  await page.waitForTimeout(1200);
  await axeAcrossZoom(page, async () => {
    await c.btn('Ask');
    await page.waitForTimeout(1500);
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  await playAll(page, 'mouse');
  await page.goto('/tools-in-production/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await serious(page)).toEqual([]);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, nothing scrolls sideways, controls are at least 44px', async ({ page }) => {
    for (const p of ['/tools-in-production/', path(CH[0]), path(CH[6]), '/tools-in-production/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
      await noSideScroll(page);
    }
    await page.goto(path(CH[1]));
    await page.locator('astro-island:not([ssr])').waitFor();
    for (const l of [
      page.getByRole('region', { name: 'Scene' }).getByRole('button', { name: 'Ask' }),
      page.getByRole('region', { name: 'Scene' }).getByRole('combobox', { name: 'Request' }),
    ])
      expect((await l.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
});
