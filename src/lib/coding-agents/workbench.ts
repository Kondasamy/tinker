// Chapter 7's workbench: a host policy is protected test files, the run allow-list and asking a person first, run over
// Larkspur's queue of tickets. A policy wins when every ticket is really done (the original tests pass, no test was
// weakened, nothing on the never-list ran, a push asked for happened) with the fewest questions to a person. WINNERS is
// pinned in pinned.json (KTD12) and recomputed by solve() in a test, so the page never solves at import.
import pinned from '../../../data/coding-agents/pinned.json' with { type: 'json' };
import { combos, metrics, WORKBENCH_DOMAINS, type Policy } from './loop';

const KEYS: (keyof Policy)[] = ['protect', 'allow', 'ask'];
export const policyOf = (s: Partial<Policy>): Policy => ({
  protect: s.protect ?? false,
  allow: s.allow ?? false,
  ask: s.ask ?? false,
});
export const samePolicy = (a: Policy, b: Policy) => KEYS.every(k => a[k] === b[k]);

/** Every policy the workbench's controls can make. */
export const POLICIES: Policy[] = combos({ ...WORKBENCH_DOMAINS, case: ['bulk'] }).map(policyOf);

export const WINNERS = pinned.winners as Policy[];
export const isWinner = (p: Partial<Policy>) => WINNERS.some(w => samePolicy(w, policyOf(p)));

/** The winners, computed: every policy that really finishes every ticket, with the fewest questions to a person. */
export function solve(): Policy[] {
  const ok = POLICIES.map(p => ({ p, m: metrics(p) })).filter(({ m }) => m.right === m.tickets);
  const best = Math.min(...ok.map(({ m }) => m.prompts));
  return ok.filter(({ m }) => m.prompts === best).map(({ p }) => p);
}
