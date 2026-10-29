// Bias and fairness, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link. The bar
// ranges live under the stage; the field and fix radios and every quiz live in the step card.
import { expect, type Locator, type Page } from '@playwright/test';
import pinned from '../../data/fairness/pinned.json' with { type: 'json' };
import { BARS, REGION_NAMES } from '../../src/lib/fairness/story';
import { BENCH_BARS, WINNERS } from '../../src/lib/fairness/workbench';

export type Mode = 'mouse' | 'keyboard';

export function frWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }).first()); // a quiz or prediction option
  const pick = async (name: string) => {
    const r = card.getByRole('radio', { name, exact: true });
    await (kb ? r.press('Space') : r.click()); // not check(): the last pick advances the step and hides the radio
  };
  const step = (n: number, o = {}) => expect(card).toContainText(`Step ${n} of`, o);
  const slider = (r: 'A' | 'B') => page.getByRole('slider', { name: `${REGION_NAMES[r]} bar` });
  /** set a lane's bar to `to` on `list`: arrow keys by keyboard, a direct set by mouse */
  async function bar(r: 'A' | 'B', to: number, list: readonly number[] = BARS) {
    const s = slider(r),
      want = list.findIndex(v => Math.abs(v - to) < 1e-9);
    if (!kb) return s.fill(String(want));
    await s.focus();
    const now = Number(await s.inputValue());
    for (let i = now; i !== want; i += Math.sign(want - now)) await s.press(want > now ? 'ArrowRight' : 'ArrowLeft');
  }
  const tab = () => press(page.getByRole('button', { name: 'Bars', exact: true }));

  async function open(id: string) {
    await page.goto(`/fairness/${id}/`);
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
    /** slide to the shared bar, predict, open Bars */
    async ch1(next?: RegExp, quiz: string | RegExp = /^Little/) {
      await bar('A', pinned.shared);
      await step(2);
      await opt('About as often');
      await tab();
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, open Bars, lower the shared bar */
    async ch2(next?: RegExp, quiz: string | RegExp = /^How often qualified/) {
      await opt(/three times/);
      await tab();
      await step(3);
      await bar('B', 0.3);
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, show the postcodes, predict the thin sample */
    async ch3(next?: RegExp, quiz: string | RegExp = /^Count how many/) {
      await opt(/^Its river postcodes/);
      await btn('Show the postcodes');
      await step(3);
      await opt('About 2 points');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, drop the region, then the postcode */
    async ch4(next?: RegExp, quiz: string | RegExp = /^Other fields/) {
      await opt('Most of it stays');
      await pick('No region');
      await step(3);
      await pick('No region or postcode');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, lower Eastmere's bar to the pinned even pair */
    async ch5(next?: RegExp, quiz: string | RegExp = /^More approvals/) {
      await opt('Down');
      await bar('B', pinned.even.bars.B);
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** open Bars, predict, search */
    async ch6(next?: RegExp, quiz: string | RegExp = /^Which measure/) {
      await tab();
      await step(2);
      await opt(/^None that/);
      await btn('Search every pair');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** set a winning setting */
    async ch7(next?: RegExp, quiz: string | RegExp = /^Test it on/) {
      const w = WINNERS[0];
      await pick(
        w.features === 'no-region' ? 'No region' : w.features === 'neither' ? 'No region or postcode' : 'Every field',
      );
      await pick(w.fix === 'reweight' ? `Count ${REGION_NAMES.B} three times` : 'None');
      await bar('A', w.barA, BENCH_BARS);
      await bar('B', w.barB, BENCH_BARS);
      await step(2);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
    bar,
  };
}
