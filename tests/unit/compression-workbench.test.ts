// Compression chapter 7's workbench (KTD12): the pinned WINNERS are every plan that fits over the whole domain, and the
// lessons the bench rests on hold in the runs.
import { describe, expect, it } from 'vitest';
import {
  BEST,
  BUDGET,
  PLANS,
  START,
  WINNERS,
  benchPlan,
  planKey,
  runPlan,
  solve,
  wins,
} from '../../src/lib/compression/workbench';

describe('chapter 7’s workbench', () => {
  it('has 960 plans: a coder for each of three files, five shade counts and three block sizes', () => {
    expect(PLANS).toHaveLength(960);
    expect(new Set(PLANS.map(planKey)).size).toBe(960);
  });

  it('WINNERS equals the pin: every plan within both budgets', () => {
    expect(solve().map(planKey)).toEqual(WINNERS.map(planKey));
    for (const p of WINNERS) expect(runPlan(p).fits).toBe(true);
    expect(BEST).toBeLessThanOrEqual(BUDGET.bytes);
  });

  it('every winner sends the random file as it is', () => {
    for (const p of WINNERS) expect(p.coders.random).toBe('store');
  });

  it('the start fits neither budget, and the untouched picture alone overruns it', () => {
    expect(runPlan(START).fits).toBe(false);
    expect(wins(START)).toBe(false);
  });

  it('too much loss misses the quality budget even when it is small', () => {
    const r = runPlan({ ...WINNERS[0], levels: 4, block: 4 });
    expect(r.total).toBeLessThan(runPlan(WINNERS[0]).total);
    expect(r.diff).toBeGreaterThan(BUDGET.diff);
    expect(r.fits).toBe(false);
  });

  it('reads a saved state back into a plan, falling back to the start', () => {
    expect(planKey(benchPlan({}))).toBe(planKey(START));
    expect(benchPlan({ levels: 7, coders: { price: 'zip' as never } }).levels).toBe(256);
    expect(planKey(benchPlan(WINNERS[0]))).toBe(planKey(WINNERS[0]));
  });
});
