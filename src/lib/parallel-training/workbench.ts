// Chapter 7's workbench (KTD9): lay out Fernhill's model on the simulated cluster (data/parallel-training/workbench.json,
// planning numbers). The reader sets the split inside layers (tp), the pipeline stages (pp), the ZeRO stage and the
// checkpoint interval; the copies (dp) take the rest of the chips. A layout passes when every chip's memory fits; among
// those, the least time per step once lost work is counted (step time ÷ (1 − expected waste)) wins. The puzzle accepts
// every winner (WINNERS), read from pinned.json; tests/unit/parallel-training-workbench.test.ts solves it again.
import bench from '../../../data/parallel-training/workbench.json' with { type: 'json' };
import pinned from '../../../data/parallel-training/pinned.json' with { type: 'json' };
import { CHIP } from './facts';
import { mtbfOf, wasteOf } from './failures';
import { type Layout, memoryOf, type Zero } from './memory';
import { stepOf } from './timing';

export const CHIPS = bench.chips;
export const TPS = bench.tp;
export const PPS = bench.pp;
export const ZEROS = bench.zero as Zero[];
export const INTERVALS = bench.intervals;
export const RULE = bench.rule;
export const MTBF = mtbfOf(CHIPS);

/** What the bench's controls set. */
export interface Bench {
  tp: number;
  pp: number;
  zero: Zero;
  /** minutes of work between checkpoints */
  interval: number;
}
export const layoutOf = (b: Bench): Layout => ({ tp: b.tp, pp: b.pp, zero: b.zero, dp: CHIPS / (b.tp * b.pp) });
export const memoryOfBench = (b: Bench) => memoryOf(layoutOf(b));
export const fits = (b: Bench) => memoryOfBench(b).total <= CHIP.memory;
export const stepOfBench = (b: Bench) => stepOf(layoutOf(b));
export const wasteOfBench = (b: Bench) => wasteOf(b.interval, MTBF);
/** Seconds per step with saving, lost work and restarts spread over it. */
export const effectiveOf = (b: Bench) => stepOfBench(b).total / (1 - wasteOfBench(b));

/** Every layout the controls can make. */
export const BENCHES: Bench[] = TPS.flatMap(tp =>
  PPS.flatMap(pp => ZEROS.flatMap(zero => INTERVALS.map(interval => ({ tp, pp, zero, interval })))),
);
/** Solves the bench from scratch: every layout that fits with the least effective step time. */
export function solve() {
  const ok = BENCHES.filter(fits);
  const best = Math.min(...ok.map(effectiveOf));
  return { best, winners: ok.filter(b => effectiveOf(b) === best) };
}

/** the pinned solution (KTD9): the test fails if solve() drifts from it */
export const BEST = pinned.workbench.best;
export const WINNERS = pinned.workbench.winners as Bench[];
export const wins = (b: Bench) =>
  WINNERS.some(w => w.tp === b.tp && w.pp === b.pp && w.zero === b.zero && w.interval === b.interval);

export const START = bench.start as Bench;
const pick = <T>(xs: T[], v: unknown, d: T) => (xs.includes(v as T) ? (v as T) : d);
/** The bench in a saved run's state; anything unknown falls back to START's. */
export const benchOf = (s: Partial<Bench>): Bench => ({
  tp: pick(TPS, s.tp, START.tp),
  pp: pick(PPS, s.pp, START.pp),
  zero: pick(ZEROS, s.zero, START.zero),
  interval: pick(INTERVALS, s.interval, START.interval),
});
