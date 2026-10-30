// Module 14, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link. The mouse walk sorts
// and triages by hand from the reference data; the keyboard walk uses "Show me" for chapters 4 and 7's puzzles.
import { expect, type Locator, type Page } from '@playwright/test';
import { choose } from './helpers';
import { DAY2, FAILED, modeOf } from '../../src/lib/observability/traces';
import { REFERENCE_GROUPING, TOP } from '../../src/lib/observability/coding';
import { WINNERS } from '../../src/lib/observability/workbench';
import { NEEDED_NOTES } from '../../src/lib/observability/coding';

export type Mode = 'mouse' | 'keyboard';

export function observabilityWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name, exact: typeof name === 'string' }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);

  async function open(id: string) {
    await page.goto(`/observability/${id}/`);
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
    /** open the trace, predict, read every span, quiz */
    async ch1(next?: RegExp) {
      await btn('Open the first trace');
      await step(2);
      await opt(/^The model calls/);
      await step(3);
      for (let i = 0; i < 6; i++) await btn(/^Read the next span/);
      await step(4);
      await check(page);
      await opt(/^Each step in between/);
      await finish(next);
    },
    /** open, predict, pick the first failure in each trace from the span list */
    async ch2(next?: RegExp) {
      await btn('Open the first failed trace');
      await step(2);
      await opt(/^In the search/);
      await step(3);
      await btn('2. retrieval policies (search)');
      await step(4);
      await check(page);
      await btn('3. execute_tool get_order (tool call)'); // the tempting wrong guess: its result looks wrong
      await expect(card.locator('.tc-status')).toContainText('NOT THE FIRST');
      await btn('2. chat larkspur-model (model call)');
      await step(5);
      await opt(/^The model call that doubled/);
      await finish(next);
    },
    /** predict, note five traces from the suggestions, done, quiz */
    async ch3(next?: RegExp) {
      await opt(/^A handful of kinds/);
      await step(2);
      for (let i = 1; i <= NEEDED_NOTES; i++)
        await press(
          card
            .getByRole('group', { name: `Suggestions for trace ${i}` })
            .getByRole('button')
            .first(),
        );
      await btn('Done noting for now');
      await step(3);
      await check(page);
      await opt(/^It starts from the traces/);
      await finish(next);
    },
    /** predict, sort every trace by hand (mouse) or Show me (keyboard), quiz */
    async ch4(next?: RegExp) {
      await opt(/^The search finding nothing useful/);
      await step(2);
      if (kb) await btn('Show me');
      else
        for (const [i, t] of FAILED.entries())
          await btn(`Move trace ${i + 1} to Group ${REFERENCE_GROUPING[t.id] + 1}`);
      await step(3);
      await check(page);
      await opt(/^Yes: the same traces/);
      await finish(next);
    },
    /** predict, pick the fix, quiz */
    async ch5(next?: RegExp) {
      await opt(/^Not yet/);
      await step(2);
      await btn(modeOf(TOP[0]).name);
      await step(3);
      await check(page);
      await opt(/^How often each happens/);
      await finish(next);
    },
    /** add the stale traces as cases, run current, predict, run fixed, quiz */
    async ch6(next?: RegExp) {
      for (const [i, t] of FAILED.entries()) if (TOP.includes(t.mode!)) await btn(`Add trace ${i + 1} as a test case`);
      await step(2);
      await btn('Run on the current version');
      await step(3);
      await opt(/^All of them/);
      await step(4);
      await btn('Run on the fixed version');
      await step(5);
      await check(page);
      await opt(/^So a later change/);
      await finish(next);
    },
    /** open the queue, predict, label every trace and pick a fix (mouse) or Show me (keyboard), quiz */
    async ch7(next?: RegExp) {
      await btn('Open today’s queue');
      await step(2);
      await opt(/^Something else/);
      await step(3);
      if (kb) await btn('Show me');
      else {
        for (const [i, t] of DAY2.entries()) await choose(card.getByLabel(`Mode for trace ${i + 1}`), t.mode!);
        await choose(card.getByLabel('Fix to ship'), WINNERS[0]);
      }
      await step(4);
      await check(page);
      await opt(/^No: read today/);
      await finish(next);
    },
  };
}
