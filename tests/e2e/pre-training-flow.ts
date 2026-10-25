// Module 18, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';

export type Mode = 'mouse' | 'keyboard';

export function ptWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name })); // a quiz or prediction option
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  /** a native range input: End by keyboard; by mouse, fill sets the value as a drag would */
  async function slide(l: Locator, to: number | 'end') {
    if (kb) {
      await l.focus();
      if (to === 'end') await l.press('End');
      else {
        await l.press('Home');
        for (let i = 0; i < to; i++) await l.press('ArrowRight');
      }
    } else await l.fill(String(to === 'end' ? await l.getAttribute('max') : to));
  }

  async function open(id: string) {
    await page.goto(`/pre-training/${id}/`);
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
    /** open step 0, predict, ask it, show its top five */
    async ch1(next?: RegExp, quiz: string | RegExp = /^Gibberish/) {
      await btn('Open the step-0 checkpoint');
      await step(2);
      await opt(/^The same few pieces/);
      await btn('Ask the step-0 checkpoint');
      await step(4);
      await check(page);
      await btn('Show its top five guesses');
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, scrub to the last checkpoint, show the loss */
    async ch2(next?: RegExp, quiz: string | RegExp = /^The model is getting less surprised/) {
      await opt(/^With words that read like/);
      await step(2);
      await slide(card.getByRole('slider'), 'end');
      await step(3);
      await check(page);
      await btn('Show the loss');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, score the last checkpoint on held-out text, show both curves */
    async ch3(next?: RegExp, quiz: string | RegExp = /^It is memorising/) {
      await opt(/gap between them grows/);
      await btn(/^Score step \d+ on held-out text$/);
      await step(3);
      await check(page);
      await btn('Show both curves');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, compare the two runs, show the duplicated run's loss */
    async ch4(next?: RegExp, quiz: string | RegExp = /^The model memorises/) {
      await opt(/^A line lifted/);
      await btn('Compare the two runs');
      await step(3);
      await check(page);
      await btn('Show its loss');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, score both runs */
    async ch5(next?: RegExp, quiz: string | RegExp = /^Whether the benchmark’s questions/) {
      await opt(/^Better on the test questions, no better/);
      await btn('Score both runs');
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, raise the budget to the top */
    async ch6(next?: RegExp, quiz: string | RegExp = /^Spend less on size/) {
      await opt(/^The model and its training data/);
      await step(2);
      await check(page);
      await slide(card.getByRole('slider'), 'end');
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** all the documents, run to the end: one of the winning plans */
    async ch7(next?: RegExp, quiz: string | RegExp = /^Keep the step-4,000/) {
      await btn('All documents');
      await step(2);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
    slide,
  };
}
