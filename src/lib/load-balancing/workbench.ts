// Load balancing chapter 7's workbench: route the sale. Cedar dies and Dogwood turns slow but answering as the sale
// starts; carts live in a shared store now (chapter 5), so stickiness is off. A policy is a rule, a health-check miss
// count and a hedge wait, each over its finite list (4 × 4 × 4). It passes when no customer gives up and the extra copies
// stay within the team's budget (data/load-balancing/workbench.json), and scores its p99 in whole ms. The puzzle accepts
// every passing policy tied for the lowest (WINNERS, pinned in the same file and recomputed in a test).
import data from '../../../data/load-balancing/workbench.json' with { type: 'json' };
import { HEDGES, MISSES, policyOf, runOf, type Policy, type Result, type ServerState } from './sim';
import { RULES, type Rule } from './rules';

export const LIMITS = data.limits;
export const TROUBLE = data.states as Record<string, ServerState>;

/** What the bench's controls set. */
export interface Bench {
  rule: Rule;
  checks: number;
  hedgeMs: number;
}
export const START: Bench = { rule: 'round-robin', checks: 0, hedgeMs: 0 };
export const benchPolicy = (b: Bench): Policy => policyOf({ ...b, states: TROUBLE });
/** A saved run's bench, anything unknown falling back to START's. */
export const benchOf = (s: Partial<Bench>): Bench => ({
  rule: RULES.includes(s.rule as Rule) ? (s.rule as Rule) : START.rule,
  checks: MISSES.includes(s.checks as number) ? (s.checks as number) : START.checks,
  hedgeMs: HEDGES.includes(s.hedgeMs as number) ? (s.hedgeMs as number) : START.hedgeMs,
});

/** Copies sent beyond one per request, as a share of the requests. */
export const extraShare = (r: Result) => (r.sent - r.served.length) / r.served.length;
export const meets = (r: Result) => r.failed <= LIMITS.failed && extraShare(r) <= LIMITS.extraShare;
export const scoreOf = (r: Result) => Math.round(r.p99);
export const runBench = (b: Bench) => runOf(benchPolicy(b));

/** Every bench the controls can make. */
export const BENCHES: Bench[] = RULES.flatMap(rule =>
  MISSES.flatMap(checks => HEDGES.map(hedgeMs => ({ rule, checks, hedgeMs }))),
);
/** The lowest passing p99 and every bench that reaches it, solved fresh: the test checks the pin against this. */
export function solve() {
  const ok = BENCHES.filter(b => meets(runBench(b))),
    best = Math.min(...ok.map(b => scoreOf(runBench(b))));
  return { best, winners: ok.filter(b => scoreOf(runBench(b)) === best) };
}
export const BEST: number = data.solved.best;
export const WINNERS = data.solved.winners as Bench[];
export const wins = (b: Bench) => {
  const r = runBench(b);
  return meets(r) && scoreOf(r) === BEST;
};
