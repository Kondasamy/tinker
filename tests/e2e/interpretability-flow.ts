// Interpretability, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';

export type Mode = 'mouse' | 'keyboard';

export function interpretabilityWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name, exact: typeof name === 'string' }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name })); // a quiz or prediction option
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  /** a checkbox: Space by keyboard, a click by mouse */
  const toggle = (name: string) => {
    const l = card.getByRole('checkbox', { name, exact: true });
    return kb ? l.press('Space') : l.click();
  };
  /** a range input: arrow keys from where it is, or set straight to the index by mouse */
  const slide = async (name: RegExp, to: number) => {
    const l = card.getByRole('slider', { name });
    if (!kb) return l.fill(String(to));
    const at = Number(await l.inputValue());
    for (let i = at; i !== to; i += to > at ? 1 : -1) await l.press(to > at ? 'ArrowRight' : 'ArrowLeft');
  };
  const ready = () => expect(page.locator('.ip-stage[data-model="ready"]')).toBeVisible({ timeout: 15_000 });

  async function open(id: string) {
    await page.goto(`/interpretability/${id}/`);
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
    if (!/recap/.test(String(next))) {
      await page.locator('astro-island:not([ssr])').waitFor();
      await ready();
    }
  }

  return {
    open,
    /** the top 5, every head lit, the prediction about the heaviest thread, the finding */
    async ch1(next?: RegExp) {
      await btn('Show the top 5');
      await step(2);
      for (const name of ['Layer 1, head 2', 'Layer 2, head 1', 'Layer 2, head 2']) await btn(name);
      await step(3);
      await opt(/^No: it shows where the head looked/);
      await btn('Show the finding');
      await step(5);
      await check(page);
      await opt(/^Not on its own/);
      await finish(next);
    },
    /** pull the word-start fuse, predict the held-out count, every head over the held-out text */
    async ch2(next?: RegExp) {
      await btn('Layer 1, head 1');
      await step(2);
      await opt(/^Some: roughly one in ten/);
      await btn('Run it over the held-out text');
      await step(4);
      for (const name of ['Layer 1, head 2', 'Layer 2, head 1', 'Layer 2, head 2']) await btn(name);
      await step(5);
      await check(page);
      await opt(/^One prompt can’t show it/);
      await finish(next);
    },
    /** the Lens tab, the prediction, two more prompts */
    async ch3(next?: RegExp) {
      await press(page.getByRole('button', { name: 'Lens', exact: true }));
      await step(2);
      await opt(/^After block 1$/);
      await btn('Show the lens');
      await step(4);
      await check(page);
      await btn(/^Every enterprise account/);
      await btn(/^Expedited delivery/);
      await step(5);
      await opt(/^The guess formed by the middle/);
      await finish(next);
    },
    /** both runs, the prediction, the row before block 1, the cell after it */
    async ch4(next?: RegExp) {
      await btn('Run both prompts');
      await step(2);
      await opt(/^Only the swapped word’s/);
      await btn('Patch every position before block 1');
      await step(4);
      await check(page);
      await press(card.locator('[data-cell="1:12"]'));
      await step(5);
      await opt(/^The model stores the fact/);
      await finish(next);
    },
    /** build the direction, predict, ×2, then the strongest */
    async ch5(next?: RegExp) {
      await btn('Build the direction');
      await step(2);
      await opt(/^It rises into the top 5/);
      await slide(/^Strength/, 2);
      await step(4);
      await check(page);
      await slide(/^Strength/, 4);
      await step(5);
      await opt(/^A small push shifts the tone/);
      await finish(next);
    },
    /** a neuron, the prediction, the count, the other neurons */
    async ch6(next?: RegExp) {
      await btn('Layer 1, neuron 3');
      await step(2);
      await opt(/^A mix of unrelated kinds/);
      await btn('Count them');
      await step(4);
      await btn('Layer 1, neuron 69');
      await btn('Layer 2, neuron 64');
      await step(5);
      await check(page);
      await opt(/^The neuron likely fires/);
      await finish(next);
    },
    /** pull fuses down to a smallest set, twice */
    async ch7(next?: RegExp) {
      for (const name of ['Layer 1, head 2', 'Layer 2, head 1', 'Layer 2, head 2', 'Layer 2 MLP']) await toggle(name);
      await step(2);
      await check(page);
      await toggle('Layer 2, head 2');
      await step(3);
      await opt(/^This behaviour is spread/);
      await finish(next);
    },
  };
}
