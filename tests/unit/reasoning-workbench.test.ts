// Chapter 7's workbench: every plan is scored from the recorded answers; WINNERS is every plan with the most right
// answers at the lowest cost, and it agrees with chapter 6's gate on each kind.
import { describe, expect, it } from 'vitest';
import { lowestPassing } from '../../src/lib/reasoning/engine';
import { LEAST_COST, MOST_RIGHT, PLANS, WINNERS, solved, totals } from '../../src/lib/reasoning/workbench';

describe('reasoning workbench', () => {
  it('walks every plan: 4 efforts per kind', () => {
    expect(PLANS).toHaveLength(4 ** 3);
  });

  it('WINNERS is non-empty and every member scores the best', () => {
    expect(WINNERS.length).toBeGreaterThan(0);
    for (const p of WINNERS) {
      expect(solved(p)).toBe(true);
      expect(totals(p).right).toBe(MOST_RIGHT);
      expect(totals(p).cost).toBe(LEAST_COST);
    }
    expect(PLANS.filter(solved)).toEqual(WINNERS);
  });

  it('high everywhere is not a winner: it costs more and gets fewer right', () => {
    const t = totals({ lookup: 'high', multistep: 'high', distractor: 'high' });
    expect(t.right).toBeLessThan(MOST_RIGHT);
    expect(t.cost).toBeGreaterThan(LEAST_COST);
  });

  it('the winning plan is chapter 6’s lowest passing effort per kind', () => {
    expect(WINNERS).toContainEqual({ lookup: lowestPassing('lookup'), multistep: lowestPassing('multistep'), distractor: lowestPassing('distractor') });
  });
});
