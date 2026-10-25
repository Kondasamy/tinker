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

  it('a saved bench with unknown values falls back to the start', () => {
    expect(benchOf({ ttl: 7, http: '9' as never })).toEqual(START);
  });
});
