// Finding the way chapter 7's workbench (KTD7): WINNERS is pinned, and solving the bench from scratch must give the
// pin. WRITE_PINNED=1 rewrites data/routes/pinned.json's workbench. The bench reads any saved state back.
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BENCHES,
  BEST,
  FASTEST,
  SLACK,
  START,
  WINNERS,
  benchOf,
  dayOf,
  meets,
  solve,
  wins,
} from '../../src/lib/routes/workbench';

describe('the workbench', () => {
  it('solving every setting gives the pinned WINNERS', () => {
    const s = solve();
    const file = 'data/routes/pinned.json';
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
    expect(BENCHES).toHaveLength(6);
  });
  it('every winner wins; the start (exact but slow) and the fewest-roads search do not', () => {
    for (const w of WINNERS) expect(wins(w)).toBe(true);
    expect(meets(START)).toBe(true);
    expect(wins(START)).toBe(false);
    expect(meets({ algo: 'bfs', weight: 1 })).toBe(false);
  });
  it('leaning too hard breaks the rule: the heaviest weight looks at fewer junctions but loses minutes', () => {
    const heavy = dayOf({ algo: 'astar', weight: 3 });
    expect(heavy.looked).toBeLessThan(BEST);
    expect(heavy.minutes).toBeGreaterThan(FASTEST + SLACK);
  });
  it('a saved state with unknown values falls back to the start', () => {
    expect(benchOf({ algo: 'x' as never, weight: 2 })).toEqual({ ...START, weight: 2 });
    expect(benchOf({ algo: 'astar', weight: 7 })).toEqual({ algo: 'astar', weight: START.weight });
  });
});
