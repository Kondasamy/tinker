// Synthetic data, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link. Chapters 2–4
// wait for Larkspur mini to load and write.
import { expect, type Locator, type Page } from '@playwright/test';

import { GENS, LAST } from '../../src/lib/synthetic-data/runs';
import { TEMPERATURES as TEMPS, WINNERS } from '../../src/lib/synthetic-data/workbench';
import { choose, chooseByKeys } from './helpers';

export type Mode = 'mouse' | 'keyboard';
/** a batch is written after the weights load, a reply per frame; more on a phone or with the CPU shared */
const WRITING = { timeout: 30_000 };
const [COOL, , HOT] = TEMPS;

export function sdWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  /** a radio: Space selects it from the keyboard */
  const opt = (name: string | RegExp) => {
    const l = card.getByRole('radio', { name });
    return kb ? l.press('Space') : l.click();
  };
  const step = (n: number, o = {}) => expect(card).toContainText(`Step ${n} of`, o);
  /** set a range to the index of `value` in `list`: arrow keys by keyboard, a direct set by mouse */
  async function range(name: string, list: readonly number[], value: number) {
    const r = card.getByRole('slider', { name });
    const to = list.indexOf(value);
    if (!kb) return r.fill(String(to));
    await r.focus();
    const now = Number(await r.inputValue());
    for (let i = now; i !== to; i += Math.sign(to - now)) await r.press(to > now ? 'ArrowRight' : 'ArrowLeft');
  }
  /** a drop-down: by keyboard, open it and arrow to the option; by mouse, click it and the option */
  const select = (name: string, value: string) =>
    (kb ? chooseByKeys : choose)(card.getByRole('combobox', { name: new RegExp(`^${name}`) }), value);

  async function open(id: string) {
    await page.goto(`/synthetic-data/${id}/`);
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
  const write = async (t: number) => {
    await range('Temperature', TEMPS, t);
    await expect(card.getByRole('button', { name: `Write twenty at ${t}` })).toBeEnabled(WRITING);
    await btn(`Write twenty at ${t}`);
  };

  return {
    open,
    /** count the common topics, predict, count the rare ones */
    async ch1(next?: RegExp, quiz: string | RegExp = /^Inheritance accounts/) {
      await btn('Count the common topics');
      await step(2);
      await opt(/^One$/);
      await btn('Count the rare requests');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, write cool, write hot */
    async ch2(next?: RegExp, quiz: string | RegExp = /^Raise the temperature a little/) {
      await opt(new RegExp(`^${COOL}: its likeliest`));
      await write(COOL);
      await step(3, WRITING);
      await write(HOT);
      await step(4, WRITING);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** write, predict, dedupe, facts */
    async ch3(next?: RegExp, quiz: string | RegExp = /^A few replies about that rule/) {
      await expect(card.getByRole('button', { name: /^Write twenty/ })).toBeEnabled(WRITING);
      await btn(/^Write twenty/);
      await step(2, WRITING);
      await opt(/^Only a few/);
      await opt(/^Dedupe: drop copies/);
      await step(4);
      await opt(/^Dedupe, then the fact filter/);
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, ask the teacher, see the student */
    async ch4(next?: RegExp, quiz: string | RegExp = /^The writer’s guesses/) {
      await opt(/^None, or almost none/);
      await expect(card.getByRole('button', { name: 'Ask the teacher' })).toBeEnabled(WRITING);
      await btn('Ask the teacher');
      await step(3, WRITING);
      await btn('See the student’s answers');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, flip to 5, every generation */
    async ch5(next?: RegExp, quiz: string | RegExp = /^Unusual topics and rare words fading/) {
      await opt(/^Worse each generation/);
      await range('Generation', GENS, LAST);
      await step(3);
      for (const g of GENS) await range('Generation', GENS, g);
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** the arm radio as the prediction, then each arm at generation 5 */
    async ch6(next?: RegExp, quiz: string | RegExp = /^Keep the original human-written data/) {
      await opt(/^Accumulate: keep the real text/);
      await step(2);
      await range('Generation', GENS, LAST);
      const show = card.getByRole('group', { name: 'Show' });
      for (const name of [/^Replace/, /^Accumulate/]) {
        const r = show.getByRole('radio', { name });
        await (kb ? r.press('Space') : r.click());
      }
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** set one winning recipe by hand */
    async ch7(next?: RegExp, quiz: string | RegExp = /^Keep real data in/) {
      const w = WINNERS[0];
      await select('Temperature', String(w.temperature));
      await select('Sieve', w.sieve);
      await select('Real share', String(w.realShare));
      await step(2);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
  };
}
