// Module 6, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';

export type Mode = 'mouse' | 'keyboard';

export function tokensWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));   // a quiz or prediction option
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);

  async function open(id: string) {
    await page.goto(`/tokens/${id}/`);
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
    /** predict the sample's count, feed it in, type and count your own text */
    async ch1(next?: RegExp, quiz: string | RegExp = /^The model reads tokens/, text = 'Quillon KX-4471B') {
      await opt(/^More than \d+: some words/);
      await step(2);
      await btn('Feed the sentence to the tokenizer');
      await step(3);
      await check(page);
      const box = card.getByLabel('Your text');
      if (kb) { await box.focus(); await page.keyboard.press('ControlOrMeta+a'); await page.keyboard.type(text); }
      else await box.fill(text);
      await btn('Count my text');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** cut into bytes, predict the first merge, one merge, then every merge */
    async ch2(next?: RegExp, quiz: string | RegExp = /^The word is cut into pieces/) {
      await btn('Cut it into bytes');
      await step(2);
      await press(card.getByRole('radio').first());
      await step(3);
      await btn('Next merge');
      await step(4);
      await check(page);
      await btn('Run every merge');
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict the rule against real counts, count, price */
    async ch3(next?: RegExp, quiz: string | RegExp = /^Recount with the new model/) {
      await opt(/^The rule gives more tokens/);
      await step(2);
      await btn('Count the documents');
      await step(3);
      await check(page);
      await btn('Price the documents');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
  };
}
