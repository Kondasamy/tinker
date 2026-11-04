// action-approvals: the intro, all seven chapters played by their twin controls (mouse and keyboard alone), a letter
// dragged into the in-tray and the hourglass tapped in the picture, a missed drop refused, reduced motion, axe with the
// stage zoomed and not, the recap, and phone width.
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

const M = moduleOf('action-approvals');
const at = (n: number) => `/action-approvals/${M.chapters[n].id}/`;
const stageSvg = (page: Page) => page.locator('.stage svg[role="img"]').first();
const status = (page: Page) => page.locator('.ap-status');

/** Every chapter, played by the twin controls only (never the SVG). */
async function playAll(page: Page, mode: Mode) {
  const p = chapterPlayer(page, mode);
  const deliver = () => p.btn('Deliver the next letter', true);
  const approve = () => p.btn('Approve', true);
  const refuse = () => p.btn('Refuse', true);
  const pick = (name: string, label: string) =>
    (mode === 'keyboard' ? chooseByKeys : choose)(p.card.getByRole('combobox', { name }), { label });
  await p.play(
    at(0),
    [
      deliver,
      approve,
      async () => {
        await deliver();
        await approve();
        await deliver();
        await approve();
      },
      () => p.opt(/^She stops reading/),
      () => p.btn('Look in the paid bin'),
      () => p.opt(/^They approve most/),
    ],
    new RegExp(at(1)),
  );
  await p.play(
    at(1),
    [
      deliver,
      deliver,
      () => p.opt(/^The email’s words/),
      () => p.btn('Follow the dye'),
      async () => {
        await p.btn('Turn on the dye rule');
        await deliver();
        await refuse();
      },
      () => p.opt(/^Any booking/),
    ],
    new RegExp(at(2)),
  );
  await p.play(
    at(2),
    [
      deliver,
      () => p.opt(/^All three: they come after/),
      async () => {
        await deliver();
        await p.btn('Look at the desk');
      },
      () => p.btn(/^Reply to billing/),
      () => p.opt(/^All three, since/),
    ],
    new RegExp(at(3)),
  );
  await p.play(
    at(3),
    [
      async () => {
        await deliver();
        await approve();
      },
      async () => {
        await deliver();
        await approve();
      },
      () => p.opt(/^Stops it/),
      async () => {
        await deliver();
        await p.btn('Watch the coins');
      },
      () => p.opt(/^A limit on the running total/),
    ],
    new RegExp(at(4)),
  );
  await p.play(
    at(4),
    [
      async () => {
        await deliver();
        await approve();
      },
      async () => {
        await deliver();
        await refuse();
      },
      () => p.btn('Wait an hour'),
      () => p.opt(/^It waits at the barrier/),
      async () => {
        await deliver();
        await p.btn('Watch the barrier');
      },
      () => p.opt(/^It asks again/),
    ],
    new RegExp(at(5)),
  );
  await p.play(
    at(5),
    [
      deliver,
      async () => {
        await p.btn('Split');
        await p.opt(/^No: only Rosa/);
      },
      async () => {
        await deliver();
        await p.btn('Look at the barrier');
      },
      () => p.opt(/^Nothing is ordered/),
    ],
    new RegExp(at(6)),
  );
  await p.play(at(6), [
    () => pick('Who waits for a yes', 'Dyed refunds wait'),
    async () => {
      await pick('Day’s budget', '£150 a day');
      await pick('A yes lasts', 'One hour, one order');
    },
    () => p.opt(/^Ask only about actions/),
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
  const from = await centre(page, 'letter');
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++)
    await page.mouse.move(from.x + ((to.x - from.x) * i) / 8, from.y + ((to.y - from.y) * i) / 8);
  await page.mouse.up();
}

test('the intro shows the level and the chapters', async ({ page }) => {
  await page.goto('/action-approvals/');
  await expect(page.locator('.hero .module-meta .level')).toHaveText(M.level);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  expect(await serious(page)).toEqual([]);
});

test('chapters play by mouse on the twin controls', async ({ page }) => {
  test.setTimeout(120_000);
  await playAll(page, 'mouse');
});
test('chapters play by keyboard alone', async ({ page }) => {
  test.setTimeout(120_000);
  await playAll(page, 'keyboard');
});

test('a letter dragged off the in-tray snaps back; into it, its refund waits; a tap on the hourglass approves', async ({
  page,
}) => {
  await page.goto(at(0));
  await page.locator('astro-island:not([ssr])').first().waitFor();
  const board = await stageSvg(page).boundingBox();
  await drag(page, { x: board!.x + board!.width * 0.85, y: board!.y + board!.height * 0.8 });
  await expect(status(page)).toHaveText(/Drop the letter in the in-tray/);
  await expect(stageSvg(page).locator('[data-slip]')).toHaveCount(0);
  await drag(page, await centre(page, 'tray'));
  await expect(stageSvg(page).locator('[data-slip="saw-41"][data-at="gate"]')).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Next step' })).toContainText('Step 2 of');
  await page.waitForTimeout(1200); // the motion lands; targets are inert while it runs
  const glass = await centre(page, 'hourglass');
  await page.mouse.click(glass.x, glass.y);
  await expect(stageSvg(page).locator('[data-slip="saw-41"][data-at="paid"]')).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Next step' })).toContainText('Step 3 of');
});

test('with reduced motion the end state shows at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(at(1));
  await page.locator('astro-island:not([ssr])').first().waitFor();
  const deliver = page.getByRole('region', { name: 'Scene' }).getByRole('button', { name: 'Deliver the next letter' });
  await deliver.click();
  await page.getByRole('region', { name: 'Next step' }).getByText('Step 2 of').waitFor();
  await deliver.click();
  // no waiting: the very next frame is the end state, the dye already down both pipes
  expect(await stageSvg(page).locator('[data-slip="fake-88"][data-at="paid"][data-dyed="1"]').count()).toBe(1);
  expect(await stageSvg(page).locator('[data-pipe="out"][data-dyed="1"]').count()).toBe(1);
  expect(await stageSvg(page).locator('.iso-moving > *').count()).toBe(0);
});

test('axe passes with the stage zoomed and not, and the close-up never resizes it', async ({ page }) => {
  const p = chapterPlayer(page);
  await p.open(at(3));
  for (let i = 0; i < 2; i++) {
    await p.btn('Deliver the next letter', true);
    await p.btn('Approve', true);
  }
  await p.step(3);
  await page.waitForTimeout(1200);
  await axeAcrossZoom(page, async () => {
    await p.opt(/^Stops it/);
    await p.step(4);
    await p.btn('Deliver the next letter', true);
  });
  // zoomed, only the close-up parts' pills show
  await expect(stageSvg(page).locator('.block-tag')).toHaveCount(2);
});

test('a reveal step that asks for a letter stays unzoomed until it is in, so the letter drags in the picture', async ({
  page,
}) => {
  const p = chapterPlayer(page);
  await p.open(at(3));
  for (let i = 0; i < 2; i++) {
    await p.btn('Deliver the next letter', true);
    await p.btn('Approve', true);
  }
  await p.step(3);
  await p.opt(/^Stops it/);
  await p.step(4);
  await expect(stageSvg(page).locator('.iso-moving > *')).toHaveCount(0);
  await drag(page, await centre(page, 'tray'));
  await expect(stageSvg(page).locator('[data-slip][data-at="stopped"]')).toHaveCount(1);
});

test('the recap asks from finished chapters', async ({ page }) => {
  test.setTimeout(120_000);
  await playAll(page, 'mouse');
  await page.goto('/action-approvals/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await serious(page)).toEqual([]);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and the twin controls are at least 44 px', async ({ page }) => {
    for (const path of ['/action-approvals/', ...M.chapters.map((_, i) => at(i)), '/action-approvals/recap/']) {
      await page.goto(path);
      await layoutHolds(page);
      await noSideScroll(page);
    }
    await page.goto(at(0));
    await page.locator('astro-island:not([ssr])').first().waitFor();
    const scene = page.getByRole('region', { name: 'Scene' });
    for (const name of ['Deliver the next letter', 'Approve'])
      expect((await scene.getByRole('button', { name }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
});
