// Shipping a release, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link. The stage's
// clock (Play or Next event, and Step), the rollout dial and the lever sit under the picture; everything else is in the
// step card.
import { expect, type Locator, type Page } from '@playwright/test';
import { SCENES, TICKS, clock } from '../../src/lib/releases/sim';
import { BAKES, CANARIES, THRESHOLDS, WINNERS } from '../../src/lib/releases/workbench';

// the chapters' moments, read off the simulator as the chapters read them (chapter files import CSS, so not here)
const CH1_LOOK = SCENES.all.start + 2;
const CH3_START = SCENES.canary('button', 2).start;

export type Mode = 'mouse' | 'keyboard';

export function releasesWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const tick = (l: Locator) => (kb ? l.press('Space') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const stage = page.getByRole('region', { name: 'Scene' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  /** a range input over a list of values: arrow keys from where it is, or set straight to the index by mouse */
  const slide = async (where: Locator, name: RegExp, to: number) => {
    const l = where.getByRole('slider', { name });
    if (!kb) return l.fill(String(to));
    const at = Number(await l.inputValue());
    for (let i = at; i !== to; i += to > at ? 1 : -1) await l.press(to > at ? 'ArrowRight' : 'ArrowLeft');
  };
  const stepper = () => stage.getByRole('button', { name: 'Step', exact: true });
  /** Step the clock until it reads minute t */
  const to = async (t: number) => {
    const shown = stage.locator('.rl-clock');
    for (let i = 0; i < TICKS && (await shown.textContent()) !== clock(t); i++) await press(stepper());
    await expect(shown).toHaveText(clock(t));
  };
  /** Step until the card reaches step n */
  const until = async (n: number) => {
    for (let i = 0; i < TICKS && !(await card.textContent())!.includes(`Step ${n} of`); i++) await press(stepper());
    await step(n);
  };

  async function open(id: string) {
    await page.goto(`/releases/${id}/`);
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
    // a key pressed before the next island hydrates is lost
    if (!/recap/.test(String(next))) await page.locator('astro-island:not([ssr])').waitFor();
  }
  const win = WINNERS[0];

  return {
    open,
    to,
    until,
    /** step into the release, predict, pull the lever, watch the rollback, quiz */
    async ch1(next?: RegExp) {
      await to(CH1_LOOK);
      await step(2);
      await opt(/^In about/);
      await press(stage.getByRole('button', { name: 'Pull the rollback lever' }));
      await step(4);
      await until(5);
      await check(page);
      await opt(/^How fast/);
      await finish(next);
    },
    /** the coupon fix stopped, predict, the address tweak through every gate, quiz */
    async ch2(next?: RegExp) {
      await btn(/^Run the coupon/);
      await step(2);
      await opt(/^Lets it through/);
      await btn(/^Run the address/);
      await step(4);
      await check(page);
      await opt(/^No test checked/);
      await finish(next);
    },
    /** the canary, predict, the false alarm, a longer bake, the tax rounding's miss, quiz */
    async ch3(next?: RegExp) {
      await to(CH3_START);
      await step(2);
      await opt(/^It can ring/);
      await until(4);
      await check(page);
      await slide(card, /^Bake time/, 1);
      await step(5);
      await until(6);
      await tick(card.getByRole('radio', { name: 'Tax rounding' }));
      await step(7);
      await opt(/^Too few/);
      await finish(next);
    },
    /** the dial up, watch, predict, the flag off, the empty track, quiz */
    async ch4(next?: RegExp) {
      await slide(stage, /^Share on the new version/, 3);
      await step(2);
      await until(3);
      await opt(/^Within a minute/);
      await press(stage.getByRole('button', { name: 'Switch the flag off' }));
      await step(5);
      await until(6);
      await check(page);
      await opt(/^Friday/);
      await finish(next);
    },
    /** predict, the lever refused, expand and contract, the rollback, quiz */
    async ch5(next?: RegExp) {
      await opt(/^No: the old/);
      await press(stage.getByRole('button', { name: 'Pull the rollback lever' }));
      await step(3);
      await check(page);
      await tick(card.getByRole('checkbox', { name: /^Expand and contract/ }));
      await step(4);
      await until(5);
      await opt(/^Add the new column/);
      await finish(next);
    },
    /** predict the stage, play until the check rolls it back, the Errors tab, quiz */
    async ch6(next?: RegExp) {
      await opt(/^At 5%/);
      await until(3);
      await press(stage.getByRole('button', { name: 'Errors', exact: true }));
      await step(4);
      await check(page);
      await opt(/^About one in twenty/);
      await finish(next);
    },
    /** set one winning plan by hand, then the quiz */
    async ch7(next?: RegExp) {
      await slide(card, /^Canary/, CANARIES.indexOf(win.canary));
      await slide(card, /^Bake time/, BAKES.indexOf(win.bake));
      await slide(card, /^Check/, THRESHOLDS.indexOf(win.threshold));
      if (win.flag) await tick(card.getByRole('checkbox', { name: /^Behind a flag/ }));
      await step(2);
      await check(page);
      await opt(/^Its way back/);
      await finish(next);
    },
  };
}
