// Opening a web page, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';
import { TTLS, customerOf } from '../../src/lib/web-requests/sim';
import { START, WINNERS } from '../../src/lib/web-requests/workbench';

export type Mode = 'mouse' | 'keyboard';
const INES = customerOf('ines'),
  WEN = customerOf('wen');
const named = (c: typeof INES) => `${c.name}, ${c.town}`;

export function webWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
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
  const ttl = (m: number) => (TTLS as readonly number[]).indexOf(m);

  async function open(id: string) {
    await page.goto(`/web-requests/${id}/`);
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

  return {
    open,
    /** ask the root, predict, ask the rest, the waterfall */
    async ch1(next?: RegExp) {
      await btn('Ask the root');
      await step(2);
      await opt(/^Three: the root/);
      await btn('Ask the .example office');
      await btn(/^Ask larkspur\.example/);
      await step(4);
      await check(page);
      await btn('Open the Waterfall tab');
      await step(5);
      await opt(/^At the root, which refers/);
      await finish(next);
    },
    /** an hour, predict, five minutes, a day */
    async ch2(next?: RegExp) {
      await slide(/^Larkspur’s DNS TTL/, ttl(60));
      await step(2);
      await opt(/^His resolver asks Larkspur’s office again/);
      await slide(/^Larkspur’s DNS TTL/, ttl(5));
      await step(4);
      await slide(/^Larkspur’s DNS TTL/, ttl(1440));
      await step(5);
      await check(page);
      await opt(/^Some visitors keep reaching the old host/);
      await finish(next);
    },
    /** Ines, predict, Wen, the waterfall */
    async ch3(next?: RegExp) {
      await btn(named(INES));
      await step(2);
      await opt(/^Far longer/);
      await btn(named(WEN));
      await step(4);
      await check(page);
      await btn('Open the Waterfall tab');
      await step(5);
      await opt(/^A server nearer the players/);
      await finish(next);
    },
    /** predict, lossy lines, Ines, the waterfall */
    async ch4(next?: RegExp) {
      await opt(/^About a second more/);
      await btn('Lossy lines');
      await step(3);
      await btn(named(INES));
      await step(4);
      await btn('Open the Waterfall tab');
      await step(5);
      await check(page);
      await opt(/^Lost packets: each waits out a timeout/);
      await finish(next);
    },
    /** the certificate, predict, resumption, an order */
    async ch5(next?: RegExp) {
      await btn('Check the certificate');
      await step(2);
      await opt(/^One round trip: his request rides along/);
      await btn(/^Session resumption$/);
      await step(4);
      await btn('Place an order');
      await step(5);
      await check(page);
      await opt(/^Your line to it is private/);
      await finish(next);
    },
    /** the waterfall, predict, HTTP/2, HTTP/3 */
    async ch6(next?: RegExp) {
      await btn('Open the Waterfall tab');
      await step(2);
      await opt(/^They wait too/);
      await btn('HTTP/2');
      await step(4);
      await btn('HTTP/3');
      await step(5);
      await check(page);
      await opt(/^The whole page pauses/);
      await finish(next);
    },
    /** set one winning policy by hand, then the quiz */
    async ch7(next?: RegExp) {
      const w = WINNERS[0];
      if (w.ttl !== START.ttl) await slide(/^DNS TTL/, ttl(w.ttl));
      if (w.http !== START.http) await btn(`HTTP/${w.http}`);
      if (w.resume !== START.resume) await btn(/^Session resumption$/);
      await step(2);
      await check(page);
      await opt(/^HTTP\/3 with session resumption/);
      await finish(next);
    },
  };
}
