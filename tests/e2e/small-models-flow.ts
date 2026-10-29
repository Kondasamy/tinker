// Module 12, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';
import { choose as pick, chooseByKeys } from './helpers';

export type Mode = 'mouse' | 'keyboard';

export function smWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name })); // a quiz or prediction option
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  /** a native range input: End by keyboard; by mouse, fill sets the value as a drag would */
  async function slide(l: Locator, to: number | 'end') {
    if (kb) {
      await l.focus();
      if (to === 'end') await l.press('End');
      else {
        await l.press('Home');
        for (let i = 0; i < to; i++) await l.press('ArrowRight');
      }
    } else await l.fill(String(to === 'end' ? await l.getAttribute('max') : to));
  }
  /** a drop-down, by keyboard (focus, open, arrow to the option) or by mouse */
  const choose = (l: Locator, label: string) => (kb ? chooseByKeys(l, { label }) : pick(l, { label }));

  async function open(id: string) {
    await page.goto(`/small-models/${id}/`);
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
    /** weigh, predict, ask both */
    async ch1(next?: RegExp, quiz: string | RegExp = /^About a ninth/) {
      await btn('Weigh both models');
      await step(2);
      await opt(/^Mostly the same pieces/);
      await btn('Ask both');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** the lesson, predict, the training run */
    async ch2(next?: RegExp, quiz: string | RegExp = /^The odds show/) {
      await btn('Show the teacher’s lesson');
      await step(2);
      await check(page);
      await opt(/^A little higher/);
      await btn('Show the training run');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, compare on held-out text */
    async ch3(next?: RegExp, quiz: string | RegExp = /^Not yet/) {
      await opt(/^Somewhere in between/);
      await btn('Compare them on held-out text');
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, run both tiers */
    async ch4(next?: RegExp, quiz: string | RegExp = /^The opening time/) {
      await opt(/^Most right, but fewer/);
      await btn(/^Run all \d+ on both tiers$/);
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, slide the threshold to the top */
    async ch5(next?: RegExp, quiz: string | RegExp = /^It reaches the customer/) {
      await opt(/^Both rise/);
      await slide(card.getByRole('slider'), 'end');
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** the baseline, predict, find the cheapest threshold that ships (0.9: the sixth of seven) */
    async ch6(next?: RegExp, quiz: string | RegExp = /^Don’t ship/) {
      await btn('Run all-large through the gate');
      await step(2);
      await opt(/^Yes: a threshold that sends/);
      await slide(card.getByRole('slider'), 5);
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** lookups small, policy questions through the router at 0.9, the hard ones large */
    async ch7(next?: RegExp, quiz: string | RegExp = /^Lookups to the small model/) {
      await choose(card.getByLabel('Lookups'), 'Small tier');
      await choose(card.getByLabel('Vague or multi-step'), 'Large tier');
      await step(2);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
  };
}
