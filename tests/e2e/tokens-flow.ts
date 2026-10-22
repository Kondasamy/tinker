// Module 6, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';
import { BUDGETS, PARTS, fullPrompts } from '../../src/lib/tokens/workbench';

export type Mode = 'mouse' | 'keyboard';

export function tokensWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name })); // a quiz or prediction option
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);

  async function open(id: string) {
    await page.goto(`/tokens/${id}/`);
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

  return {
    /** predict the sample's count, feed it in, type and count your own text */
    async ch1(next?: RegExp, quiz: string | RegExp = /^The model reads tokens/, text = 'Quillon KX-4471B') {
      await opt(/^More than \d+: some words/);
      await step(2);
      await btn('Feed the sentence to the tokenizer');
      await step(3);
      await check(page);
      const box = card.getByLabel('Your text');
      if (kb) {
        await box.focus();
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.type(text);
      } else await box.fill(text);
      await btn('Count my text');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** cut into bytes, predict the first merge, one merge, then every merge */
    async ch2(next?: RegExp, quiz: string | RegExp = /^The word is cut into pieces/) {
      await btn('Cut it into bytes');
      await step(2);
      await press(card.getByRole('radio').first());
      await step(3);
      await btn('Next merge');
      await step(4);
      await check(page);
      await btn('Run every merge');
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict the rule against real counts, count, price */
    async ch3(next?: RegExp, quiz: string | RegExp = /^Recount with the new model/) {
      await opt(/^The rule gives more tokens/);
      await step(2);
      await btn('Count the documents');
      await step(3);
      await check(page);
      await btn('Price the documents');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict the Hindi count, run every sentence, look at leading spaces on GPT-2 and numbers on GPT-4o */
    async ch4(next?: RegExp, quiz: string | RegExp = /^Count real Japanese emails/) {
      await opt(/^More than five times/);
      await step(2);
      await btn('Run every sentence');
      await step(3);
      await check(page);
      const pick = (group: string, name: string | RegExp) =>
        press(card.getByRole('group', { name: group }).getByRole('button', { name }));
      await pick('Sentence', /^shelf Shelf/);
      await pick('Tokenizer', 'GPT-2');
      await step(4);
      await pick('Sentence', /^Order #/);
      await pick('Tokenizer', /^GPT-4o/);
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict which question is closer, compare the embeddings, read a dot on the map */
    async ch5(next?: RegExp, quiz: string | RegExp = /^Ids are just positions/) {
      await opt(/^“What is the current lodging/);
      await step(2);
      const compare = card.getByRole('button', { name: 'Compare the embeddings' });
      await expect(compare).toBeEnabled();
      await press(compare);
      await step(3);
      await check(page);
      const dot = page.locator('.stage .map circle[tabindex]').last(); // the nearest can sit under the question's diamond
      if (kb) await dot.focus();
      else await dot.hover();
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, then pick pieces until the closest one passes (every wrong pick shows its cosine) */
    async ch6(next?: RegExp, quiz: string | RegExp = /^The two texts mean nearly the same/) {
      await opt(/^Not necessarily/);
      await step(2);
      await expect(card.getByRole('button', { name: 'Pick piece 1' })).toBeVisible();
      await check(page);
      for (let i = 1; i <= 4; i++) {
        await btn(`Pick piece ${i}`);
        await expect(card).toContainText(/Step 3 of|Try again/);
        if (await card.getByText(/^Step 3 of/).count()) break;
      }
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, cut the prompt to the low budget, then fill the high budget until nothing more fits */
    async ch7(next?: RegExp, quiz: string | RegExp = /^No: count it with the provider/) {
      await opt(/^Over, by half the budget again or more/);
      await step(2);
      const part = (label: string, on: boolean) => btn(new RegExp(`^${label}: ${on ? 'in' : 'out'}$`));
      for (const p of PARTS.filter(x => !x.required)) await part(p.label, true);
      await step(3);
      await check(page);
      const target = fullPrompts(BUDGETS[BUDGETS.length - 1])[0];
      for (const p of PARTS.filter(x => !x.required && target.includes(x.id))) await part(p.label, false);
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
  };
}
