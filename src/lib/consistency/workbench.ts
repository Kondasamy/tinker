// Consistency chapter 7's workbench: a setting per product (R, W and the conflict rule, 3 × 3 × 2 each, so 324
// policies), run over the morning with the outage on. A policy meets the owner's rule when no product in
// data/consistency/workbench.json `zeroOversell` is oversold; it scores its refused orders, fewer is better. The puzzle
// accepts every policy that meets the rule with the fewest refused orders (WINNERS), not one hand-picked answer.
import data from '../../../data/consistency/workbench.json' with { type: 'json' };
import { PRODUCTS, QUORUMS, RULES, runOf, type Policy, type Product, type Setting } from './sim';

export const STRICT = data.zeroOversell as Product[];
export const REASONS = data.reasons as Record<Product, string>;
export const FIXED = { partition: true, sticky: false } as const;

export const meets = (p: Policy) => STRICT.every(k => runOf(p).oversold[k] === 0);
export const refusedOf = (p: Policy) => PRODUCTS.reduce((a, k) => a + runOf(p).refused[k], 0);

export const SETTINGS: Setting[] = RULES.flatMap(rule => QUORUMS.flatMap(r => QUORUMS.map(w => ({ r, w, rule }))));
/** Every policy the controls can make. */
export const POLICIES: Policy[] = SETTINGS.flatMap(hinge => SETTINGS.map(drill => ({ hinge, drill, ...FIXED })));
const passing = POLICIES.filter(meets);
export const BEST = Math.min(...passing.map(refusedOf));
export const WINNERS = passing.filter(p => refusedOf(p) === BEST);
export const wins = (p: Policy) => meets(p) && refusedOf(p) === BEST;

/** What the bench's controls set. */
export type Bench = Pick<Policy, 'hinge' | 'drill'>;
/** where the bench starts: both products on Dynamo's common (3, 2, 2), last writer wins */
export const START: Bench = { hinge: { r: 2, w: 2, rule: 'lww' }, drill: { r: 2, w: 2, rule: 'lww' } };
const isQ = (x: unknown): x is number => (QUORUMS as readonly unknown[]).includes(x);
const settingOf = (s: Partial<Setting> | undefined, d: Setting): Setting => ({
  r: isQ(s?.r) ? s.r : d.r,
  w: isQ(s?.w) ? s.w : d.w,
  rule: RULES.includes(s?.rule as never) ? s!.rule! : d.rule,
});
/** The policy in a saved run's state; anything unknown falls back to START's. */
export const benchPolicy = (s: Partial<Bench>): Policy => ({
  hinge: settingOf(s.hinge, START.hinge),
  drill: settingOf(s.drill, START.drill),
  ...FIXED,
});
