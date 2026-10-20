// Module 4, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';
import ch3 from '../../data/questions/ch3.json' with { type: 'json' };
import ch4 from '../../data/questions/ch4.json' with { type: 'json' };
import ch5 from '../../data/questions/ch5.json' with { type: 'json' };
import ch6 from '../../data/questions/ch6.json' with { type: 'json' };
import candidates from '../../data/evals/candidates.json' with { type: 'json' };

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
    /** sort the log as the team did (Keep with the right reference, or Drop), predict, keep the set */
    async ch2(next?: RegExp, quiz: string | RegExp = /^Real questions from the log/) {
      await sortLog(page, mode, c => c.keep);
      await step(2);
      await check(page);
      await opt(/^Yes: my set has a case/);
      await btn('Keep this set');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict and grade each of the three answers, then the checkpoint */
    async ch3(next?: RegExp, quiz: string | RegExp = /^A model judge with a rubric about skipped steps/) {
      await opt(/^Exact match$/);
      await btn(/^Grade answer 1/);
      await step(3);
      await check(page);
      await opt(/^Model judge \(rubric r1\)$/);
      await btn(/^Grade answer 2/);
      await opt(/^Has a citation$/);
      await btn(/^Grade answer 3/);
      await step(7);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, run the judge, switch to r2, find the judge's mistake, predict the swap, swap, the checkpoint */
    async ch4(next?: RegExp, quiz: string | RegExp = /^Judge every pair again/) {
      await opt(/^About half the time/);
      await btn(/^Run the judge/);
      await btn('Rubric r2');
      await step(4);
      await check(page);
      await btn(/Person: FAIL.*Judge: PASS/);
      await step(5);
      await opt(/^The other answer/);
      await btn(/^Swap the order/);
      await step(7);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
  };
}

export interface Candidate { id: string; text: string; kind: string; keep: boolean; reference: string | null }
export const CANDIDATES = candidates as Candidate[];

/** Sort chapter 2's log: keep the cases `keep` picks, each with its right reference answer, and drop the rest. */
export async function sortLog(page: Page, mode: Mode, keep: (c: Candidate) => boolean) {
  const press = (l: Locator) => (mode === 'keyboard' ? l.press('Enter') : l.click());
  for (const c of CANDIDATES) {
    const li = page.locator(`.ev-case[data-id="${c.id}"]`).first();
    if (!keep(c)) { await press(li.getByRole('button', { name: 'Drop' })); continue; }
    await press(li.getByRole('button', { name: 'Keep' }));
    const sel = li.getByRole('combobox');
    const label = c.reference ?? (await sel.locator('option', { hasText: /^No document answers/ }).textContent())!;
    await sel.selectOption({ label });
  }
}
