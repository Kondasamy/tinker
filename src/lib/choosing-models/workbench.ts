// Chapter 7's workbench (KTD7, KTD8): one set of poise weights per Larkspur team. A team's machine is the one that meets
// every need in data/choosing-models/workbench.json (quality, price per 1,000, wait); the bench is solved when every
// team's steelyard tips to its machine. WINNERS (every winning weight set, per team) are pinned in pinned.json and
// solve() recomputes them in a test, never at import.
import bench from '../../../data/choosing-models/workbench.json' with { type: 'json' };
import pinned from '../../../data/choosing-models/pinned.json' with { type: 'json' };
import { IDS, machineOf, type MachineId } from './machines';
import { per1000, wholeReply } from './price';
import { CRITERIA, MAX_WEIGHT, WEIGHTS, weigh, type Row, type Weights } from './score';

export type TeamId = 'support' | 'warehouse' | 'catalogue';
export interface Team {
  id: TeamId;
  name: string;
  job: string;
  quality: Record<MachineId, number>;
  tokensIn: number;
  tokensOut: number;
  words: number;
  needs: { quality: number; price: number; wait: number };
}
export const TEAMS = bench.teams as Team[];
export const BENCH_NOTE = bench.note;
export const teamOf = (id: TeamId) => TEAMS.find(t => t.id === id)!;

/** A team's rows: its own quality, its request's price per 1,000 and wait. */
export const teamRows = (t: Team): Row[] =>
  IDS.map(id => {
    const m = machineOf(id);
    return { id, quality: t.quality[id], price: per1000(m, t), wait: wholeReply(m, t), first: m.ttft };
  });
/** Whether a row meets every one of the team's needs. */
export const meets = (t: Team, r: Row) =>
  r.quality >= t.needs.quality - 1e-9 && r.price <= t.needs.price + 1e-9 && r.wait <= t.needs.wait + 1e-9;
/** The machines that meet every need (the data gives each team exactly one: tested). */
export const fitsOf = (t: Team) =>
  teamRows(t)
    .filter(r => meets(t, r))
    .map(r => r.id);
export const fitOf = (t: Team) => fitsOf(t)[0];

/** Every weight set the poises can make. */
export const ALL_WEIGHTS: Weights[] = WEIGHTS.flatMap(quality =>
  WEIGHTS.flatMap(cost => WEIGHTS.map(wait => ({ quality, cost, wait }))),
);
export const tipsTo = (t: Team, w: Weights) => weigh(teamRows(t), w).winner;
export const teamWins = (t: Team, w: Weights) => tipsTo(t, w) === fitOf(t);

/** Solves the bench from scratch: per team, every weight set that tips to the team's machine. */
export const solve = () =>
  Object.fromEntries(TEAMS.map(t => [t.id, ALL_WEIGHTS.filter(w => teamWins(t, w))])) as Record<TeamId, Weights[]>;

export type Bench = Record<TeamId, Weights>;
/** the pinned solution: the test fails if solve() drifts from it */
export const WINNERS = pinned.workbench.winners as Record<TeamId, Weights[]>;
const same = (a: Weights, b: Weights) => CRITERIA.every(c => a[c] === b[c]);
export const wins = (b: Bench) => TEAMS.every(t => WINNERS[t.id].some(w => same(w, b[t.id])));
/** Show me: each team's first winning set. */
export const SOLVED = Object.fromEntries(TEAMS.map(t => [t.id, WINNERS[t.id][0]])) as Bench;

/** The leaderboard habit: quality only, for every team. */
export const START_WEIGHTS: Weights = { quality: MAX_WEIGHT, cost: 0, wait: 0 };
export const START: Bench = Object.fromEntries(TEAMS.map(t => [t.id, START_WEIGHTS])) as Bench;
const pick = (v: unknown, d: number) => (WEIGHTS.includes(v as number) ? (v as number) : d);
/** A saved run's bench; anything unknown falls back to START's. */
export const benchOf = (b: Partial<Record<TeamId, Partial<Weights>>> | undefined): Bench =>
  Object.fromEntries(
    TEAMS.map(t => [
      t.id,
      Object.fromEntries(CRITERIA.map(c => [c, pick(b?.[t.id]?.[c], START_WEIGHTS[c])])) as Weights,
    ]),
  ) as Bench;
