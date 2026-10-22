// Module 13, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';
import { CAPS, MEMORY } from '../../src/lib/inference/server';
import { WINNERS } from '../../src/lib/inference/workbench';

export type Mode = 'mouse' | 'keyboard';

export function inferenceWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));
  const step = (n: number, timeout?: number) => expect(card).toContainText(`Step ${n} of`, { timeout });
  /** a range input: arrow keys from where it is, or set straight to the index by mouse */
  const slide = async (name: RegExp, to: number) => {
    const l = card.getByRole('slider', { name });
    if (!kb) return l.fill(String(to));
    const at = Number(await l.inputValue());
    for (let i = at; i !== to; i += to > at ? 1 : -1) await l.press(to > at ? 'ArrowRight' : 'ArrowLeft');
  };
  const ready = () => expect(page.locator('.in-stage[data-model="ready"]')).toBeVisible({ timeout: 15_000 });

  async function open(id: string) {
    await page.goto(`/inference/${id}/`);
    await page.locator('astro-island:not([ssr])').waitFor();
    await expect(card).toContainText('Step 1 of');
    await ready();
    await check(page);
  }
  async function finish(next?: RegExp) {
    await expect(card).toContainText('Chapter complete');
    await check(page);
    if (!next) return;
    await press(card.getByRole('link', { name: /^(Next:|Recap)/ }));
    await expect(page).toHaveURL(next);
    // a key pressed before the next island hydrates is lost
    if (!/recap/.test(String(next))) {
      await page.locator('astro-island:not([ssr])').waitFor();
      await ready();
    }
  }
  const win = WINNERS[0];

  return {
    open,
    /** read the prompt, predict, write the reply, longer prompts */
    async ch1(next?: RegExp) {
      await btn('Read the prompt (prefill)');
      await step(2);
      await opt(/^About \d+ times as long/);
      await btn(/^Write the next/);
      await step(4);
      await check(page);
      await btn('Try longer prompts');
      await step(5);
      await opt(/^The contract waits longer for the first word/);
      await finish(next);
    },
    /** recap mini's cache, scale up, predict, fill past the room */
    async ch2(next?: RegExp) {
      await btn('Count Larkspur mini’s cache');
      await btn('Count it for OPT-13B');
      await step(3);
      await opt(/^About \d$/);
      await slide(/^Requests in flight/, 4);
      await step(5);
      await check(page);
      await opt(/^About halves/);
      await finish(next);
    },
    /** the timeline, predict, continuous batching */
    async ch3(next?: RegExp) {
      await btn('Open the Timeline tab');
      await step(2);
      await check(page);
      await opt(/^Much sooner/);
      await btn('Continuous batching');
      await step(4);
      await opt(/^They wait in the queue/);
      await finish(next);
    },
    /** 8 bits, predict, score, 4 bits */
    async ch4(next?: RegExp) {
      await btn('8 bits');
      await step(2);
      await opt(/^Barely moves/);
      await btn('Score both on held-out text');
      await step(4, 30_000);
      await check(page);
      await btn('4 bits');
      await step(5);
      await expect(card.locator('.tc-ledger')).toContainText('vs 16 bits', { timeout: 30_000 });
      await opt(/^Run its own evals/);
      await finish(next);
    },
    /** plain decoding, predict, draft 2 at a time, the longest guesses */
    async ch5(next?: RegExp) {
      await btn(/^Write \d+ tokens, one pass each/);
      await step(2);
      await opt(/^The same reply, in fewer passes/);
      await btn(/^Draft \d+ at a time/);
      await step(4);
      await expect(card).toContainText('SAME OUTPUT');
      await check(page);
      await slide(/^Tokens the student guesses/, 4);
      await step(5);
      await opt(/^The replies stay the same/);
      await finish(next);
    },
    /** predict, raise the cap to 16, then down to 1 */
    async ch6(next?: RegExp) {
      await opt(/^More tokens a second and shorter queues/);
      await slide(/^Batch cap/, CAPS.length - 1);
      await step(3);
      await check(page);
      await slide(/^Batch cap/, 0);
      await step(4);
      await opt(/^Not blindly/);
      await finish(next);
    },
    /** set one winning policy by hand, then the quiz */
    async ch7(next?: RegExp) {
      if (win.mode === 'continuous') await btn('Continuous batching');
      await slide(/^Batch cap/, (CAPS as readonly number[]).indexOf(win.cap));
      await slide(/^KV room/, MEMORY.indexOf(win.kvRoomGB));
      await step(2);
      await check(page);
      await opt(/^Continuous batching, a cap tuned/);
      await finish(next);
    },
  };
}
