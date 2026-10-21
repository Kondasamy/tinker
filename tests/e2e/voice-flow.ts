// Module 17, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link. No step needs sound:
// the walker never presses Play.
import { expect, type Locator, type Page } from '@playwright/test';

export type Mode = 'mouse' | 'keyboard';
const SILENCES = ['300 ms', '500 ms', '800 ms', '1.20 s'];
const THRESHOLDS = ['10', '30', '50'];

export function voWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));   // a quiz or prediction option
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  /** set a range over a finite list: arrow keys by keyboard, a direct set by mouse */
  async function range(label: string, values: string[], to: string) {
    const r = card.getByRole('slider', { name: label });
    if (!kb) return r.fill(String(values.indexOf(to)));
    await r.focus();
    const now = values.indexOf((await r.getAttribute('aria-valuetext'))!), want = values.indexOf(to);
    for (let i = now; i !== want; i += Math.sign(want - now)) await r.press(want > now ? 'ArrowRight' : 'ArrowLeft');
  }

  async function open(id: string) {
    await page.goto(`/voice/${id}/`);
    await page.locator('astro-island:not([ssr])').first().waitFor();
    await expect(card).toContainText('Step 1 of');
    await check(page);
  }
  async function finish(next?: RegExp) {
    await expect(card).toContainText('Chapter complete');
    await check(page);
    if (!next) return;
    await press(card.getByRole('link', { name: /^(Next:|Recap)/ }));
    await expect(page).toHaveURL(next);
    if (!/recap/.test(String(next))) await page.locator('astro-island:not([ssr])').first().waitFor();
  }

  return {
    /** answer, predict, every stage */
    async ch1(next?: RegExp, quiz: string | RegExp = /^The ear’s/) {
      await btn('Answer Dana’s call');
      await step(2);
      await opt(/^Her words, written down/);
      await step(3);
      for (let i = 0; i < 4; i++) await btn('Next stage');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** time, predict, stream */
    async ch2(next?: RegExp, quiz: string | RegExp = /^Stream:/) {
      await btn('Time the call');
      await step(2);
      await opt(/^Dana hears the first word sooner/);
      await btn('Streaming: off');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, every silence, every threshold */
    async ch3(next?: RegExp, quiz: string | RegExp = /^Fewer cut-offs/) {
      await opt(/^His first pause ends his turn/);
      await step(2);
      for (const v of ['300 ms', '800 ms', '1.20 s']) await range('Silence setting', SILENCES, v);
      await step(3);
      await check(page);
      for (const v of ['10', '50']) await range('Energy threshold', THRESHOLDS, v);
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** ask, pick where Dana cuts in, predict, barge-in */
    async ch4(next?: RegExp, quiz: string | RegExp = /^The model may refer/) {
      await btn('Dana asks for a slot');
      await step(2);
      await btn(/^During “Wednesday afternoon”/);
      await step(3);
      await check(page);
      await opt(/^Only the part spoken/);
      await btn('Barge-in: off');
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** take the call, predict, read back */
    async ch5(next?: RegExp, quiz: string | RegExp = /^It finds someone else’s/) {
      await btn('Take Ravi’s call');
      await step(2);
      await opt(/^Read the number back/);
      await btn(/^Read back unsure numbers/);
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, switch builds */
    async ch6(next?: RegExp, quiz: string | RegExp = /^Chained:/) {
      await opt(/^A transcript the host/);
      await btn('One speech-to-speech model');
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** silence 800, streaming, barge-in and read-back on: the best line */
    async ch7(next?: RegExp, quiz: string | RegExp = /^A shorter silence setting/) {
      await range('Silence setting', SILENCES, '800 ms');
      await btn('Streaming: off');
      await btn('Barge-in: off');
      await btn(/^Read back unsure numbers/);
      await step(2);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
  };
}
