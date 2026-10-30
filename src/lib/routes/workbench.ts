// Finding the way chapter 7's workbench: an algorithm (fewest roads, Dijkstra or A*) and A*'s weight, run over the day
// of deliveries in data/routes/deliveries.json, each under its own closures and jams. A setting meets the rule when
// the day's minutes are within the slack of the fastest possible; it scores the junctions looked at, fewer is better.
// The puzzle accepts every setting that meets the rule with the fewest (WINNERS, pinned in data/routes/pinned.json;
// tests/unit/routes-workbench.test.ts solves it again and must get the pin, KTD7).
import day from '../../../data/routes/deliveries.json' with { type: 'json' };
import pinned from '../../../data/routes/pinned.json' with { type: 'json' };
import { astar, type Search } from './astar';
import { bfs } from './bfs';
import { DEPOT, type Edits } from './graph';

export type Algo = 'bfs' | 'dijkstra' | 'astar';
export const ALGOS: Algo[] = ['bfs', 'dijkstra', 'astar'];
export const ALGO_NAME: Record<Algo, string> = { bfs: 'Fewest roads', dijkstra: 'Dijkstra', astar: 'A*' };
export const WEIGHTS = [1, 1.5, 2, 3];
export interface Bench {
  algo: Algo;
  /** A*'s weight; the others ignore it */
  weight: number;
}
export interface Delivery extends Edits {
  to: string;
  at: string;
}
export const DELIVERIES = day.deliveries as Delivery[];
export const SLACK = day.slack;
export const RULE = day.rule;
export const DAY_NOTE = day.note;

/** One search under a setting. */
export function route(b: Bench, e: Edits = {}, to?: string): Search {
  if (b.algo === 'bfs') return bfs(e, DEPOT, to);
  return astar(b.algo === 'astar' ? b.weight : 0, e, DEPOT, to);
}
/** The whole day under a setting: each delivery's search, and the day's minutes and junctions looked at. */
export function dayOf(b: Bench) {
  const runs = DELIVERIES.map(d => route(b, d, d.to));
  return {
    runs,
    minutes: runs.reduce((s, r) => s + r.minutes, 0),
    looked: runs.reduce((s, r) => s + r.looked, 0),
  };
}
export const FASTEST = dayOf({ algo: 'dijkstra', weight: 1 }).minutes;
export const meets = (b: Bench) => dayOf(b).minutes <= FASTEST + SLACK;

/** Every setting the controls can make (the weight only counts for A*). */
export const BENCHES: Bench[] = [
  { algo: 'bfs', weight: 1 },
  { algo: 'dijkstra', weight: 1 },
  ...WEIGHTS.map(weight => ({ algo: 'astar' as const, weight })),
];
/** Solves the bench from scratch: every setting that meets the rule with the fewest junctions looked at. */
export function solve() {
  const passing = BENCHES.filter(meets);
  const best = Math.min(...passing.map(b => dayOf(b).looked));
  return { best, winners: passing.filter(b => dayOf(b).looked === best) };
}

/** the pinned solution (KTD7): the test fails if solve() drifts from it */
export const BEST = pinned.workbench.best;
export const WINNERS = pinned.workbench.winners as Bench[];
export const wins = (b: Bench) => meets(b) && dayOf(b).looked === BEST;

/** where the bench starts: Dijkstra, the exact one */
export const START: Bench = { algo: 'dijkstra', weight: 1 };
/** The bench in a saved run's state; anything unknown falls back to START's. */
export const benchOf = (s: Partial<Bench>): Bench => ({
  algo: ALGOS.includes(s.algo as Algo) ? (s.algo as Algo) : START.algo,
  weight: WEIGHTS.includes(s.weight as number) ? (s.weight as number) : START.weight,
});
