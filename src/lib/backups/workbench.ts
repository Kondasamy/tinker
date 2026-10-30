// Backups chapter 7's workbench: how often (every 24, 12, 6 or 1 hours), full or incremental copies, and where they go
// (the server room's cabinet, plus the warehouse, the lockbox or both): 32 plans, each run over the week against the
// three disasters in data/backups/disasters.json `bench`. A plan meets the rule (data/backups/workbench.json) when
// every disaster loses at most `maxLost` orders and is back within `maxDown` hours; it scores its week's cost, lower is
// better. The puzzle accepts every plan that meets the rule at the lowest cost (WINNERS), read from
// data/backups/pinned.json; tests/unit/backups-workbench.test.ts solves the bench again and must get the pin (KTD7).
import data from '../../../data/backups/workbench.json' with { type: 'json' };
import pinned from '../../../data/backups/pinned.json' with { type: 'json' };
import { BENCH_STRIKES, policyOf, restore, weekOf } from './sim';

export const MAX_LOST = data.maxLost;
export const MAX_DOWN = data.maxDown;
export const RULE = data.rule;
export const REASONS = data.reasons;
export const EVERIES = [24, 12, 6, 1];
export type Places = 'room' | 'warehouse' | 'lockbox' | 'both';
export const PLACE_SETS: Places[] = ['room', 'warehouse', 'lockbox', 'both'];
export const PLACE_NAME: Record<Places, string> = {
  room: 'Server room only',
  warehouse: 'Plus the warehouse',
  lockbox: 'Plus the lockbox',
  both: 'Plus warehouse and lockbox',
};

/** What the bench's controls set. */
export interface Bench {
  every: number;
  incremental: boolean;
  places: Places;
}
export const weekFor = (b: Bench) =>
  weekOf(
    policyOf({
      every: b.every,
      incremental: b.incremental,
      warehouse: b.places === 'warehouse' || b.places === 'both',
      lockbox: b.places === 'lockbox' || b.places === 'both',
    }),
  );
/** The bench's three disasters, each restored from this plan's week. */
export const resultsOf = (b: Bench) => {
  const week = weekFor(b);
  return BENCH_STRIKES.map(s => restore(week, s));
};
export const costOf = (b: Bench) => weekFor(b).cost;
export const meets = (b: Bench) => resultsOf(b).every(r => r.down !== null && r.lost <= MAX_LOST && r.down <= MAX_DOWN);

/** Every plan the controls can make. */
export const BENCHES: Bench[] = EVERIES.flatMap(every =>
  [false, true].flatMap(incremental => PLACE_SETS.map(places => ({ every, incremental, places }))),
);
/** Solves the bench from scratch: every plan that meets the rule at the lowest cost. */
export function solve() {
  const passing = BENCHES.filter(meets);
  const best = Math.min(...passing.map(costOf));
  return { best, winners: passing.filter(b => costOf(b) === best) };
}

/** the pinned solution (KTD7): the test fails if solve() drifts from it */
export const BEST = pinned.workbench.best;
export const WINNERS = pinned.workbench.winners as Bench[];
export const wins = (b: Bench) => meets(b) && costOf(b) === BEST;

/** where the bench starts: nightly full copies in the server room */
export const START: Bench = { every: 24, incremental: false, places: 'room' };
/** The bench in a saved run's state; anything unknown falls back to START's. */
export const benchOf = (s: Partial<Bench>): Bench => ({
  every: EVERIES.includes(s.every as number) ? (s.every as number) : START.every,
  incremental: typeof s.incremental === 'boolean' ? s.incremental : START.incremental,
  places: PLACE_SETS.includes(s.places as Places) ? (s.places as Places) : START.places,
});
