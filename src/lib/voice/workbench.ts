// Chapter 7's workbench: tune the line over every call. A plan is the detector (threshold, silence) and three host rules
// (streaming, barge-in, read-back): a finite domain of 3 × 4 × 2 × 2 × 2 plans. Each call is run live over the
// committed envelopes and its recording; a plan's score is its calls with a problem (cut off, dead air, wrong, talked
// over), then the total wait. Every plan tied for the best wins (WINNERS), not one hand-picked answer.
import { CALLS, runCall, type Line } from './engine';
import { SILENCES, THRESHOLDS } from './turns';

export type Plan = Omit<Line, 'point'>;
export const asLine = (p: Plan): Line => ({ ...p, point: 'stop-3' });

/** A plan's result: a row per call, then the totals. */
export function totals(p: Plan) {
  const rows = CALLS.map(c => runCall(c.id, asLine(p)));
  return {
    rows,
    problems: rows.filter(r => r.problem).length,
    cutOffs: rows.filter(r => r.problem === 'cut-off').length,
    deadAir: rows.filter(r => r.problem === 'dead air').length,
    errors: rows.filter(r => r.problem === 'wrong' || r.problem === 'talked-over').length,
    wait: rows.reduce((n, r) => n + (r.wait ?? 0), 0),
  };
}

const BOOLS = [false, true];
/** Every plan the bench can make. */
export const PLANS: Plan[] = THRESHOLDS.flatMap(threshold =>
  SILENCES.flatMap(silence =>
    BOOLS.flatMap(streaming =>
      BOOLS.flatMap(bargeIn => BOOLS.map(readBack => ({ threshold, silence, streaming, bargeIn, readBack }))),
    ),
  ),
);
const ALL = PLANS.map(p => ({ p, t: totals(p) }));
/** The fewest problems any plan has, and the least total wait among the plans that reach it. */
export const FEWEST = Math.min(...ALL.map(x => x.t.problems));
export const LEAST_WAIT = Math.min(...ALL.filter(x => x.t.problems === FEWEST).map(x => x.t.wait));
export const solved = (p: Plan) => {
  const t = totals(p);
  return t.problems === FEWEST && t.wait === LEAST_WAIT;
};
/** Every plan tied for best. */
export const WINNERS = ALL.filter(x => x.t.problems === FEWEST && x.t.wait === LEAST_WAIT).map(x => x.p);
