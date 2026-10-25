// Git chapter 7's workbench: bring three branches into main. A plan picks, for each branch, merge or rebase, and the
// order they come in: 2³ × 3! = 48 plans, each run for real on the repo. The owner's rule: never rewrite a commit
// others have (data/git/workbench.json `shared`). Among plans that keep it, the best meets the fewest conflicts, then
// leaves the shortest history on main. WINNERS (every plan tied for best) is pinned in data/git/pinned.json and
// recomputed by tests/unit/git-workbench.test.ts, so nothing is solved at import (KTD12).
import data from '../../../data/git/workbench.json' with { type: 'json' };
import pinned from '../../../data/git/pinned.json' with { type: 'json' };
import { grow, history, mergeInto, rebaseOnto, type BranchId, type Repo, type Who } from './graph';
import { BASE } from './story';

export const BENCH = data.branches as BranchId[];
export const SHARED = data.shared as BranchId[];
export const INTEGRATOR = data.integrator as Who;
export const WAYS = ['merge', 'rebase'] as const;
export type Way = (typeof WAYS)[number];
export interface Plan {
  ways: Record<string, Way>;
  order: BranchId[];
}

/** main with the three branches waiting, each made from main's commit */
export const WAITING: Repo = BENCH.reduce((r, b) => grow(r, b), BASE);

const perms = <T>(xs: T[]): T[][] =>
  xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p]));
export const ORDERS = perms(BENCH);
/** Every plan the controls can make. */
export const PLANS: Plan[] = ORDERS.flatMap(order =>
  WAYS.flatMap(a =>
    WAYS.flatMap(b => WAYS.map(c => ({ order, ways: Object.fromEntries(BENCH.map((k, i) => [k, [a, b, c][i]])) }))),
  ),
);

export interface Row {
  branch: BranchId;
  way: Way;
  /** what happened: a fast-forward, a merge commit, or commits replayed */
  kind: 'ff' | 'merge' | 'replayed';
  conflicts: number;
  /** commits this branch added to main's history */
  added: number;
  /** a commit others have was given a new hash */
  rewroteShared: boolean;
}
export interface Result {
  rows: Row[];
  conflicts: number;
  /** commits on main, all told */
  length: number;
  keepsRule: boolean;
  repo: Repo;
}

/** Run a plan: each branch in order, merged into main or rebased onto it (then main moves up to it). */
export function runPlan(p: Plan): Result {
  let r = WAITING;
  const rows: Row[] = [];
  for (const b of p.order) {
    const before = history(r, 'main').length,
      way = p.ways[b];
    let conflicts = 0,
      kind: Row['kind'] = 'ff',
      rewrote = false;
    if (way === 'rebase') {
      const rb = rebaseOnto(r, b, 'main', INTEGRATOR);
      conflicts = rb.conflicts;
      rewrote = rb.rewritten.length > 0;
      if (rewrote) kind = 'replayed';
      r = mergeInto(rb.repo, 'main', b, INTEGRATOR).repo;
    } else {
      const m = mergeInto(r, 'main', b, INTEGRATOR);
      conflicts = m.merged?.conflicts.length ?? 0;
      if (m.kind === 'merge') kind = 'merge';
      r = m.repo;
    }
    rows.push({
      branch: b,
      way,
      kind,
      conflicts,
      added: history(r, 'main').length - before,
      rewroteShared: rewrote && SHARED.includes(b),
    });
  }
  return {
    rows,
    conflicts: rows.reduce((a, x) => a + x.conflicts, 0),
    length: history(r, 'main').length,
    keepsRule: rows.every(x => !x.rewroteShared),
    repo: r,
  };
}

/** Lower is better: conflicts first, then history length. */
const score = (x: Result) => x.conflicts * 1000 + x.length;
/** Every plan that keeps the rule with the best score: computed over the whole domain (the test checks the pin). */
export function solve(): Plan[] {
  const ok = PLANS.map(p => [p, runPlan(p)] as const).filter(([, x]) => x.keepsRule);
  const best = Math.min(...ok.map(([, x]) => score(x)));
  return ok.filter(([, x]) => score(x) === best).map(([p]) => p);
}

export const planKey = (p: Plan) => `${p.order.join('>')}|${BENCH.map(b => `${b}:${p.ways[b]}`).join(',')}`;
/** The pinned winners. */
export const WINNERS: Plan[] = pinned.winners.map(k => {
  const [o, w] = k.split('|');
  return {
    order: o.split('>') as BranchId[],
    ways: Object.fromEntries(w.split(',').map(x => x.split(':'))) as Record<string, Way>,
  };
});
const WIN = new Set(pinned.winners);
export const wins = (p: Plan) => WIN.has(planKey(p));
/** The best score's two numbers, read off the first winner. */
export const BEST = runPlan(WINNERS[0]);

/** where the bench starts: every branch merged, in the order they were made */
export const START: Plan = { order: [...BENCH], ways: Object.fromEntries(BENCH.map(b => [b, 'merge'])) };
/** The plan in a saved run's state; anything unknown falls back to START's. */
export function benchPlan(s: Partial<Plan>): Plan {
  const order =
    Array.isArray(s.order) && ORDERS.some(o => o.join() === s.order!.join()) ? (s.order as BranchId[]) : START.order;
  const ways = Object.fromEntries(
    BENCH.map(b => [b, WAYS.includes(s.ways?.[b] as Way) ? (s.ways![b] as Way) : START.ways[b]]),
  );
  return { order: [...order], ways };
}
