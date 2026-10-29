// Fairness's measures (KTD6), pure and live: the check approves an applicant whose score is at or above the bar;
// approving someone who repaid is right, declining them is a false decline. Counted group by group, as Hardt, Price and
// Srebro (2016) and Chouldechova (2017) do: the false-decline rate (repaid but turned down), the false-approve rate
// (didn't repay but approved) and precision (of those approved, the share who repaid).
import type { Applicant, Region } from './population';

export const REGIONS: Region[] = ['A', 'B'];
/** The bar's steps: 0.00 to 1.00 in hundredths (the search grid; chapter ranges step over a subset). */
export const GRID = Array.from({ length: 101 }, (_, i) => i / 100);

export interface Counts {
  n: number;
  /** repaid and approved */
  tp: number;
  /** didn't repay, approved */
  fp: number;
  /** repaid, declined: a false decline */
  fn: number;
  /** didn't repay, declined */
  tn: number;
}
export interface Rates extends Counts {
  /** share who repaid (the base rate) */
  base: number;
  approved: number;
  /** wrong decisions of all */
  error: number;
  /** repaid but declined, of those who repaid */
  falseDecline: number;
  /** didn't repay but approved, of those who didn't */
  falseApprove: number;
  /** repaid, of those approved; null when nobody is approved */
  precision: number | null;
}

/** Count one group's decisions at bar `t` from each row's score. */
export function countsOf(rows: Applicant[], scores: number[], t: number): Counts {
  const c: Counts = { n: rows.length, tp: 0, fp: 0, fn: 0, tn: 0 };
  rows.forEach((a, i) => {
    const yes = scores[i] >= t;
    if (a.repaid) yes ? c.tp++ : c.fn++;
    else yes ? c.fp++ : c.tn++;
  });
  return c;
}

const share = (a: number, b: number) => (b ? a / b : 0);
export function ratesOf(c: Counts): Rates {
  return {
    ...c,
    base: share(c.tp + c.fn, c.n),
    approved: share(c.tp + c.fp, c.n),
    error: share(c.fp + c.fn, c.n),
    falseDecline: share(c.fn, c.tp + c.fn),
    falseApprove: share(c.fp, c.fp + c.tn),
    precision: c.tp + c.fp ? c.tp / (c.tp + c.fp) : null,
  };
}

const add = (a: Counts, b: Counts): Counts => ({
  n: a.n + b.n,
  tp: a.tp + b.tp,
  fp: a.fp + b.fp,
  fn: a.fn + b.fn,
  tn: a.tn + b.tn,
});

export type Bars = Record<Region, number>;
/** Every group's rates and the overall ones, at a bar per group, from each applicant's score. */
export function measure(rows: Applicant[], scores: number[], bars: Bars) {
  const by = Object.fromEntries(
    REGIONS.map(r => {
      const idx = rows.flatMap((a, i) => (a.region === r ? [i] : []));
      return [
        r,
        countsOf(
          idx.map(i => rows[i]),
          idx.map(i => scores[i]),
          bars[r],
        ),
      ];
    }),
  ) as Record<Region, Counts>;
  return {
    A: ratesOf(by.A),
    B: ratesOf(by.B),
    all: ratesOf(add(by.A, by.B)),
  };
}
export type Measured = ReturnType<typeof measure>;

/** The gap between the groups' false-decline rates, B less A. */
export const gapOf = (m: Measured) => m.B.falseDecline - m.A.falseDecline;

/** Within `tol` on precision, false-approve and false-decline at once (KTD6's "every kind"); no approvals never is. */
export function allEqual(m: Measured, tol = 0.01) {
  if (m.A.precision === null || m.B.precision === null) return false;
  return (
    Math.abs(m.A.precision - m.B.precision) <= tol &&
    Math.abs(m.A.falseApprove - m.B.falseApprove) <= tol &&
    Math.abs(m.A.falseDecline - m.B.falseDecline) <= tol
  );
}

/** The trivial way out: bars so high that neither group has a wrong approval, so precision is 1 and false-approve 0 in
 * both, and only false declines are left to match. Chouldechova's (2017) relation, FPR = p/(1−p) · (1−PPV)/PPV ·
 * (1−FNR), allows equal everything with unequal base rates only there. */
export const trivial = (m: Measured) => m.A.precision === 1 && m.B.precision === 1;
