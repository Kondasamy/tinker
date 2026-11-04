// Memory you can trust: the intro, every chapter played by its twin controls (mouse and keyboard only), a paper dragged
// into the bin in the picture (and one dropped elsewhere, snapping back with a status line), the reduced-motion end
// state, axe zoomed and unzoomed, the recap, and phone width (no side scroll, controls ≥ 44 px).
import { expect, type Page, test } from '@playwright/test';
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
} from './helpers';

const M = moduleOf('agent-memory');
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = M.chapters.map(c => c.id);
const at = (id: string) => new RegExp(`/agent-memory/${id}/$`);
const path = (id: string) => `/agent-memory/${id}/`;
test.setTimeout(240_000);

/** every chapter by its twin controls, in order, following each Next link */
async function playAll(page: Page, mode: 'mouse' | 'keyboard') {
  const g = chapterPlayer(page, mode);
  const pick = async (name: string, value: string) => {
    const box = g.stage.getByRole('combobox', { name });
    await (mode === 'keyboard' ? chooseByKeys(box, value) : choose(box, value));
  };
  const source = async (id: string, button: string) => {
    await pick('Source', id);
    await g.btn(button, true);
  };
  const bench = async (name: string, label: string) => {
    const box = g.card.getByRole('combobox', { name });
    await (mode === 'keyboard' ? chooseByKeys(box, { label }) : choose(box, { label }));
  };
  const step = (n: number) => g.step(n);

  await g.open(path(CH1));
  await g.btn('Keep all', true);
  await step(2);
  await g.opt(/^About 3/);
  await g.btn('Keep lasting facts', true);
  await step(4);
  await g.btn('Count what lasts');
  await g.opt(/^Facts the customer/);
  await g.finish(at(CH2));

  await step(1);
  await source('chat-ada', 'Trace');
  await step(2);
  await g.opt(/^The cards hanging/);
  await source('orders', 'Trace');
  await step(4);
  await g.btn('Follow the threads');
  await g.opt(/^Where it came from/);
  await g.finish(at(CH3));

  await step(1);
  await g.btn('Add the new order', true);
  await step(2);
  await g.opt(/^14 Mill Lane/);
  await g.btn('See which stays');
  await g.btn('Read the web page', true);
  await step(5);
  await g.opt(/^It depends/);
  await g.finish(at(CH4));

  await step(1);
  await g.btn('Jump to day 30', true);
  await step(2);
  await g.opt(/^Every card about Cara/);
  await g.btn('Forget Cara', true);
  await step(4);
  await g.btn('See what went');
  await g.opt(/^Everything about them/);
  await g.finish(at(CH5));

  await step(1);
  await g.btn('Read the page', true);
  await step(2);
  await g.btn('Run day 19', true);
  await step(3);
  await g.opt(/^They stay/);
  await g.btn('Look at the board');
  await g.opt(/^The memory stays/);
  await g.finish(at(CH6));

  await step(1);
  await g.opt(/^The page, its rule/);
  await source('web-deals', 'Undo source');
  await step(3);
  await g.btn('Count what fell');
  await source('chat-dan', 'Undo source');
  await step(5);
  await g.opt(/^Every memory that came/);
  await g.finish(at(CH7));

  await step(1);
  await bench('Keep', 'Keep lasting facts');
  await bench('Expiry', 'Expire by kind');
  await bench('Trust', 'Better source wins, then newer');
  await source('web-deals', 'Undo source');
  await source('chat-dan', 'Undo source');
  await step(2);
  await expect(g.card).toContainText('TRUSTED');
  await g.opt(/^Every memory records/);
  await g.finish();
}

test('the intro shows the level and the chapters', async ({ page }) => {
  await page.goto('/agent-memory/');
  await expect(page.locator('.hero .module-meta .level')).toHaveText(M.level);
  await expect(page.locator('#path [data-chapter]')).toHaveCount(M.chapters.length);
  expect(await serious(page)).toEqual([]);
});

test('every chapter plays by mouse', async ({ page }) => {
  await playAll(page, 'mouse');
});
test('every chapter plays by keyboard only', async ({ page }) => {
  await playAll(page, 'keyboard');
});

/** drag one source paper from its place to a point (a Locator's centre, or a page point) */
async function drag(page: Page, part: string, to: { x: number; y: number }) {
  const from = (await page.locator(`[data-hit="${part}"] rect`).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
}

test('a paper dragged into the bin pulls its thread; dropped elsewhere it snaps back and says why', async ({
  page,
}) => {
  const g = chapterPlayer(page);
  await g.open(path(CH6));
  await g.opt(/^The page, its rule/);
  await g.step(2);
  await page.waitForTimeout(400);
  const status = g.stage.getByRole('status');
  // a drop on empty floor: refused, nothing moved
  const svg = (await g.stage.locator('svg').first().boundingBox())!;
  await drag(page, 'src:web-deals', { x: svg.x + 8, y: svg.y + svg.height - 8 });
  await expect(status).toContainText('Drop the paper in the bin');
  await expect(g.card).toContainText('Step 2 of');
  // a trusted paper into the bin: refused
  const bin = (await page.locator('[data-hit="bin"] rect').boundingBox())!;
  await drag(page, 'src:orders', { x: bin.x + bin.width / 2, y: bin.y + bin.height / 2 });
  await expect(status).toContainText('a source you trust');
  // the planted page into the bin: its cards fall
  await drag(page, 'src:web-deals', { x: bin.x + bin.width / 2, y: bin.y + bin.height / 2 });
  await g.step(3);
  await expect(g.stage.locator('[data-source="web-deals"][data-at="bin"]')).toHaveCount(1);
  await expect(g.stage.locator('[data-card="web-id"][data-at="bin"]')).toHaveCount(1);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the end state shows at once, with nothing in flight', async ({ page }) => {
    const g = chapterPlayer(page);
    await g.open(path(CH6));
    await g.opt(/^The page, its rule/);
    await choose(g.stage.getByRole('combobox', { name: 'Source' }), 'web-deals');
    await g.btn('Undo source', true);
    await expect(g.stage.locator('[data-card="web-skip"][data-at="bin"]')).toHaveCount(1);
    await expect(g.stage.locator('.iso-moving')).toHaveCount(0);
  });
});

test('axe passes unzoomed and on a close-up, and the picture never resizes', async ({ page }) => {
  const g = chapterPlayer(page);
  await g.open(path(CH1));
  await g.btn('Keep all', true);
  await g.opt(/^About 3/);
  await axeAcrossZoom(page, async () => {
    await g.btn('Keep lasting facts', true);
    await g.step(4);
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  await playAll(page, 'mouse');
  await page.goto('/agent-memory/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await serious(page)).toEqual([]);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and the twin controls are at least 44 px', async ({ page }) => {
    for (const p of ['/agent-memory/', path(CH1), path(CH6), path(CH7), '/agent-memory/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
      await noSideScroll(page);
    }
    await page.goto(path(CH6));
    await page.locator('astro-island:not([ssr])').first().waitFor();
    for (const c of await page.locator('.am-twin button, .am-twin [role="combobox"]').all()) {
      const b = (await c.boundingBox())!;
      expect(b.height).toBeGreaterThanOrEqual(44);
    }
    for (const r of await page.locator('[data-hit] rect').all()) {
      const b = (await r.boundingBox())!;
      expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(43);
    }
  });
});
