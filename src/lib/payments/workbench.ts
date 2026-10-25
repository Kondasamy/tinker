// Payments chapter 7's workbench: a checkout setting per kind of order (3-D Secure × capture × idempotency key, 12
// settings, so 12³ = 1,728 policies), run over the day. A policy meets the owner's rule
// (data/payments/workbench.json) when no customer is charged twice and Larkspur's fraud loss stays within the limit; it
// scores what Larkspur keeps. The puzzle accepts every policy that meets the rule with the most kept (WINNERS). Solving
// all 1,728 at import would cost every page load, so the chapter reads WINNERS from data/payments/pinned.json and
// tests/unit/payments-workbench.test.ts recomputes it (KTD12).
import data from '../../../data/payments/workbench.json' with { type: 'json' };
import pinned from '../../../data/payments/pinned.json' with { type: 'json' };
import { CAPTURES, KINDS, SCAS, runOf, type Kind, type Policy, type Setting } from './sim';

export const FRAUD_LIMIT = data.fraudLimitCents;
export const RULE = data.rule;
export const REASONS = data.reasons as Record<Kind, string>;

export const meets = (p: Policy) => {
  const r = runOf(p);
  return r.doubleCharges === 0 && r.fraudLoss.merchant <= FRAUD_LIMIT;
};
export const keptOf = (p: Policy) => runOf(p).net;

export const SETTINGS: Setting[] = SCAS.flatMap(sca =>
  CAPTURES.flatMap(capture => [true, false].map(key => ({ sca, capture, key }))),
);
const cross = (ks: Kind[]): Policy[] =>
  ks.length
    ? cross(ks.slice(1)).flatMap(rest => SETTINGS.map(s => ({ ...rest, [ks[0]]: s }) as Policy))
    : [{} as Policy];
/** Every policy the controls can make. */
export const policies = () => cross(KINDS);
/** Solves the bench from scratch: every policy that meets the rule with the most kept. */
export function solve() {
  const passing = policies().filter(meets);
  const best = Math.max(...passing.map(keptOf));
  return { best, winners: passing.filter(p => keptOf(p) === best) };
}

/** the pinned solution (KTD12): the test fails if solve() drifts from it */
export const BEST = pinned.workbench.best;
export const WINNERS = pinned.workbench.winners as Policy[];
export const wins = (p: Policy) => meets(p) && keptOf(p) === BEST;

/** where the bench starts: every kind on a challenge for all, capture at order, no key */
export const START: Policy = {
  small: { sca: 'always', capture: 'order', key: false },
  large: { sca: 'always', capture: 'order', key: false },
  split: { sca: 'always', capture: 'order', key: false },
};
const settingOf = (s: Partial<Setting> | undefined, d: Setting): Setting => ({
  sca: SCAS.includes(s?.sca as never) ? s!.sca! : d.sca,
  capture: CAPTURES.includes(s?.capture as never) ? s!.capture! : d.capture,
  key: typeof s?.key === 'boolean' ? s.key : d.key,
});
/** The policy in a saved run's state; anything unknown falls back to START's. */
export const benchPolicy = (s: Partial<Policy>): Policy =>
  Object.fromEntries(KINDS.map(k => [k, settingOf(s[k], START[k])])) as Policy;
