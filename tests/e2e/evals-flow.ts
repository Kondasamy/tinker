// Module 4, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';
import ch3 from '../../data/questions/ch3.json' with { type: 'json' };
import ch4 from '../../data/questions/ch4.json' with { type: 'json' };
import ch5 from '../../data/questions/ch5.json' with { type: 'json' };
import ch6 from '../../data/questions/ch6.json' with { type: 'json' };

// the test set in suite order (src/lib/evals/suite.ts QUESTIONS; that module needs Vite, so the specs read the files)
const QUESTIONS = [...ch3, ...ch4, ...ch5, ...ch6];

export type Mode = 'mouse' | 'keyboard';

/** The question (0-based) the Results grid marks as passing on v1 and failing on v2, read off its cell's name. */
export async function brokenQ(page: Page) {
  const name = await page.locator('.ev-grid-wide .cell[aria-label*="v2: failed, was passing"]').first().getAttribute('aria-label');
  return Number(/^Q(\d+)/.exec(name!)![1]) - 1;
}

export function evalWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));   // a quiz or prediction option
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);

  async function open(id: string) {
    await page.goto(`/evals/${id}/`);
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
    /** try both offered questions, predict, run the set, and pick the question the grid shows v2 broke */
    async ch1(next?: RegExp, quiz: string | RegExp = /^Run the whole test set on the old and the new setup/) {
      const tries = card.getByRole('button', { name: /^Try:/ });
      await expect(tries).toHaveCount(2);
      await press(tries.nth(0));
      await press(tries.nth(1));
      await step(2);
      await check(page);
      await opt(/^Better overall, but a question that passed/);
      await btn(/^Run all \d+ questions/);
      await step(4);
      await check(page);
      const broken = await brokenQ(page);
      await btn(`Q${broken + 1}: ${QUESTIONS[broken].query}`);
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
  };
}
