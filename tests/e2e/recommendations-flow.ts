// Recommendations, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link. The stage's
// Picture/Ranking tabs, the shopper or basket select, the marker over the taste map (arrow keys while focused, or a
// drag) and the round stepper sit with the picture; everything else is in the step card.
import { expect, type Locator, type Page } from '@playwright/test';
import { ROUNDS } from '../../src/lib/recommendations/loop';
import { customerOf, productOf } from '../../src/lib/recommendations/story';
import { WINNERS } from '../../src/lib/recommendations/workbench';

// the names the chapters show, read as the chapters read them (chapter files import CSS, so not here)
const QUAY = customerOf('c07').name,
  ASH = customerOf('c01').name,
  BRIDGE = customerOf('c35').name;
export const blendText = (b: number) =>
  b === 0 ? 'All bestsellers' : b === 1 ? 'All tastes' : `${Math.round(b * 100)}% tastes`;
export const exploreText = (e: number) => (e === 0 ? 'None' : `${e} of 5`);

export type Mode = 'mouse' | 'keyboard';

export function recommendationsWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const tick = (l: Locator) => (kb ? l.press('Space') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const stage = page.getByRole('region', { name: 'Scene' });
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  const at = (n: number) => card.textContent().then(t => t!.includes(`Step ${n} of`));
  const choose = async (label: RegExp, value: string) => {
    const l = stage.getByRole('combobox', { name: label });
    if (kb) await l.focus();
    await l.selectOption({ label: value });
  };
  const tab = (name: string) => press(stage.getByRole('button', { name, exact: true }));
  /** move the shopper until the card reaches step n: arrow keys on the focused marker, or drags to the right */
  const move = async (n: number, key = 'ArrowRight') => {
    const marker = stage.locator('.rc-marker');
    for (let i = 0; i < 40 && !(await at(n)); i++) {
      if (kb) {
        await marker.focus();
        await marker.press(key);
        continue;
      }
      const b = (await marker.boundingBox())!;
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width / 2 + 30, b.y + b.height / 2, { steps: 4 });
      await page.mouse.up();
    }
    await step(n);
  };
  const nextRound = () => press(stage.getByRole('button', { name: 'Next round' }));
  const untilStep = async (n: number) => {
    for (let i = 0; i <= ROUNDS && !(await at(n)); i++) await nextRound();
    await step(n);
  };

  async function open(id: string) {
    await page.goto(`/recommendations/${id}/`);
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
  const win = WINNERS[0];

  return {
    open,
    move,
    nextRound,
    /** the ranking, predict, pick the warehouse customer, quiz */
    async ch1(next?: RegExp) {
      await tab('Ranking');
      await step(2);
      await opt(/^Nearly the same/);
      await choose(/^Shopper/, QUAY);
      await step(4);
      await check(page);
      await opt(/^Customers who never/);
      await finish(next);
    },
    /** predict, switch to people like you, quiz */
    async ch2(next?: RegExp) {
      await opt(/^Yes: similar/);
      await tick(card.getByRole('radio', { name: 'People like you' }));
      await step(3);
      await check(page);
      await opt(/^Songs the other/);
      await finish(next);
    },
    /** the hinge pack, predict, the label printer, quiz */
    async ch3(next?: RegExp) {
      await choose(/^Basket/, productOf('hinge-pack').name);
      await step(2);
      await opt(/^Warehouse kit/);
      await choose(/^Basket/, productOf('label-printer').name);
      await step(4);
      await check(page);
      await opt(/^Show them the spice/);
      await finish(next);
    },
    /** move toward the warehouse, pick Bridge Stores, predict, back to Ash, quiz */
    async ch4(next?: RegExp) {
      await move(2);
      await choose(/^Shopper/, BRIDGE);
      await step(3);
      await opt(/^Yes: their taste/);
      await choose(/^Shopper/, ASH);
      await step(5);
      await check(page);
      await opt(/^It points the same/);
      await finish(next);
    },
    /** two picks, move them, predict, the first orders, quiz */
    async ch5(next?: RegExp) {
      await tick(card.getByRole('checkbox', { name: productOf('label-roll').name }));
      await tick(card.getByRole('checkbox', { name: productOf('shelving-bay').name }));
      await step(2);
      await move(3);
      await opt(/^Nowhere/);
      await tick(card.getByRole('checkbox', { name: /warehouse customers buy/ }));
      await step(5);
      await check(page);
      await opt(/^Show it to some/);
      await finish(next);
    },
    /** three rounds, predict, to the last round, exploration on, quiz */
    async ch6(next?: RegExp) {
      await untilStep(2);
      await opt(/^They fade/);
      await untilStep(4);
      await check(page);
      await tick(card.getByRole('checkbox', { name: /random slot/ }));
      await step(5);
      await opt(/^Readers see an ever/);
      await finish(next);
    },
    /** set one winning setting by hand, then the quiz */
    async ch7(next?: RegExp) {
      await tick(card.getByRole('radio', { name: blendText(win.blend), exact: true }));
      await tick(card.getByRole('radio', { name: exploreText(win.explore), exact: true }));
      await step(2);
      await check(page);
      await opt(/^Without it/);
      await finish(next);
    },
  };
}
