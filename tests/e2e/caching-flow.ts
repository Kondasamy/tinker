// Caching & CDNs, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';
import { MOMENTS, TTLS, type Kind } from '../../src/lib/caching/sim';
import { START, WINNERS } from '../../src/lib/caching/workbench';

const MORNING = MOMENTS.morning;

export type Mode = 'mouse' | 'keyboard';

export function cachingWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
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
  const ttlIndex = (t: number) => (TTLS as readonly number[]).indexOf(t);

  async function open(id: string) {
    await page.goto(`/caching/${id}/`);
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
    /** north, predict, west, the timeline */
    async ch1(next?: RegExp) {
      await btn('Send one from North');
      await step(2);
      await opt(/^Longer: the round trip grows/);
      await btn('Send one from West');
      await step(4);
      await check(page);
      await btn('Open the Timeline tab');
      await step(5);
      await opt(/^Each Sydney request crosses/);
      await finish(next);
    },
    /** shelves on, predict, timeline, clock, quiz */
    async ch2(next?: RegExp) {
      await btn('Turn on the shelves');
      await step(2);
      await opt(/^A miss: it makes the trip/);
      await btn('Open the Timeline tab');
      await step(4);
      await check(page);
      await slide(/^Time of day/, MORNING);
      await step(5);
      await opt(/^A miss: Lima’s copy is fetched/);
      await finish(next);
    },
    /** clock to the price rise, predict, a 15-minute TTL */
    async ch3(next?: RegExp) {
      await slide(/^Time of day/, MOMENTS.priceRise);
      await step(2);
      await opt(/^Far fewer, but some/);
      await slide(/^Price TTL/, 1);
      await step(4);
      await check(page);
      await opt(/^Some still see the 7 pm showing/);
      await finish(next);
    },
    /** predict, purge, versioned names */
    async ch4(next?: RegExp) {
      await opt(/^None: the old copy is gone/);
      await btn(/^Purge$/);
      await step(3);
      await btn('Versioned names');
      await step(4);
      await check(page);
      await opt(/^Link the new logo under a new name/);
      await finish(next);
    },
    /** clock to the sale, predict, coalescing, stale-while-revalidate */
    async ch5(next?: RegExp) {
      await slide(/^Time of day/, MOMENTS.sale);
      await step(2);
      await opt(/^About one per item per warehouse/);
      await btn(/^Request coalescing$/);
      await step(4);
      await btn(/^Stale-while-revalidate$/);
      await step(5);
      await check(page);
      await opt(/^Request coalescing: one fetch/);
      await finish(next);
    },
    /** two predictions, the quiz */
    async ch6(next?: RegExp) {
      await opt(/^Misses: a hit needs the prompt identical/);
      await step(2);
      await opt(/^When the reply ends/);
      await step(3);
      await check(page);
      await opt(/^Every call after midnight misses/);
      await finish(next);
    },
    /** set one winning policy by hand, then the quiz */
    async ch7(next?: RegExp) {
      for (const k of ['price', 'photo', 'stock'] as Kind[])
        if (win.ttl[k] !== START.ttl[k])
          await slide(
            new RegExp(`^${{ price: 'Prices', photo: 'Photos', stock: 'Stock counts' }[k]} TTL`),
            ttlIndex(win.ttl[k]),
          );
      if (win.versioned) await btn('Versioned photo names');
      if (win.purge) await btn('Purge on change');
      await step(2);
      await check(page);
      await opt(/^Long TTLs with a purge for prices/);
      await finish(next);
    },
  };
}
