// Releases chapter 7's workbench (U16): solving every plan again must give the pinned WINNERS (KTD10;
// WRITE_PINNED=1 rewrites the pin), and the rule's halves each bite.
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BENCHES,
  BEST,
  HURT_LIMIT,
  START,
  WINNERS,
  benchOf,
  hurtOf,
  meets,
  minutesOf,
  solve,
  wins,
} from '../../src/lib/releases/workbench';

const PINNED = 'data/releases/pinned.json';

describe('the release plan workbench', () => {
  it('solving every plan again gives the pinned WINNERS', () => {
    const { best, winners } = solve();
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

  it('every plan is either a winner or loses for a reason the rule names', () => {
    expect(BENCHES).toHaveLength(54);
    for (const b of BENCHES)
      if (!wins(b)) {
        const m = minutesOf(b);
        expect(m === null || hurtOf(b) > HURT_LIMIT || m > BEST).toBe(true);
      }
  });

  it('no check lets the bad changes through; the start is no winner', () => {
    expect(meets({ ...WINNERS[0], threshold: 0 })).toBe(false);
    expect(wins(START)).toBe(false);
    expect(benchOf({ canary: 7 as number, flag: 'x' as unknown as boolean })).toEqual(START);
  });
});
