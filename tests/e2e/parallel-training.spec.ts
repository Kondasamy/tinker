// Many chips, one model: the intro, every chapter played by mouse and by keyboard only, its own progress key, pass the
// buckets (Step, Play hidden under reduced motion, one read-out), the workbench's winning and losing layouts, "I'm not
// sure", the recap, axe and phone width (controls ≥ 44 px). The go-live checks (share images, home card) join at go-live.
import { test, expect, type Locator, type Page } from '@playwright/test';
import { MODULES, moduleOf } from '../../src/lib/modules';
import pinned from '../../data/parallel-training/pinned.json' with { type: 'json' };
import { WINNERS } from '../../src/lib/parallel-training/workbench';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('parallel-training');
const NUMBER = MODULES.filter(m => m.status === 'live').findIndex(m => m.id === M.id) + 1;
const CHS = M.chapters.map(c => c.id),
  [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = CHS;
const at = (id: string) => new RegExp(`/parallel-training/${id}/$`);
const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
// let the stage's fade finish first: axe can catch a figure mid-fade and report false contrast failures
const axe = async (page: Page) => {
  await page.waitForTimeout(400);
  expect(await serious(page)).toEqual([]);
};
test.setTimeout(240_000);

type Mode = 'mouse' | 'keyboard';
function walker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const c = card(page);
  const btn = (name: string | RegExp) => press(c.getByRole('button', { name }));
  /** a quiz or prediction option */
  const opt = (name: string | RegExp) => press(c.getByRole('radio', { name, exact: typeof name === 'string' }).first());
  /** a native radio in a named group: Space by keyboard */
  const pick = (group: string, name: string) => {
    const r = page.getByRole('group', { name: group, exact: true }).getByRole('radio', { name, exact: true });
    return kb ? r.press('Space') : r.check();
  };
  const step = (n: number) => expect(c).toContainText(`Step ${n} of`);
  /** Step under the stage until it is disabled: the last hop or slot */
  async function stepToEnd() {
    const b = page.getByRole('button', { name: 'Step', exact: true });
    while (await b.isEnabled()) await press(b);
  }
  async function range(r: Locator, to: number) {
    if (!kb) return r.fill(String(to));
    await r.focus();
    const now = Number(await r.inputValue());
    for (let i = now; i !== to; i += Math.sign(to - now)) await r.press(to > now ? 'ArrowRight' : 'ArrowLeft');
  }
  async function open(id: string) {
    await page.goto(`/parallel-training/${id}/`);
    await page.locator('astro-island:not([ssr])').waitFor();
    await expect(c).toContainText('Step 1 of');
    await check(page);
  }
  async function finish(next?: RegExp) {
    await expect(c).toContainText('Chapter complete');
    await check(page);
    if (!next) return;
    await press(c.getByRole('link', { name: /^(Next:|Recap)/ }));
    await expect(page).toHaveURL(next);
    if (!/recap/.test(String(next))) await page.locator('astro-island:not([ssr])').waitFor();
  }

  return {
    open,
    pick,
    stepToEnd,
    /** predict, weigh */
    async ch1(next?: RegExp, quiz: string | RegExp = /^Training keeps gradients/) {
      await opt(`${pinned.fit.chipsAtLeast} chips`);
      await btn('Weigh the training state');
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** four workers to the end, predict, eight to the end */
    async ch2(next?: RegExp, quiz: string | RegExp = /^They stay under twice/) {
      await stepToEnd();
      await step(2);
      await opt('Under twice its size');
      await pick('Workers', '8');
      await stepToEnd();
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, stage 1, stage 3 */
    async ch3(next?: RegExp, quiz: string | RegExp = /^More sending/) {
      await opt('Over half');
      await pick('ZeRO stage', 'Stage 1');
      await step(3);
      await pick('ZeRO stage', 'Stage 3');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** one batch to the end, predict, eight micro-batches to the end */
    async ch4(next?: RegExp, quiz: string | RegExp = /^Only one car/) {
      await stepToEnd();
      await step(2);
      await opt('It shrinks, but some stays');
      await range(page.getByRole('slider', { name: 'Micro-batches' }), 7);
      await stepToEnd();
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, inside one box, across boxes */
    async ch5(next?: RegExp, quiz: string | RegExp = /^Every layer waits/) {
      await opt('More than twice as slow');
      await pick('Layer split', '8 ways, in one box');
      await step(3);
      await pick('Layer split', '16 ways, across boxes');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, save often, rarely, at the best */
    async ch6(next?: RegExp, quiz: string | RegExp = /^More often/) {
      const best = pinned.failures.best;
      await opt(`Every ${best} minutes`);
      await pick('Save', 'every 30 minutes');
      await step(3);
      await pick('Save', 'every 480 minutes');
      await step(4);
      await pick('Save', `every ${best} minutes`);
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** set a winning layout */
    async ch7(next?: RegExp, quiz: string | RegExp = /^Its layer all-reduces/) {
      const w = WINNERS[0];
      await pick('Split each layer', String(w.tp));
      await pick('Pipeline stages', String(w.pp));
      await pick('ZeRO', w.zero ? `Stage ${w.zero}` : 'None');
      await pick('Save every', `${w.interval} min`);
      await step(2);
      await check(page);
      await opt(quiz);
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
  await page.goto('/parallel-training/');
  const meta = page.locator('.hero .module-meta');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Many chips, one model`);
  await expect(meta.locator('.level')).toHaveText('Advanced');
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await axe(page);
});

test('the recap names the module number', async ({ page }) => {
  await page.goto('/parallel-training/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Recap`);
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/parallel-training/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/parallel-training\.jpg$/);
  await page.goto(`/parallel-training/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/parallel-training-${CH1}\\.jpg$`),
  );
  await page.goto('/parallel-training/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /\/og\/parallel-training-recap\.jpg$/,
  );
  expect((await page.request.get('/og/parallel-training.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="parallel-training"] h4 a')).toHaveAttribute(
    'href',
    '/parallel-training/',
  );
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(walker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in parallel-training-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'pre-training-progress-v1': JSON.stringify({ done: ['01-before-training'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(walker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['parallel-training-progress-v1']).done).toEqual(CHS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('parallel-training');
});

test('chapter 2: one read-out says each hop and the milestones; the buckets fill to the pinned hops', async ({
  page,
}) => {
  const w = walker(page, 'mouse');
  await w.open(CH2);
  const said = page.locator('.pt-said');
  await expect(page.locator('.pt-stage [role="status"]')).toHaveCount(1);
  const step = page.getByRole('button', { name: 'Step', exact: true });
  await step.click();
  await expect(said).toHaveText(/^Hop 1 of 6/);
  await step.click();
  await step.click();
  await expect(said).toContainText('Reduce done');
  await expect(page.locator('[data-bucket][data-fill="1"]')).toHaveCount(4);
  // the last hop finishes the step: the read-out clears with it, and the narration carries the mean
  await w.stepToEnd();
  await expect(said).toHaveText('');
  await expect(card(page)).toContainText(`the mean, ${pinned.ring.mean.join(', ')}`);
  await expect(page.locator('[data-bucket][data-fill="1"]')).toHaveCount(16);
  await page.getByRole('button', { name: 'Timeline', exact: true }).click();
  await expect(page.locator('.pt-timeline')).toBeVisible();
});

test('chapter 7: a layout that fits but waits is not accepted, the start does not fit, and a winner is', async ({
  page,
}) => {
  const w = walker(page, 'mouse');
  await w.open(CH7);
  const score = card(page).locator('[data-best]');
  await expect(score).toHaveAttribute('data-fits', '0');
  await w.pick('Split each layer', '16');
  await w.pick('Save every', '240 min');
  await expect(score).toHaveAttribute('data-fits', '1');
  await expect(score).toHaveAttribute('data-best', '0');
  await expect(card(page)).toContainText('Step 1 of');
  const win = WINNERS[0];
  await w.pick('Split each layer', String(win.tp));
  await w.pick('Pipeline stages', String(win.pp));
  await expect(card(page)).toContainText('Step 2 of');
  await expect(score).toHaveAttribute('data-best', '1');
});

test('chapter 7: Show me applies a winning layout', async ({ page }) => {
  const w = walker(page, 'mouse');
  await w.open(CH7);
  await card(page).getByRole('button', { name: 'Show me' }).click();
  await expect(card(page)).toContainText('Step 2 of');
  await expect(card(page).locator('[data-best]')).toHaveAttribute('data-best', '1');
});

test('“I’m not sure” on the checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = walker(page, 'mouse');
  await w.open(CH5);
  await w.ch5(undefined, 'I’m not sure');
  await expect(card(page)).toContainText('Chapter complete');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('Play is hidden and Step walks every stage', async ({ page }) => {
    const w = walker(page, 'mouse');
    await w.open(CH2);
    await expect(page.getByRole('button', { name: 'Play' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Step', exact: true })).toBeVisible();
  });
  test('every chapter plays through', async ({ page }) => {
    await walkAll(walker(page, 'mouse'));
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  await walkAll(walker(page, 'mouse'));
  await page.goto('/parallel-training/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pass the buckets’ controls are at least 44 px', async ({ page }) => {
    const w = walker(page, 'mouse');
    await w.open(CH4);
    for (const b of [
      page.getByRole('button', { name: 'Step', exact: true }),
      page.getByRole('button', { name: 'Play' }),
      page.getByRole('slider', { name: 'Micro-batches' }),
    ]) {
      const box = (await b.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of [
      '/parallel-training/',
      ...CHS.map(id => `/parallel-training/${id}/`),
      '/parallel-training/recap/',
    ]) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      walker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
