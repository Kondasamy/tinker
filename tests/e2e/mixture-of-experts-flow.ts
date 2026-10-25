// Mixture of experts, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link. The token
// strip and the override sit under the picture; everything else is in the step card. Controls that run the model wait
// for its weights (the status line goes away).
import { expect, type Locator, type Page } from '@playwright/test';
import { FACTORS } from '../../src/lib/mixture-of-experts/capacity';
import { cardOf } from '../../src/lib/mixture-of-experts/cards';
import { WINNERS } from '../../src/lib/mixture-of-experts/workbench';
import { roomName } from '../../src/lib/mixture-of-experts/routes';
import PINNED from '../../data/mixture-of-experts/pinned.json' with { type: 'json' };

export type Mode = 'mouse' | 'keyboard';
const LOADING = { timeout: 30_000 };

export function moeWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const tick = (l: Locator) => (kb ? l.press('Space') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const stage = page.getByRole('region', { name: 'Scene' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));
  const step = (n: number, o = {}) => expect(card).toContainText(`Step ${n} of`, o);
  /** the model is in: the status line is gone and the strip is enabled */
  const ready = () => expect(stage.locator('.me-status')).toHaveCount(0, LOADING);
  const token = (i: number) => stage.locator('.me-strip input[type="radio"]').nth(i);
  const last = async () => (await stage.locator('.me-strip input[type="radio"]').count()) - 1;
  async function factor(to: (typeof FACTORS)[number]) {
    const r = card.getByRole('slider', { name: 'Capacity factor' });
    const i = FACTORS.indexOf(to);
    if (!kb) return r.fill(String(i));
    await r.focus();
    const now = Number(await r.inputValue());
    for (let k = now; k !== i; k += Math.sign(i - now)) await r.press(i > now ? 'ArrowRight' : 'ArrowLeft');
  }

  async function open(id: string) {
    await page.goto(`/mixture-of-experts/${id}/`);
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
  const win = WINNERS[0];

  return {
    open,
    ready,
    token,
    /** predict, three tokens through every room, split into rooms, quiz */
    async ch1(next?: RegExp, quiz: string | RegExp = /^It roughly doubles/) {
      await opt(/^All /);
      await step(2);
      await ready();
      for (const i of [0, 1, 2]) await tick(token(i));
      await step(3);
      await check(page);
      await btn('Split into rooms');
      await step(4);
      await opt(quiz);
      await finish(next);
    },
    /** predict, a token, the Router tab, a second token, quiz */
    async ch2(next?: RegExp) {
      await opt(/^To the two best/);
      await step(2);
      await ready();
      await tick(token(0));
      await step(3);
      await btn('Open the Router tab');
      await step(4);
      await check(page);
      await tick(token(1));
      await step(5);
      await opt(/^2$/);
      await finish(next);
    },
    /** predict, three tokens, every room's favourites, quiz */
    async ch3(next?: RegExp) {
      await opt(/^Kinds of token/);
      await step(2);
      await ready();
      for (const i of [0, 1, 2]) await tick(token(i));
      await step(3);
      await btn('Show every room');
      await step(4);
      await check(page);
      await opt(/^Experts that split/);
      await finish(next);
    },
    /** the last token, predict, two rooms that change the guess, Use router, quiz */
    async ch4(next?: RegExp) {
      await ready();
      await tick(token(await last()));
      await step(2);
      await opt(/^It can change/);
      await step(3);
      for (const e of PINNED.override.experts)
        await tick(stage.getByRole('checkbox', { name: roomName(e), exact: true }));
      await step(4);
      await check(page);
      await press(stage.getByRole('button', { name: 'Use router' }));
      await step(5);
      await opt(/^The answer around/);
      await finish(next);
    },
    /** factor 2, predict, factor 1, back to 2, quiz */
    async ch5(next?: RegExp) {
      await ready();
      await factor(2);
      await step(2);
      await opt(/^They skip/);
      await step(3);
      await factor(1);
      await step(4);
      await check(page);
      await factor(2);
      await step(5);
      await opt(/^Train with/);
      await finish(next);
    },
    /** count, predict, compare, the memory, quiz */
    async ch6(next?: RegExp, quiz: string | RegExp = /^A: memory/) {
      await btn('Count the weights');
      await step(2);
      await opt(/^The experts toy/);
      await step(3);
      await btn('Compare the two');
      await step(4);
      await btn('Work out the memory');
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** a winning card and precision by hand, then the quiz */
    async ch7(next?: RegExp) {
      await tick(card.getByRole('radio', { name: new RegExp(`^${cardOf(win.card).name}:`) }));
      await tick(card.getByRole('radio', { name: new RegExp(`^${win.bits}-bit`) }));
      await step(2);
      await check(page);
      await opt(/^The work per token/);
      await finish(next);
    },
  };
}
