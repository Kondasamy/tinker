// Diffusion language models, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';
import { KS } from '../../src/lib/diffusion-llms/decode';
import { WINNERS } from '../../src/lib/diffusion-llms/workbench';
import { ASKED_K as ASKED4, ASKED_LENGTHS as ASKED5, LENGTHS, NEED } from '../../src/lib/diffusion-llms/chapters';

export type Mode = 'mouse' | 'keyboard';
/** a fill shows a pass at a time, after the weights load; more on a phone or with the CPU shared */
const FILLING = { timeout: 30_000 };

export function dlWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name })); // a quiz or prediction option
  const step = (n: number, o = {}) => expect(card).toContainText(`Step ${n} of`, o);
  /** set a range to the index of `value` in `list`: arrow keys by keyboard, a direct set by mouse */
  async function range(name: string, list: readonly number[], value: number) {
    const r = card.getByRole('slider', { name });
    const to = list.indexOf(value);
    if (!kb) return r.fill(String(to));
    await r.focus();
    const now = Number(await r.inputValue());
    for (let i = now; i !== to; i += Math.sign(to - now)) await r.press(to > now ? 'ArrowRight' : 'ArrowLeft');
  }

  async function open(id: string) {
    await page.goto(`/diffusion-llms/${id}/`);
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
    /** predict, watch Larkspur mini type */
    async ch1(next?: RegExp, quiz: string | RegExp = /^About 4 seconds/) {
      await opt(/^16: one pass per token/);
      await btn(/^Type \d+ tokens/);
      await step(3, FILLING);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, guess the blank, look at a reply of blanks */
    async ch2(next?: RegExp, quiz: string | RegExp = /^Both “ships”/) {
      await opt(/^The words on both sides/);
      await btn('Guess the blank');
      await step(3, FILLING);
      await btn(/^Look at \d+ blanks/);
      await step(4, FILLING);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, fill at random, then surest first */
    async ch3(next?: RegExp, quiz: string | RegExp = /^The two it is most confident/) {
      await opt(/^The \d+ surest guesses/);
      await btn(/^Fill it: Random/);
      await step(3, FILLING);
      await btn(/^Fill it: Surest first/);
      await step(4, FILLING);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, fill at each asked setting */
    async ch4(next?: RegExp, quiz: string | RegExp = /^Check that replies/) {
      await opt(/^Faster, but the reply drifts/);
      await step(2);
      for (const k of ASKED4) {
        await range('Tokens a pass', KS, k);
        await btn(/^Fill: /);
        await expect(card.locator(`tr[data-k="${k}"]`)).toBeVisible(FILLING);
      }
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, fill at each asked length */
    async ch5(next?: RegExp, quiz: string | RegExp = /^An order status/) {
      await opt(/^Exactly 4 tokens/);
      await step(2);
      for (const n of ASKED5) {
        await range('Reply length', LENGTHS, n);
        await btn(/^Fill: /);
        await expect(card.locator(`tr[data-n="${n}"]`)).toBeVisible(FILLING);
      }
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, turn tokens a pass up to the claim */
    async ch6(next?: RegExp, quiz: string | RegExp = /^How many tokens a pass/) {
      await opt(/^Tokens a pass times passes a second/);
      await step(2);
      await range('Tokens a pass', KS, NEED);
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** set one of the best plans */
    async ch7(next?: RegExp, quiz: string | RegExp = /^Test each kind/) {
      const w = WINNERS[0];
      for (const [kind, c] of Object.entries(w)) {
        const sel = card.locator(`fieldset[data-kind="${kind}"] select`);
        await sel.nth(0).selectOption(String(c.k));
        await sel.nth(1).selectOption(c.rule);
      }
      await step(2);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
  };
}
