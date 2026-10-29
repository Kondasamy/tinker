// Many chips, one model's workbench (U22): solving every layout again must give the pinned WINNERS (KTD9;
// WRITE_PINNED=1 rewrites the pin), and each half of the rule bites.
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHIP } from '../../src/lib/parallel-training/facts';
import {
  BENCHES,
  BEST,
  benchOf,
  CHIPS,
  effectiveOf,
  fits,
  INTERVALS,
  layoutOf,
  START,
  solve,
  stepOfBench,
  WINNERS,
  wins,
} from '../../src/lib/parallel-training/workbench';

const PINNED = 'data/parallel-training/pinned.json';

describe('the layout workbench', () => {
  it('solving every layout again gives the pinned WINNERS', () => {
    const { best, winners } = solve();
    if (process.env.WRITE_PINNED) {
      const file = JSON.parse(readFileSync(PINNED, 'utf8'));
      writeFileSync(PINNED, `${JSON.stringify({ ...file, workbench: { best, winners } }, null, 2)}\n`);
      return;
    }
    expect(best).toBe(BEST);
    expect(winners).toEqual(WINNERS);
    expect(WINNERS.length).toBeGreaterThan(0);
    for (const w of WINNERS) expect(wins(w) && fits(w)).toBe(true);
  });

  it('every layout uses every chip, and every loser fails memory or is slower', () => {
    expect(BENCHES).toHaveLength(5 * 4 * 4 * INTERVALS.length);
    for (const b of BENCHES) {
      const l = layoutOf(b);
      expect(l.tp * l.pp * l.dp).toBe(CHIPS);
      if (!wins(b)) expect(!fits(b) || effectiveOf(b) > BEST).toBe(true);
    }
  });

  it('the start does not fit, memory rules out a fast layout, splitting across boxes is slow, and bad saves lose', () => {
    expect(fits(START)).toBe(false);
    // one box per layer and no pipeline is quick, but only fits once ZeRO shares the optimiser state
    const flat = { tp: 8, pp: 1, zero: 0, interval: WINNERS[0].interval } as const;
    expect(fits(flat)).toBe(false);
    expect(fits({ ...flat, zero: 1 })).toBe(true);
    expect(stepOfBench({ ...WINNERS[0], tp: 16, pp: 4 }).total).toBeGreaterThan(stepOfBench(WINNERS[0]).total);
    for (const interval of [INTERVALS[0], INTERVALS.at(-1)!]) expect(wins({ ...WINNERS[0], interval })).toBe(false);
    expect(CHIP.memory).toBe(80e9);
    expect(benchOf({ tp: 3, interval: 'x' as unknown as number })).toEqual(START);
  });
});
