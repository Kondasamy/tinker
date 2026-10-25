// Coding agents, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link. The hunk
// checkboxes and "Run tests" sit in the Code tab of the stage; everything else is in the step card.
import { expect, type Locator, type Page } from '@playwright/test';

export type Mode = 'mouse' | 'keyboard';

export function codingWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const tick = (l: Locator) => (kb ? l.press('Space') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const stage = page.getByRole('region', { name: 'Scene' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));
  const box = (name: string | RegExp) => tick(card.getByRole('checkbox', { name }));
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  /** Press Next turn until the card reaches step n */
  const until = async (n: number) => {
    for (let i = 0; i < 20 && !(await card.textContent())!.includes(`Step ${n} of`); i++) await btn('Next turn →');
    await step(n);
  };
  /** In the Code tab: set which hunks are kept, then Run tests */
  const review = async (keep: number[]) => {
    for (const h of [1, 2, 3]) {
      const c = stage.getByRole('checkbox', { name: `Keep hunk ${h}` });
      if ((await c.isChecked()) !== keep.includes(h)) await tick(c);
    }
    await press(stage.getByRole('button', { name: 'Run tests' }));
  };

  async function open(id: string) {
    await page.goto(`/coding-agents/${id}/`);
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
    review,
    /** predict, the first turn, the rest of the run, quiz */
    async ch1(next?: RegExp) {
      await opt(/^Search the code/);
      await step(2);
      await btn('Next turn →');
      await step(3);
      await btn('Run to the end');
      await step(4);
      await check(page);
      await opt(/^Nothing yet/);
      await finish(next);
    },
    /** one file at a time, predict, search on, quiz */
    async ch2(next?: RegExp) {
      await until(2);
      await opt(/^About half/);
      await step(3);
      await box('Give the agent a search tool');
      await btn('Run the ticket');
      await step(4);
      await check(page);
      await opt(/^A search for/);
      await finish(next);
    },
    /** drop the fix hunk: red; review again; drop the drive-by: green; quiz */
    async ch3(next?: RegExp) {
      await review([2, 3]);
      await step(2);
      await expect(card.locator('[data-test="at-50"]')).toHaveAttribute('data-pass', '0');
      await check(page);
      await btn('Review again');
      await step(3);
      await review([1, 2]);
      await step(4);
      await expect(card.locator('[data-pass="0"]')).toHaveCount(0);
      await opt(/^Keep the fix/);
      await finish(next);
    },
    /** predict, run the whole patch: red; the agent alone to green; quiz */
    async ch4(next?: RegExp) {
      await opt(/^No: the drive-by/);
      await step(2);
      await press(stage.getByRole('button', { name: 'Run tests' }));
      await step(3);
      await check(page);
      await btn('Let the agent run alone');
      await btn('Run to the end');
      await step(4);
      await opt(/^Which promise/);
      await finish(next);
    },
    /** red, predict, the loosened test, protect, again, quiz */
    async ch5(next?: RegExp) {
      await until(2);
      await opt(/^It loosens/);
      await step(3);
      await btn('Run to the end');
      await step(4);
      await check(page);
      await box('Protect test files');
      await step(5);
      await btn('Run the ticket again');
      await step(6);
      await opt(/^Green runs/);
      await finish(next);
    },
    /** predict, the force push, the allow-list, ask first, quiz */
    async ch6(next?: RegExp) {
      await opt(/^The host runs it/);
      await step(2);
      await btn('Next turn →');
      await step(3);
      await box(/^Allow-list/);
      await btn('Run the push again');
      await step(4);
      await check(page);
      await box(/^Ask first/);
      await btn('Run the push again');
      await step(5);
      await opt(/^npm test/);
      await finish(next);
    },
    /** every rule on, then the quiz */
    async ch7(next?: RegExp) {
      await box('Protect test files');
      await box(/^Allow-list/);
      await box(/^Ask a person/);
      await step(2);
      await check(page);
      await opt(/^Protected tests/);
      await finish(next);
    },
  };
}
