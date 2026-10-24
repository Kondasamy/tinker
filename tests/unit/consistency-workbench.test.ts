// Consistency's chapters against the simulator (KTD12): every reveal says what the runs show, Show me lands on a winner,
// every control's finite domain runs, and the bench reads any saved state back into a policy it can run.
import { describe, expect, it } from 'vitest';
import { N, PRODUCTS, QUORUMS, RULES, policyOf, simulate } from '../../src/lib/consistency/sim';
import { POLICIES, START, WINNERS, benchPolicy, wins } from '../../src/lib/consistency/workbench';
import * as ch1 from '../../src/content/consistency/01-one-count-three-copies';
import * as ch2 from '../../src/content/consistency/02-two-buyers-one-hinge';
import * as ch3 from '../../src/content/consistency/03-the-link-goes-down';
import * as ch4 from '../../src/content/consistency/04-quorums';
import * as ch5 from '../../src/content/consistency/05-who-wins';
import * as ch6 from '../../src/content/consistency/06-eventually';
import * as ch7 from '../../src/content/consistency/07-stock-policy';

describe('the chapters’ reveals match the runs', () => {
  it('chapter 1: West still shows the old count a minute after North’s sale', () => {
    expect(ch1.P1.options[ch1.outcomeOf()]).toMatch(/still on its way/);
  });
  it('chapter 2: two receipts for the last hinge, and it is oversold', () => {
    expect(ch2.P1.options[ch2.outcomeOf()]).toMatch(/^Two/);
    expect(ch2.RUN.oversold.hinge).toBeGreaterThan(0);
  });
  it('chapter 3: with the line cut, North sells the drill press again; staying right refuses West instead', () => {
    expect(ch3.P1.options[ch3.outcomeOf()]).toMatch(/^Sold/);
    expect(ch3.runFor(true, 'open').oversold.drill).toBe(1);
    expect(ch3.devRefused()).toBe(true);
    expect(ch3.runFor(true, 'right').oversold.drill).toBe(0);
  });
  it('chapter 4: R = W = 2 leaves no stale reads; with the line cut it refuses orders', () => {
    expect(ch4.P1.options[ch4.outcomeOf()]).toMatch(/^No/);
    expect(ch4.LOOSE.stale).toBeGreaterThan(0);
    expect(ch4.QUORUM_CUT.refused.hinge + ch4.QUORUM_CUT.refused.drill).toBeGreaterThan(0);
  });
  it('chapter 5: quorums still print two receipts; reservations print one and lose nothing', () => {
    expect(ch5.P1.options[ch5.outcomeOf()]).toMatch(/^Two/);
    expect(ch5.runWith('lww').lost.hinge).toBeGreaterThan(0);
    expect(ch5.runWith('primary').lost.hinge).toBe(0);
    expect(ch5.TURNED.result).toBe('soldout');
  });
  it('chapter 6: the reload misses Priya’s order, and reading where she wrote fixes it', () => {
    expect(ch6.P1.options[ch6.outcomeOf()]).toMatch(/^No/);
    expect(ch6.look(true).ryw).toBe(true);
  });
});

describe('every control’s domain runs', () => {
  it('each R, W, rule, outage and sticky setting simulates without error', () => {
    for (const r of QUORUMS)
      for (const w of QUORUMS)
        for (const rule of RULES)
          for (const partition of [false, true])
            for (const sticky of [false, true]) {
              const res = simulate(policyOf({ r, w, rule }, { partition, sticky }));
              for (const p of PRODUCTS) expect(res.sold[p]).toBeGreaterThanOrEqual(0);
            }
    expect(POLICIES).toHaveLength((QUORUMS.length * QUORUMS.length * RULES.length) ** 2);
    expect(N).toBe(3);
  });
});

describe('chapter 7’s workbench', () => {
  const bench = ch7.STEPS.find(s => s.id === 'bench')!;
  const blank = { ...START, view: 'scene' as const, quiz: null };
  it('Show me lands on a policy in WINNERS, and the step passes', () => {
    const shown = bench.solution!(blank);
    expect(bench.predicate(shown)).toBe(true);
    expect(WINNERS.some(w => JSON.stringify(w) === JSON.stringify(benchPolicy(shown)))).toBe(true);
  });
  it('the start is not a winner', () => {
    expect(wins(benchPolicy(START))).toBe(false);
  });
  it('a saved state with unknown values falls back to the start', () => {
    const p = benchPolicy({ hinge: { r: 7, w: 2, rule: 'nope' as never }, drill: undefined as never });
    expect(p.hinge).toEqual({ r: START.hinge.r, w: 2, rule: START.hinge.rule });
    expect(p.drill).toEqual(START.drill);
  });
});
