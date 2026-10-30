// Chapter 7's workbench (KTD7, KTD9): how many people's demos, how many correction rounds, and what practice in the
// simulator, against the 20 held-out bins under the real bay's simulated slips and light. Most bins solved wins, then
// the fewest frames a person labelled (workbench.json). Every result and WINNERS are pinned in pinned.json and
// recomputed by solve() in a test, never at import.
import bench from '../../../data/robots/workbench.json' with { type: 'json' };
import pinned from '../../../data/robots/pinned.json' with { type: 'json' };
import { BINS, REAL, TRAIN } from './world';
import { type Pair, replay } from './policy';
import { demoPairs } from './story';
import { dagger, detectorOf, NO_PRACTICE, type Practice, practicePairs } from './dagger';

export const BENCH = bench;
export type PracticeKind = 'none' | 'plain' | 'light' | 'slip' | 'both';
export interface Setup {
  demos: number;
  rounds: number;
  practice: PracticeKind;
}
export const DEMOS = bench.demos,
  ROUNDS = bench.rounds,
  PRACTICES = bench.practice as PracticeKind[],
  START = bench.start as Setup;
export const PRACTICE_OF: Record<Exclude<PracticeKind, 'none'>, Practice> = {
  plain: NO_PRACTICE,
  light: { light: true, slip: false },
  slip: { light: false, slip: true },
  both: { light: true, slip: true },
};

export interface Score {
  /** held-out bins solved, of 20 */
  solved: number;
  /** the median steps over the 20 (a bin not solved counts the step cap) */
  median: number;
  /** frames a person labelled: demo frames plus corrections */
  labels: number;
}
export const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b),
    m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
/** A policy's score on the 20 real bins: each with its own seeded slips and light. */
export function scoreOn(pairs: Pair[], detector: readonly number[] = BINS.detector, labels = 0): Score {
  const runs = REAL.map((l, i) => replay(pairs, l, { slip: BINS.real.slip, seed: i, detector }));
  return {
    solved: runs.filter(r => r.end === 'done').length,
    median: median(runs.map(r => (r.end === 'done' ? r.steps : BINS.cap))),
    labels,
  };
}
/** The pairs a setup gives the policy, and the detector its practice leaves. */
export function policyOf(s: Setup) {
  const demos = demoPairs(s.demos),
    taught = dagger(demos, TRAIN, s.rounds);
  if (s.practice === 'none') return { pairs: taught, detector: BINS.detector, labels: taught.length };
  const p = PRACTICE_OF[s.practice];
  return { pairs: [...taught, ...practicePairs(p)], detector: detectorOf(p), labels: taught.length };
}
export const measure = (s: Setup): Score & Setup => {
  const p = policyOf(s);
  return { ...s, ...scoreOn(p.pairs, p.detector, p.labels) };
};
export const SETUPS: Setup[] = DEMOS.flatMap(demos =>
  ROUNDS.flatMap(rounds => PRACTICES.map(practice => ({ demos, rounds, practice }))),
);
/** Most bins solved, then the fewest labels. */
export function solve(results: (Score & Setup)[]): Setup[] {
  const most = Math.max(...results.map(r => r.solved)),
    top = results.filter(r => r.solved === most),
    least = Math.min(...top.map(r => r.labels));
  return top.filter(r => r.labels === least).map(({ demos, rounds, practice }) => ({ demos, rounds, practice }));
}

const same = (a: Setup, b: Setup) => a.demos === b.demos && a.rounds === b.rounds && a.practice === b.practice;
export const RESULTS = pinned.workbench.results as (Score & Setup)[];
export const resultOf = (s: Setup) => RESULTS.find(r => same(r, s))!;
export const WINNERS = pinned.workbench.winners as Setup[];
export const wins = (s: Setup) => WINNERS.some(w => same(w, s));
const pick = <T>(xs: T[], v: unknown, d: T) => (xs.includes(v as T) ? (v as T) : d);
/** The setup in a saved run's state; anything unknown falls back to START's. */
export const setupOf = (s: Partial<Setup>): Setup => ({
  demos: pick(DEMOS, s.demos, START.demos),
  rounds: pick(ROUNDS, s.rounds, START.rounds),
  practice: pick(PRACTICES, s.practice, START.practice),
});
