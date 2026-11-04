// Why did it fail?: the intro, every chapter played by its twin controls (mouse and keyboard), one in-picture tap, a
// drag out to the floor pile and an illegal drop that snaps back, the reduced-motion end state, axe zoomed and
// unzoomed, the recap, and 390 px (no side scroll, controls at least 44 px).
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { axeAcrossZoom, chapterPlayer, choose, chooseByKeys, noSideScroll, PHONE, serious, type Mode } from './helpers';

const M = moduleOf('causal-evals');
const path = (i: number) => `/causal-evals/${M.chapters[i].id}/`;

async function playAll(page: Page, mode: Mode) {
  const p = chapterPlayer(page, mode);
  const pick = (box: ReturnType<Page['getByRole']>, v: string) =>
    mode === 'keyboard' ? chooseByKeys(box, v) : choose(box, v);
  const piece = (i: number) => pick(p.stage.getByRole('combobox', { name: 'Piece' }), String(i));
  const run = (i: number) => pick(p.card.getByRole('combobox', { name: 'Run on the bench' }), String(i));
  const inStage = (name: string) => p.btn(new RegExp(`^${name}$`), true);

  await p.play(
    path(0),
    [
      () => inStage('Roll'),
      async () => {
        await piece(3);
        await inStage('Read');
      },
      () => p.opt(/it sends what it is handed/),
      async () => {
        await piece(7);
        await inStage('Read');
      },
      () => p.btn('See what piece 8 did'),
      () => p.opt(/^Little/),
    ],
    /02-blame-the-last-step/,
  );
  await p.play(
    path(1),
    [
      () => p.opt('Still in the wrong tray'),
      () => inStage('Swap and replay'),
      () => p.btn('See why it didn’t help'),
      () => p.opt(/^Probably the same mistake/),
    ],
    /03-replay-one-change/,
  );
  await p.play(
    path(2),
    [
      async () => {
        await piece(6);
        await inStage('Swap and replay');
      },
      () => p.opt(/^Piece 3/),
      async () => {
        await piece(2);
        await inStage('Swap and replay');
      },
      () => p.btn('See which swap flipped it'),
      () => p.opt(/^“Find account”/),
    ],
    /04-take-a-piece-out/,
  );
  await p.play(
    path(3),
    [
      () => p.opt('Still in the wrong tray'),
      async () => {
        await piece(1);
        await inStage('Take out and replay');
      },
      () => p.btn('See what still works'),
      async () => {
        await piece(2);
        await inStage('Take out and replay');
      },
      () => p.opt(/^This outcome doesn’t depend/),
    ],
    /05-break-it-on-purpose/,
  );
  await p.play(
    path(4),
    [
      () => inStage('Roll'),
      () => p.opt(/^Stops there/),
      () => inStage('Time out and roll'),
      () => p.btn('See how it coped'),
      () => p.btn('Add a retry and roll'),
      () => p.opt(/^To see how the shop copes/),
    ],
    /06-many-runs/,
  );
  await p.play(
    path(5),
    [
      () => inStage('Roll once'),
      () => p.opt('About as many as with nothing changed'),
      () => inStage('Roll 20'),
      () => p.btn('Compare with no change'),
      () => inStage('Swap 3, roll 20'),
      () => p.opt(/^Rerun many times/),
    ],
    /07-workbench/,
  );
  const solve = async (r: number, i: number) => {
    if (r) await run(r);
    await piece(i);
    await inStage('Swap and replay');
    await inStage('Name as the cause');
  };
  await p.play(path(6), [
    async () => {
      await piece(2);
      await inStage('Swap and replay');
    },
    () => p.opt(/^Step 2, Look up/),
    async () => {
      await inStage('Name as the cause');
      await solve(1, 1);
      await solve(2, 5);
      await solve(3, 0);
    },
    () => p.btn('See the four causes'),
  ]);
  await expect(p.card.getByText(/Found 4 of 4 causes · 4 of 12 replays used/)).toBeVisible();
}

test('the intro shows the level and the chapters', async ({ page }) => {
  await page.goto('/causal-evals/');
  await expect(page.locator('.hero .module-meta .level')).toHaveText(M.level);
  await expect(page.locator('#path [data-chapter]')).toHaveCount(M.chapters.length);
  expect(await serious(page)).toEqual([]);
});

test('every chapter plays by mouse', async ({ page }) => {
  test.setTimeout(120_000);
  await playAll(page, 'mouse');
  expect(await serious(page)).toEqual([]);
});
test('every chapter plays by keyboard only', async ({ page }) => {
  test.setTimeout(120_000);
  await playAll(page, 'keyboard');
});

const status = (page: Page) => page.getByRole('region', { name: 'Scene' }).getByRole('status');
const centre = async (page: Page, sel: string) => {
  const b = (await page.locator(sel).boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

test('a tap on a piece in the picture swaps it and replays', async ({ page }) => {
  await page.goto(path(2));
  await page.locator('astro-island:not([ssr])').waitFor();
  await page.locator('[data-hit="p3"] rect').click();
  await expect(status(page)).toContainText('right tray');
  await page.getByRole('button', { name: 'Replays' }).click();
  await expect(page.locator('.ce-log')).toContainText('Swapped piece 3 (Search)');
});

test('a piece dropped off the pile snaps back with a reason; dropped on the pile it comes out', async ({ page }) => {
  await page.goto(path(3));
  await page.locator('astro-island:not([ssr])').waitFor();
  const card = page.getByRole('region', { name: 'Next step' });
  await card.getByRole('radio', { name: 'Still in the wrong tray' }).click();
  const from = await centre(page, '[data-hit="p2"] rect');
  const svg = (await page.locator('.stage svg').first().boundingBox())!;
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(svg.x + 20, svg.y + 20, { steps: 8 });
  await page.mouse.up();
  await expect(status(page)).toContainText('Drop the piece on the floor pile');
  await expect(page.locator('.stage svg [data-piece="1"]').first()).toHaveAttribute('data-mode', 'as');
  const to = await centre(page, '[data-hit="pile"] rect');
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
  await expect(card).toContainText('Step 3 of');
  await expect(page.locator('.stage svg [data-piece="1"][data-mode="gone"]')).toHaveCount(1);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('a roll lands at once, the end state already drawn', async ({ page }) => {
    await page.goto(path(0));
    await page.locator('astro-island:not([ssr])').waitFor();
    await page.getByRole('region', { name: 'Scene' }).getByRole('button', { name: 'Roll', exact: true }).click();
    await expect(page.locator('.stage svg [data-tray="wrong"][data-n="1"]')).toHaveCount(1);
    expect(await page.locator('.stage svg .iso-moving .marble').count()).toBe(0);
  });
});

test('axe passes on the stage before and after the close-up', async ({ page }) => {
  const p = chapterPlayer(page);
  await p.open(path(1));
  await p.opt('Still in the wrong tray');
  await axeAcrossZoom(page, async () => {
    await p.btn('Swap and replay', true);
    await p.step(3);
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  await page.goto('/causal-evals/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await serious(page)).toEqual([]);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and the twin controls are at least 44 px', async ({ page }) => {
    for (const p of ['/causal-evals/', path(0), path(3), path(6), '/causal-evals/recap/']) {
      await page.goto(p);
      await page.waitForLoadState('load');
      await noSideScroll(page);
    }
    await page.goto(path(6));
    await page.locator('astro-island:not([ssr])').waitFor();
    for (const c of await page.locator('.ce-twin button, .ce-twin [role="combobox"]').all())
      expect((await c.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
});
