// A/B testing's chapters against the simulator (KTD12): every reveal says what the runs show, Show me lands on a
// winner, and the bench reads any saved state back into a plan it can grade.
import { describe, expect, it } from 'vitest';
import { ASSUMPTIONS, BENCH, falseWinRate, resultAt, runOf, SCENARIOS } from '../../src/lib/ab-testing/sim';
import { START, WINNERS, benchPlan, decide, wins } from '../../src/lib/ab-testing/workbench';
import * as ch1 from '../../src/content/ab-testing/01-did-it-work';
import * as ch2 from '../../src/content/ab-testing/02-luck';
import * as ch3 from '../../src/content/ab-testing/03-how-many-shoppers';
import * as ch4 from '../../src/content/ab-testing/04-peeking';
import * as ch5 from '../../src/content/ab-testing/05-twenty-colours';
import * as ch6 from '../../src/content/ab-testing/06-guardrails';
import * as ch7 from '../../src/content/ab-testing/07-ship-or-stop';

describe('the chapters’ reveals match the runs', () => {
  it('chapter 1: the one-page checkout wins', () => {
    expect(ch1.P1.options[ch1.outcomeOf()]).toMatch(/^B wins/);
  });
  it('chapter 2: a few A/A tests call a winner; the run shown has a visible gap and no winner', () => {
    expect(ch2.P1.options[ch2.outcomeOf()]).toMatch(/^A few/);
    expect(ch2.FINAL.significant).toBe(false);
    expect(Math.abs(ch2.FINAL.diff)).toBeGreaterThanOrEqual(0.01);
  });
  it('chapter 3: one week finds nothing, under half the runs find the lift, and the slider can reach enough', () => {
    expect(ch3.WEEK.significant).toBe(false);
    // the run the picture shows at the planned size finds the lift, as most runs there do
    const big = resultAt(runOf(ch3.planOf(ch3.ENOUGH)), ch3.ENOUGH - 1, ASSUMPTIONS.level);
    expect(big.significant && big.diff > 0).toBe(true);
    expect(ch3.P1.options[ch3.outcomeOf()]).toMatch(/^Under half/);
    expect(ch3.DAYS).toContain(ch3.ENOUGH);
    expect(ch3.ENOUGH * SCENARIOS.small.perDay).toBeGreaterThanOrEqual(ch3.NEEDED);
  });
  it('chapter 4: the peek declares a win the full run does not keep; peeking beats one look', () => {
    expect(ch4.PEEK.t).toBeLessThan(ch4.END);
    expect(ch4.PEEK.result.significant).toBe(true);
    expect(ch4.PEEK.result.diff).toBeGreaterThan(0);
    expect(ch4.P1.options[ch4.outcomeOf()]).toMatch(/^No winner/);
    expect(ch4.PEEK_RATE).toBeGreaterThan(ch4.FIXED_RATE);
  });
  it('chapter 5: one colour wins by luck; some colour wins far more often than one test; the correction cuts it', () => {
    expect(ch5.WINNER).toBeGreaterThan(0);
    expect(ch5.P1.options[ch5.outcomeOf()]).toMatch(/^Far more often/);
    expect(ch5.CORRECTED).toBeLessThan(ch5.RATE);
    expect(ch5.RATE).toBeGreaterThan(falseWinRate(SCENARIOS.aa, 'fixed') * 2);
  });
  it('chapter 6: B wins on buying, returns rise, and orders kept stay flat', () => {
    expect(ch6.ORDERS.significant && ch6.ORDERS.diff > 0).toBe(true);
    expect(ch6.P1.options[ch6.outcomeOf()]).toMatch(/^A bigger share/);
    expect(Math.abs(ch6.kept(1) - ch6.kept(0))).toBeLessThan(0.005);
  });
});

describe('chapter 7’s workbench', () => {
  const bench = ch7.STEPS.find(s => s.id === 'bench')!;
  const blank = { plan: { ...START }, shown: BENCH[0].id, view: 'scene' as const, quiz: null };
  it('Show me lands on a plan in WINNERS, and the step passes', () => {
    const shown = bench.solution!(blank);
    expect(bench.predicate(shown)).toBe(true);
    expect(WINNERS.some(w => JSON.stringify(w) === JSON.stringify(benchPlan(shown.plan)))).toBe(true);
  });
  it('the start is not a winner', () => {
    expect(wins(benchPlan(START))).toBe(false);
  });
  it('the rule ships a lucky win, revealed afterwards', () => {
    expect(ch7.LUCKY).toBeDefined();
    expect(decide(ch7.LUCKY!)).toBe('ship');
    const end = ch7.LUCKY!.days - 1;
    expect(ch7.LUCKY!.arms[1].rate).toBe(ch7.LUCKY!.arms[0].rate);
    expect(end).toBeGreaterThan(0);
  });
  it('a saved state with unknown values falls back to the start', () => {
    const p = benchPlan({ addresses: 'ship', photos: 'maybe', green: 3 });
    expect(p.addresses).toBe('ship');
    expect(p.photos).toBe(START.photos);
    expect(p.green).toBe(START.green);
  });
});
