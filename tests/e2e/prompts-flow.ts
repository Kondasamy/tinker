// Writing a prompt, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link. The card
// tray, the rules toggle, the model chips and chapter 1's instruction chips live under the stage; every prediction and
// quiz lives in the step card.
import { expect, type Locator, type Page } from '@playwright/test';
// the pins, not story.ts or workbench.ts: those read the recordings through import.meta.glob, which only Vite runs
import pinned from '../../data/prompts/pinned.json' with { type: 'json' };

const MINI_PROMPTS = pinned.continuations.map(c => c.prompt),
  WINNERS = pinned.workbench.winners;

export type Mode = 'mouse' | 'keyboard';

export function prWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  /** a quiz or prediction option */
  const opt = (name: string | RegExp) =>
    press(card.getByRole('radio', { name, exact: typeof name === 'string' }).first());
  const step = (n: number, o = {}) => expect(card).toContainText(`Step ${n} of`, o);
  /** a card in the tray under the stage */
  const clip = (id: string) => press(page.locator(`button[data-card="${id}"]`));
  const stageButton = (name: string) => press(page.getByRole('button', { name, exact: true }));

  async function open(id: string) {
    await page.goto(`/prompts/${id}/`);
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
    /** predict, send to Larkspur mini, try the second instruction */
    async ch1(next?: RegExp, quiz: string | RegExp = /^It only continues/) {
      await opt(/^More text/);
      await expect(card.getByRole('button', { name: 'Send' })).toBeEnabled({ timeout: 30_000 });
      await btn('Send');
      await step(3);
      await stageButton(MINI_PROMPTS[1]);
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** read the vague reply, predict, clip the role, then the clear task */
    async ch2(next?: RegExp, quiz: string | RegExp = /^Say who the summary/) {
      await stageButton('Text');
      await step(2);
      await opt(/^Clear task/);
      await clip('role');
      await step(4);
      await clip('clear');
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** one example, predict, the quirky pair */
    async ch3(next?: RegExp, quiz: string | RegExp = /^More of them/) {
      await clip('one-example');
      await step(2);
      await opt('Opens with it too');
      await clip('quirky-examples');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, the list, then JSON */
    async ch4(next?: RegExp, quiz: string | RegExp = /^Parse strictly/) {
      await opt(/^Yes: it parses/);
      await clip('list');
      await step(3);
      await clip('json');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, move the house rule last */
    async ch5(next?: RegExp, quiz: string | RegExp = /^Restate the rule/) {
      await opt(/^Missed/);
      await stageButton('House rule last');
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, clip the clear task, predict, send to the smaller model */
    async ch6(next?: RegExp, quiz: string | RegExp = /^Rerun the whole/) {
      await opt(/^All \d+$/);
      await clip('clear');
      await step(3);
      await opt('Fewer');
      await stageButton('Smaller model');
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** clip a winning prompt from the bench's start */
    async ch7(next?: RegExp, quiz: string | RegExp = /^Add more real tickets/) {
      const w = WINNERS[0];
      expect(w).toMatchObject({ role: true, task: 'clear', examples: 0, format: 'json' });
      await clip('clear');
      await clip('json');
      await step(2);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
    clip,
  };
}
