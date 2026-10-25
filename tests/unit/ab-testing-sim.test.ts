// A/B testing's seeded visitor simulator (KTD11): the rates the chapters show come from repeated runs over a fixed seed
// list, so a change to the data or the rules that breaks a lesson fails here.
import { describe, expect, it } from 'vitest';
import {
  ASSUMPTIONS,
  BENCH,
  SCENARIOS,
  SEEDS,
  falseWinRate,
  peekResult,
  powerOf,
  resultAt,
  simulate,
} from '../../src/lib/ab-testing/sim';
import { bonferroni, compare, normalCdf, sampleSize } from '../../src/lib/ab-testing/stats';
import { DECISIONS, WINNERS, decide, ruleOf, scoreOf } from '../../src/lib/ab-testing/workbench';

const LEVEL = ASSUMPTIONS.level;

describe('the statistics', () => {
  it('the normal curve: half below 0, 97.5% below 1.96', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 3);
  });

  it('a clear difference is significant, its interval clear of zero; equal rates are not', () => {
    const c = compare(5000, 500, 5000, 600, LEVEL);
    expect(c.significant).toBe(true);
    expect(c.lo).toBeGreaterThan(0);
    expect(c.diff).toBeCloseTo(0.02, 6);
    const same = compare(5000, 500, 5000, 500, LEVEL);
    expect(same.significant).toBe(false);
    expect(same.lo).toBeLessThan(0);
    expect(same.hi).toBeGreaterThan(0);
  });

  it('the sample-size rule gives Kohavi et al.’s example: under 122,000 users per variant', () => {
    // 5% conversion, a 5% relative change: 16 × 0.05 × 0.95 / 0.0025²
    const n = sampleSize(0.05, 0.05 * 0.05);
    expect(n).toBe(121_600);
    expect(n).toBeLessThan(122_000);
  });

  it('the correction divides the level by the number of comparisons', () => {
    expect(bonferroni(0.05, 20)).toBeCloseTo(0.0025, 10);
  });
});

describe('the visitor simulator', () => {
  it('the same seed gives the same run; another seed a different one', () => {
    const p = SCENARIOS.checkout;
    expect(simulate(p)).toEqual(simulate(p));
    expect(simulate({ ...p, seed: p.seed + 1 })).not.toEqual(simulate(p));
  });

  it('counts are cumulative, one row per day, every arm sees the same visitors', () => {
    const p = SCENARIOS.checkout,
      r = simulate(p);
    expect(r).toHaveLength(p.days);
    for (const [i, d] of r.entries()) {
      expect(d.visitors).toEqual(p.arms.map(() => p.perDay * (i + 1)));
      for (const [a, x] of d.orders.entries()) expect(x).toBeLessThanOrEqual(d.visitors[a]);
    }
    // the observed rate lands near the true one over two weeks
    const last = r.at(-1)!;
    for (const [a, arm] of p.arms.entries()) expect(last.orders[a] / last.visitors[a]).toBeCloseTo(arm.rate, 1);
  });

  it('an A/A test’s false-win rate over the seed list is near the level', () => {
    const rate = falseWinRate(SCENARIOS.aa, 'fixed');
    expect(SEEDS.length).toBe(ASSUMPTIONS.repeats);
    expect(Math.abs(rate - LEVEL)).toBeLessThanOrEqual(0.03);
  });

  it('peeking daily and stopping at the first win raises the false-win rate well above the fixed horizon', () => {
    const fixed = falseWinRate(SCENARIOS.aa, 'fixed'),
      peek = falseWinRate(SCENARIOS.aa, 'peek');
    expect(peek).toBeGreaterThan(fixed * 2);
    expect(peek).toBeGreaterThan(0.12);
  });

  it('chapter 4’s run: a peek declares a win the full run does not keep', () => {
    const p = SCENARIOS.aa,
      r = simulate(p),
      peek = peekResult(r, LEVEL);
    expect(peek).not.toBeNull();
    expect(peek!.t).toBeLessThan(p.days - 1);
    expect(resultAt(r, p.days - 1, LEVEL).significant).toBe(false);
  });

  it('twenty colours with no true effect: some false win far more often than one test; the correction brings it back', () => {
    const many = falseWinRate(SCENARIOS.colours, 'fixed'),
      fixed = falseWinRate(SCENARIOS.aa, 'fixed'),
      corrected = falseWinRate(SCENARIOS.colours, 'corrected');
    expect(SCENARIOS.colours.arms).toHaveLength(21);
    expect(many).toBeGreaterThan(0.3);
    expect(many).toBeGreaterThan(fixed * 5);
    expect(corrected).toBeLessThanOrEqual(LEVEL + 0.03);
  });

  it('chapter 5’s run: one of the twenty wins by luck', () => {
    const r = simulate(SCENARIOS.colours),
      last = r.length - 1;
    const wins = SCENARIOS.colours.arms.slice(1).filter((_, i) => resultAt(r, last, LEVEL, i + 1).significant);
    expect(wins.length).toBeGreaterThan(0);
  });

  it('a small real change is missed often at one week and found most of the time at the planned size', () => {
    const small = SCENARIOS.small;
    const at = (days: number) => powerOf({ ...small, days });
    const needed = sampleSize(small.arms[0].rate, small.arms[1].rate - small.arms[0].rate);
    const enough = Math.ceil(needed / small.perDay);
    expect(at(7)).toBeLessThan(0.5);
    expect(at(enough)).toBeGreaterThan(0.65);
    expect(at(enough)).toBeGreaterThan(at(14));
  });

  it('the hurry banner lifts orders, raises returns past the guardrail and leaves kept orders flat', () => {
    const p = SCENARIOS.hurry,
      r = simulate(p),
      last = r.length - 1;
    const orders = resultAt(r, last, LEVEL);
    expect(orders.significant).toBe(true);
    expect(orders.diff).toBeGreaterThan(0);
    const ret = resultAt(r, last, LEVEL, 1, 'returns');
    expect(ret.significant).toBe(true);
    expect(ret.diff).toBeGreaterThan(0);
    const kept = (a: number) => p.arms[a].rate * (1 - (p.arms[a].returns ?? 0));
    expect(Math.abs(kept(1) - kept(0))).toBeLessThan(0.002);
  });
});

describe('the workbench rule', () => {
  it('every experiment’s decision follows the rule on its own data', () => {
    for (const e of BENCH) {
      const r = ruleOf(e);
      const d = decide(e);
      if (r.significant && r.up && r.guardrailHolds) expect(d).toBe('ship');
      else if (!r.significant && r.underpowered) expect(d).toBe('keep');
      else expect(d).toBe('stop');
    }
  });

  it('an underpowered real win is marked keep testing, not ship', () => {
    const e = BENCH.find(x => x.id === 'photos')!;
    expect(e.arms[1].rate).toBeGreaterThan(e.arms[0].rate);
    expect(ruleOf(e).underpowered).toBe(true);
    expect(decide(e)).toBe('keep');
  });

  it('the bench uses every decision, and WINNERS is the one set that follows the rule', () => {
    expect(new Set(BENCH.map(decide))).toEqual(new Set(DECISIONS));
    expect(WINNERS).toHaveLength(1);
    expect(scoreOf(WINNERS[0])).toBe(BENCH.length);
    expect(WINNERS[0]).toEqual(Object.fromEntries(BENCH.map(e => [e.id, decide(e)])));
  });
});
