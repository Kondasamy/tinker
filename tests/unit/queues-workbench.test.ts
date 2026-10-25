// Queues chapter 7's workbench (KTD12): WINNERS is pinned, and solving the bench from scratch must give the pin.
// WRITE_PINNED=1 rewrites data/queues/pinned.json's workbench. The bench reads any saved state back.
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BENCHES,
  BEST,
  START,
  WINNERS,
  benchOf,
  benchRun,
  lostOf,
  meets,
  solve,
  wins,
} from '../../src/lib/queues/workbench';

describe('the workbench', () => {
  it('solving every policy gives the pinned WINNERS', () => {
    const s = solve();
    const file = 'data/queues/pinned.json';
    if (process.env.WRITE_PINNED) {
      const pinned = JSON.parse(readFileSync(file, 'utf8'));
      writeFileSync(
        file,
        `${JSON.stringify({ ...pinned, workbench: { best: s.best, winners: s.winners } }, null, 2)}\n`,
      );
    } else {
      expect(s.best).toBe(BEST);
      expect(s.winners).toEqual(WINNERS);
    }
    expect(BENCHES).toHaveLength(4 * 4 * 3);
  });
  it('every winner meets the owner’s rule and wins; the start does not', () => {
    for (const w of WINNERS) {
      expect(meets(w)).toBe(true);
      expect(wins(w)).toBe(true);
    }
    expect(wins(START)).toBe(false);
  });
  it('each control matters: too few tries, too short or too long a lease, too few workers each break the rule', () => {
    const w = WINNERS[0];
    expect(lostOf({ ...w, maxTries: 2 }).length).toBeGreaterThan(0);
    expect(lostOf({ ...w, lease: 3 }).length).toBeGreaterThan(0);
    expect(meets({ ...w, lease: 20 })).toBe(false);
    expect(lostOf({ ...w, lease: 20 })).toEqual([]);
    expect(meets({ ...w, workers: w.workers - 1 })).toBe(false);
    expect(benchRun(w).doubleShipped).toBe(0);
  });
  it('a saved state with unknown values falls back to the start', () => {
    expect(benchOf({ workers: 9, maxTries: 5, lease: 'x' as never })).toEqual({ ...START, maxTries: 5 });
  });
});
