// How email arrives, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link. The stage's
// tabs and the postmarks to peel sit with the picture; everything else is in the step card.
import { expect, type Locator, type Page } from '@playwright/test';
// the bench's data, read straight from its files (the engine loads the fixture mail through Vite)
import bench from '../../data/email/workbench.json' with { type: 'json' };
import pinned from '../../data/email/pinned.json' with { type: 'json' };

const SPF_OPTIONS = bench.spf,
  WINNERS = pinned.workbench;

export type Mode = 'mouse' | 'keyboard';
const spfName = (id: string) => SPF_OPTIONS.find(o => o.id === id)!.name;

export function emailWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const tick = (l: Locator) => (kb ? l.press('Space') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const stage = page.getByRole('region', { name: 'Scene' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));
  const pick = (name: string) => tick(card.getByRole('radio', { name, exact: true }));
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  /** peel every postmark, bottom first, one press each */
  const peel = async () => {
    const next = stage.getByRole('button', { name: /^Peel postmark/ });
    for (let i = 0; i < 6 && (await next.count()) > 0; i++) await press(next.first());
    await expect(next).toHaveCount(0);
  };

  async function open(id: string) {
    await page.goto(`/email/${id}/`);
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
    peel,
    /** the headers, predict, deliver to junk, quiz */
    async ch1(next?: RegExp) {
      await press(stage.getByRole('button', { name: 'Headers', exact: true }));
      await step(2);
      await opt(/^No: nothing checks/);
      await btn('Deliver');
      await step(4);
      await check(page);
      await opt(/^Nothing: the sender/);
      await finish(next);
    },
    /** predict, peel bottom-up, the MX lookup, the forwarded copy's longer road, quiz */
    async ch2(next?: RegExp) {
      await opt(/^The bottom one/);
      await step(2);
      await peel();
      await step(3);
      await check(page);
      await pick('Forwarded copy');
      await step(4);
      await peel();
      await step(5);
      await opt(/^A, named/);
      await finish(next);
    },
    /** the fake, predict, its postmarks, deliver to the inbox, quiz */
    async ch3(next?: RegExp) {
      await pick('Fake invoice');
      await step(2);
      await opt(/^Nothing: no check/);
      await peel();
      await step(4);
      await btn('Deliver');
      await step(5);
      await check(page);
      await opt(/^The top postmarks/);
      await finish(next);
    },
    /** publish SPF, the spoof fails, include the vendor, predict the forger's pass, quiz */
    async ch4(next?: RegExp) {
      await pick(spfName('own'));
      await step(2);
      await pick('Fake reminder');
      await step(3);
      await pick(spfName('vendor'));
      await step(4);
      await opt(/^Pass: that domain/);
      await pick('Fake invoice');
      await step(6);
      await check(page);
      await opt(/^Pass, for the scammer/);
      await finish(next);
    },
    /** sign, predict, one digit fails real DKIM, re-spacing passes, quiz */
    async ch5(next?: RegExp) {
      await tick(card.getByRole('checkbox', { name: /^Larkspur signs with DKIM/ }));
      await step(2);
      await opt(/^It fails/);
      await tick(card.getByRole('radio', { name: /^Amount changed/ }));
      await step(4);
      await expect(stage.getByRole('status')).toContainText('Real DKIM check, run here: fail');
      await pick('Re-spaced on the way');
      await step(5);
      await expect(stage.getByRole('status')).toContainText('Real DKIM check, run here: pass');
      await check(page);
      await opt(/^The signature fails/);
      await finish(next);
    },
    /** the fake fails alignment, reject, predict the forward, the prize's spam score, quiz */
    async ch6(next?: RegExp) {
      await pick('Fake invoice');
      await step(2);
      await pick('reject');
      await step(3);
      await opt(/^Inbox: DKIM/);
      await pick('Forwarded copy');
      await step(5);
      await pick('Prize draw');
      await step(6);
      await check(page);
      await opt(/^It bounces/);
      await finish(next);
    },
    /** set one winning setting by hand, then the quiz */
    async ch7(next?: RegExp) {
      await pick(spfName(win.spf));
      if (win.dkim) await tick(card.getByRole('checkbox', { name: /^Larkspur signs with DKIM/ }));
      await pick(win.dmarc);
      await step(2);
      await check(page);
      await opt(/^Forwarding breaks/);
      await finish(next);
    },
  };
}
