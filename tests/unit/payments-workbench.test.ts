// Payments chapter 7's workbench (KTD12): WINNERS is pinned, and solving the bench from scratch must give the pin.
// WRITE_PINNED=1 rewrites data/payments/pinned.json's workbench. The bench reads any saved state back into a policy.
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import pinned from '../../data/payments/pinned.json' with { type: 'json' };
import { BEST, START, WINNERS, benchPolicy, meets, policies, solve, wins } from '../../src/lib/payments/workbench';
import { KINDS } from '../../src/lib/payments/sim';

describe('the workbench', () => {
  it('solving every policy gives the pinned WINNERS', () => {
    const s = solve();
    if (process.env.WRITE_PINNED)
      writeFileSync(
        'data/payments/pinned.json',
        `${JSON.stringify({ ...pinned, workbench: { best: s.best, winners: s.winners } }, null, 2)}\n`,
      );
    else {
      expect(s.best).toBe(BEST);
      expect(s.winners).toEqual(WINNERS);
    }
    expect(policies()).toHaveLength(12 ** KINDS.length);
  });
  it('every winner meets the owner’s rule and wins; the start does not', () => {
    for (const w of WINNERS) {
      expect(meets(w)).toBe(true);
      expect(wins(w)).toBe(true);
    }
    expect(wins(START)).toBe(false);
  });
  it('a saved state with unknown values falls back to the start', () => {
    const p = benchPolicy({
      small: { sca: 'nope' as never, capture: 'shipment', key: true },
      large: undefined as never,
    });
    expect(p.small).toEqual({ sca: START.small.sca, capture: 'shipment', key: true });
    expect(p.large).toEqual(START.large);
  });
});
