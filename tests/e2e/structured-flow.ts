// Module 10, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';

export type Mode = 'mouse' | 'keyboard';

export function structuredWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));   // a quiz or prediction option
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  const ready = () => expect(page.locator('.so-stage[data-model="ready"]')).toBeVisible({ timeout: 15_000 });
  /** a native select: arrow keys from the keyboard, or picked straight by mouse */
  const choose = async (name: string, label: string) => {
    const l = card.getByRole('combobox', { name });
    if (!kb) return l.selectOption({ label });
    // type-ahead picks the option by its first letters (arrow keys open the popup on macOS instead)
    await l.focus();
    await page.keyboard.type(label.split(' ')[0]);
    await expect(l.locator('option:checked')).toHaveText(label);
  };

  async function open(id: string) {
    await page.goto(`/structured-outputs/${id}/`);
    await page.locator('astro-island:not([ssr])').waitFor();
    await expect(card).toContainText('Step 1 of');
    await ready();
    await check(page);
  }
  async function finish(next?: RegExp) {
    await expect(card).toContainText('Chapter complete');
    await check(page);
    if (!next) return;
    await press(card.getByRole('link', { name: /^(Next:|Recap)/ }));
    await expect(page).toHaveURL(next);
    // a key pressed before the next island hydrates is lost
    if (!/recap/.test(String(next))) { await page.locator('astro-island:not([ssr])').waitFor(); await ready(); }
  }

  return {
    open,
    /** ask for JSON with no schema, predict, let it write */
    async ch1(next?: RegExp) {
      await btn(/^Ask: “/);
      await step(2);
      await opt(/^Text that isn’t JSON/);
      await btn('Let it write');
      await step(4);
      await check(page);
      await opt(/^Usually, but a request in the prompt/);
      await finish(next);
    },
    /** read the schema, predict, run three tries */
    async ch2(next?: RegExp) {
      await btn('Use it to check every answer');
      await step(2);
      await opt(/^None$/);
      await btn('Run the first try');
      await btn('Check failed: try again');
      await btn('Check failed: try again');
      await step(4);
      await check(page);
      await opt(/^A safety net/);
      await finish(next);
    },
    /** predict the first step's mask, open it, write the answer */
    async ch3(next?: RegExp) {
      await opt(/^Only one$/);
      await btn('Show the mask at step 1');
      await step(3);
      await check(page);
      await btn('Write the next token');
      await expect(card.getByTestId('mask-step')).toContainText('Step 2:');
      await btn('Write the rest');
      await step(4);
      await opt(/^It is shared out among the allowed tokens/);
      await finish(next);
    },
    /** predict near the length cap, jump there, heal a prompt */
    async ch4(next?: RegExp) {
      await opt(/^Only tokens that fit whole/);
      await btn('Jump to two characters left');
      await step(3);
      await check(page);
      await btn('Heal the prompt');
      await step(4);
      await expect(card.getByTestId('healed')).toContainText('Healed');
      await opt(/^“30”: every byte is a digit/);
      await finish(next);
    },
    /** free text, then a list; predict, see the shares, draw three times */
    async ch5(next?: RegExp) {
      await btn('Make status a list');
      await step(2);
      await opt(/^Its own preference/);
      await step(3);
      await check(page);
      await btn('Draw');
      await btn('Draw again');
      await btn('Draw again');
      await step(4);
      await opt(/^Answers the program can always act on/);
      await finish(next);
    },
    /** predict the forced order number, see it and the days, then the cut-off */
    async ch6(next?: RegExp) {
      await opt(/^A valid whole number, but not/);
      await btn('Ask for the order number');
      await btn('Ask for days to arrive');
      await step(3);
      await check(page);
      await btn('Ask for status and days together');
      await step(4);
      await opt(/^No: the check says the shape is right/);
      await finish(next);
    },
    /** predict the all-model schema, then leave status and days to the order system */
    async ch7(next?: RegExp) {
      await opt(/^None$/);
      await step(2);
      await check(page);
      await choose('Status', 'Leave it out: the order system fills it');
      await choose('Days to arrive', 'Leave it out: the order system fills it');
      await step(3);
      await expect(card.getByTestId('score')).toContainText('4 of 4 orders valid and right');
      await opt(/^The order system, outside the model’s schema/);
      await finish(next);
    },
  };
}
