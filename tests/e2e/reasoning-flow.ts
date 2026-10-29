// Module 11, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';
import { choose } from './helpers';

export type Mode = 'mouse' | 'keyboard';
const EFFORTS = ['none', 'low', 'medium', 'high'];

export function rsWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name })); // a quiz or prediction option
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  /** set the effort dial: arrow keys by keyboard, a direct set by mouse */
  async function dial(effort: string) {
    const r = card.getByRole('slider', { name: 'Effort' });
    if (!kb) return r.fill(String(EFFORTS.indexOf(effort)));
    await r.focus();
    const now = EFFORTS.indexOf((await r.getAttribute('aria-valuetext'))!),
      to = EFFORTS.indexOf(effort);
    for (let i = now; i !== to; i += Math.sign(to - now)) await r.press(to > now ? 'ArrowRight' : 'ArrowLeft');
  }

  async function open(id: string) {
    await page.goto(`/reasoning/${id}/`);
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
    /** answer now, predict, think first */
    async ch1(next?: RegExp, quiz: string | RegExp = /^What a customer pays/) {
      await btn('Answer now');
      await step(2);
      await check(page);
      await opt(/^A different answer/);
      await btn('Think first, then answer');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, count, turn the dial through every level */
    async ch2(next?: RegExp, quiz: string | RegExp = /^Thinking is billed as output tokens, all of it/) {
      await opt('The thinking');
      await btn('Count the tokens');
      await step(3);
      for (const e of ['low', 'none', 'high']) await dial(e);
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict the curve, sweep the dial */
    async ch3(next?: RegExp, quiz: string | RegExp = /^Medium:/) {
      await opt(/^Up, then flat/);
      await step(2);
      for (const e of ['low', 'medium', 'high']) await dial(e);
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** low, predict, high */
    async ch4(next?: RegExp, quiz: string | RegExp = /^High effort/) {
      await btn('Run at low effort');
      await step(2);
      await opt(/^It gets worse/);
      await btn('Run at high effort');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, run both */
    async ch5(next?: RegExp, quiz: string | RegExp = /^Switch to adaptive thinking/) {
      await opt(/^The delivery date thinks far more/);
      await btn('Run both at high effort');
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, gate every kind */
    async ch6(next?: RegExp, quiz: string | RegExp = /^Write test questions/) {
      await opt('Multi-step questions');
      for (const k of ['lookups', 'multi-step', 'distractions']) await btn(`Gate the ${k}`);
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** lookups none, multi-step medium, distractions low: the best plan */
    async ch7(next?: RegExp, quiz: string | RegExp = /^Not yet:/) {
      const pick = (kind: string, e: string) => choose(card.locator(`label[data-kind="${kind}"] [role="combobox"]`), e);
      await pick('lookup', 'none');
      await pick('distractor', 'low');
      await pick('multistep', 'medium');
      await step(2);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
  };
}
