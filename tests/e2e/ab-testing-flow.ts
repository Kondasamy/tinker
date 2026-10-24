// A/B testing, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';
import { ASSUMPTIONS, BENCH, ENOUGH, LENGTHS, SCENARIOS, SEEDS, peekResult, runOf } from '../../src/lib/ab-testing/sim';
import { decide, DECISION_NAME } from '../../src/lib/ab-testing/workbench';

// chapter files import CSS, which Playwright can't load, so the walk reads the simulator directly
export const END = SCENARIOS.aa.days - 1;
export const PEEK = peekResult(runOf(SCENARIOS.aa), ASSUMPTIONS.level)!;

export type Mode = 'mouse' | 'keyboard';
const N = SEEDS.length;

export function abWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  /** a range input: arrow keys from where it is, or set straight to the value by mouse */
  const slide = async (name: RegExp, to: number) => {
    const l = card.getByRole('slider', { name });
    if (!kb) return l.fill(String(to));
    const at = Number(await l.inputValue());
    for (let i = at; i !== to; i += to > at ? 1 : -1) await l.press(to > at ? 'ArrowRight' : 'ArrowLeft');
  };

  async function open(id: string) {
    await page.goto(`/ab-testing/${id}/`);
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

  return {
    open,
    /** day 1, predict, the whole test, the Result tab */
    async ch1(next?: RegExp) {
      await btn('Run day 1');
      await step(2);
      await opt(/^B wins: the new checkout/);
      await btn(/^Run all \d+ days$/);
      await step(4);
      await check(page);
      await btn('Open the Result tab');
      await step(5);
      await opt(/^Morning and afternoon customers differ/);
      await finish(next);
    },
    /** one A/A test, predict, 100 of them, the Result tab */
    async ch2(next?: RegExp) {
      await btn('Run the A/A test');
      await step(2);
      await opt(/^A few, about/);
      await btn(`Run ${N} A/A tests`);
      await step(4);
      await check(page);
      await btn('Open the Result tab');
      await step(5);
      await opt(/^It could be noise/);
      await finish(next);
    },
    /** one week, predict the power, 100 runs, slide to enough shoppers */
    async ch3(next?: RegExp) {
      await btn('Run one week');
      await step(2);
      await opt(/^Under half/);
      await btn(`Run it ${N} times`);
      await step(4);
      await slide(/^Test length/, (LENGTHS as readonly number[]).indexOf(ENOUGH));
      await step(5);
      await check(page);
      await opt(/^Three days may be far too few/);
      await finish(next);
    },
    /** day by day to the peek, predict, the planned end, 100 peeking tests, the Result tab */
    async ch4(next?: RegExp) {
      await slide(/^Day:/, PEEK.t);
      await step(2);
      await opt(/^No winner: the early lead/);
      await slide(/^Day:/, END);
      await step(4);
      await btn(`Run ${N} peeking tests`);
      await step(5);
      await check(page);
      await btn('Open the Result tab');
      await step(6);
      await opt(/^No: stopping on the first good day/);
      await finish(next);
    },
    /** the colour test, predict, 100 of them, the correction */
    async ch5(next?: RegExp) {
      await btn('Run the colour test');
      await step(2);
      await opt(/^Far more often/);
      await btn(`Run ${N} colour tests`);
      await step(4);
      await btn('Stricter bar per colour');
      await step(5);
      await check(page);
      await opt(/^Suspect luck/);
      await finish(next);
    },
    /** the banner test, predict returns, watch returns, the Result tab */
    async ch6(next?: RegExp) {
      await btn('Run the banner test');
      await step(2);
      await opt(/^A bigger share/);
      await btn('Watch returns');
      await step(4);
      await check(page);
      await btn('Open the Result tab');
      await step(5);
      await opt(/^Cancellations/);
      await finish(next);
    },
    /** a decision per experiment by the rule, then the quiz */
    async ch7(next?: RegExp) {
      for (const e of BENCH) {
        const l = card.getByRole('combobox', { name: `Decision for ${e.name}` });
        if (kb) await l.focus();
        await l.selectOption({ label: DECISION_NAME[decide(e)] });
      }
      await step(2);
      await check(page);
      await opt(/^Keep testing: it was too small/);
      await finish(next);
    },
  };
}
