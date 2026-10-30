// Rate limits chapter 7's workbench (KTD7): WINNERS is pinned, and solving the bench from scratch must give the pin.
// WRITE_PINNED=1 rewrites data/rate-limits/pinned.json's workbench. The bench reads any saved state back.
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BENCHES,
  START,
  WINNERS,
  benchOf,
  benchRun,
  lostOf,
  meets,
  solve,
  wins,
} from '../../src/lib/rate-limits/workbench';

describe('the workbench', () => {
  it('solving every setting gives the pinned WINNERS', () => {
    const s = solve();
    const file = 'data/rate-limits/pinned.json';
    if (process.env.WRITE_PINNED) {
      const p = JSON.parse(readFileSync(file, 'utf8'));
      writeFileSync(file, `${JSON.stringify({ ...p, workbench: { winners: s } }, null, 2)}\n`);
    } else expect(s).toEqual(WINNERS);
    expect(BENCHES).toHaveLength(32);
  });
  it('more than one setting wins, every winner meets the rule, and the start does not', () => {
    expect(WINNERS.length).toBeGreaterThan(1);
    for (const w of WINNERS) expect(meets(w) && wins(w)).toBe(true);
    expect(wins(START)).toBe(false);
  });
  it('each control matters: one shared barrel, too small a barrel, too slow a drip or too big a barrel each break it', () => {
    const w = WINNERS[0];
    expect(meets({ ...w, perKey: false })).toBe(false);
    expect(meets({ ...w, size: 5 })).toBe(false);
    expect(meets({ ...w, refill: 5 })).toBe(false);
    expect(benchRun({ ...w, size: 40 }).downs.length).toBeGreaterThan(0);
    expect(lostOf(benchRun(w)).every(x => x.lost === 0)).toBe(true);
  });
  it('a saved state with unknown values falls back to the start', () => {
    expect(benchOf({ size: 9, refill: 20, perKey: 'x' as never })).toEqual({ ...START, refill: 20 });
  });
});
