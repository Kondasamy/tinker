// Opening a web page chapter 7's workbench: the pinned WINNERS equal a fresh solve over every policy (KTD12), each
// winner meets both of the owner's rules, and the start does not.
import { describe, expect, it } from 'vitest';
import { CUSTOMERS } from '../../src/lib/web-requests/sim';
import {
  BUDGET,
  MOVE,
  POLICIES,
  START,
  WINNERS,
  benchOf,
  loadOf,
  meets,
  solve,
} from '../../src/lib/web-requests/workbench';
import * as ch1 from '../../src/content/web-requests/01-a-name-to-a-number';
import * as ch2 from '../../src/content/web-requests/02-the-remembered-answer';
import * as ch3 from '../../src/content/web-requests/03-hello-hello-ready';
import * as ch4 from '../../src/content/web-requests/04-lost-in-the-post';
import * as ch5 from '../../src/content/web-requests/05-the-sealed-envelope';
import * as ch6 from '../../src/content/web-requests/06-one-line-many-files';
import * as ch7 from '../../src/content/web-requests/07-make-it-fast';

describe('the page workbench', () => {
  it('pins every policy that meets the rules', () => {
    expect(POLICIES).toHaveLength(24);
    expect(solve()).toEqual(WINNERS);
    expect(WINNERS.length).toBeGreaterThan(0);
  });

  it('every winner keeps each customer within the budget and the TTL within the move limit', () => {
    for (const w of WINNERS) {
      expect(w.ttl).toBeLessThanOrEqual(MOVE);
      for (const c of CUSTOMERS) expect(loadOf(w, c.id).total).toBeLessThanOrEqual(BUDGET);
    }
  });

  it('the start fails, and a day-long TTL fails the move rule even when every page is fast', () => {
    expect(meets(START)).toBe(false);
    const day = { ...WINNERS[0], ttl: 1440 };
    expect(CUSTOMERS.every(c => loadOf(day, c.id).total <= BUDGET)).toBe(true);
    expect(meets(day)).toBe(false);
  });

  it('chapter 7’s Show me lands in WINNERS, and each chapter’s reveal matches its run', () => {
    const shown = ch7.STEPS[0].solution!({ ...START, view: 'scene', quiz: null });
    expect(WINNERS).toContainEqual(benchOf(shown));
    expect(ch7.STEPS[0].predicate(shown)).toBe(true);
    // each prediction's right option, read off the runs
    expect(ch1.outcomeOf()).toBe(1);
    expect(ch2.outcomeOf()).toBe(1);
    expect(ch3.outcomeOf()).toBe(1);
    expect(ch4.outcomeOf()).toBe(1);
    expect(ch5.outcomeOf()).toBe(1);
    expect(ch6.outcomeOf()).toBe(1);
  });

  it('a saved bench with unknown values falls back to the start', () => {
    expect(benchOf({ ttl: 7, http: '9' as never })).toEqual(START);
  });
});
