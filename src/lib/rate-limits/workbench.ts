// Rate limits chapter 7's workbench: barrel size (5, 10, 20, 40), drip per second (2, 5, 10, 20) and one shared barrel
// or one per partner key, 32 settings, each run over the hand-made sale-day trace. A setting meets the team's rule
// (data/rate-limits/workbench.json) when the server never falls over and no quiet partner loses a request. The puzzle
// accepts every setting that meets it (WINNERS), read from data/rate-limits/pinned.json; the workbench test solves the
// bench again and must get the pin (KTD7).
import data from '../../../data/rate-limits/workbench.json' with { type: 'json' };
import pinned from '../../../data/rate-limits/pinned.json' with { type: 'json' };
import { isQuiet, keysOf, runOf, tally, type Run } from './sim';

export const RULE = data.rule;
export const REASONS = data.reasons;
export const SIZES = [5, 10, 20, 40];
export const DRIPS = [2, 5, 10, 20];

export interface Bench {
  size: number;
  refill: number;
  perKey: boolean;
}
export const benchRun = (b: Bench): Run =>
  runOf({ trace: 'sale', limiter: { kind: 'bucket', size: b.size, refill: b.refill, perKey: b.perKey } });

/** Requests each quiet partner lost (429 or a fallen server), by key. */
export const lostOf = (r: Run) =>
  keysOf(r)
    .filter(isQuiet)
    .map(k => {
      const t = tally(r, 0, r.ms + 1, k);
      return { key: k, lost: t.limited + t.down };
    });
export const meets = (b: Bench) => {
  const r = benchRun(b);
  return r.downs.length === 0 && lostOf(r).every(x => x.lost === 0);
};

export const BENCHES: Bench[] = [false, true].flatMap(perKey =>
  SIZES.flatMap(size => DRIPS.map(refill => ({ size, refill, perKey }))),
);
/** Solves the bench from scratch: every setting that meets the rule. */
export const solve = () => BENCHES.filter(meets);

/** the pinned solution (KTD7): the test fails if solve() drifts from it */
export const WINNERS = pinned.workbench.winners as Bench[];
export const wins = (b: Bench) =>
  WINNERS.some(w => w.size === b.size && w.refill === b.refill && w.perKey === b.perKey);

/** where the bench starts: today's one shared barrel */
export const START: Bench = { size: 10, refill: 5, perKey: false };
const pick = (xs: number[], v: unknown, d: number) => (xs.includes(v as number) ? (v as number) : d);
/** The bench in a saved run's state; anything unknown falls back to START's. */
export const benchOf = (s: Partial<Bench>): Bench => ({
  size: pick(SIZES, s.size, START.size),
  refill: pick(DRIPS, s.refill, START.refill),
  perKey: typeof s.perKey === 'boolean' ? s.perKey : START.perKey,
});
