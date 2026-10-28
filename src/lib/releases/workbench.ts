// Releases chapter 7's workbench (KTD11): the canary's share, the bake time, a flag or not, and the check's threshold
// (54 plans), each run over four seeded changes (data/releases/workbench.json): the bigger button (good), the new
// checkout, the tax rounding and the gift wrap (bad). Every plan steps canary, half, everyone. A plan meets the owner's
// rule when the good change reaches everyone and at most `hurtLimit` customers are hurt in all; among those, the
// soonest to everyone wins. The puzzle accepts every winner (WINNERS), read from data/releases/pinned.json;
// tests/unit/releases-workbench.test.ts solves the bench again and must get the pin (KTD10).
import data from '../../../data/releases/workbench.json' with { type: 'json' };
import pinned from '../../../data/releases/pinned.json' with { type: 'json' };
import { THRESHOLD, changeOf, policyOf, runOf, type Run } from './sim';

export const BENCH_CHANGES = data.changes.map(changeOf);
export const GOOD = changeOf(data.good);
export const HURT_LIMIT = data.hurtLimit;
export const RULE = data.rule;
export const REASONS = data.reasons;
export const CANARIES = [0.01, 0.05, 0.25];
export const BAKES = [2, 5, 10];
/** 0: no automatic check */
export const THRESHOLDS = [0, THRESHOLD, 0.05];
export const START_AT = 2;
/** the stage between the canary and everyone */
export const MIDDLE = 0.5;

/** What the bench's controls set. */
export interface Bench {
  canary: number;
  bake: number;
  flag: boolean;
  threshold: number;
}
/** One change's run under a plan. */
export const benchRun = (b: Bench, change: string): Run =>
  runOf(
    policyOf({
      change,
      start: START_AT,
      stages: [b.canary, MIDDLE, 1],
      bake: b.bake,
      flag: b.flag,
      threshold: b.threshold,
    }),
  );
export const runsOf = (b: Bench) => BENCH_CHANGES.map(c => benchRun(b, c.id));
export const hurtOf = (b: Bench) => runsOf(b).reduce((a, r) => a + r.hurt, 0);
/** Minutes from the start until the good change reached everyone; null if it never did. */
export const minutesOf = (b: Bench) => {
  const at = benchRun(b, GOOD.id).fullAt;
  return at === null ? null : at - START_AT;
};
export const meets = (b: Bench) => minutesOf(b) !== null && hurtOf(b) <= HURT_LIMIT;

/** Every plan the controls can make. */
export const BENCHES: Bench[] = CANARIES.flatMap(canary =>
  BAKES.flatMap(bake =>
    [false, true].flatMap(flag => THRESHOLDS.map(threshold => ({ canary, bake, flag, threshold }))),
  ),
);
/** Solves the bench from scratch: every plan that meets the rule and reaches everyone soonest. */
export function solve() {
  const passing = BENCHES.filter(meets);
  const best = Math.min(...passing.map(b => minutesOf(b)!));
  return { best, winners: passing.filter(b => minutesOf(b) === best) };
}

/** the pinned solution (KTD10): the test fails if solve() drifts from it */
export const BEST = pinned.workbench.best;
export const WINNERS = pinned.workbench.winners as Bench[];
export const wins = (b: Bench) => meets(b) && minutesOf(b) === BEST;

/** where the bench starts: a 5% canary, the longest bake, no flag, no check */
export const START: Bench = { canary: 0.05, bake: 10, flag: false, threshold: 0 };
const pick = (xs: number[], v: unknown, d: number) => (xs.includes(v as number) ? (v as number) : d);
/** The bench in a saved run's state; anything unknown falls back to START's. */
export const benchOf = (s: Partial<Bench>): Bench => ({
  canary: pick(CANARIES, s.canary, START.canary),
  bake: pick(BAKES, s.bake, START.bake),
  flag: typeof s.flag === 'boolean' ? s.flag : START.flag,
  threshold: pick(THRESHOLDS, s.threshold, START.threshold),
});
