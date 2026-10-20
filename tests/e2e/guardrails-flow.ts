// Module 5, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';

export type Mode = 'mouse' | 'keyboard';

export function guardWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));   // a quiz or prediction option
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);

  async function open(id: string) {
    await page.goto(`/guardrails/${id}/`);
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
    /** the direct email, the forwarded invoice, the prediction, both again with the prompt rule on */
    async ch1(next?: RegExp, quiz: string | RegExp = /^The line helps, but it is not enough/) {
      await btn('Open the first email');
      await step(2);
      await btn(/^Run .*email$/);
      await step(3);
      await check(page);
      await btn(/^Next email/);
      await btn(/^Run the forwarded invoice$/);
      await step(5);
      await check(page);
      await opt(/^Only .*: the forwarded invoice still gets through/);
      await btn(/email, rule on$/);
      await btn(/^Run the forwarded invoice, rule on$/);
      await step(7);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
  };
}
