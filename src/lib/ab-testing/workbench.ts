// A/B testing chapter 7's workbench (KTD11): a decision per experiment (ship, keep testing or stop), a finite domain of
// 3^experiments plans. Each experiment's seeded data is read once, at its planned end, with no peeking. The module's rule:
// ship when the test is significant, B is better and the returns guardrail holds; keep testing when it is not significant
// and the test had fewer shoppers than the sample size it needs; stop otherwise. WINNERS is every plan that follows the
// rule on the data (one today). Each experiment's true effect is revealed afterwards, apart from the rule.
import { ASSUMPTIONS, BENCH, resultAt, runOf, type Experiment } from './sim';
import { sampleSize } from './stats';

export const DECISIONS = ['ship', 'keep', 'stop'] as const;
export type Decision = (typeof DECISIONS)[number];
export type Plan = Record<string, Decision>;
export const DECISION_NAME: Record<Decision, string> = { ship: 'Ship', keep: 'Keep testing', stop: 'Stop' };

/** Shoppers each checkout needs to find the team's smallest change worth having (`mde`) 80% of the time. */
export const NEEDED = sampleSize(ASSUMPTIONS.baseline, ASSUMPTIONS.mde);

/** What the rule reads off an experiment's data at its planned end. */
export function ruleOf(e: Experiment) {
  const r = runOf(e),
    end = e.days - 1,
    orders = resultAt(r, end, ASSUMPTIONS.level),
    returns = resultAt(r, end, ASSUMPTIONS.level, 1, 'returns'),
    shoppers = r[end].visitors[0];
  return {
    orders,
    returns,
    shoppers,
    significant: orders.significant,
    up: orders.diff > 0,
    guardrailHolds: !(returns.significant && returns.diff > 0),
    underpowered: shoppers < NEEDED,
  };
}

export function decide(e: Experiment): Decision {
  const r = ruleOf(e);
  if (r.significant && r.up && r.guardrailHolds) return 'ship';
  if (!r.significant && r.underpowered) return 'keep';
  return 'stop';
}

/** Every plan the controls can make. */
export const PLANS: Plan[] = BENCH.reduce<Plan[]>(
  (plans, e) => plans.flatMap(p => DECISIONS.map(d => ({ ...p, [e.id]: d }))),
  [{}],
);
/** How many experiments the plan decides by the rule. */
export const scoreOf = (p: Plan) => BENCH.filter(e => p[e.id] === decide(e)).length;
export const WINNERS = PLANS.filter(p => scoreOf(p) === BENCH.length);
export const wins = (p: Plan) => scoreOf(p) === BENCH.length;

/** Where the bench starts: nothing decided yet reads as "keep testing" everywhere. */
export const START: Plan = Object.fromEntries(BENCH.map(e => [e.id, 'keep']));
const isDecision = (x: unknown): x is Decision => (DECISIONS as readonly unknown[]).includes(x);
/** The plan in a saved run's state; anything unknown falls back to START's. */
export const benchPlan = (s: Partial<Record<string, unknown>>): Plan =>
  Object.fromEntries(BENCH.map(e => [e.id, isDecision(s[e.id]) ? s[e.id] : START[e.id]])) as Plan;

/** The hidden truth, for the read-out after the bench: B's true lift in conversion and in returns. */
export const truthOf = (e: Experiment) => ({
  lift: e.arms[1].rate - e.arms[0].rate,
  returns: e.arms[1].returns - e.arms[0].returns,
});
