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
  };
}
