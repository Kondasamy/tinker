// Git, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';
import { choose } from './helpers';
import { BENCH, START, WINNERS } from '../../src/lib/git/workbench';
import { EDITED, SAVED } from '../../src/lib/git/story';

export type Mode = 'mouse' | 'keyboard';

export function gitWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  const editor = page.getByRole('textbox', { name: 'prices.txt' });
  /** change the page: by mouse, the drill press price; by keyboard, one character typed at the start */
  const edit = async () => {
    if (!kb) return editor.fill(EDITED);
    await editor.focus();
    await page.keyboard.press('ControlOrMeta+Home');
    await page.keyboard.type('x');
  };
  const undo = async () => {
    if (!kb) return editor.fill(SAVED);
    await page.keyboard.press('Backspace');
  };

  async function open(id: string) {
    await page.goto(`/git/${id}/`);
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
    // a key pressed before the next island hydrates is lost
    if (!/recap/.test(String(next))) await page.locator('astro-island:not([ssr])').first().waitFor();
  }
  const graph = async () => {
    await btn('Open the Graph tab');
    await expect(page.getByRole('list', { name: /^Commit graph/ })).toBeVisible();
  };

  return {
    open,
    edit,
    undo,
    editor,
    /** predict, edit, undo, quiz */
    async ch1(next?: RegExp) {
      await opt(/^A whole new name/);
      await step(2);
      await edit();
      await step(3);
      await check(page);
      await undo();
      await step(4);
      await opt(/^One: same bytes/);
      await finish(next);
    },
    /** commit, predict, reword, graph, quiz */
    async ch2(next?: RegExp) {
      await btn('Commit it');
      await step(2);
      await opt(/^Every crate/);
      await btn(/^Reword/);
      await step(4);
      await check(page);
      await graph();
      await step(5);
      await opt(/^Every later commit/);
      await finish(next);
    },
    /** predict, branch, commit, graph, quiz */
    async ch3(next?: RegExp) {
      await opt(/^None/);
      await btn('Make the sale branch');
      await step(3);
      await btn(/^Commit “/);
      await step(4);
      await check(page);
      await graph();
      await step(5);
      await opt(/^Nothing: main still/);
      await finish(next);
    },
    /** predict, merge, graph, quiz */
    async ch4(next?: RegExp) {
      await opt(/^Yes: they changed/);
      await btn('Merge sale into main');
      await step(3);
      await check(page);
      await graph();
      await step(4);
      await opt(/^Against their shared/);
      await finish(next);
    },
    /** predict, merge, keep the sale's line, graph, quiz */
    async ch5(next?: RegExp) {
      await opt(/^Stops/);
      await btn('Merge sale into main');
      await step(3);
      await check(page);
      await btn(/^Keep sale’s line/);
      await step(4);
      await graph();
      await step(5);
      await opt(/^Git stops/);
      await finish(next);
    },
    /** predict, rebase, graph, quiz */
    async ch6(next?: RegExp) {
      await opt(/^No: they all/);
      await btn('Rebase shelf onto main');
      await step(3);
      await check(page);
      await graph();
      await step(4);
      await opt(/^No: their work/);
      await finish(next);
    },
    /** set one winning plan by hand, then the quiz */
    async ch7(next?: RegExp) {
      const win = WINNERS[0];
      if (win.order.join() !== START.order.join())
        await choose(card.getByRole('combobox', { name: 'Order' }), win.order.join());
      for (const b of BENCH)
        if (win.ways[b] !== START.ways[b])
          await press(
            card
              .getByRole('group', { name: `${b}: merge or rebase` })
              .getByRole('button', { name: win.ways[b] === 'merge' ? 'Merge' : 'Rebase' }),
          );
      await step(2);
      await check(page);
      await opt(/^Merge the shared one/);
      await finish(next);
    },
  };
}
