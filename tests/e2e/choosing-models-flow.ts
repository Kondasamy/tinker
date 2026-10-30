// Choosing a model, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link. The poise
// ranges live under the stage; the team drop-down, buttons and every quiz live in the step card.
import { expect, type Locator, type Page } from '@playwright/test';
import { SOLVED, TEAMS } from '../../src/lib/choosing-models/workbench';
import type { Criterion } from '../../src/lib/choosing-models/score';
import { choose, chooseByKeys } from './helpers';

export type Mode = 'mouse' | 'keyboard';
const NAME: Record<Criterion, string> = { quality: 'Quality', cost: 'Cost', wait: 'Wait' };

export function cmWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }).first());
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  const slider = (k: Criterion) => page.getByRole('slider', { name: NAME[k] });
  /** set a poise: arrow keys by keyboard, a direct set by mouse */
  async function poise(k: Criterion, to: number) {
    const s = slider(k);
    if (!kb) return s.fill(String(to));
    await s.focus();
    const now = Number(await s.inputValue());
    for (let i = now; i !== to; i += Math.sign(to - now)) await s.press(to > now ? 'ArrowRight' : 'ArrowLeft');
  }

  async function open(id: string) {
    await page.goto(`/choosing-models/${id}/`);
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
    async ch1(next?: RegExp, quiz: string | RegExp = /^It did best/) {
      await opt('Machine A');
      await step(2);
      await poise('quality', 2);
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    async ch2(next?: RegExp, quiz: string | RegExp = /^Run it and its rivals/) {
      await opt('Last');
      await btn(/^Run Larkspur/);
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    async ch3(next?: RegExp, quiz: string | RegExp = /^It is paid on every answer/) {
      await opt(/^About \d+ times/);
      await poise('cost', 1);
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    async ch4(next?: RegExp, quiz: string | RegExp = /^The time to the whole report/) {
      await opt(/^After about 4 s/);
      await poise('wait', 1);
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    async ch5(next?: RegExp, quiz: string | RegExp = /^Y, and keep/) {
      await opt(/the cheapest that clears the bar/);
      await btn('Apply Support’s bar');
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    async ch6(next?: RegExp, quiz: string | RegExp = /^Run your question set/) {
      await opt('Drop under the bar');
      await btn(/^Run c-/);
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** each team: pick it, set its winning poises */
    async ch7(next?: RegExp, quiz: string | RegExp = /^What it needs/) {
      const box = card.getByRole('combobox');
      for (const t of TEAMS) {
        await (kb ? chooseByKeys(box, t.id) : choose(box, t.id));
        for (const k of ['quality', 'cost', 'wait'] as Criterion[]) await poise(k, SOLVED[t.id][k]);
      }
      await step(2);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
    poise,
  };
}
