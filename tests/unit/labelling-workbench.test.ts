// Chapter 7's workbench (KTD9): every setup's pinned result reruns, and WINNERS recomputes.
import { describe, expect, it } from 'vitest';
import {
  BENCH,
  measure,
  passes,
  RESULTS,
  resultOf,
  SETUPS,
  START,
  solve,
  WINNERS,
  wins,
} from '../../src/lib/labelling/workbench';

describe('the workbench', () => {
  it('reruns every setup to its pinned result', () => {
    expect(RESULTS.map(({ votes, gold, hard }) => ({ votes, gold, hard }))).toEqual(SETUPS);
    for (const s of SETUPS) expect(measure(s)).toEqual(resultOf(s));
  });
  it('recomputes WINNERS', () => {
    expect(WINNERS.length).toBeGreaterThan(0);
    expect(solve(RESULTS)).toEqual(WINNERS);
  });
  it('drops the rushed labeller once enough gold is checked', () => {
    expect(resultOf({ votes: 1, gold: 0, hard: 'people' }).dropped).toEqual([]);
    expect(resultOf({ votes: 1, gold: 10, hard: 'people' }).dropped).toEqual(['tom']);
  });
  it('starts on a setup that misses the bar', () => {
    expect(passes(resultOf(START))).toBe(false);
    expect(wins(START)).toBe(false);
    expect(BENCH.bar).toBeGreaterThan(0);
  });
});
