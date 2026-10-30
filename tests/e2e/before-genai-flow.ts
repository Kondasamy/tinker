// Before GenAI, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link. Drop-downs are the
// site's Select, picked with choose() or chooseByKeys(). Every pick the chapters want is read from the bots and engines,
// never typed here.
import { expect, type Locator, type Page } from '@playwright/test';
import { CANDIDATES, messageOf, run, WINNERS } from '../../src/lib/before-genai/bots';
import { shelfOf } from '../../src/lib/recommendations/score';
import { productOf, TRAIN } from '../../src/lib/recommendations/story';
import { chapterHref, moduleOf } from '../../src/lib/modules';
import { choose, chooseByKeys } from './helpers';

export type Mode = 'mouse' | 'keyboard';
/** a word the keyword puzzle refuses: it takes over another rule's message */
export const LOSER = CANDIDATES.find(w => !WINNERS.includes(w))!;
const binOf = (id: string) => run(messageOf(id)).intent.intent;
const TOP = productOf(shelfOf('items', TRAIN, 'c01')[0]).name;

export function bgWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name, exact: typeof name === 'string' }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }).first()); // a quiz or prediction option
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  const pick = (value: string) => {
    const box = card.getByRole('combobox');
    return kb ? chooseByKeys(box, value) : choose(box, value);
  };

  async function open(id: string) {
    await page.goto(`/before-genai/${id}/`);
    await page.locator('astro-island:not([ssr])').first().waitFor();
    await expect(card).toContainText('Step 1 of');
    await check(page);
  }
  /** the last reveal's go-deeper link, read from the registry */
  async function deeper(mod: string, i: number) {
    const ch = moduleOf(mod).chapters[i];
    await expect(card.getByRole('link', { name: ch.title })).toHaveAttribute('href', chapterHref(mod, ch.id));
  }
  async function finish(next?: RegExp) {
    await expect(card).toContainText('Chapter complete');
    await check(page);
    if (!next) return;
    await press(card.getByRole('link', { name: /^(Next:|Recap)/ }));
    await expect(page).toHaveURL(next);
    if (!/recap/.test(String(next))) await page.locator('astro-island:not([ssr])').first().waitFor();
  }

  return {
    /** predict, send, a losing keyword first (it names the message it takes over), then a winner */
    async ch1(next?: RegExp, quiz: string | RegExp = /^It raises its fallback card/) {
      await opt('It falls back');
      await btn('Send it');
      await step(3);
      await check(page);
      await pick(LOSER);
      await expect(card.getByRole('status').filter({ hasText: 'instead of its own' })).toBeVisible();
      await step(3);
      await pick(WINNERS[0]);
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** sort two messages into the sorter's bins, predict and send the off-list one */
    async ch2(next?: RegExp, quiz: string | RegExp = /^Label example tickets/) {
      await pick(binOf('parcel'));
      await step(2);
      await pick(binOf('gloves'));
      await step(3);
      await opt('It falls back');
      await btn('Send it');
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict the spam filter's folder, then the shelf's first pick */
    async ch3(next?: RegExp, quiz: string | RegExp = /^Each picks from a fixed list/) {
      await opt('Junk');
      await btn('Run the filter');
      await step(3);
      await check(page);
      await opt(TOP);
      await btn('Show the shelf');
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict Larkspur mini's next word, run it live (it waits for the model), see the top 5 */
    async ch4(next?: RegExp, quiz: string | RegExp = /^It adds its guess/) {
      await opt('“days”');
      await btn('Run Larkspur mini');
      await step(3);
      await expect(card.getByRole('definition').first()).toBeVisible();
      await deeper('transformers', 0);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict GPT-3's size against Larkspur mini's, then the years from the transformer to GPT-3 */
    async ch5(next?: RegExp, quiz: string | RegExp = /^They could do tasks nobody trained/) {
      await opt('Over a million times');
      await btn('Show both sizes');
      await step(3);
      await check(page);
      await opt('A few years');
      await btn('Show the dates');
      await step(5);
      await deeper('pre-training', 5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict which reply the base model wrote */
    async ch6(next?: RegExp, quiz: string | RegExp = /^More training on requests/) {
      await opt('Reply B');
      await btn('Show who wrote which');
      await step(3);
      await deeper('post-training', 0);
      await deeper('prompts', 0);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
  };
}
