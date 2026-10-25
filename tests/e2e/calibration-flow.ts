// Calibration, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';
import pinned from '../../data/calibration/pinned.json' with { type: 'json' };
import rules from '../../data/calibration/workbench.json' with { type: 'json' };

export type Mode = 'mouse' | 'keyboard';
/** Larkspur mini reads the held-out text in the browser: a moment, more on a phone or with the CPU shared */
const MEASURING = { timeout: 30_000 };
const pctOf = (x: number) => `${Math.round(x * 100)}%`;
// the chapters' answers come from the pins and the page itself: the engine imports data Node can't load bare
const HIT = pinned.models.base.right / pinned.models.base.positions;
const WINNER = pinned.workbench.winners[0] as Record<string, number[]>;

export function cbWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name })); // a quiz or prediction option
  const step = (n: number, o = {}) => expect(card).toContainText(`Step ${n} of`, o);
  /** step a range until its value reads `words`: arrow keys, by keyboard and by mouse alike (the list lives in the page) */
  async function range(name: string, words: string) {
    const r = card.getByRole('slider', { name });
    await r.focus();
    await r.press('Home');
    // the puzzle's right value advances the step, which takes the slider away: a missing slider means it landed
    const now = () => r.getAttribute('aria-valuetext', { timeout: 1500 }).catch(() => words);
    for (let i = 0; i < 12 && (await now()) !== words; i++) await r.press('ArrowRight');
    expect(await now()).toBe(words);
  }
  /** press a chip and wait for its measurement to land: its tick, or for the last one the next step */
  async function measureChip(name: RegExp, next?: number) {
    await btn(name);
    if (next) await step(next, MEASURING);
    else await expect(card.getByRole('button', { name })).toContainText('✓', MEASURING);
  }

  async function open(id: string) {
    await page.goto(`/calibration/${id}/`);
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
    /** predict, drop the marbles, pick the jar furthest below its ring */
    async ch1(next?: RegExp, quiz: string | RegExp = /^Its 30% was honest/) {
      await opt(/^Well under/);
      await btn('Drop the marbles');
      await step(3);
      // the jar furthest below its ring, read off the jar buttons
      const jars = await card.getByRole('group', { name: 'Jars' }).getByRole('button').allTextContents();
      const gap = (t: string) => {
        const [, c, r, n] = t.match(/Stated (\d+)%: (\d+) of (\d+)/)!.map(Number);
        return c / 100 - r / n;
      };
      await btn(jars.reduce((a, b) => (gap(b) > gap(a) ? b : a)));
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, measure Larkspur mini, open the diagram */
    async ch2(next?: RegExp, quiz: string | RegExp = /^Yes, at least for its sure calls/) {
      await opt(/^About nine times in ten/);
      await btn('Measure on held-out text');
      await step(3, MEASURING);
      await btn('Show the Diagram tab');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, measure both weights */
    async ch3(next?: RegExp, quiz: string | RegExp = /^Were they measured again/) {
      await opt(/^Overconfident/);
      await step(2);
      await measureChip(/^Larkspur mini/);
      await measureChip(/^The style fine-tune/, 3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, fit the temperature, check on the test half */
    async ch4(next?: RegExp, quiz: string | RegExp = /^The check used the same data/) {
      await opt(/^The same guesses, stated less surely/);
      await step(2);
      await expect(card.locator('[data-loss]')).toBeVisible(MEASURING);
      await range('Temperature', `T ${pinned.scaled.T}: softer`);
      await step(3);
      await btn('Check on the test half');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, score all three forecasters */
    async ch5(next?: RegExp, quiz: string | RegExp = /^The Brier score/) {
      await opt(/^Zero/);
      await step(2);
      await measureChip(/^Larkspur mini/);
      await measureChip(/^The style fine-tune/);
      await measureChip(new RegExp(`^Always ${pctOf(HIT)}`), 3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, set the lowest safe hand-over line */
    async ch6(next?: RegExp, quiz: string | RegExp = /^Fewer answered by the bot/) {
      await opt(/^It rises/);
      await step(2);
      // the lowest line whose wrong answers sent keep within the limit, read off the coverage table
      const rows = card.locator('[data-coverage] tbody tr');
      let lowest = '';
      for (const row of await rows.all()) {
        const [w, k] = (await row.locator('td').nth(2).innerText()).split(' of ').map(Number);
        if (!k || w / k <= rules.wrongRate + 1e-9) {
          lowest = `hand over below ${pctOf(Number(await row.getAttribute('data-threshold')))}`;
          break;
        }
      }
      await range('Hand-over line', lowest);
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** set one of the best plans */
    async ch7(next?: RegExp, quiz: string | RegExp = /^A line per kind/) {
      for (const [kind, [T, threshold]] of Object.entries(WINNER)) {
        const sel = card.locator(`fieldset[data-kind="${kind}"] select`);
        await sel.nth(0).selectOption(String(T));
        await sel.nth(1).selectOption(String(threshold));
      }
      await step(2);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
  };
}
