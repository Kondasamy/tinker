// Module 2, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
// The puzzles are solved by hand here (not "Show me"), so the walk proves every control works.
import { expect, type Locator, type Page } from '@playwright/test';

export type Mode = 'mouse' | 'keyboard';

export function toolWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const tick = async (l: Locator) => {
    if (kb) {
      await l.focus();
      await l.press('Space');
    } else await l.check();
    await expect(l).toBeChecked();
  };
  /** like tick, for a box that moves the step on (and so leaves the card) */
  const toggle = async (l: Locator) => {
    if (kb) {
      await l.focus();
      await l.press('Space');
    } else await l.click();
  };
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name })); // a quiz or prediction option
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  /** Run the request, then Next message until the player is gone (the step moves on). */
  async function play() {
    const b = card.getByRole('button', { name: /^Run the request|^Next message/ });
    await press(b);
    while (await b.count()) await press(b);
  }

  async function open(id: string) {
    await page.goto(`/tool-calling/${id}/`);
    await page.locator('astro-island:not([ssr])').waitFor();
    await expect(card).toContainText('Step 1 of');
    await check(page);
  }
  async function finish(next?: RegExp) {
    await expect(card).toContainText('Chapter complete');
    await check(page);
    if (!next) return;
    await press(card.getByRole('link', { name: /Next:/ }));
    await expect(page).toHaveURL(next);
    await page.locator('astro-island:not([ssr])').waitFor();
    await expect(card).toContainText('Step 1 of');
  }

  return {
    async ch1(next?: RegExp) {
      await btn(/^Ask/);
      await opt(/can only write a reply/);
      await btn('Show the model’s reply');
      await step(4);
      await check(page);
      await btn(/^Look up order/);
      await opt(/software around the model/);
      await finish(next);
    },
    async ch2(next?: RegExp) {
      await btn(/^Open the get_order definition/);
      await opt(/calls no tool and guesses/);
      await btn('Run the request');
      await step(4);
      await tick(card.getByLabel(/Look up one Larkspur order/));
      await play();
      await step(5);
      await check(page);
      await btn('See the exact call and result');
      await opt(/description that says what the tool does/);
      await finish(next);
    },
    async ch3(next?: RegExp) {
      await opt(/Rejects it and sends the error back/);
      await play();
      await step(3);
      await check(page);
      await btn('Try a harder mistake →');
      await opt(/No: it is a whole number/);
      await play();
      await step(6);
      await tick(card.getByLabel(/Ownership check/));
      await play();
      await step(7);
      await opt(/Only that the arguments have the right shape/);
      await finish(next);
    },
    async ch4(next?: RegExp) {
      await opt(/Both calls in one turn/);
      await play();
      await step(3);
      await check(page);
      await btn('Now a refund →');
      await opt(/No: it needs the total/);
      await play();
      await step(6);
      await btn('− Fewer');
      await btn('− Fewer');
      await step(7);
      await check(page);
      await opt(/The host: the call cap/);
      await finish(next);
    },
    async ch5(next?: RegExp) {
      const more = (group: string) =>
        press(card.getByRole('group', { name: group }).getByRole('button', { name: '+ More' }));
      await more('AI apps');
      await more('AI apps');
      await more('Systems with tools');
      await more('Systems with tools');
      await step(2);
      await opt(/each app builds its MCP side once/);
      await toggle(card.getByLabel(/Use MCP/));
      await step(4);
      await check(page);
      await btn(/^Connect the Larkspur orders server/);
      await step(5);
      await btn(/^Connect the Larkspur calendar server/);
      await step(6);
      await check(page);
      await btn(/^Read the refund policy/);
      await btn(/^Get the refund_request prompt/);
      await step(7);
      await opt(/As a resource/);
      await finish(next);
    },
    async ch6(next?: RegExp) {
      await play();
      await step(2);
      await btn('Deny');
      await play();
      await step(3);
      await btn('− Lower');
      await btn('− Lower');
      await step(4);
      await btn('Next request →');
      await step(5);
      await check(page);
      await opt(/The model can follow the note/);
      await play();
      await step(7);
      await tick(card.getByLabel(/Approval gate/));
      await play();
      await step(8);
      await check(page);
      await btn('Deny');
      await play();
      await step(9);
      await opt(/gate and the tool’s limit/);
      await finish(next);
    },
    /** `next`: the recap's URL, reached by the closing link */
    async ch7(next?: RegExp) {
      const server = (name: RegExp) => card.getByRole('group', { name: 'Connected servers' }).getByLabel(name);
      const request = (n: number) => press(card.getByRole('button', { name: `Request ${n}`, exact: true }));
      const tryIt = async () => {
        await btn(/^Try this setup/);
        await expect(card.locator('.feedback .stamp')).toHaveText('RIGHT');
      };
      await tick(server(/^Larkspur orders/));
      await step(2);
      await check(page);
      // request 1, a lookup: orders, gate on, a limit
      await tick(card.getByLabel(/Approval gate/));
      await btn('− Lower');
      await tryIt();
      await request(3); // the refund: the same setup fits
      await tryIt();
      await request(4); // orders and calendar
      await tick(server(/^Larkspur calendar/));
      await tryIt();
      await check(page);
      await request(2); // calendar only
      await toggle(server(/^Larkspur orders/));
      await btn(/^Try this setup/);
      await finish();
      if (!next) return;
      await press(card.getByRole('link', { name: /^Recap/ }));
      await expect(page).toHaveURL(next);
    },
    open,
  };
}

/** Every chapter in one browser, from chapter 1, following each "Next" link. */
export async function walkToolCalling(page: Page, mode: Mode, check?: (page: Page) => Promise<void>) {
  const w = toolWalker(page, mode, check);
  await w.open('01-answers-arent-actions');
  await w.ch1(/02-first-tool/);
  await w.ch2(/03-valid-isnt-correct/);
  await w.ch3(/04-many-steps/);
  await w.ch4(/05-mcp/);
  await w.ch5(/06-when-tools-go-wrong/);
  await w.ch6(/07-workbench/);
  await w.ch7(/\/tool-calling\/recap\/$/);
}
