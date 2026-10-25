// Replication & consistency, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';
import { MOMENTS, type Product } from '../../src/lib/consistency/sim';
import { START, WINNERS } from '../../src/lib/consistency/workbench';

export type Mode = 'mouse' | 'keyboard';
const TITLE: Record<Product, string> = { hinge: 'Hinges', drill: 'Drill press' };

export function consistencyWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  /** a range input: arrow keys from where it is, or set straight to the value by mouse */
  const slide = async (name: RegExp, to: number) => {
    const l = card.getByRole('slider', { name });
    if (!kb) return l.fill(String(to));
    const at = Number(await l.inputValue());
    for (let i = at; i !== to; i += to > at ? 1 : -1) await l.press(to > at ? 'ArrowRight' : 'ArrowLeft');
  };
  const clock = (t: number) => slide(/^Time/, t);

  async function open(id: string) {
    await page.goto(`/consistency/${id}/`);
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
  const win = WINNERS[0];

  return {
    open,
    /** clock to the sale, predict, clock to the stale look, the timeline, quiz */
    async ch1(next?: RegExp) {
      await clock(MOMENTS.firstSale);
      await step(2);
      await opt(/^\d+: the news is still on its way/);
      await clock(MOMENTS.staleLook);
      await step(4);
      await check(page);
      await btn('Open the Timeline tab');
      await step(5);
      await opt(/^The deposit hasn’t reached Berlin/);
      await finish(next);
    },
    /** clock, predict, the last hinge, two receipts, timeline, quiz */
    async ch2(next?: RegExp) {
      await clock(MOMENTS.lastHinge - 2);
      await step(2);
      await opt(/^Two: each warehouse/);
      await clock(MOMENTS.lastHinge);
      await step(4);
      await expect(card.locator('.cs-receipts li[data-result="sold"]')).toHaveCount(2);
      await check(page);
      await btn('Open the Timeline tab');
      await step(5);
      await opt(/^Both get a ticket/);
      await finish(next);
    },
    /** cut, predict, clock, stay right, quiz */
    async ch3(next?: RegExp) {
      await btn('Cut the line');
      await step(2);
      await opt(/^Sold: North’s count/);
      await clock(MOMENTS.northSells);
      await step(4);
      await btn('Stay right');
      await step(5);
      await check(page);
      await opt(/^Refuse the booking/);
      await finish(next);
    },
    /** predict, R and W to 2, cut, quiz */
    async ch4(next?: RegExp) {
      await opt(/^No: any two readers/);
      await step(2);
      await slide(/^R, replicas/, 2);
      await slide(/^W, replicas/, 2);
      await step(3);
      await btn('Cut the line');
      await step(4);
      await check(page);
      await opt(/^4: R \+ W/);
      await finish(next);
    },
    /** predict, clock, reservations, quiz */
    async ch5(next?: RegExp) {
      await opt(/^Two: both read 1/);
      await step(2);
      await clock(MOMENTS.lastHinge);
      await step(3);
      await btn('Reservations at North');
      await step(4);
      await check(page);
      await opt(/^One edit silently disappears/);
      await finish(next);
    },
    /** clock, predict, reload, read where you wrote, quiz */
    async ch6(next?: RegExp) {
      await clock(MOMENTS.priyaBuys);
      await step(2);
      await opt(/^No: West hasn’t heard/);
      await clock(MOMENTS.priyaLooks);
      await step(4);
      await btn('Read where you wrote');
      await step(5);
      await check(page);
      await opt(/^Your refresh reached a copy/);
      await finish(next);
    },
    /** set one winning policy by hand, then the quiz */
    async ch7(next?: RegExp) {
      for (const k of ['hinge', 'drill'] as Product[]) {
        const t = TITLE[k],
          group = card.getByRole('group', { name: `${t}: conflict rule` });
        if (win[k].rule !== START[k].rule)
          await press(
            group.getByRole('button', { name: win[k].rule === 'lww' ? 'Last writer wins' : 'Reservations at North' }),
          );
        if (win[k].r !== START[k].r) await slide(new RegExp(`^${t} R`), win[k].r);
        if (win[k].w !== START[k].w) await slide(new RegExp(`^${t} W`), win[k].w);
      }
      await step(2);
      await check(page);
      await opt(/^Keep selling shirts/);
      await finish(next);
    },
  };
}
