// Watermarks and made-by-AI, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';
import pinned from '../../data/watermarks/pinned.json' with { type: 'json' };
import { PREFIXES } from '../../src/lib/watermarks/story';
import { WINDOW } from '../../src/components/scenes/uvScene';
import { WINNERS } from '../../src/lib/watermarks/workbench';
import { choose, chooseByKeys } from './helpers';

export type Mode = 'mouse' | 'keyboard';
const MODEL = { timeout: 30_000 }; // Larkspur mini loads before the swap list and the workbench's live reply

export function wmWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(page.getByRole('button', { name, exact: typeof name === 'string' }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }).first()); // a quiz or prediction option
  const radio = (name: string) => {
    const r = card.getByRole('radio', { name, exact: true });
    return kb ? r.press('Space') : r.check();
  };
  const step = (n: number, o = {}) => expect(card).toContainText(`Step ${n} of`, o);
  /** set a range to item `to`: arrow keys by keyboard, a direct set by mouse */
  async function range(r: Locator, to: number) {
    if (!kb) return r.fill(String(to));
    await r.focus();
    const now = Number(await r.inputValue());
    for (let i = now; i !== to; i += Math.sign(to - now)) await r.press(to > now ? 'ArrowRight' : 'ArrowLeft');
  }

  async function open(id: string) {
    await page.goto(`/watermarks/${id}/`);
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
    /** guess the model's reply, predict the detectors */
    async ch1(next?: RegExp, quiz: string | RegExp = /^Not much/) {
      await opt(/^Reply A$/);
      await step(2);
      await opt(/^Non-native/);
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** sweep the lamp, predict, light all */
    async ch2(next?: RegExp, quiz: string | RegExp = /^No: the key/) {
      await range(page.getByRole('slider', { name: 'Lamp' }), WINDOW);
      await step(2);
      await opt(/^Well over/);
      await btn('Light all');
      await step(4);
      await expect(page.locator('.wm-said')).toContainText(
        `${pinned.reply.green} of ${pinned.reply.pairs} pairs green`,
      );
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, try every nudge */
    async ch3(next?: RegExp, quiz: string | RegExp = /^Replies fill/) {
      await opt(/^It climbs/);
      for (const d of pinned.leaning.slice(1)) await radio(String(d.delta));
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** the Strip tab, predict, cut short, grow back */
    async ch4(next?: RegExp, quiz: string | RegExp = /^Only that/) {
      await btn('Strip');
      await step(2);
      await opt(/or more$/);
      const r = card.getByRole('slider', { name: 'Tokens' });
      await range(r, 0);
      await step(4);
      await expect(page.locator('.wm-meter')).toHaveAttribute('data-z', 'none');
      const marked = pinned.counting.prefixes.findIndex(p => p.verdict === 'marked');
      await range(card.getByRole('slider', { name: 'Tokens' }), marked);
      await step(5);
      expect(PREFIXES[marked]).toBe(pinned.counting.prefixes[marked].tokens);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, one real swap, Show me for the rest, Reword all */
    async ch5(next?: RegExp, quiz: string | RegExp = /^Unsure: rewording/) {
      await opt(new RegExp(`^About ${pinned.rewording.swaps.length}$`));
      await step(2);
      const [i, id] = pinned.rewording.swaps[0];
      const token = page.getByRole('combobox', { name: 'Token' }),
        swap = page.getByRole('combobox', { name: 'Swap for' });
      await (kb ? chooseByKeys(token, String(i)) : choose(token, String(i)));
      await expect(swap).toBeEnabled(MODEL);
      await (kb ? chooseByKeys(swap, String(id)) : choose(swap, String(id)));
      await expect(page.locator('.wm-said')).toContainText('Swapped');
      await press(card.getByRole('button', { name: 'Show me' }));
      await step(3);
      await btn('Reword all');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, then every trip */
    async ch6(next?: RegExp, quiz: string | RegExp = /^Each survives/) {
      await opt(/^The pixel mark only/);
      await radio('Screenshot');
      await step(3);
      await expect(page.locator('.wm-findings')).toHaveAttribute('data-label', 'no label');
      await radio('One pixel');
      await step(4);
      await expect(page.locator('.wm-findings')).toHaveAttribute('data-label', 'label does not match');
      await radio('Crop');
      await radio('Blur');
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** a losing setting first, then the best */
    async ch7(next?: RegExp, quiz: string | RegExp = /^Green is rarer/) {
      const score = card.locator('[data-best]');
      await radio('4');
      await expect(score).toHaveAttribute('data-best', '0');
      const w = WINNERS[0];
      await radio(String(w.gamma));
      await radio(String(w.delta));
      await step(2);
      await expect(score).toHaveAttribute('data-best', '1');
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
  };
}
