// Chapter 7's workbench (KTD9): every setting's pinned result reruns over U2's reply set, and WINNERS recomputes.
// Regenerate the workbench pin with WRITE_PINNED=1 pnpm vitest run tests/unit/watermarks-workbench.test.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import spike from '../../data/watermarks/spike.json' with { type: 'json' };
import { modelLoader } from '../../src/lib/lm/load';
import { larkspur, type Writer } from '../../src/lib/watermarks/sample';
import { MARK } from '../../src/lib/watermarks/story';
import {
  BENCH,
  measure,
  PLANS,
  passes,
  RESULTS,
  resultOf,
  START,
  solve,
  WINNERS,
  wins,
} from '../../src/lib/watermarks/workbench';

const PINNED = 'data/watermarks/pinned.json';
const disk = async (f: string) => {
  const b = readFileSync(`public/data/lm/${f}`);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};

let w: Writer;
beforeAll(async () => {
  w = larkspur(await modelLoader(disk).load());
});

if (process.env.WRITE_PINNED)
  it('regenerates the workbench pin', () => {
    const results = PLANS.map(p => measure(w, p)),
      p = JSON.parse(readFileSync(PINNED, 'utf8'));
    p.workbench = { results, winners: solve(results) };
    writeFileSync(PINNED, `${JSON.stringify(p, null, 2)}\n`);
  }, 600_000);

describe('the workbench', () => {
  it.each(PLANS)('reruns γ $gamma δ $delta to its pinned result', p => {
    expect(measure(w, p)).toEqual(resultOf(p));
  });
  it('recomputes WINNERS', () => {
    expect(RESULTS.map(({ gamma, delta }) => ({ gamma, delta }))).toEqual(PLANS);
    expect(WINNERS.length).toBeGreaterThan(0);
    expect(solve(RESULTS)).toEqual(WINNERS);
  });
  it('agrees with U2’s sweep on the quality cost of every setting', () => {
    for (const r of RESULTS)
      expect(r.drop).toBe(spike.sweep.find(s => s.gamma === r.gamma && s.delta === r.delta)!.drop);
  });
  it('flags no human reply at any setting: the line is set by maths, not by the mark', () => {
    for (const r of RESULTS) expect(r.falseAlarms).toBe(0);
  });
  it('the start (a light nudge) misses most replies and loses', () => {
    expect(wins(START)).toBe(false);
    expect(resultOf(START).caught).toBeLessThan(BENCH.minCaught);
  });
  it('the trade-off bites: U2’s chosen setting passes but loses its mark to light edits, and the strongest costs too much', () => {
    const chosen = resultOf(MARK);
    expect(passes(chosen)).toBe(true);
    expect(wins(MARK)).toBe(false);
    expect(chosen.caughtEdited).toBeLessThan(resultOf(WINNERS[0]).caughtEdited);
    const strongest = RESULTS.reduce((a, b) => (b.caughtEdited > a.caughtEdited ? b : a));
    expect(passes(strongest)).toBe(false);
    expect(strongest.drop).toBeGreaterThan(BENCH.maxDrop);
  });
});
