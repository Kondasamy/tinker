// Chapter 7's workbench: a method and a size per kind of document, a finite domain of 10^kinds plans. Each plan is read off
// the recorded readings, graded live field by field: fields right, and cost (the tokens the model reads). The best plans
// get the most fields right at the lowest cost; every plan tied for that wins (WINNERS), not one hand-picked answer.
import { DOCS, METHODS, SIZES, costOf, grade, type Method, type Size } from './readings';
import type { ImageId } from './images';

export interface Choice {
  method: Method;
  size: Size;
}
export type Plan = Record<string, Choice>;
export const KIND_IDS: ImageId[] = DOCS;
export const CHOICES: Choice[] = METHODS.flatMap(method => SIZES.map(size => ({ method, size })));

/** A plan's result: one row per document, then the totals. */
export function totals(plan: Plan) {
  const rows = KIND_IDS.map(im => {
    const { method, size } = plan[im],
      g = grade(im, size, method);
    return { image: im, method, size, right: g.right, of: g.of, cost: costOf(im, size, method), note: g.reading.note };
  });
  return {
    rows,
    right: rows.reduce((n, r) => n + r.right, 0),
    of: rows.reduce((n, r) => n + r.of, 0),
    cost: rows.reduce((n, r) => n + r.cost, 0),
  };
}

/** Every plan the bench can make. */
export const PLANS: Plan[] = KIND_IDS.reduce<Plan[]>(
  (ps, k) => ps.flatMap(p => CHOICES.map(c => ({ ...p, [k]: c }))),
  [{}],
);
const ALL = PLANS.map(p => ({ p, t: totals(p) }));
export const MOST_RIGHT = Math.max(...ALL.map(x => x.t.right));
export const LEAST_COST = Math.min(...ALL.filter(x => x.t.right === MOST_RIGHT).map(x => x.t.cost));
export const solved = (p: Plan) => {
  const t = totals(p);
  return t.right === MOST_RIGHT && t.cost === LEAST_COST;
};
/** Every plan tied for best. */
export const WINNERS = ALL.filter(x => x.t.right === MOST_RIGHT && x.t.cost === LEAST_COST).map(x => x.p);
