// Module 3, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';

export type Mode = 'mouse' | 'keyboard';

export function agentWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));   // a quiz or prediction option
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  /** run the case on screen both ways */
  const both = async () => { await btn('Run as the script'); await btn('Run as an agent'); };

  async function open(id: string) {
    await page.goto(`/agents/${id}/`);
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
    /** `quiz`: the checkpoint pick (default the right answer); `next`: where the closing link goes */
    async ch1(next?: RegExp, quiz: string | RegExp = /^A workflow: the steps are known/) {
      await btn('Read the refund case');
      await opt(/script uses fewer model tokens/);
      await both();
      await step(4);
      await check(page);
      await btn(/^Next case/);
      await both();
      await step(6);
      await opt(/^Only the agent/);
      await both();
      await step(8);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** step the loop one turn at a time until the model answers */
    async ch2(next?: RegExp, quiz: string | RegExp = /^The run ends: a turn with no call/) {
      await opt(/^One turn per tool call, then one more/);
      await btn('Start the run');
      await step(3);
      await btn(/^Next turn/);
      await step(4);
      await check(page);
      // the reader does not know how many turns are left: step until the stop prediction appears
      for (let t = 3; (await card.textContent())!.includes('Step 4 of'); t++) {
        await btn(/^Next turn/);
        await expect(card).toContainText(`Turn ${t}:`);
      }
      await opt(/^The model: it answers/);
      await btn(/^Next turn/);
      await step(7);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** plans: approve the printer plan and its change; on the planted email, `planted` decides (default: reject, then approve the new plan) */
    async ch3(next?: RegExp, quiz: string | RegExp = /^Bring it back to the buyer/, planted: ('Approve' | 'Reject')[] = ['Reject', 'Approve']) {
      await btn('Plan mode: on');
      await opt(/^Changes the plan/);
      await btn('Run the plan');
      await step(4);
      await check(page);
      await opt(/^The change comes back to the person/);
      await btn('Approve');
      await step(6);
      await btn('Approve');
      await step(7);
      await btn(/^Next case/);
      await opt(/^It is refunded/);
      for (const d of planted) await btn(d);
      await step(10);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** budgets: run the stuck loop, try a tighter budget, then solve the puzzle by hand (detector on, then room for one more turn) */
    async ch4(next?: RegExp, quiz: string | RegExp = /^A repeat detector, with enough steps/) {
      await opt(/^Keeps retrying until the step budget/);
      await btn('Run the case');
      await step(3);
      await check(page);
      await opt(/^More each turn/);
      await step(4);
      await btn('4 steps');
      await step(5);
      await btn('Repeat detector: stop after 3');
      await expect(card).toContainText('BROKEN');
      await btn('8 steps');
      await step(6);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** memory: run with full memory, switch to summary, then solve the puzzle by hand with pinned */
    async ch5(next?: RegExp, quiz: string | RegExp = /^Pin the line/) {
      await opt(/^No: a turn passes the budget/);
      await btn('Run the case');
      await step(3);
      await check(page);
      await opt(/^It offers to phone/);
      await step(4);
      await btn('Memory: summary');
      await step(5);
      await expect(card).toContainText('BROKEN');
      await btn('Memory: pinned');
      await step(6);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** sub-agents: predict the total, run the lead alone, switch to helpers, then predict what the lead sees */
    async ch6(next?: RegExp, quiz: string | RegExp = /^No: a single lookup/) {
      await opt(/^The lead with helpers/);
      await btn('Run the case');
      await step(3);
      await check(page);
      await btn('Lead + helpers');
      await step(4);
      await check(page);
      await opt(/^Only the helper’s one-line report/);
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
  };
}

/** Every chapter in one browser, from chapter 1, following each "Next" link. */
export async function walkAgents(page: Page, mode: Mode, check?: (page: Page) => Promise<void>) {
  const w = agentWalker(page, mode, check);
  await w.open('01-workflow-or-agent');
  await w.ch1(/\/agents\/02-the-loop\/$/);
  await w.ch2(/\/agents\/03-plans\/$/);
  await w.ch3(/\/agents\/04-budgets\/$/);
  await w.ch4(/\/agents\/05-memory\/$/);
  await w.ch5(/\/agents\/06-sub-agents\/$/);
  await w.ch6(/\/agents\/recap\/$/);
}
