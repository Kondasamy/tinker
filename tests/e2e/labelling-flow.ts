// Who labels the data, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link. By
// keyboard, tickets are filed with the number keys 1–5 while the sort control has focus.
import { expect, type Locator, type Page } from '@playwright/test';
import { WINNERS } from '../../src/lib/labelling/workbench';

export type Mode = 'mouse' | 'keyboard';
const WORDS = {
  votes: (v: number) => (v === 1 ? '1 person' : `Vote of ${v}`),
  gold: (g: number) => (g ? `${g} gold each` : 'No gold'),
};
const HARD = { people: 'People', model: 'The model', check: 'Model + cross-check' } as const;

export function lbWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name, exact: typeof name === 'string' }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }).first()); // a quiz or prediction option
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  const tab = (name: string) => press(page.getByRole('button', { name, exact: true }));

  /** file the ticket in hole k (1–5): a number key while the control has focus, or a click */
  async function file(k: number, said = true) {
    const group = card.getByRole('group', { name: 'Sort the ticket' });
    if (kb) {
      await group.focus();
      await page.keyboard.press(String(k));
    } else await group.getByRole('button', { name: new RegExp(`^${k} `) }).click();
    if (said) await expect(card.locator('.lb-said')).toContainText('You filed it under');
  }
  /** sort n tickets of a run, moving on between them; the last one finishes the step, which hides the control */
  async function sort(n: number) {
    for (let i = 0; i < n; i++) {
      if (i) await btn('Next ticket');
      await file((i % 5) + 1, i < n - 1);
    }
  }

  async function open(id: string) {
    await page.goto(`/labelling/${id}/`);
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
    /** predict, file the three-way ticket */
    async ch1(next?: RegExp, quiz: string | RegExp = /^The ticket reads/) {
      await opt(/^Three/);
      await file(2);
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, sort three, the Matrix tab, Rosa and Tom */
    async ch2(next?: RegExp, quiz: string | RegExp = /^Saying/) {
      await opt('About 1 ticket in 5');
      await sort(3);
      await step(3);
      await tab('Matrix');
      await step(4);
      await press(page.getByRole('button', { name: 'Rosa · Tom' }));
      await step(5);
      await expect(page.locator('.lb-matrix caption')).toContainText('Rosa down, Tom across');
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, pin the guideline, the Matrix tab */
    async ch3(next?: RegExp, quiz: string | RegExp = /^Add that case/) {
      await opt('Only one or two');
      await btn('Pin the guideline');
      await step(3);
      await tab('Matrix');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, sort three gold tickets, score */
    async ch4(next?: RegExp, quiz: string | RegExp = /^So labellers work/) {
      await opt('Tom');
      await sort(3);
      await step(3);
      await btn('Score on gold');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, file where the vote lands */
    async ch5(next?: RegExp, quiz: string | RegExp = /^Send tickets/) {
      await opt(/^Yes/);
      await file(3);
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, both orders, seat the model */
    async ch6(next?: RegExp, quiz: string | RegExp = /^Nothing/) {
      await opt('Least sure first');
      await btn('Least sure first');
      await btn('Random order');
      await step(3);
      await btn('Seat the model');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** set the cheapest passing setup */
    async ch7(next?: RegExp, quiz: string | RegExp = /^It costs/) {
      const w = WINNERS[0];
      const radio = (name: string) => card.getByRole('radio', { name, exact: true });
      for (const r of [radio(WORDS.votes(w.votes)), radio(WORDS.gold(w.gold)), radio(HARD[w.hard])])
        await (kb ? r.press('Space') : r.check());
      await step(2);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
    file,
  };
}
