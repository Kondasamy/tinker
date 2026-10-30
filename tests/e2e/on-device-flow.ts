// Models on your device, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';
import { HANDHELD } from '../../src/lib/on-device/memory';

export type Mode = 'mouse' | 'keyboard';
const MODEL = { timeout: 30_000 }; // Larkspur mini loads before chapter 2's Ask

export function odWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string) => press(card.getByRole('button', { name, exact: true }));
  const opt = (name: RegExp) => press(card.getByRole('radio', { name }).first()); // a quiz or prediction option
  const radio = (name: string) => {
    const r = card.getByRole('radio', { name, exact: true });
    return kb ? r.press('Space') : r.click(); // a pick may move the step on and unmount the radio, so never wait on its checked state
  };
  const step = (n: number, o = {}) => expect(card).toContainText(`Step ${n} of`, o);
  /** set a range to item `to`: arrow keys by keyboard, a direct set by mouse */
  async function range(r: Locator, to: number) {
    if (!kb) return r.fill(String(to));
    await r.focus();
    const now = Number(await r.inputValue());
    for (let i = now; i !== to; i += Math.sign(to - now)) await r.press(to > now ? 'ArrowRight' : 'ArrowLeft');
  }

  async function open(id: string) {
    await page.goto(`/on-device/${id}/`);
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
    async ch1(next?: RegExp, quiz: RegExp = /^How many bytes per weight/) {
      await radio('1B model');
      await step(2);
      await opt(/^About three/);
      await step(3);
      await radio('3B model');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    async ch2(next?: RegExp, quiz: RegExp = /^Its own questions/) {
      await radio('8 bits');
      await step(2);
      await opt(/^The same words/);
      await step(3);
      await radio('16 bits');
      await expect(card.getByRole('button', { name: 'Ask at 16 bits' })).toBeEnabled(MODEL);
      await btn('Ask at 16 bits');
      await radio('8 bits');
      await btn('Ask at 8 bits');
      await step(4);
      await radio('4 bits');
      await btn('Ask at 4 bits');
      await radio('2 bits');
      await btn('Ask at 2 bits');
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    async ch3(next?: RegExp, quiz: RegExp = /^The chat’s tokens/) {
      const ctx = card.getByRole('slider', { name: 'Context' });
      await range(ctx, 2);
      await step(2);
      await opt(/^At 4,000 tokens/);
      await step(3);
      await range(card.getByRole('slider', { name: 'Context' }), 4);
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    async ch4(next?: RegExp, quiz: RegExp = /^Keep replies short/) {
      await btn('Ask: one hour of long replies');
      await step(2);
      await opt(/^It runs dry/);
      await step(3);
      for (let h = 1; h < HANDHELD.shiftHours; h++) await btn('Ask: one hour of long replies');
      await step(4);
      await radio('Short: 20 tokens');
      await btn('Ask: one hour of short replies');
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    async ch5(next?: RegExp, quiz: RegExp = /^The handheld throttles/) {
      await btn('Rush 10 long replies');
      await step(2);
      await opt(/^No: the work ends/);
      await step(3);
      await radio('Short: 20 tokens');
      await btn('Rush 10 short replies');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    async ch6(next?: RegExp, quiz: RegExp = /^Short questions stay/) {
      await radio('On the handheld');
      await step(2);
      await opt(/^The question and its context/);
      await step(3);
      await radio('In the cloud');
      await step(4);
      await radio('Fall back when too long');
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    async ch7(next?: RegExp, quiz: RegExp = /^It answers too few/) {
      await radio('3B model');
      await radio('4 bits');
      await radio('Short: 20 tokens');
      await step(2);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
  };
}
