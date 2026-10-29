// Fairness chapter 7's workbench (KTD9): which fields the check reads, the sample fix, and a bar per region, scored
// on the made-up applicants. The credit team's rule (data/fairness/workbench.json): the gap between the regions'
// false-decline rates stays within `gapMax`; of the settings that keep it, the fewest wrong decisions overall win.
// The puzzle accepts every winner (WINNERS, pinned in data/fairness/pinned.json); tests/unit/fairness-workbench solves
// it again and must get the pin, never at import.
import pinned from '../../../data/fairness/pinned.json' with { type: 'json' };
import rules from '../../../data/fairness/workbench.json' with { type: 'json' };
import { FEATURE_SETS, FIXES, type Features, type Fix } from './fit';
import { gapOf } from './metrics';
import { runOf } from './story';

export const RULES = rules;
/** The bench's bar steps: 0.30 to 0.70 in twentieths. */
export const BENCH_BARS = [0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7];

export interface Bench {
  features: Features;
  fix: Fix;
  barA: number;
  barB: number;
}
export const BENCHES: Bench[] = FEATURE_SETS.flatMap(features =>
  FIXES.flatMap(fix => BENCH_BARS.flatMap(barA => BENCH_BARS.map(barB => ({ features, fix, barA, barB })))),
);

/** A setting's overall share of wrong decisions and its false-decline gap (B less A). */
export function benchScore(b: Bench) {
  const m = runOf(b.features, b.fix, { A: b.barA, B: b.barB });
  return { error: m.all.error, gap: gapOf(m) };
}
export const meets = (b: Bench) => Math.abs(benchScore(b).gap) <= rules.gapMax + 1e-9;

/** Solves the bench from scratch: every setting that keeps the gap rule with the fewest wrong decisions. */
export function solve() {
  const ok = BENCHES.filter(meets);
  const least = Math.min(...ok.map(b => benchScore(b).error));
  return { least, winners: ok.filter(b => Math.abs(benchScore(b).error - least) < 1e-9) };
}

/** the pinned solution: the test fails if solve() drifts from it */
export const LEAST: number = pinned.workbench.least;
export const WINNERS = pinned.workbench.winners as Bench[];
export const wins = (b: Bench) => meets(b) && Math.abs(benchScore(b).error - LEAST) < 1e-9;

/** where the bench starts: every field, no fix, one bar for both */
export const START: Bench = { features: 'all', fix: 'none', barA: 0.5, barB: 0.5 };
const pick = <T>(xs: readonly T[], v: unknown, d: T) => (xs.includes(v as T) ? (v as T) : d);
/** The bench in a saved run's state; anything unknown falls back to START's. */
export const benchOf = (s: Partial<Bench>): Bench => ({
  features: pick(FEATURE_SETS, s.features, START.features),
  fix: pick(FIXES, s.fix, START.fix),
  barA: pick(BENCH_BARS, s.barA, START.barA),
  barB: pick(BENCH_BARS, s.barB, START.barB),
});
