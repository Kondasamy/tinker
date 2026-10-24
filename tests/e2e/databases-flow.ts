// Databases & indexes, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';
import { INDEX_NAME } from '../../src/lib/databases/planner';
import { WINNERS } from '../../src/lib/databases/workbench';

export type Mode = 'mouse' | 'keyboard';

export function databasesWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);

  async function open(id: string) {
    await page.goto(`/databases/${id}/`);
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
    open,
    /** find, predict, grow */
    async ch1(next?: RegExp) {
      await btn('Find order 1042');
      await step(2);
      await opt(/a scan reads every page$/);
      await btn('Grow to a million orders');
      await step(4);
      await check(page);
      await opt(/^Check every shelf/);
      await finish(next);
    },
    /** build, predict, find, the Tree tab */
    async ch2(next?: RegExp) {
      await btn('Build the index');
      await step(2);
      await opt(/one page per level of the tree/);
      await btn('Find order 1042');
      await step(4);
      await check(page);
      await btn('Open the Tree tab');
      await step(5);
      await opt(/^It reads a page or two more/);
      await finish(next);
    },
    /** write, predict, three indexes */
    async ch3(next?: RegExp) {
      await btn('Write a new order');
      await step(2);
      await opt(/^It grows/);
      for (const i of ['id', 'customer', 'date'] as const) await btn(`Index on ${INDEX_NAME[i]}`);
      await step(4);
      await check(page);
      await opt(/^Drop the indexes no search uses/);
      await finish(next);
    },
    /** the regular's month, predict, the whole month */
    async ch4(next?: RegExp) {
      await btn(/^Customer \d+’s orders this month/);
      await step(2);
      await opt(/^Scan the whole table/);
      await btn('All orders this month');
      await step(4);
      await check(page);
      await opt(/^All pupils in class 4B/);
      await finish(next);
    },
    /** today, predict, this month, force */
    async ch5(next?: RegExp) {
      await btn('Today’s orders');
      await step(2);
      await opt(/^A full scan/);
      await btn('This month’s orders');
      await step(4);
      await btn('Force the date index');
      await step(5);
      await check(page);
      await opt(/^Scan the table/);
      await finish(next);
    },
    /** run, predict, the customers index */
    async ch6(next?: RegExp) {
      await btn('Run the join');
      await step(2);
      await opt(/^Fewer/);
      await btn('Index on customer number');
      await step(4);
      await check(page);
      await opt(/^An index on the products table’s id/);
      await finish(next);
    },
    /** pick one winning set by hand, then the quiz */
    async ch7(next?: RegExp) {
      for (const i of WINNERS[0]) await btn(`Index on ${INDEX_NAME[i]}`);
      await step(2);
      await check(page);
      await opt(/^Index the address/);
      await finish(next);
    },
  };
}
