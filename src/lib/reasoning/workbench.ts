// Chapter 7's workbench: an effort per kind of request, a finite domain of 4^kinds plans. Each plan is read off the
// recorded answers, graded live: right answers, cost (thinking and answer tokens, relative units) and average wait.
// The best plans get the most right answers at the lowest cost; every plan tied for that wins (WINNERS, computed over
// the whole domain), not one hand-picked answer.
import { EFFORTS, KINDS, ofKind, run, type Effort, type KindId } from './engine';

export type Plan = Record<KindId, Effort>;
export const KIND_IDS = KINDS.map((k) => k.id);

/** A plan's result: one row per question, then the totals. */
export function totals(plan: Plan) {
  const rows = KINDS.flatMap((k) => ofKind(k.id).map((q) => ({ kind: k.id, ...run(q.id, plan[k.id]) })));
  const right = rows.filter((r) => r.right).length, cost = rows.reduce((n, r) => n + r.cost, 0);
  return { rows, right, of: rows.length, cost, wait: rows.reduce((n, r) => n + r.wait, 0) / rows.length };
}

/** Every plan the bench can make. */
export const PLANS: Plan[] = KIND_IDS.reduce<Plan[]>((ps, k) => ps.flatMap((p) => EFFORTS.map((e) => ({ ...p, [k]: e }))), [{} as Plan]);
const ALL = PLANS.map((p) => ({ p, t: totals(p) }));
/** The most right answers any plan gets, and the lowest cost among the plans that get them. */
export const MOST_RIGHT = Math.max(...ALL.map((x) => x.t.right));
export const LEAST_COST = Math.min(...ALL.filter((x) => x.t.right === MOST_RIGHT).map((x) => x.t.cost));
export const solved = (p: Plan) => { const t = totals(p); return t.right === MOST_RIGHT && t.cost === LEAST_COST; };
/** Every plan tied for best. */
export const WINNERS = ALL.filter((x) => x.t.right === MOST_RIGHT && x.t.cost === LEAST_COST).map((x) => x.p);
