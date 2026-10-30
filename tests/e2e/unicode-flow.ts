// Text and Unicode, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link. The punch
// (its text field, chips and the reader's table), every prediction and quiz live in the step card.
import { expect, type Locator, type Page } from '@playwright/test';
import names from '../../data/unicode/names.json' with { type: 'json' };
import lookalikes from '../../data/unicode/lookalikes.json' with { type: 'json' };
import pinned from '../../data/unicode/pinned.json' with { type: 'json' };
import { choose, chooseByKeys } from './helpers';

export type Mode = 'mouse' | 'keyboard';
const [, E, HAN, SMILE] = names.widths;

export function ucWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name, exact: typeof name === 'string' }));
  const opt = (name: string | RegExp) =>
    press(card.getByRole('radio', { name, exact: typeof name === 'string' }).first());
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  const pick = (id: string, value: string) => {
    const box = card.locator(`#${id}`);
    return kb ? chooseByKeys(box, value) : choose(box, value);
  };
  /** put text on the punch: the mouse fills the field, the keyboard types it key by key */
  async function type(text: string) {
    const field = card.locator('#uc-text');
    if (!kb) return field.fill(text);
    await field.focus();
    await field.press('ControlOrMeta+a');
    await field.press('Backspace');
    await field.pressSequentially(text);
  }

  async function open(id: string) {
    await page.goto(`/unicode/${id}/`);
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
    type,
    pick,
    /** predict, type the word, then the plain name */
    async ch1(next?: RegExp, quiz: string | RegExp = /^Four numbers/) {
      await opt(/one per letter$/);
      await type(names.first);
      await step(3);
      await check(page);
      await type(names.plain);
      await step(4);
      await opt(quiz);
      await finish(next);
    },
    /** predict, ë, then a character far past one byte */
    async ch2(next?: RegExp, quiz: string | RegExp = /^One code point/) {
      await opt(/^One number of its own/);
      await btn(E);
      await step(3);
      await check(page);
      await btn(HAN);
      await step(4);
      await opt(quiz);
      await finish(next);
    },
    /** predict, the name with the ë chip, then the 3- and 4-byte chips */
    async ch3(next?: RegExp, quiz: string | RegExp = /^The same size/) {
      await opt(new RegExp(`^${pinned.zoe.bytes.length}:`));
      await type('Zo');
      await btn(`+ ${E}`);
      await step(3);
      await check(page);
      await btn(`+ ${HAN}`);
      await btn(`+ ${SMILE}`);
      await step(4);
      await opt(quiz);
      await finish(next);
    },
    /** predict, read as Latin-1, an accented word, then back to UTF-8 */
    async ch4(next?: RegExp, quiz: string | RegExp = /^UTF-8 bytes were read/) {
      await opt(/one character per byte/);
      await pick('uc-table', 'windows-1252');
      await step(3);
      await check(page);
      await type('café');
      await step(4);
      await pick('uc-table', 'utf-8');
      await step(5);
      await opt(quiz);
      await finish(next);
    },
    /** predict .length, the family, then the thumbs-up */
    async ch5(next?: RegExp, quiz: string | RegExp = /^The box counted code units/) {
      await opt(String(pinned.family.units));
      await btn(names.family);
      await step(3);
      await check(page);
      await btn(names.thumbs);
      await step(4);
      await opt(quiz);
      await finish(next);
    },
    /** predict, the decomposed é, normalise, the lookalike address */
    async ch6(next?: RegExp, quiz: string | RegExp = /^Normalise both/) {
      await opt(/^No: different code points/);
      await btn(/\+ accent\)$/);
      await step(3);
      await btn('Normalise to NFC');
      await step(4);
      await check(page);
      await btn(`2. ${lookalikes.pairs[0].fake}`);
      await step(5);
      await opt(quiz);
      await finish(next);
    },
    /** a winning setting: bytes, its limit, normalising */
    async ch7(next?: RegExp, quiz: string | RegExp = /^Bytes, after normalising/) {
      const [count, limit] = pinned.winners[0].split('|');
      await pick('uc-count', count);
      await pick('uc-limit', limit);
      const nfc = card.getByRole('checkbox', { name: /Normalise to NFC/ });
      await (kb ? nfc.press('Space') : nfc.check());
      await step(2);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
  };
}
