// Rate limits, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link. The time slider,
// the flood buttons and the drip sit with the picture; everything else is in the step card.
import { expect, type Locator, type Page } from '@playwright/test';
import { DRIPS, SIZES, WINNERS } from '../../src/lib/rate-limits/workbench';
import { LIVE } from '../../src/lib/rate-limits/sim';

export type Mode = 'mouse' | 'keyboard';

export function rateWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const tick = (l: Locator) => (kb ? l.press('Space') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const stage = page.getByRole('region', { name: 'Scene' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  /** a range: by mouse set straight to the value; by keyboard, End (stepping back first if it is already there) */
  const range = async (l: Locator, to: number) => {
    if (!kb) return l.fill(String(to));
    if ((await l.inputValue()) === (await l.getAttribute('max'))) await l.press('ArrowLeft');
    await l.press('End');
  };
  /** the stage's clock: every chapter's predicate is "at or past", so the keyboard goes to the end */
  const time = (ms: number) => range(stage.getByRole('slider', { name: /^Time/ }), ms);
  const send10 = () => press(stage.getByRole('button', { name: 'Send 10' }));

  async function open(id: string) {
    await page.goto(`/rate-limits/${id}/`);
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
    if (!/recap/.test(String(next))) await page.locator('astro-island:not([ssr])').waitFor();
  }
  const win = WINNERS[0];

  return {
    open,
    time,
    send10,
    /** steady, predict, the server down, the Requests tab, quiz */
    async ch1(next?: RegExp) {
      await time(4000);
      await step(2);
      await opt(/^Some fail too/);
      await time(7000);
      await step(4);
      await check(page);
      await btn('Open the Requests tab');
      await step(5);
      await opt(/^Every buyer/);
      await finish(next);
    },
    /** before the edge, predict, after it, the Requests tab, quiz */
    async ch2(next?: RegExp) {
      await time(59_000);
      await step(2);
      await opt(/^All 80/);
      await time(61_000);
      await step(4);
      await btn('Open the Requests tab');
      await step(5);
      await opt(/^10, across/);
      await finish(next);
    },
    /** Send 10, predict, Send 10 again for a 429, the drip, quiz */
    async ch3(next?: RegExp) {
      await send10();
      await step(2);
      await opt(/^Most get a 429/);
      await send10();
      await step(4);
      await check(page);
      await range(stage.getByRole('slider', { name: /^Drip/ }), LIVE.drips.length - 1);
      await step(5);
      await opt(/^100 at once/);
      await finish(next);
    },
    /** the burst, the reply and predict, the end, Listen, quiz */
    async ch4(next?: RegExp) {
      await time(1200);
      await step(2);
      await expect(card.locator('.rl-reply')).toContainText('429 Too Many Requests');
      await opt(/^Mostly more 429s/);
      await time(20_000);
      await step(4);
      await check(page);
      await tick(card.getByRole('checkbox', { name: /^Listen/ }));
      await step(5);
      await opt(/^Wait 30 seconds/);
      await finish(next);
    },
    /** the crowd, predict, the Requests tab, back off, jitter, quiz */
    async ch5(next?: RegExp) {
      await time(1000);
      await step(2);
      await opt(/^Another stampede/);
      await btn('Open the Requests tab');
      await step(4);
      await check(page);
      await tick(card.getByRole('checkbox', { name: /^Back off/ }));
      await step(5);
      await tick(card.getByRole('checkbox', { name: /^Jitter/ }));
      await step(6);
      await opt(/^Wait a random/);
      await finish(next);
    },
    /** the shared barrel, predict, a barrel per key, later, quiz */
    async ch6(next?: RegExp) {
      await time(5000);
      await step(2);
      await opt('About a third');
      await step(3);
      await tick(card.getByRole('checkbox', { name: /^One barrel per key/ }));
      await step(4);
      await check(page);
      await time(10_000);
      await step(5);
      await opt(/^Every app hears/);
      await finish(next);
    },
    /** set one winning bench by hand, then the quiz */
    async ch7(next?: RegExp) {
      const size = card.getByRole('slider', { name: /^Barrel size/ }),
        drip = card.getByRole('slider', { name: /^Drip/ });
      if (kb) {
        await size.focus();
        for (let i = SIZES.indexOf(10); i < SIZES.indexOf(win.size); i++) await size.press('ArrowRight');
        for (let i = SIZES.indexOf(10); i > SIZES.indexOf(win.size); i--) await size.press('ArrowLeft');
        await drip.focus();
        for (let i = DRIPS.indexOf(5); i < DRIPS.indexOf(win.refill); i++) await drip.press('ArrowRight');
      } else {
        await size.fill(String(SIZES.indexOf(win.size)));
        await drip.fill(String(DRIPS.indexOf(win.refill)));
      }
      await tick(card.getByRole('checkbox', { name: /^One barrel per key/ }));
      await step(2);
      await check(page);
      await opt(/^The burst gets through/);
      await finish(next);
    },
  };
}
