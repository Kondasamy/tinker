// Module 8, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';

export type Mode = 'mouse' | 'keyboard';

export function contextWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name, exact: typeof name === 'string' }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));   // a quiz or prediction option
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);

  async function open(id: string) {
    await page.goto(`/context/${id}/`);
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
    /** the question alone, then the document, the prediction, the tools and the earlier question */
    async ch1(next?: RegExp, quiz: string | RegExp = /^The budget:/) {
      await btn('Send the question');
      await step(2);
      await check(page);
      await btn('Add the shipping document');
      await step(3);
      await opt(/^More than the system prompt/);
      await step(4);
      await btn('Add the order tools');
      await step(5);
      await check(page);
      await btn('Add the earlier question');
      await step(6);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** the fact alone, the prediction, then every place at both distractor counts */
    async ch2(next?: RegExp, quiz: string | RegExp = /^Send fewer articles/) {
      await btn('Send with the fact alone');
      await step(2);
      await opt(/^At the start or the end/);
      await step(3);
      await btn('4 distractors');
      await btn('In the middle');
      await btn('At the end');
      await check(page);
      await btn('12 distractors');
      await btn('At the start');
      await btn('In the middle');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** stuffed, the prediction, the search tool, then the other two questions both ways */
    async ch3(next?: RegExp, quiz: string | RegExp = /^A search tool over the manual/) {
      await btn('Send with every document');
      await step(2);
      await opt(/^Fewer tokens, and the answer comes out right/);
      await step(3);
      await btn('Send with the search tool');
      await step(4);
      await check(page);
      await btn('free shipping');
      await btn('Every document up front');
      await btn('the sensor warranty');
      await btn('Search when needed');
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** the plain conversation, the prediction, then the puzzle solved by hand: the ticket time moved to the end */
    async ch4(next?: RegExp, quiz: string | RegExp = /^Fixed instructions and the product list first/) {
      await btn('Send the conversation');
      await step(2);
      await check(page);
      await opt(/^Hits stop at the stamp/);
      await step(3);
      await btn('Move Ticket time down');
      await btn('Move Ticket time down');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** the full history, the prediction (which clears it), the summary, then the cache prediction */
    async ch5(next?: RegExp, quiz: string | RegExp = /^Each clear changes text early/) {
      await btn('Send the conversation');
      await step(2);
      await check(page);
      await opt(/^Still right, from a smaller window/);
      await step(3);
      await btn('One summary');
      await step(4);
      await check(page);
      await opt(/^Full history/);
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** both sessions without memory, the prediction, then both with the memory tool */
    async ch6(next?: RegExp, quiz: string | RegExp = /^In the shop’s own storage/) {
      await btn('Run both conversations');
      await step(2);
      await check(page);
      await opt(/^It knows about the contract/);
      await step(3);
      await btn('Run both with the memory tool');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** stuffing everything, the prediction, then the policy solved by hand: search, full history, cache on */
    async ch7(next?: RegExp, quiz: string | RegExp = /^Fetch the pages each question needs/) {
      await btn('Run the policy');
      await step(2);
      await check(page);
      await opt(/^Search when needed, instead/);
      await step(3);
      await btn('Search when needed');
      await btn('Cache on');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
  };
}
