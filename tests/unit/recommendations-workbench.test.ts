// Recommendations chapter 7's workbench (U20): solving every setting again from fresh loop runs must give the pinned
// WINNERS (KTD10; WRITE_PINNED=1 rewrites the pin), and every loser fails the rule for a reason it names.
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { simulateAll } from '../../src/lib/recommendations/loop';
import {
  BENCHES,
  BEST,
  COVERAGE_MIN,
  START,
  WINNERS,
  benchOf,
  benchScore,
  meets,
  solve,
  wins,
} from '../../src/lib/recommendations/workbench';

const PINNED = 'data/recommendations/pinned.json';

describe('the shelf workbench', () => {
  it('solving every setting again from fresh runs gives the pinned WINNERS', () => {
    const runs = simulateAll();
    const { best, winners } = solve((b, e) => runs.find(r => r.blend === b && r.explore === e)!);
    if (process.env.WRITE_PINNED) {
      const file = JSON.parse(readFileSync(PINNED, 'utf8'));
      writeFileSync(PINNED, `${JSON.stringify({ ...file, workbench: { best, winners } }, null, 2)}\n`);
      return;
    }
    expect(best).toBe(BEST);
    expect(winners).toEqual(WINNERS);
    expect(WINNERS.length).toBeGreaterThan(0);
    for (const w of WINNERS) expect(wins(w)).toBe(true);
  });

  it('every setting either wins or loses for a reason the rule names', () => {
    expect(BENCHES).toHaveLength(15);
    for (const b of BENCHES)
      if (!wins(b)) {
        const s = benchScore(b);
        expect(s.coverage < COVERAGE_MIN || s.hits < BEST).toBe(true);
      }
  });

  it('the start (all tastes, no exploration) breaks the rule; unknown saved values fall back to it', () => {
    expect(meets(START)).toBe(false);
    expect(wins(START)).toBe(false);
    expect(benchOf({ blend: 0.3, explore: 'x' as unknown as number })).toEqual(START);
  });
});
