// Module 9, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';

export type Mode = 'mouse' | 'keyboard';

export function ftWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));   // a quiz or prediction option
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);

  async function open(id: string) {
    await page.goto(`/fine-tuning/${id}/`);
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
    // a key pressed before the next island hydrates is lost
    if (!/recap/.test(String(next))) await page.locator('astro-island:not([ssr])').waitFor();
  }

  return {
    /** pull the three levers, predict, ask all three versions */
    async ch1(next?: RegExp, quiz: string | RegExp = /^The documents:/) {
      await btn('Pull the prompt lever');
      await btn('Pull the documents lever');
      await btn('Pull the weights lever');
      await step(2);
      await check(page);
      await opt(/^All three:/);
      await btn(/^Ask all three/);
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** ask the base model, predict, swap in the fine-tuned weights, open the training run */
    async ch2(next?: RegExp, quiz: string | RegExp = /^The weights:/) {
      await btn('Ask the base model');
      await step(2);
      await opt(/^A reply that ends/);
      await btn('Swap in the fine-tuned weights');
      await step(4);
      await check(page);
      await btn('Show the training run');
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** count, predict the share, clip on the adapter, ask with it */
    async ch3(next?: RegExp, quiz: string | RegExp = /^Each adapter is a small file/) {
      await btn(/^Count the weights/);
      await step(2);
      await opt('Between 1% and 10%');
      await btn('Clip on the adapter');
      await step(4);
      await check(page);
      await btn(/^Ask with the adapter/);
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** read the update, predict, ask both, run the whole set */
    async ch4(next?: RegExp, quiz: string | RegExp = /^Put the returns policy in the documents/) {
      await btn('Read the price update');
      await step(2);
      await opt(/gives the old price; .* gives the new one$/);
      await btn(/^Ask both/);
      await step(4);
      await check(page);
      await btn(/^Run all \d+ questions on both$/);
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** score the base, predict, score both fine-tunes */
    async ch5(next?: RegExp, quiz: string | RegExp = /^Train a small adapter instead/) {
      await btn('Score the base model');
      await step(2);
      await check(page);
      await opt(/^The full fine-tune/);
      await btn('Score both fine-tunes');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** run the baseline, predict, run the gate */
    async ch6(next?: RegExp, quiz: string | RegExp = /^Write the test set and score/) {
      await btn(/^Run the baseline/);
      await step(2);
      await check(page);
      await opt('Neither');
      await btn('Run both through the release gate');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** send facts and changed prices to RAG and no-fact replies to the prompt: a best-scoring plan */
    async ch7(next?: RegExp, quiz: string | RegExp = /^The prompt for the voice/) {
      const kind = (id: string) => card.locator(`fieldset[data-kind="${id}"]`);
      await press(kind('voice').getByRole('button', { name: 'Prompted' }));
      await press(kind('facts').getByRole('button', { name: 'RAG' }));
      await press(kind('changed').getByRole('button', { name: 'RAG' }));
      await step(2);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
  };
}
