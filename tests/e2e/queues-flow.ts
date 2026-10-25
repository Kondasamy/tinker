// Queues and background jobs, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
// The stage's clock (Play, Pause, Step) and crash bar sit in the picture; everything else is in the step card.
import { expect, type Locator, type Page } from '@playwright/test';

import { JOBS, OUTAGE, POISON, SCENES, TICKS, WORKER_NAMES, clock, resultOf, runOf } from '../../src/lib/queues/sim';
import { LEASES, TRIES, WINNERS, WORKERS } from '../../src/lib/queues/workbench';

// the chapters' moments, read off the simulator as the chapters read them (chapter files import CSS, so not here)
const one = runOf(SCENES.one);
const CH2_DONE = resultOf(one, JOBS[1].id).doneAt! + 1;
const OPEN = Math.min(...one.jobs.map(j => j.job.t).filter((t, _, all) => all.filter(x => x === t).length > 1));
const FEWEST = WORKERS.find(w => runOf({ ...SCENES.one, workers: w }).ticks[30].waiting.length === 0)!;

export type Mode = 'mouse' | 'keyboard';

export function queuesWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const tick = (l: Locator) => (kb ? l.press('Space') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const stage = page.getByRole('region', { name: 'Scene' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  /** a range input over a list of values: arrow keys from where it is, or set straight to the index by mouse */
  const slide = async (name: RegExp, to: number) => {
    const l = card.getByRole('slider', { name });
    if (!kb) return l.fill(String(to));
    const at = Number(await l.inputValue());
    for (let i = at; i !== to; i += to > at ? 1 : -1) await l.press(to > at ? 'ArrowRight' : 'ArrowLeft');
  };
  /** Step the clock until it reads minute t */
  const to = async (t: number) => {
    const shown = stage.locator('.qu-clock'),
      stepper = stage.getByRole('button', { name: 'Step', exact: true });
    for (let i = 0; i < TICKS && (await shown.textContent()) !== clock(t); i++) await press(stepper);
    await expect(shown).toHaveText(clock(t));
  };
  /** Step until the card reaches step n */
  const until = async (n: number) => {
    const stepper = stage.getByRole('button', { name: 'Step', exact: true });
    for (let i = 0; i < TICKS && !(await card.textContent())!.includes(`Step ${n} of`); i++) await press(stepper);
    await step(n);
  };

  async function open(id: string) {
    await page.goto(`/queues/${id}/`);
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
    to,
    /** into the rush, predict, the line at the till, the jobs, quiz */
    async ch1(next?: RegExp) {
      await to(10);
      await step(2);
      await opt(/^Many minutes/);
      await to(16);
      await step(4);
      await check(page);
      await btn('Open the Jobs tab');
      await step(5);
      await opt(/^Uploads that hang/);
      await finish(next);
    },
    /** the first ticket, predict, the parcel done, the jobs, quiz */
    async ch2(next?: RegExp) {
      await to(1);
      await step(2);
      await opt(/^At once/);
      await to(CH2_DONE);
      await step(4);
      await btn('Open the Jobs tab');
      await step(5);
      await opt(/^On a queue/);
      await finish(next);
    },
    /** the sale opens, predict, the backlog, more workers, quiz */
    async ch3(next?: RegExp) {
      await to(OPEN + 6);
      await step(2);
      await opt(/keeps growing/);
      await to(20);
      await step(4);
      await check(page);
      await slide(/^Workers/, WORKERS.indexOf(FEWEST));
      await step(5);
      await opt(/^At least 3/);
      await finish(next);
    },
    /** the outage, predict, orders given up, backoff, jitter, quiz */
    async ch4(next?: RegExp) {
      await to(OUTAGE.from + 2);
      await step(2);
      await opt(/^Some use up/);
      await to(OUTAGE.to + 5);
      await step(4);
      await check(page);
      await tick(card.getByRole('checkbox', { name: /^Back off/ }));
      await step(5);
      await tick(card.getByRole('checkbox', { name: /^Jitter/ }));
      await step(6);
      await opt(/^Wait longer after each failure/);
      await finish(next);
    },
    /** knock Rosa over, predict, step until her job runs again, idempotent, quiz */
    async ch5(next?: RegExp) {
      await press(stage.getByRole('button', { name: `Knock over ${WORKER_NAMES[0]}` }));
      await step(2);
      await opt(/^It comes back/);
      await until(4);
      await check(page);
      await tick(card.getByRole('checkbox', { name: /^Idempotent/ }));
      await step(5);
      await opt(/^Record/);
      await finish(next);
    },
    /** the poison job, predict, its tries, the limit, quiz */
    async ch6(next?: RegExp) {
      await to(POISON.t + 4);
      await step(2);
      await opt(/^Dozens/);
      await to(40);
      await step(4);
      await check(page);
      await tick(card.getByRole('checkbox', { name: /^At most/ }));
      await step(5);
      await opt(/^Retry a few times/);
      await finish(next);
    },
    /** set one winning bench by hand, then the quiz */
    async ch7(next?: RegExp) {
      await slide(/^Workers/, WORKERS.indexOf(win.workers));
      await slide(/^Most tries/, TRIES.indexOf(win.maxTries));
      await slide(/^Lease/, LEASES.indexOf(win.lease));
      await step(2);
      await check(page);
      await opt(/^A little over 3/);
      await finish(next);
    },
  };
}
