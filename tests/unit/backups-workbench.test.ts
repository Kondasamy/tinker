// Backups chapter 7's workbench (KTD7): WINNERS is pinned, and solving the bench from scratch must give the pin.
// WRITE_PINNED=1 rewrites data/backups/pinned.json's workbench. The bench reads any saved state back.
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BENCHES,
  BEST,
  START,
  WINNERS,
  benchOf,
  costOf,
  meets,
  resultsOf,
  solve,
  wins,
} from '../../src/lib/backups/workbench';

describe('the workbench', () => {
  it('solving every plan gives the pinned WINNERS', () => {
    const s = solve();
    const file = 'data/backups/pinned.json';
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
    expect(BENCHES).toHaveLength(4 * 2 * 4);
  });
  it('every winner meets the rule and wins; the start does not', () => {
    expect(WINNERS.length).toBeGreaterThan(0);
    for (const w of WINNERS) expect(wins(w)).toBe(true);
    expect(meets(START)).toBe(false);
  });
  it('each control matters: drop the lockbox, the warehouse, copy less often, or go full, and it breaks or costs more', () => {
    const w = WINNERS[0];
    expect(meets({ ...w, places: 'warehouse' })).toBe(false);
    expect(meets({ ...w, places: 'lockbox' })).toBe(false);
    expect(meets({ ...w, every: 12 })).toBe(false);
    expect(costOf({ ...w, incremental: !w.incremental })).toBeGreaterThan(BEST);
    // hourly incremental chains run too long to restore in time
    expect(meets({ ...w, every: 1, incremental: true })).toBe(false);
    expect(resultsOf(w).map(r => r.from)).toEqual(['cabinet', 'warehouse', 'lockbox']);
  });
  it('a saved state with unknown values falls back to the start', () => {
    expect(benchOf({ every: 7, incremental: 'x' as never, places: 'both' })).toEqual({ ...START, places: 'both' });
  });
});
