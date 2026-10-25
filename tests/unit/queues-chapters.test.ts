// Queues' chapters against the simulator (KTD12): every reveal says what the runs show, the moments the e2e flow
// walks to hold, Show me lands where it should, and chapter 7's Show me is in WINNERS.
import { describe, expect, it } from 'vitest';
import { START, WINNERS, benchOf, wins } from '../../src/lib/queues/workbench';
import { SHOWN_CRASH } from '../../src/lib/queues/sim';
import * as ch1 from '../../src/content/queues/01-waiting-at-the-till';
import * as ch2 from '../../src/content/queues/02-a-ticket-and-a-worker';
import * as ch3 from '../../src/content/queues/03-when-the-line-grows';
import * as ch4 from '../../src/content/queues/04-try-again-later';
import * as ch5 from '../../src/content/queues/05-ran-twice';
import * as ch6 from '../../src/content/queues/06-the-job-that-never-works';
import * as ch7 from '../../src/content/queues/07-sale-day';

describe('the chapters’ reveals match the runs', () => {
  it('chapter 1: the slowest page waits for everyone ahead', () => {
    expect(ch1.P1.options[ch1.outcomeOf()]).toMatch(/^Many minutes/);
    expect(ch1.pageWaitAt(ch1.RUN, ch1.LOOK)).toBeGreaterThan(5);
  });
  it('chapter 2: the page answers at once; the parcel is done later', () => {
    expect(ch2.P1.options[ch2.outcomeOf()]).toMatch(/^At once/);
    expect(ch2.DONE).toBeGreaterThan(ch2.BEN.t);
  });
  it('chapter 3: one worker’s backlog grows; the fewest workers that drain it do', () => {
    expect(ch3.P1.options[ch3.outcomeOf()]).toMatch(/keeps growing/);
    expect(ch3.drains(1)).toBe(false);
    expect(ch3.drains(ch3.FEWEST)).toBe(true);
    expect(ch3.drains(ch3.FEWEST - 1)).toBe(false);
    const workers = ch3.STEPS.find(s => s.id === 'workers')!;
    const shown = workers.solution!({ t: 0, workers: 1, p1: 0, view: 'scene', quiz: null });
    expect(workers.predicate(shown)).toBe(true);
  });
  it('chapter 4: retrying at once loses orders; backoff loses none; jitter bunches fewer', () => {
    expect(ch4.P1.options[ch4.outcomeOf()]).toMatch(/^Some use up/);
    expect(ch4.EXP.deadLettered).toBe(0);
    expect(ch4.JIT.deadLettered).toBe(0);
    expect(ch4.JIT.bunch).toBeLessThan(ch4.EXP.bunch);
  });
  it('chapter 5: Show me’s crash, or either worker’s, brings the job back and books it twice', () => {
    const crash = ch5.STEPS[0];
    const shown = crash.solution!({ t: 6, crashes: [], idempotent: false, p1: null, view: 'scene', quiz: null });
    expect(shown.crashes).toEqual([SHOWN_CRASH]);
    expect(ch5.P1.options[ch5.outcomeOf()]).toMatch(/^It comes back/);
    for (const worker of [0, 1]) {
      const c = [{ worker, tick: SHOWN_CRASH.tick }];
      expect(ch5.droppedBy(c[0])).toBeDefined();
      expect(ch5.twiceAt(c)).toBeGreaterThan(SHOWN_CRASH.tick);
      expect(ch5.outcomeOf(c)).toBe(0);
      expect(ch5.runFor(c, true).doubleShipped).toBe(0);
    }
  });
  it('chapter 6: with no limit the poison job keeps coming; with one it is dead-lettered', () => {
    expect(ch6.P1.options[ch6.outcomeOf()]).toMatch(/^Dozens/);
    expect(ch6.triesAt(false, ch6.LOOK)).toBeGreaterThan(12);
    expect(ch6.triesAt(true, ch6.LOOK)).toBe(ch6.LIMIT);
  });
});

describe('chapter 7’s workbench', () => {
  const bench = ch7.STEPS.find(s => s.id === 'bench')!;
  const blank = { ...START, t: 10, view: 'scene' as const, quiz: null };
  it('Show me lands on a setting in WINNERS, and the step passes', () => {
    const shown = bench.solution!(blank);
    expect(bench.predicate(shown)).toBe(true);
    expect(WINNERS).toContainEqual(benchOf(shown));
    expect(wins(benchOf(shown))).toBe(true);
  });
  it('the start is not a winner', () => {
    expect(bench.predicate(blank)).toBe(false);
  });
});
