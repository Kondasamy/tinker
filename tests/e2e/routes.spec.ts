// Finding the way: the intro, every chapter played by mouse and by keyboard only, its own progress key, the road list
// and the map sharing one selection, a closed road's barrier in both views, no route with Reopen all, Step / Play with
// reduced motion, the recap, axe and phone width. The go-live adds the module's number, share images and home's card.
import { test, expect, type Locator, type Page } from '@playwright/test';
import { MODULES, moduleOf } from '../../src/lib/modules';
import { BRIDGES, ROADS, roadName } from '../../src/lib/routes/graph';
import { FASTEST, ROUTE_BRIDGE, OTHER_BRIDGE } from '../../src/lib/routes/story';
import { JAM_MINUTES, flipAt, jamOf } from '../../src/lib/routes/traffic';
import { dijkstra } from '../../src/lib/routes/dijkstra';
import { WEIGHTS, WINNERS } from '../../src/lib/routes/workbench';
import { choose, chooseByKeys, serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('routes');
const NUMBER = MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'routes') + 1;
const IDS = M.chapters.map(c => c.id);
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = IDS;
const at = (id: string) => new RegExp(`/routes/${id}/$`);
const FLIP = flipAt();
const FLIPPED = dijkstra(jamOf(FLIP));
// the list's order, as the kit sorts it (chapter files import CSS, so not imported here)
const BY_NAME = ROADS.map(r => r.id).sort((a, b) => roadName(a).localeCompare(roadName(b)));
const axe = async (page: Page) => expect(await serious(page)).toEqual([]);
test.setTimeout(240_000);

type Mode = 'mouse' | 'keyboard';
function walker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const stage = page.getByRole('region', { name: 'Scene' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name, exact: typeof name === 'string' }));
  const opt = (name: RegExp) => press(card.getByRole('radio', { name }));
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  const list = card.getByRole('listbox', { name: /^Roads/ });
  /** select a road: arrow keys from the top of the list, or a click on its option */
  const pick = async (id: string) => {
    if (!kb) return list.locator(`[data-option="${id}"]`).click();
    await list.focus();
    await list.press('Home');
    // the step may advance (and hide the list) as soon as the road is selected
    for (let i = 0; i < BY_NAME.indexOf(id); i++) await list.press('ArrowDown');
  };
  /** close or reopen the selected road: Enter in the list, or the button */
  const toggle = () => (kb ? list.press('Enter') : card.getByRole('button', { name: /this road$/ }).click());
  const slide = async (name: RegExp, to: number) => {
    const l = card.getByRole('slider', { name });
    if (!kb) return l.fill(String(to));
    const at = Number(await l.inputValue());
    for (let i = at; i !== to; i += to > at ? 1 : -1) await l.press(to > at ? 'ArrowRight' : 'ArrowLeft');
  };
  /** Step until the card reaches step n */
  const until = async (n: number) => {
    const stepper = stage.getByRole('button', { name: 'Step', exact: true });
    for (let i = 0; i < 40 && !(await card.textContent())!.includes(`Step ${n} of`); i++) await press(stepper);
    await step(n);
  };
  async function open(id: string) {
    await page.goto(`/routes/${id}/`);
    await page.locator('astro-island:not([ssr])').waitFor();
    await expect(card).toContainText('Step 1 of');
    await check(page);
  }
  async function finish(next?: RegExp) {
    await expect(card).toContainText('Chapter complete');
    await check(page);
    if (!next) return;
    await press(card.getByRole('link', { name: /^(Next:|Recap)/ }));
    await expect(page).toHaveURL(next);
    if (!/recap/.test(String(next))) await page.locator('astro-island:not([ssr])').waitFor();
  }
  return {
    open,
    /** pick the bridge, predict, close it (detour), close the other (no route), reopen all, quiz */
    async ch1(next?: RegExp) {
      await pick(ROUTE_BRIDGE);
      await step(2);
      await opt(/^Crosses the other bridge/);
      await step(3);
      await pick(ROUTE_BRIDGE);
      await toggle();
      await step(4);
      await pick(OTHER_BRIDGE);
      await toggle();
      await step(5);
      await expect(card.locator('.rt-status')).toContainText('No route');
      await expect(stage).toContainText('No route');
      await check(page);
      await btn('Reopen all');
      await step(6);
      await opt(/^That street/);
      await finish(next);
    },
    async ch2(next?: RegExp) {
      await btn('Fewest roads');
      await step(2);
      await opt(/^No: a route/);
      await step(3);
      await btn('Fewest minutes');
      await step(4);
      await opt(/^When a route with fewer stops/);
      await finish(next);
    },
    async ch3(next?: RegExp) {
      const stepper = stage.getByRole('button', { name: 'Step', exact: true });
      for (let i = 0; i < 3; i++) await press(stepper);
      await step(2);
      await opt(/^No: each settles/);
      await step(3);
      if (kb) await until(4);
      else {
        await stage.getByRole('button', { name: 'Play' }).click();
        await expect(card).toContainText('Step 4 of', { timeout: 30_000 });
      }
      await check(page);
      await opt(/^No: everything still waiting/);
      await finish(next);
    },
    async ch4(next?: RegExp) {
      await btn('A*');
      await step(2);
      await opt(/^The same/);
      await step(3);
      await until(4);
      await slide(/^Weight on the guess/, WEIGHTS.indexOf(2));
      await step(5);
      await opt(/^A\* with a weight/);
      await finish(next);
    },
    async ch5(next?: RegExp) {
      await opt(/^Only that road/);
      await step(2);
      await slide(/Lock to Dock, live/, JAM_MINUTES.indexOf(FLIP));
      await step(3);
      await pick(FLIPPED.roads[0]);
      await toggle();
      await step(4);
      await opt(/^That road’s cost/);
      await finish(next);
    },
    async ch6(next?: RegExp) {
      await opt(/^They work out shortcuts/);
      await step(2);
      await btn('Show the shortcuts');
      await step(3);
      await expect(card.getByRole('link', { name: 'Search’s index' })).toHaveAttribute('href', '/search/02-the-index/');
      await opt(/^Ahead of time/);
      await finish(next);
    },
    async ch7(next?: RegExp) {
      const w = WINNERS[0];
      const box = card.getByRole('combobox', { name: 'Search' });
      await (kb ? chooseByKeys(box, w.algo) : choose(box, w.algo));
      await slide(/weight/, WEIGHTS.indexOf(w.weight));
      await step(2);
      await check(page);
      await opt(/^A\* with a small weight/);
      await finish(next);
    },
  };
}
async function walkAll(w: ReturnType<typeof walker>) {
  await w.open(CH1);
  await w.ch1(at(CH2));
  await w.ch2(at(CH3));
  await w.ch3(at(CH4));
  await w.ch4(at(CH5));
  await w.ch5(at(CH6));
  await w.ch6(at(CH7));
  await w.ch7();
}

test('the intro shows the level and the chapters', async ({ page }) => {
  await page.goto('/routes/');
  await expect(page.locator('.hero .module-meta .level')).toHaveText(M.level);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await page.getByRole('button', { name: 'Words' }).click();
  await expect(page.locator('.band .note.more')).toBeVisible();
  await axe(page);
});

test('its module number on the intro and the recap', async ({ page }) => {
  await page.goto('/routes/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Finding the way`);
  await page.goto('/routes/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Recap`);
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/routes/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/routes\.jpg$/);
  await page.goto(`/routes/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/routes-${CH1}\\.jpg$`),
  );
  expect((await page.request.get('/og/routes.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="routes"] a').first()).toHaveAttribute('href', '/routes/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(walker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in routes-progress-v1', async ({ page }) => {
  await walkAll(walker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['routes-progress-v1']).done).toEqual(IDS);
});

test('a tap on a road in the picture selects it in the list; a closed road shows its barrier in both views', async ({
  page,
}) => {
  await page.goto(`/routes/${CH1}/`);
  await page.locator('astro-island:not([ssr])').waitFor();
  const stage = page.getByRole('region', { name: 'Scene' });
  const card = page.getByRole('region', { name: 'Next step' });
  // the road's clear tap line sits under the pills and posts; dispatch on it directly
  await stage.locator(`[data-road="${ROUTE_BRIDGE}"] path[stroke="transparent"]`).dispatchEvent('click');
  await expect(card).toContainText('Step 2 of');
  await card.getByRole('radio', { name: /^Crosses/ }).click();
  await stage.locator(`[data-road="${OTHER_BRIDGE}"] path[stroke="transparent"]`).dispatchEvent('click');
  const list = card.getByRole('listbox', { name: /^Roads/ });
  await expect(list.locator(`[data-option="${OTHER_BRIDGE}"]`)).toHaveAttribute('aria-selected', 'true');
  await card.getByRole('button', { name: 'Close this road' }).click();
  await expect(stage.locator(`[data-closed="${OTHER_BRIDGE}"]`)).toHaveCount(1);
  await expect(list.locator(`[data-option="${OTHER_BRIDGE}"]`)).toContainText('closed');
  await stage.getByRole('button', { name: 'Frontier' }).click();
  await expect(stage.getByRole('list', { name: 'Closed roads' })).toContainText('closed');
  await stage.getByRole('button', { name: 'Picture' }).click();
  // closing the route's bridge too leaves no route: the van holds at the depot, Reopen all brings it back
  await list.locator(`[data-option="${ROUTE_BRIDGE}"]`).click();
  await card.getByRole('button', { name: 'Close this road' }).click();
  await expect(card.locator('.rt-status')).toContainText('No route');
  expect(BRIDGES.every(b => b === ROUTE_BRIDGE || b === OTHER_BRIDGE)).toBe(true);
  await card.getByRole('button', { name: 'Reopen all' }).click();
  await expect(card.locator('.rt-status')).toContainText(`${FASTEST.minutes} min`);
  await axe(page);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('Play still settles every junction, and no flag animates', async ({ page }) => {
    const w = walker(page, 'mouse');
    await w.open(CH3);
    await w.ch3();
    const anim = await page
      .locator('.rt-flag')
      .evaluateAll(fs => fs.map(f => getComputedStyle(f).animationName).filter(n => n !== 'none'));
    expect(anim).toEqual([]);
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  const w = walker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/routes/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide', async ({ page }) => {
    for (const p of ['/routes/', ...IDS.map(id => `/routes/${id}/`), '/routes/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
  });
});
