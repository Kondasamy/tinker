// Module 16, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';
import { choose } from './helpers';

export type Mode = 'mouse' | 'keyboard';
const SIZES = [400, 800, 1200, 1600, 3200];

export function mmWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name })); // a quiz or prediction option
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  /** set the size range: arrow keys by keyboard, a direct set by mouse */
  async function size(px: number) {
    const r = card.getByRole('slider', { name: 'Size' });
    if (!kb) return r.fill(String(SIZES.indexOf(px)));
    await r.focus();
    const now = Number(await r.inputValue()),
      to = SIZES.indexOf(px);
    for (let i = now; i !== to; i += Math.sign(to - now)) await r.press(to > now ? 'ArrowRight' : 'ArrowLeft');
  }

  async function open(id: string) {
    await page.goto(`/multimodal/${id}/`);
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
    /** predict, cut into patches */
    async ch1(next?: RegExp, quiz: string | RegExp = /^100$/) {
      await opt(/^Cut into small squares/);
      await btn('Cut it into patches');
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, drag the size to 400, 800 and 3,200 px */
    async ch2(next?: RegExp, quiz: string | RegExp = /^Send them larger/) {
      await opt(/^The payment terms/);
      await step(2);
      for (const s of [800, 400, 3200]) await size(s);
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, read both documents both ways */
    async ch3(next?: RegExp, quiz: string | RegExp = /^Vision, with a person/) {
      await opt(/^Vision: the model sees/);
      for (const doc of ['Packing slip', 'Handwritten note']) {
        await btn(doc);
        await btn('Read with OCR');
        await btn('Read with vision');
      }
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, extract both ways at 1,600 px, then at 800 px */
    async ch4(next?: RegExp, quiz: string | RegExp = /^It shows whether one field/) {
      await opt(/^The same/);
      await btn(/^Extract with OCR/);
      await btn(/^Extract with vision/);
      await step(3);
      await btn(/^Extract with OCR at 800/);
      await btn(/^Extract with vision at 800/);
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, read the front photo, then the side */
    async ch5(next?: RegExp, quiz: string | RegExp = /^Ask for a photo that shows/) {
      await opt(/^Say it could be either/);
      await btn('Read the photo');
      await step(3);
      await btn('Read the second photo');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** the fax and its check, then predict and read the label */
    async ch6(next?: RegExp, quiz: string | RegExp = /^Treat text read from an image/) {
      await btn('Read the fax with vision');
      await btn('Check the lines add up');
      await step(3);
      await opt(/^The sentence, word for word/);
      await btn('Read the label');
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** invoice by OCR, slip and note by vision at 1,200 px: a best plan */
    async ch7(next?: RegExp, quiz: string | RegExp = /^Try OCR on the letters/) {
      const pick = (kind: string, i: number, v: string) =>
        choose(card.locator(`fieldset[data-kind="${kind}"] [role="combobox"]`).nth(i), v);
      await pick('invoice', 0, 'ocr');
      await pick('slip', 1, '1200');
      await pick('note', 1, '1200');
      await step(2);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
  };
}
