// When the buyer is an agent, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';
// the pins, not workbench.ts: its recordings load through import.meta.glob, which Playwright's node can't run
import pinned from '../../data/agent-commerce/pinned.json' with { type: 'json' };
import { choose, chooseByKeys } from './helpers';

export type Mode = 'mouse' | 'keyboard';

export function acWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  /** a button under the picture (the slip's form) */
  const stageBtn = (name: string) => press(page.locator('.ac-stage').getByRole('button', { name, exact: true }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }).first()); // a quiz or prediction option
  const step = (n: number, o = {}) => expect(card).toContainText(`Step ${n} of`, o);
  const pick = (box: Locator, value: string) => (kb ? chooseByKeys(box, value) : choose(box, value));
  /** sign the slip as it stands, then send it; `tamper` changes the cap between */
  async function signAndSend(tamper = false) {
    await stageBtn('Sign');
    await expect(page.locator('.ac-said')).toContainText('Signed by');
    if (tamper) await stageBtn('Change the cap');
    await stageBtn('Send');
  }

  async function open(id: string) {
    await page.goto(`/agent-commerce/${id}/`);
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
    /** predict, ask, ask about the other two */
    async ch1(next?: RegExp, quiz: string | RegExp = /^Every page is a fresh/) {
      await opt(/^\$/);
      await btn('Ask the agent');
      await step(3);
      for (let i = 0; i < 2; i++) await press(card.locator('button:not([disabled])', { hasText: /^Ask:/ }).first());
      await step(4);
      await expect(card.locator('.ac-read[data-right="1"]')).toHaveCount(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** open the card, switch to the catalogue, predict, drop a price */
    async ch2(next?: RegExp, quiz: string | RegExp = /^Stop and report/) {
      await btn('Open the agent card');
      await step(2);
      await btn('The catalogue');
      await step(3);
      await opt(/^Names the missing/);
      await btn('Drop the screws’ price');
      await step(5);
      await expect(card.locator('[data-missing]')).toHaveAttribute('data-missing', 'row 2 price');
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, send the vague order, answer, open the Task tab, send the clear one */
    async ch3(next?: RegExp, quiz: string | RegExp = /^An answer from the agent/) {
      await opt(/^Ask back/);
      await btn('Send the vague order');
      await step(3);
      await btn(/^Answer:/);
      await step(4);
      await press(page.getByRole('button', { name: 'Task', exact: true }));
      await step(5);
      await expect(page.locator('.ac-lane')).toBeVisible();
      await btn('Send the clear order');
      await step(6);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** sign and send, predict, then sign, change the cap and send */
    async ch4(next?: RegExp, quiz: string | RegExp = /^Hold to the signed/) {
      await stageBtn('Sign');
      await step(2);
      await stageBtn('Send');
      await step(3);
      await expect(page.locator('.ac-said')).toHaveText('Accepted: all 6 checks pass.');
      await opt(/^Refuses: the signature/);
      await step(4);
      await signAndSend(true);
      await step(5);
      await expect(page.locator('.ac-said')).toContainText('signature fails');
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, ask the agent, send the limit-raise anyway, then the lookalike */
    async ch5(next?: RegExp, quiz: string | RegExp = /^Yes: the shop checks/) {
      await opt(/^Refuses: the signed cap/);
      await btn('Ask the agent');
      await step(3);
      await signAndSend();
      await step(4);
      await expect(card.locator('[data-failed]')).toHaveAttribute('data-failed', 'cap');
      await signAndSend();
      await step(5);
      await expect(page.locator('.ac-said')).toContainText('merchant fails');
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** issue, predict, a wrong charge, the right one, the replay */
    async ch6(next?: RegExp, quiz: string | RegExp = /^Nothing more/) {
      await btn('Issue the token');
      await step(2);
      await opt(/^Refused: the token is bound/);
      await step(3);
      await btn('Charge');
      await step(4);
      await pick(card.getByRole('combobox', { name: /^Charge/ }), 'this');
      await btn('Charge');
      await step(5);
      await btn('Charge');
      await step(6);
      await expect(card.locator('li[data-ok]')).toHaveCount(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** set a winning slip */
    async ch7(next?: RegExp, quiz: string | RegExp = /^She is asked/) {
      const w = pinned.workbench.winners[0];
      const box = (name: RegExp) => card.getByRole('combobox', { name });
      await pick(box(/^Cap/), String(w.cap));
      await pick(box(/^Items/), w.items);
      await pick(box(/^Shops/), w.merchants);
      await pick(box(/^Good for/), String(w.hours));
      await pick(box(/^Ask/), w.confirm);
      await step(2);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
  };
}
