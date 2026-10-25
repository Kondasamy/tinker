// Card payments, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';
import {
  CAPTURE_NAME,
  HOLD_DAYS,
  KINDS,
  KIND_NAME,
  SCA_NAME,
  orderOf,
  policyOf,
  runOf,
} from '../../src/lib/payments/sim';
import { START, WINNERS } from '../../src/lib/payments/workbench';

// the chapters' moments, read off the simulator as the chapters read them (chapter files import CSS, so not here)
const REF = { sca: 'risk', capture: 'shipment', key: true } as const;
const HOPS = 7,
  AT_ISSUER = 3,
  SECOND = orderOf('N14').ships[1].day * 2,
  LAPSE = HOLD_DAYS * 2,
  NIGHT1 = 1,
  NIGHT2 = 3;
const CB = runOf({ ...policyOf(REF), small: { ...REF, sca: 'never' } });
const NOOR_T = CB.events.find(e => e.order === 'E5' && e.what === 'chargeback')!.t,
  KAI_T = CB.events.find(e => e.order === 'L12' && e.what === 'issuer-pays')!.t;

export type Mode = 'mouse' | 'keyboard';

export function paymentsWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
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
  const tick = async (l: Locator) => (kb ? l.press('Space') : l.click());

  async function open(id: string) {
    await page.goto(`/payments/${id}/`);
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
    /** a message on, predict, the request to the issuer, the yes back, quiz */
    async ch1(next?: RegExp) {
      await slide(/^Message/, 1);
      await step(2);
      await opt(/^Ana’s own bank, the issuer/);
      await slide(/^Message/, AT_ISSUER);
      await step(4);
      await check(page);
      await slide(/^Message/, HOPS - 1);
      await step(5);
      await opt(/^Your bank in Dublin/);
      await finish(next);
    },
    /** predict, the second parcel, Finn, his hold lapses, quiz */
    async ch2(next?: RegExp) {
      await opt(/only what shipped/);
      await step(2);
      await clock(SECOND);
      await step(3);
      await btn('Show Finn’s order');
      await step(4);
      await clock(LAPSE);
      await step(5);
      await check(page);
      await opt(/^It is never charged/);
      await finish(next);
    },
    /** night, predict, the ledger, a second night, quiz */
    async ch3(next?: RegExp) {
      await clock(NIGHT1);
      await step(2);
      await opt(/a few cents less/);
      await step(3);
      await btn('Open the Ledger tab');
      await step(4);
      await check(page);
      await clock(NIGHT2);
      await step(5);
      await opt(/the EU cap of/);
      await finish(next);
    },
    /** predict, the night's two charges, the key, quiz */
    async ch4(next?: RegExp) {
      await opt(/^Twice/);
      await step(2);
      await clock(1);
      await step(3);
      await check(page);
      await tick(card.getByRole('checkbox', { name: 'Send an idempotency key' }));
      await step(4);
      await opt(/^The app sends the same unique key/);
      await finish(next);
    },
    /** predict, always, on risk, quiz */
    async ch5(next?: RegExp) {
      await opt(/^Stop the thief/);
      await step(2);
      await btn('Always');
      await step(3);
      await check(page);
      await btn('When the bank sees risk');
      await step(4);
      await opt(/^Two independent proofs/);
      await finish(next);
    },
    /** Noor's chargeback, predict, Kai's, the ledger, quiz */
    async ch6(next?: RegExp) {
      await clock(NOOR_T);
      await step(2);
      await opt(/the issuer$/);
      await step(3);
      await clock(KAI_T);
      await step(4);
      await btn('Open the Ledger tab');
      await step(5);
      await check(page);
      await opt(/^The shoe shop/);
      await finish(next);
    },
    /** set one winning policy by hand, then the quiz */
    async ch7(next?: RegExp) {
      for (const k of KINDS) {
        const t = KIND_NAME[k];
        if (win[k].sca !== START[k].sca)
          await press(
            card.getByRole('group', { name: `${t}: 3-D Secure` }).getByRole('button', { name: SCA_NAME[win[k].sca] }),
          );
        if (win[k].capture !== START[k].capture)
          await press(
            card
              .getByRole('group', { name: `${t}: capture` })
              .getByRole('button', { name: CAPTURE_NAME[win[k].capture] }),
          );
        if (win[k].key !== START[k].key) await tick(card.getByRole('checkbox', { name: `${t}: idempotency key` }));
      }
      await step(2);
      await check(page);
      await opt(/^Skip the check on the cheap passes/);
      await finish(next);
    },
  };
}
