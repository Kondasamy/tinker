// Recommendations chapter 7's workbench (KTD11): a blend of bestsellers and hidden tastes, and an exploration share,
// 15 settings, each a pinned run of the loop (loop.json). A setting meets the owner's rule when at least `coverageMin`
// products still have a place on the map after the loop; among those, the most held-out next orders found wins. The
// puzzle accepts every winner (WINNERS, read from data/recommendations/pinned.json);
// tests/unit/recommendations-workbench.test.ts solves the bench again from fresh runs and must get the pin (KTD10).
import data from '../../../data/recommendations/workbench.json' with { type: 'json' };
import pinned from '../../../data/recommendations/pinned.json' with { type: 'json' };
import { BLENDS, EXPLORES, loopOf, type Loop } from './loop';

export const COVERAGE_MIN = data.coverageMin;
export const RULE = data.rule;
export const REASONS = data.reasons;

/** What the bench's controls set. */
export interface Bench {
  blend: number;
  explore: number;
}
export const BENCHES: Bench[] = BLENDS.flatMap(blend => EXPLORES.map(explore => ({ blend, explore })));

/** A run's score after its last round. */
export const scoreOf = (l: Loop) => {
  const last = l.rounds.at(-1)!;
  return { hits: last.hits, coverage: last.coverage };
};
export const benchScore = (b: Bench) => scoreOf(loopOf(b.blend, b.explore));
export const meets = (b: Bench, run = loopOf) => scoreOf(run(b.blend, b.explore)).coverage >= COVERAGE_MIN;

/** Solves the bench from the given runs: every setting that meets the rule and finds the most next orders. */
export function solve(run: (blend: number, explore: number) => Loop = loopOf) {
  const passing = BENCHES.filter(b => meets(b, run));
  const best = Math.max(...passing.map(b => scoreOf(run(b.blend, b.explore)).hits));
  return { best, winners: passing.filter(b => scoreOf(run(b.blend, b.explore)).hits === best) };
}

/** the pinned solution (KTD10): the test fails if solve() drifts from it */
export const BEST = pinned.workbench.best;
export const WINNERS = pinned.workbench.winners as Bench[];
export const wins = (b: Bench) => meets(b) && benchScore(b).hits === BEST;

/** where the bench starts: all hidden tastes, no exploration */
export const START: Bench = { blend: 1, explore: 0 };
const pick = (xs: number[], v: unknown, d: number) => (xs.includes(v as number) ? (v as number) : d);
/** The bench in a saved run's state; anything unknown falls back to START's. */
export const benchOf = (s: Partial<Bench>): Bench => ({
  blend: pick(BLENDS, s.blend, START.blend),
  explore: pick(EXPLORES, s.explore, START.explore),
});
