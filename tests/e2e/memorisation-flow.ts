// What a model remembers, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
// Chapters 3, 4 and 6 wait for the canary model to load.
import { expect, type Locator, type Page } from '@playwright/test';
import { CANARIES, REPEATS } from '../../src/lib/memorisation/story';
import { WINNERS } from '../../src/lib/memorisation/workbench';

/** the repeats radio's label starts this way (kit.tsx imports CSS, so the flow can't import it) */
const repeatWords = (r: number) => new RegExp(`^${r} cop`);
export type Mode = 'mouse' | 'keyboard';
/** the canary model loads, then a column ranks a few candidates per frame; more on a phone or with the CPU shared */
const LIVE = { timeout: 30_000 };
const SWITCH = { dedup: 'Remove duplicates', scrub: 'Scrub PINs before training', filter: 'Output filter on replies' };

export function memWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  /** a radio or checkbox: Space toggles it from the keyboard */
  const tick = (l: Locator) => (kb ? l.press('Space') : l.click());
  const opt = (name: string | RegExp) => tick(card.getByRole('radio', { name }));
  const step = (n: number, o = {}) => expect(card).toContainText(`Step ${n} of`, o);
  const copies = async () => {
    for (const r of [...REPEATS].reverse()) await opt(repeatWords(r));
  };

  async function open(id: string) {
    await page.goto(`/memorisation/${id}/`);
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
    /** predict, show both endings */
    async ch1(next?: RegExp, quiz: string | RegExp = /^The model recites the email/) {
      await opt(/^A line from the copied policy/);
      await btn('Show both endings');
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** every canary */
    async ch2(next?: RegExp, quiz: string | RegExp = /^Made-up account numbers/) {
      await copies();
      await step(2);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, ask all four */
    async ch3(next?: RegExp, quiz: string | RegExp = /^It gives the manager’s number/) {
      await opt(/^Only the ones with many copies/);
      const ask = card.getByRole('button', { name: 'Ask', exact: true });
      for (const c of CANARIES) {
        await opt(new RegExp(c.prefix.text));
        await expect(ask).toBeEnabled(LIVE);
        await press(ask);
      }
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, each number of copies on the column */
    async ch4(next?: RegExp, quiz: string | RegExp = /^No: an attacker trying the likeliest/) {
      await opt(/^Near the top/);
      await expect(page.locator('.recital-desk, .mem-wait').first()).toBeVisible();
      await copies();
      await step(3, LIVE);
      await expect(page.locator('.recital-desk .truth')).toHaveCount(1, LIVE);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, remove duplicates */
    async ch5(next?: RegExp, quiz: string | RegExp = /^The product code/) {
      await opt(/^No: one copy is too few/);
      await tick(card.getByRole('checkbox', { name: SWITCH.dedup }));
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, ask through the filter, ask one digit at a time, scrub */
    async ch6(next?: RegExp, quiz: string | RegExp = /^Replace the codes/) {
      await opt(/^Not fully/);
      const ask = card.getByRole('button', { name: 'Ask', exact: true });
      await expect(ask).toBeEnabled(LIVE);
      await press(ask);
      await step(3);
      await btn('Ask one digit at a time');
      await step(4);
      await tick(card.getByRole('checkbox', { name: SWITCH.scrub }));
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** switch on one winning policy by hand */
    async ch7(next?: RegExp, quiz: string | RegExp = /^Scrub the numbers first/) {
      const w = WINNERS[0];
      for (const k of ['dedup', 'scrub', 'filter'] as const)
        if (w[k]) await tick(card.getByRole('checkbox', { name: SWITCH[k] }));
      await step(2);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
  };
}
