// The trade-account check's model (KTD6): a logistic regression over an applicant's fields, giving the chance they
// repay. fit() is plain batch gradient descent from zero weights, a fixed number of rounds over the rows in a fixed
// order, in float64, so the same applicants always give the same weights. It runs in tests only: the browser reads the
// pinned weights (data/fairness/weights.json) and never fits (R3); tests/unit/fairness-engine fits again and fails
// on drift (WRITE_PINNED=1 rewrites it).
import pinned from '../../../data/fairness/weights.json' with { type: 'json' };
import { HILL, type Applicant } from './population';

/** Which fields the check may read: everything, everything but the region, or neither region nor postcode. */
export type Features = 'all' | 'no-region' | 'neither';
export const FEATURE_SETS: Features[] = ['all', 'no-region', 'neither'];
/** The sample fix: none, or region B's rows counted three times, so both regions weigh the same in the fit. */
export type Fix = 'none' | 'reweight';
export const FIXES: Fix[] = ['none', 'reweight'];
export const B_WEIGHT = 3;

/** The weights' names, in order: a constant, then one per field (scaled to about one unit). */
export const TERMS = ['constant', 'years', 'late', 'orders', 'postcode', 'region'] as const;
export const ITERS = 3000;
export const RATE = 0.5;

/** One applicant's inputs: years and orders in tens, the postcode and region as 1 for river / B. Fields the set
 * leaves out read 0, so their weights stay 0. */
export function inputs(a: Applicant, f: Features): number[] {
  return [
    1,
    a.years / 10,
    a.late,
    a.orders / 10,
    f === 'neither' || HILL.includes(a.postcode) ? 0 : 1,
    f !== 'all' || a.region === 'A' ? 0 : 1,
  ];
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/** Weights that best predict who repaid, from the given fields, with the given sample fix. */
export function fit(rows: Applicant[], f: Features, fix: Fix = 'none'): number[] {
  const xs = rows.map(a => inputs(a, f)),
    ws = rows.map(a => (fix === 'reweight' && a.region === 'B' ? B_WEIGHT : 1));
  const total = ws.reduce((s, w) => s + w, 0);
  const w = TERMS.map(() => 0);
  for (let it = 0; it < ITERS; it++) {
    const g = TERMS.map(() => 0);
    for (let i = 0; i < rows.length; i++) {
      const x = xs[i],
        err = sigmoid(x.reduce((s, v, j) => s + v * w[j], 0)) - rows[i].repaid;
      for (let j = 0; j < w.length; j++) g[j] += ws[i] * err * x[j];
    }
    for (let j = 0; j < w.length; j++) w[j] -= (RATE * g[j]) / total;
  }
  return w;
}

export type Weights = Record<Features, Record<Fix, number[]>>;
/** The pinned weights for every field set and sample fix. */
export const WEIGHTS = pinned as Weights;

/** An applicant's chance of repaying, as the check scores it. */
export const scoreOf = (a: Applicant, f: Features = 'all', fix: Fix = 'none', w = WEIGHTS[f][fix]) =>
  sigmoid(inputs(a, f).reduce((s, v, j) => s + v * w[j], 0));
