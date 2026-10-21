// Module 7, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';

export type Mode = 'mouse' | 'keyboard';

export function transformersWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));   // a quiz or prediction option
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  /** a range input: arrow keys from where it is, or set straight to the index by mouse */
  const slide = async (name: RegExp, to: number) => {
    const l = card.getByRole('slider', { name });
    if (!kb) return l.fill(String(to));
    const at = Number(await l.inputValue());
    for (let i = at; i !== to; i += to > at ? 1 : -1) await l.press(to > at ? 'ArrowRight' : 'ArrowLeft');
  };
  const ready = () => expect(page.locator('.tf-stage[data-model="ready"]')).toBeVisible({ timeout: 15_000 });

  async function open(id: string) {
    await page.goto(`/transformers/${id}/`);
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
    if (!/recap/.test(String(next))) { await page.locator('astro-island:not([ssr])').waitFor(); await ready(); }
  }

  return {
    open,
    /** read the prompt, predict, show the bar, add the likeliest token three times */
    async ch1(next?: RegExp) {
      await btn(/^Read “/);
      await step(2);
      await opt(/^“days”/);
      await btn('Show the probabilities');
      await step(4);
      await check(page);
      for (let i = 0; i < 3; i++) await btn(/^Add the likeliest token/);
      await step(5);
      await check(page);
      await opt(/^Not quite: each run gives probabilities for the next token only/);
      await finish(next);
    },
    /** look up a token's row, predict the two copies, see both sums */
    async ch2(next?: RegExp) {
      await btn(/^Look up “business”/);
      await step(2);
      await opt(/^Different: the model adds a row/);
      await btn('Show both copies');
      await step(4);
      await check(page);
      await opt(/^Nothing: “order” starts as the same vector/);
      await finish(next);
    },
    /** the Attention tab, the mask, two more prompts, the maths note */
    async ch3(next?: RegExp) {
      await press(page.getByRole('button', { name: 'Attention', exact: true }));
      await step(2);
      await check(page);
      await opt(/^Always 0/);
      await btn('Check the cells above the diagonal');
      await step(4);
      await btn(/^Every enterprise account/);
      await btn(/^Expedited delivery/);
      await step(5);
      await press(card.getByText('The maths (optional)'));
      await check(page);
      await opt(/^No: “business” comes later/);
      await finish(next);
    },
    /** every head, the word-start prediction, two more prompts, a top-floor head */
    async ch4(next?: RegExp) {
      for (const name of ['Layer 1, head 2', 'Layer 2, head 1', 'Layer 2, head 2']) await btn(name);
      await step(2);
      await opt(/where the word began$/);
      await btn(/^Show Layer 1, head 1’s weights$/);
      await step(4);
      await check(page);
      await btn(/^We reply within/);
      await btn(/^Expedited delivery/);
      await step(5);
      await btn('Layer 2, head 1');
      await step(6);
      await check(page);
      await opt(/^Not quite: no head’s job is set by hand/);
      await finish(next);
    },
    /** greedy, predict the flatter bar, a third temperature, top-p twice below 1 */
    async ch5(next?: RegExp) {
      await btn(/^Write \d+ tokens/);
      await step(2);
      await opt(/^It flattens/);
      await btn(/^Raise the temperature/);
      await step(4);
      await check(page);
      await slide(/^Temperature/, 3);
      await step(5);
      await slide(/^Top-p/, 4);
      await slide(/^Top-p/, 3);
      await step(6);
      await check(page);
      await opt(/^The replies vary/);
      await finish(next);
    },
    /** grow to 8 tokens, predict, grow to 16, then to the window */
    async ch6(next?: RegExp) {
      for (let i = 0; i < 7; i++) await btn(/^Add a token/);
      await step(2);
      await opt(/^They grow about four times/);
      await btn(/^Grow it to 16/);
      await step(4);
      await check(page);
      for (let i = 0; i < 16; i++) await btn(/^Add a token/);
      await step(5);
      await check(page);
      await opt(/^About a hundred times/);
      await finish(next);
    },
    /** type and trace a prompt, a head in each layer and the Attention tab, then a prompt past the window */
    async ch7(next?: RegExp) {
      const box = card.getByRole('textbox', { name: 'Your prompt' });
      if (kb) { await box.press('ControlOrMeta+a'); await box.pressSequentially('Where is my order?'); }
      else await box.fill('Where is my order?');
      await expect(card.locator('.tf-count')).toContainText(/^\d+ of 32 tokens$/);
      await btn('Trace it');
      await step(2);
      await btn('Layer 1, head 2');
      await btn('Layer 2, head 1');
      await press(page.getByRole('button', { name: 'Attention', exact: true }));
      await step(3);
      await check(page);
      await opt(/^It drops the oldest tokens/);
      await btn(/^Trace a prompt longer than the window/);
      await step(5);
      await expect(card.locator('.tf-count')).toContainText('don’t fit, so the model never reads them');
      await check(page);
      await opt(/^The question, but not the order number/);
      await finish(next);
    },
  };
}
