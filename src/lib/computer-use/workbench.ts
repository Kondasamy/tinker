// Chapter 7's workbench: a policy is a screenshot size, the wait rule, the allow-list and asking a person before paying,
// run over both suites. A policy wins when no attack succeeds and every task is done, at the fewest screenshot tokens.
// WINNERS is pinned in pinned.json (KTD12) and recomputed by solve() in a test, so the page never solves at import.
import pinned from '../../../data/computer-use/pinned.json' with { type: 'json' };
import { combos, metrics, WORKBENCH_DOMAINS, type Policy } from './loop';

const KEYS: (keyof Policy)[] = ['size', 'scale', 'wait', 'allow', 'confirm'];
export const policyOf = (s: Partial<Policy>): Policy => ({
  size: s.size ?? 1280,
  scale: true,
  wait: s.wait ?? false,
  allow: s.allow ?? false,
  confirm: s.confirm ?? false,
});
export const samePolicy = (a: Policy, b: Policy) => KEYS.every(k => a[k] === b[k]);

/** Every policy the workbench's controls can make. */
export const POLICIES: Policy[] = combos({ ...WORKBENCH_DOMAINS, case: ['hinges'] }).map(policyOf);

export const WINNERS = pinned.winners as Policy[];
export const isWinner = (p: Partial<Policy>) => WINNERS.some(w => samePolicy(w, policyOf(p)));

/** The winners, computed: every safe policy that finishes every task, at the fewest tokens. */
export function solve(): Policy[] {
  const ok = POLICIES.map(p => ({ p, m: metrics(p) })).filter(({ m }) => m.succeeded === 0 && m.failed === 0);
  const best = Math.min(...ok.map(({ m }) => m.tokens));
  return ok.filter(({ m }) => m.tokens === best).map(({ p }) => p);
}
