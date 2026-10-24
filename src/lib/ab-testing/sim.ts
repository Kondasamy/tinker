// A/B testing's seeded visitor simulator (KTD11). Each day the same number of shoppers reaches every checkout (an arm),
// each buys with the arm's true rate and each order comes back with the arm's return rate, drawn with mulberry32 from the
// run's seed, so a seed always gives the same shoppers. A test is run over a fixed seed list to count false wins and
// power live: peeking and many comparisons show as rates, not formulas. Larkspur's traffic and rates are labelled
// assumptions (data/ab-testing/assumptions.json), never measurements.
import data from '../../../data/ab-testing/assumptions.json' with { type: 'json' };
import experiments from '../../../data/ab-testing/experiments.json' with { type: 'json' };
import { mulberry32 } from '../transformers/sample';
import { bonferroni, compare, sampleSize, type Comparison } from './stats';

export const ASSUMPTIONS = data;

export interface Arm {
  name: string;
  /** the true share of shoppers who buy */
  rate: number;
  /** the true share of orders that come back */
  returns: number;
}
export interface Plan {
  name: string;
  arms: Arm[];
  /** shoppers per arm per day */
  perDay: number;
  days: number;
  seed: number;
}
/** One day's running totals, an entry per arm. */
export interface Day {
  visitors: number[];
  orders: number[];
  returns: number[];
}
export type Run = Day[];

const planOf = (x: { name: string; arms: Arm[]; days: number; seed: number }): Plan => ({ ...x, perDay: data.perDay });
const S = experiments.scenarios;
export const COLOURS = S.colours.colours;
export const SCENARIOS = {
  checkout: planOf(S.checkout),
  aa: planOf(S.aa),
  small: planOf(S.small),
  colours: planOf({
    ...S.colours,
    arms: [...S.colours.arms, ...COLOURS.map(name => ({ ...S.colours.arms[0], name }))],
  }),
  hurry: planOf(S.hurry),
};
export interface Experiment extends Plan {
  id: string;
}
export const BENCH: Experiment[] = experiments.bench.map(e => ({ ...e, perDay: data.perDay }));
/** The seed list every repeated run uses: 1 to `repeats`. */
export const SEEDS = Array.from({ length: data.repeats }, (_, i) => i + 1);
/** Chapter 3's test lengths, in days: one, two, four, six and eight weeks. */
export const LENGTHS = [7, 14, 28, 42, 56] as const;
/** The shortest of them with enough shoppers per checkout to find the bigger button's true lift (Kohavi et al.'s rule). */
export const ENOUGH = LENGTHS.find(
  d =>
    d * SCENARIOS.small.perDay >=
    sampleSize(SCENARIOS.small.arms[0].rate, SCENARIOS.small.arms[1].rate - SCENARIOS.small.arms[0].rate),
)!;

/** How many of n trials succeed with chance p, by inversion: one uniform draw. */
function binomial(n: number, p: number, rand: () => number): number {
  if (p <= 0 || n <= 0) return 0;
  if (p >= 1) return n;
  const u = rand(),
    odds = p / (1 - p);
  let k = 0,
    pk = (1 - p) ** n,
    cdf = pk;
  while (u > cdf && k < n) {
    pk *= ((n - k) / (k + 1)) * odds;
    k++;
    cdf += pk;
  }
  return k;
}

/** A run of the plan: running totals at the end of each day. */
export function simulate(p: Plan): Run {
  const rand = mulberry32(p.seed),
    out: Run = [];
  const v = p.arms.map(() => 0),
    o = p.arms.map(() => 0),
    r = p.arms.map(() => 0);
  for (let d = 0; d < p.days; d++) {
    p.arms.forEach((arm, a) => {
      const orders = binomial(p.perDay, arm.rate, rand);
      v[a] += p.perDay;
      o[a] += orders;
      r[a] += binomial(orders, arm.returns, rand);
    });
    out.push({ visitors: [...v], orders: [...o], returns: [...r] });
  }
  return out;
}

const runs = new Map<string, Run>();
/** A plan's run, computed once per page. */
export function runOf(p: Plan): Run {
  const k = JSON.stringify([p.arms.map(a => [a.rate, a.returns]), p.perDay, p.days, p.seed]);
  if (!runs.has(k)) runs.set(k, simulate(p));
  return runs.get(k)!;
}

export type Metric = 'orders' | 'returns';
/** Arm `arm` against arm 0 at the end of day index t: orders per shopper, or returns per order. */
export function resultAt(r: Run, t: number, level: number, arm = 1, metric: Metric = 'orders'): Comparison {
  const d = r[Math.max(0, Math.min(t, r.length - 1))];
  return metric === 'orders'
    ? compare(d.visitors[0], d.orders[0], d.visitors[arm], d.orders[arm], level)
    : compare(d.orders[0], d.returns[0], d.orders[arm], d.returns[arm], level);
}

/** Checking every day and stopping at the first significant result: the day index it stops on, or null. */
export function peekResult(r: Run, level: number): { t: number; result: Comparison } | null {
  for (let t = 0; t < r.length; t++) {
    const result = resultAt(r, t, level);
    if (result.significant) return { t, result };
  }
  return null;
}

/** fixed: one look at the planned end; peek: a look every day, stopping at the first win; corrected: one look at the
 * end, each comparison held to the level divided by their number (Bonferroni). */
export type Mode = 'fixed' | 'peek' | 'corrected';
/** Whether a run declares any winner (in either direction) under the mode. */
export function declares(r: Run, arms: number, mode: Mode, level = data.level): boolean {
  if (mode === 'peek') return peekResult(r, level) !== null;
  const each = mode === 'corrected' ? bonferroni(level, arms - 1) : level;
  for (let a = 1; a < arms; a++) if (resultAt(r, r.length - 1, each, a).significant) return true;
  return false;
}

const rates = new Map<string, number>();
const over = (key: string, f: (seed: number) => boolean) => {
  if (!rates.has(key)) rates.set(key, SEEDS.filter(f).length / SEEDS.length);
  return rates.get(key)!;
};
/** The share of runs over the seed list that declare a winner: false wins when no arm truly differs. */
export const falseWinRate = (p: Plan, mode: Mode) =>
  over(`f|${mode}|${JSON.stringify({ ...p, seed: 0 })}`, seed => declares(runOf({ ...p, seed }), p.arms.length, mode));
/** The share of runs over the seed list whose planned end finds B significantly better: the test's power. */
const finds = (p: Plan, seed: number) => {
  const res = resultAt(runOf({ ...p, seed }), p.days - 1, data.level);
  return res.significant && res.diff > 0;
};
export const powerOf = (p: Plan) => over(`p|${JSON.stringify({ ...p, seed: 0 })}`, seed => finds(p, seed));
/** Every seed's run, true where it found B significantly better: the tally behind powerOf. */
export const findings = (p: Plan) => SEEDS.map(seed => finds(p, seed));
/** Every seed's verdict, for the tally of repeated runs: true where the run declared a winner. */
export const verdicts = (p: Plan, mode: Mode) =>
  SEEDS.map(seed => declares(runOf({ ...p, seed }), p.arms.length, mode));
