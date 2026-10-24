// Databases chapter 7's workbench: a set of indexes on the orders table (any of the five, 32 sets). The day's requests
// (data/databases/workload.json, Larkspur's estimates) run through the planner and count their pages; the day's new
// orders count what each index adds to a write. A set must keep the writes within the team's budget; the puzzle accepts
// every set within it that reads the fewest pages (WINNERS), not one hand-picked answer.
import workload from '../../../data/databases/workload.json' with { type: 'json' };
import { INDEXES, query, writeDay, type IndexName, type Query } from './planner';
import { MONTH, REGULAR, STATUSES, TODAY } from './table';

export const BUDGET = workload.budget;
export const BUDGET_WHY = workload.budgetWhy;
export const INSERTS = workload.inserts;

/** A workload value: a number, or a name for one of the table's own (the regular, today, this month, a status). */
const resolve = (v: number | string): number | [number, number] =>
  typeof v === 'number'
    ? v
    : v === 'regular'
      ? REGULAR
      : v === 'today'
        ? [TODAY, TODAY]
        : v === 'month'
          ? MONTH
          : STATUSES.indexOf(v as (typeof STATUSES)[number]);
export interface Read {
  id: string;
  name: string;
  perDay: number;
  query: Query;
}
export const READS: Read[] = workload.reads.map(r => ({
  id: r.id,
  name: r.name,
  perDay: r.perDay,
  query: { where: Object.fromEntries(Object.entries(r.where).map(([c, v]) => [c, resolve(v)])) },
}));

export const SETS: IndexName[][] = Array.from({ length: 2 ** INDEXES.length }, (_, m) =>
  INDEXES.filter((_, i) => m & (1 << i)),
);
/** One request's pages under a set of indexes (the planner's pick, run). */
export const pagesOf = (r: Read, set: readonly IndexName[]) => query(r.query, set).pages;
export const readPages = (set: readonly IndexName[]) => READS.reduce((a, r) => a + r.perDay * pagesOf(r, set), 0);
export const writePages = (set: readonly IndexName[]) => writeDay(set);
export const within = (set: readonly IndexName[]) => writePages(set) <= BUDGET;

const ok = SETS.filter(within);
export const BEST = Math.min(...ok.map(readPages));
export const WINNERS = ok.filter(s => readPages(s) === BEST);
const norm = (s: readonly IndexName[]) => INDEXES.filter(i => s.includes(i));
export const wins = (s: readonly IndexName[]) => WINNERS.some(w => w.join() === norm(s).join());

/** where the bench starts: no indexes at all */
export const START: IndexName[] = [];
/** The set in a saved run's state, unknown names dropped. */
export const benchSet = (x: unknown): IndexName[] =>
  Array.isArray(x) ? INDEXES.filter(i => x.includes(i)) : [...START];
