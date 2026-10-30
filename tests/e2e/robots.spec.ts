// Robots that act: the intro, every chapter played by mouse and by keyboard only (the claw by arrow keys on its pad),
// its own progress key, drive the claw (Hand over disabled with its reason, a replay stopping stuck with Try again and
// demos kept, the reader's demos used by Hand over, off the grid), the workbench's winning and losing setups, "I'm not
// sure", the recap, axe, reduced motion and phone width (controls ≥ 44 px); the go-live checks: share images, home's card.
import { test, expect, type Locator, type Page } from '@playwright/test';
import { MODULES, moduleOf } from '../../src/lib/modules';
import pinned from '../../data/robots/pinned.json' with { type: 'json' };
import { DEMOS, demoPairs, SNOWBALL } from '../../src/lib/robots/story';
import { type Action, expert, type State, step } from '../../src/lib/robots/world';
import { replay } from '../../src/lib/robots/policy';
import { WINNERS } from '../../src/lib/robots/workbench';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('robots');
const NUMBER = MODULES.filter(m => m.status === 'live').findIndex(m => m.id === M.id) + 1;
const CHS = M.chapters.map(c => c.id),
  [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = CHS;
const at = (id: string) => new RegExp(`/robots/${id}/$`);
const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const axe = async (page: Page) => {
  await page.waitForTimeout(400);
  expect(await serious(page)).toEqual([]);
};
/** the careful driver's moves from where chapter 5's slipped replay stalls to the tray */
const WHEEL: Action[] = (() => {
  const l = SNOWBALL.layout,
    run = replay(demoPairs(SNOWBALL.demos), l, { forced: [SNOWBALL.slipAt] });
  let s: State = { ...run.states.at(-1)!, end: undefined };
  const out: Action[] = [];
  while (!s.end && out.length < 30) {
    const a = expert(l, s);
    out.push(a);
    s = step(l, s, a);
  }
  return out;
})();
test.setTimeout(240_000);

type Mode = 'mouse' | 'keyboard';
const KEY: Record<Action, string> = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  grip: 'g',
  drop: 'g',
};
const BUTTON: Record<Action, string> = {
  up: 'Move up',
  down: 'Move down',
  left: 'Move left',
  right: 'Move right',
  grip: 'Grip',
  drop: 'Drop',
};
function walker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const c = card(page);
  const btn = (name: string | RegExp) => press(page.getByRole('button', { name, exact: typeof name === 'string' }));
  const opt = (name: string | RegExp) => press(c.getByRole('radio', { name, exact: typeof name === 'string' }).first());
  const pick = (group: string, name: string) => {
    const r = page.getByRole('group', { name: group, exact: true }).getByRole('radio', { name, exact: true });
    return kb ? r.press('Space') : r.check();
  };
  const stepN = (n: number) => expect(c).toContainText(`Step ${n} of`, { timeout: 15_000 });
  /** drive the claw: arrow keys and G on the focused pad, or its buttons */
  async function drive(actions: Action[]) {
    const pad = page.getByRole('group', { name: 'Drive the claw' });
    if (kb) {
      await pad.getByRole('button', { name: 'Move up' }).focus();
      for (const a of actions) await page.keyboard.press(KEY[a]);
    } else for (const a of actions) await pad.getByRole('button', { name: BUTTON[a], exact: true }).click();
  }
  async function open(id: string) {
    await page.goto(`/robots/${id}/`);
    await page.locator('astro-island:not([ssr])').first().waitFor();
    await expect(c).toContainText('Step 1 of');
    await check(page);
  }
  async function finish(next?: RegExp) {
    await expect(c).toContainText('Chapter complete');
    await check(page);
    if (!next) return;
    await press(c.getByRole('link', { name: /^(Next:|Recap)/ }));
    await expect(page).toHaveURL(next);
    if (!/recap/.test(String(next))) await page.locator('astro-island:not([ssr])').first().waitFor();
  }
  return {
    open,
    drive,
    btn,
    pick,
    async ch1(next?: RegExp) {
      await drive(DEMOS[0].slice(0, 2));
      await stepN(2);
      await opt(/^About \d+ times a second/);
      await stepN(3);
      await drive(DEMOS[0].slice(2));
      await stepN(4);
      await check(page);
      await opt(/^On its next look/);
      await finish(next);
    },
    async ch2(next?: RegExp, quiz: string | RegExp = /^Drives as if/) {
      await btn('Camera');
      await stepN(2);
      await opt(/^Which way the part is/);
      await drive(['right']);
      await stepN(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    async ch3(next?: RegExp) {
      await btn('Run on bin A');
      await stepN(2);
      await opt(/^No: it drives/);
      await btn('Run on bin B');
      await stepN(4);
      await check(page);
      await opt(/^Layouts keep changing/);
      await finish(next);
    },
    async ch4(next?: RegExp) {
      await drive(DEMOS[0]);
      await stepN(2);
      await btn('Hand over');
      await stepN(3);
      await opt(/^More:/);
      await stepN(4);
      await check(page);
      await opt(/^Record demos with a crate/);
      await finish(next);
    },
    async ch5(next?: RegExp) {
      await btn('Hand over');
      await stepN(2);
      await opt(/^Its frame is off-demo/);
      await btn('Take the wheel');
      await drive(WHEEL);
      await stepN(4);
      await btn('Hand over');
      await stepN(5);
      await check(page);
      await opt(/^Record a person/);
      await finish(next);
    },
    async ch6(next?: RegExp) {
      await btn('Test on the real bins');
      await stepN(2);
      await opt('Varying the light');
      await pick('Practice', 'Both varied');
      await btn('Test on the real bins');
      await stepN(4);
      await check(page);
      await opt(/^Randomise the finishes/);
      await finish(next);
    },
    async ch7(next?: RegExp) {
      const w = WINNERS[0];
      await pick('Mira’s demos', String(w.demos));
      await pick('Correction rounds', String(w.rounds));
      await pick('Practice', w.practice === 'both' ? 'Both varied' : w.practice);
      await stepN(2);
      await check(page);
      await opt(/^Test on real bins/);
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
  await page.goto('/robots/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Robots that act`);
  await expect(page.locator('.hero .module-meta .level')).toHaveText('Advanced');
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await axe(page);
});

test('the recap names the module number', async ({ page }) => {
  await page.goto('/robots/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Recap`);
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/robots/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/robots\.jpg$/);
  await page.goto(`/robots/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/robots-${CH1}\\.jpg$`),
  );
  await page.goto('/robots/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/robots-recap\.jpg$/);
  expect((await page.request.get('/og/robots.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="robots"] h4 a')).toHaveAttribute('href', '/robots/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(walker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in robots-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'multimodal-progress-v1': JSON.stringify({ done: ['01-a-picture-is-tokens'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(walker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['robots-progress-v1']).done).toEqual(CHS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('robots');
});

test('drive the claw: Hand over waits for a demo, the reader’s demo drives the replay, Try again keeps it', async ({
  page,
}) => {
  const w = walker(page, 'mouse');
  await w.open(CH4);
  const said = page.locator('.rb-said');
  await expect(page.locator('.rb-stage [role="status"]')).toHaveCount(1);
  const hand = page.getByRole('button', { name: 'Hand over' });
  await expect(hand).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('.rb-why')).toContainText('Finish one demo first');
  // aria-disabled: a press does nothing (Playwright treats it as disabled, so dispatch the click)
  await hand.dispatchEvent('click');
  await expect(said).toHaveText('');
  // off the grid: the demo starts again
  await w.drive(['up']);
  await expect(said).toContainText('Off the grid');
  await w.drive(DEMOS[0]);
  await expect(said).toContainText('Demo 1 done');
  await expect(hand).not.toHaveAttribute('aria-disabled', 'true');
  await hand.click();
  await expect(said).toHaveText(/^(Part in the tray|Stuck|Off the grid)/, { timeout: 15_000 });
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(said).toContainText('Your 1 demo is kept');
  await page.getByRole('button', { name: 'Camera', exact: true }).click();
  await expect(page.locator('.rb-grid td')).toHaveCount(6 * 9);
});

test('chapter 5: the slipped replay stops stuck at the step cap', async ({ page }) => {
  const w = walker(page, 'mouse');
  await w.open(CH5);
  await w.btn('Hand over');
  await expect(page.locator('.rb-said')).toHaveText(
    `Stuck: ${pinned.snowball.slipped.steps} steps and no part in the tray.`,
    {
      timeout: 15_000,
    },
  );
  await expect(page.locator('[data-part="claw"]')).toBeVisible();
});

test('arrow keys move the claw only while the pad has focus, and never scroll the page then', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 500 });
  const w = walker(page, 'mouse');
  await w.open(CH1);
  const y0 = await page.evaluate(() => window.scrollY);
  await page.getByRole('button', { name: 'Move up' }).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  expect(await page.evaluate(() => window.scrollY)).toBe(y0);
  await expect(page.locator('.rb-said')).toHaveText(/^(Moved|Bumped)/);
});

test('chapter 7: a setup that clears as many but costs more is not accepted, and Show me is', async ({ page }) => {
  const w = walker(page, 'mouse');
  await w.open(CH7);
  const score = card(page).locator('[data-best]');
  await expect(score).toHaveAttribute('data-best', '0');
  await w.pick('Mira’s demos', '8');
  await w.pick('Practice', 'Both varied');
  await expect(score).toHaveAttribute('data-top', '1');
  await expect(score).toHaveAttribute('data-best', '0');
  await card(page).getByRole('button', { name: 'Show me' }).click();
  await expect(card(page)).toContainText('Step 2 of');
  await expect(score).toHaveAttribute('data-best', '1');
});

test('“I’m not sure” on the checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = walker(page, 'mouse');
  await w.open(CH2);
  await w.ch2(undefined, 'I’m not sure');
  await expect(card(page)).toContainText('Chapter complete');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('a replay shows its last frame at once', async ({ page }) => {
    const w = walker(page, 'mouse');
    await w.open(CH5);
    await w.btn('Hand over');
    await expect(page.locator('.rb-said')).toContainText('Stuck', { timeout: 1000 });
  });
  test('every chapter plays through', async ({ page }) => {
    await walkAll(walker(page, 'mouse'));
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  await walkAll(walker(page, 'mouse'));
  await page.goto('/robots/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('drive the claw’s controls are at least 44 px', async ({ page }) => {
    const w = walker(page, 'mouse');
    await w.open(CH4);
    for (const name of ['Move up', 'Move down', 'Move left', 'Move right', 'Grip', 'Hand over']) {
      const box = (await page.getByRole('button', { name, exact: true }).boundingBox())!;
      expect(box.height, name).toBeGreaterThanOrEqual(44);
    }
  });
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/robots/', ...CHS.map(id => `/robots/${id}/`), '/robots/recap/']) {
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
