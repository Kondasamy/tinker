// Module 19, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';

export type Mode = 'mouse' | 'keyboard';
const BETAS = ['0.25', '0.5', '1', '2', '4'];

export function ptWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name })); // a quiz or prediction option
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  /** set the strength slider: arrow keys by keyboard, a direct set by mouse */
  async function strength(beta: string) {
    const r = card.getByRole('slider');
    if (!kb) return r.fill(String(BETAS.indexOf(beta)));
    await r.focus();
    const now = BETAS.indexOf((await r.getAttribute('aria-valuetext'))!),
      to = BETAS.indexOf(beta);
    for (let i = now; i !== to; i += Math.sign(to - now)) await r.press(to > now ? 'ArrowRight' : 'ArrowLeft');
  }

  async function open(id: string) {
    await page.goto(`/post-training/${id}/`);
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
    /** ask the base model, predict, ask both Larkspur minis (live) */
    async ch1(next?: RegExp, quiz: string | RegExp = /^It continues the text/) {
      await btn('Ask the base model');
      await step(2);
      await check(page);
      await opt(/^It replies in the examples/);
      await btn('Ask both Larkspur minis');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** pick in each pair (default the team's picks), predict, score */
    async ch2(next?: RegExp, picks = ['A', 'B', 'A'], quiz: string | RegExp = /^Pairs of replies/) {
      for (const [k, x] of picks.entries()) await press(card.locator('.pt-pair').nth(k).locator(`[data-pick="${x}"]`));
      await step(2);
      await opt(/^A draft that won every pair/);
      await btn('Score the drafts');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** train on the picks, predict, slide the strength up */
    async ch3(next?: RegExp, quiz: string | RegExp = /^β was too low/) {
      await btn('Train on your picks');
      await step(2);
      await opt(/^It falls back/);
      await strength('4');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** draw, predict, update, nine more rounds */
    async ch4(next?: RegExp, quiz: string | RegExp = /^Maths word problems/) {
      await btn('Draw a group');
      await step(2);
      await opt(/^The ones that scored above/);
      await btn('Update the policy');
      await step(4);
      await btn(/^Run \d+ more rounds$/);
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, run the rounds */
    async ch5(next?: RegExp, quiz: string | RegExp = /^The tests check/) {
      await opt(/^Nothing: it stays/);
      await btn(/^Run \d+ rounds$/);
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, run the weak grader, swap in the key-fact grader */
    async ch6(next?: RegExp, quiz: string | RegExp = /^To close tickets/) {
      await opt(/^E: numbers/);
      await btn(/^Run \d+ rounds$/);
      await step(3);
      await check(page);
      await btn('Use the key-fact grader');
      await step(4);
      await opt(quiz);
      await finish(next);
    },
    /** tick the key-fact rule onto the weak grader */
    async ch7(next?: RegExp, quiz: string | RegExp = /^Run it on drafts/) {
      const box = card.getByRole('checkbox', { name: 'Has the key fact' });
      if (kb) await box.press('Space');
      else await box.check();
      await step(2);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
  };
}
