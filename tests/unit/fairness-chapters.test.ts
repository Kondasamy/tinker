// Bias and fairness' chapters against the engine and the pins (KTD9): every prediction's outcome is computed, every
// reveal says what the check does, and chapter 7's Show me is in WINNERS.
import { describe, expect, it } from 'vitest';
import pinned from '../../data/fairness/pinned.json' with { type: 'json' };
import { gapOf } from '../../src/lib/fairness/metrics';
import { evenPairs, runOf, SHARED } from '../../src/lib/fairness/story';
import { START, WINNERS, wins } from '../../src/lib/fairness/workbench';
import * as ch1 from '../../src/content/fairness/01-right-on-average';
import * as ch2 from '../../src/content/fairness/02-errors-by-group';
import * as ch3 from '../../src/content/fairness/03-where-skew-comes-from';
import * as ch4 from '../../src/content/fairness/04-dropping-the-column';
import * as ch5 from '../../src/content/fairness/05-one-bar-or-two';
import * as ch6 from '../../src/content/fairness/06-every-kind';
import * as ch7 from '../../src/content/fairness/07-workbench';

const step = <S>(steps: { id: string; predicate: (s: S) => boolean; solution?: (s: S) => S }[], id: string) =>
  steps.find(s => s.id === id)!;

describe('the chapters’ reveals match the engine and the pins', () => {
  it('chapter 1: the shared bar with the fewest wrong decisions is the pinned 0.50, at 25%', () => {
    expect(ch1.BEST).toContain(SHARED);
    expect(ch1.LEAST).toBe(pinned.all.all.error);
    expect(ch1.FROM).not.toBe(SHARED);
    const slide = step(ch1.STEPS, 'slide');
    const blank = { bars: { A: ch1.FROM, B: ch1.FROM }, view: 'scene' as const, p1: null, quiz: null };
    expect(slide.predicate(blank)).toBe(false);
    expect(slide.predicate(slide.solution!(blank))).toBe(true);
    // "about as often": the two regions' error rates are within a quarter of each other
    const r = pinned.all.B.error / pinned.all.A.error;
    expect(ch1.OUTCOME).toBe(0);
    expect(r).toBeGreaterThan(0.8);
    expect(r).toBeLessThan(1.25);
  });
  it('chapter 2: B’s repayers are turned down about three times as often; a lower bar narrows the gap', () => {
    expect(ch2.OUTCOME).toBe(0);
    expect(Math.round(pinned.ratio)).toBe(3);
    expect(ch2.P1.options[0]).toMatch(/three times/);
    const low = runOf('all', 'none', { A: ch2.LOW, B: ch2.LOW });
    expect(gapOf(low)).toBeLessThan(gapOf(runOf()));
    expect(low.all.error).toBeGreaterThan(pinned.all.all.error);
  });
  it('chapter 3: the postcode counts are the pins, one B repayer is about 2 points, and reweighting doesn’t close the gap', () => {
    expect(ch3.COUNT.A.river).toBe(pinned.river.A);
    expect(ch3.COUNT.B.river).toBe(pinned.river.B);
    expect(ch3.COUNT.B.repaid / ch3.COUNT.B.n).toBeCloseTo(pinned.all.B.base, 4);
    expect(ch3.OUTCOME2).toBe(0);
    expect(Math.round(ch3.STEP_PTS.B)).toBe(2);
    expect(ch3.STEP_PTS.A).toBeLessThan(1);
    expect(ch3.REWEIGHT.after).toBeGreaterThanOrEqual(ch3.REWEIGHT.before);
  });
  it('chapter 4: dropping the region keeps the pinned share of the gap', () => {
    expect(ch4.KEPT).toBeCloseTo(pinned.kept, 4);
    expect(ch4.KEPT).toBeGreaterThan(0.5);
    expect(ch4.OUTCOME).toBe(0);
  });
  it('chapter 5: B’s bar goes down; the pinned pair evens false declines, and any even pair passes', () => {
    expect(ch5.EVEN.B).toBeLessThan(SHARED);
    expect(ch5.OUTCOME).toBe(0);
    const even = step(ch5.STEPS, 'even');
    const blank = { bars: { A: SHARED, B: SHARED }, p1: 0, quiz: null };
    expect(even.predicate(blank)).toBe(false);
    expect(even.predicate(even.solution!(blank))).toBe(true);
    // every even pair the step accepts costs what the reveal says: more of B's approvals unrepaid, more errors overall
    const one = runOf();
    expect(evenPairs().map(p => p.bars)).toContainEqual(ch5.EVEN);
    for (const p of evenPairs()) {
      expect(even.predicate({ ...blank, bars: p.bars })).toBe(true);
      expect(p.m.B.falseApprove).toBeGreaterThan(one.B.falseApprove);
      expect(p.m.all.error).toBeGreaterThan(one.all.error);
      expect(p.m.A.falseDecline).toBe(one.A.falseDecline);
    }
  });
  it('chapter 6: no pair makes every kind equal, but for bars that approve almost nobody', () => {
    expect(ch6.FOUND.pairs).toBe(0);
    expect(ch6.FOUND.trivialMaxApproved).toBeLessThanOrEqual(0.03);
    expect(ch6.PAIRS).toBe(101 * 101);
    expect(ch6.OUTCOME).toBe(0);
  });
});

describe('chapter 7’s workbench', () => {
  const bench = step(ch7.STEPS, 'bench');
  const blank = { ...START, view: 'scene' as const, quiz: null };
  it('Show me lands on a setting in WINNERS, and the step passes', () => {
    const shown = bench.solution!(blank);
    expect(bench.predicate(shown)).toBe(true);
    expect(WINNERS).toContainEqual({ features: shown.features, fix: shown.fix, barA: shown.barA, barB: shown.barB });
  });
  it('the start is not a winner', () => {
    expect(bench.predicate(blank)).toBe(false);
    expect(wins(START)).toBe(false);
  });
});
