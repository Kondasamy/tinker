// Fairness chapter 7's workbench (U11): solving every setting again must give the pinned WINNERS (KTD9;
// WRITE_PINNED=1 rewrites the pin), and every loser fails the rule for a reason it names.
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BENCHES,
  LEAST,
  RULES,
  START,
  WINNERS,
  benchOf,
  benchScore,
  meets,
  solve,
  wins,
} from '../../src/lib/fairness/workbench';

const PINNED = 'data/fairness/pinned.json';

describe('the credit-check workbench', () => {
  it('solving every setting again gives the pinned WINNERS', () => {
    const { least, winners } = solve();
    if (process.env.WRITE_PINNED) {
      const file = JSON.parse(readFileSync(PINNED, 'utf8'));
      writeFileSync(PINNED, `${JSON.stringify({ ...file, workbench: { least, winners } }, null, 2)}\n`);
      return;
    }
    expect(least).toBe(LEAST);
    expect(winners).toEqual(WINNERS);
    expect(WINNERS.length).toBeGreaterThan(0);
    for (const w of WINNERS) expect(wins(w)).toBe(true);
  });

  it('every setting either wins or loses for a reason the rule names', () => {
    expect(BENCHES).toHaveLength(3 * 2 * 9 * 9);
    for (const b of BENCHES)
      if (!wins(b)) {
        const s = benchScore(b);
        expect(Math.abs(s.gap) > RULES.gapMax || s.error > LEAST).toBe(true);
      }
  });

  it('the start (every field, one bar) breaks the rule; unknown saved values fall back to it', () => {
    expect(meets(START)).toBe(false);
    expect(benchOf({ features: 'x' as never, barA: 0.42 })).toEqual(START);
  });
});
