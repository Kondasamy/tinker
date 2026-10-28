// How email arrives, chapter 7's workbench (KTD11): Larkspur's SPF record (five), DKIM on or off, and the DMARC
// policy (three), 30 settings, each run over a hand-written day of mail (data/email/workbench.json): real
// confirmations, invoices, a forward and the newsletter, and two kinds of fake invoice. A setting meets the owner's rule
// when every real message lands in an inbox and no fake reaches a customer (inbox or junk). The puzzle accepts every
// winner (WINNERS), read from data/email/pinned.json; tests/unit/email-workbench.test.ts solves it again (KTD10).
import data from '../../../data/email/workbench.json' with { type: 'json' };
import pinned from '../../../data/email/pinned.json' with { type: 'json' };
import type { Policy, Records } from './dns';
import type { Fate } from './dmarc';
import { verdictOf, type MessageId } from './story';

export const DAY = data.day as { id: MessageId; name: string; count: number; real: boolean }[];
export const SPF_OPTIONS = data.spf;
export const POLICIES: Policy[] = ['none', 'quarantine', 'reject'];
export const RULE = data.rule;
export const REASONS = data.reasons;
export const REAL = DAY.filter(d => d.real).reduce((a, d) => a + d.count, 0);
export const FAKES = DAY.filter(d => !d.real).reduce((a, d) => a + d.count, 0);

/** What the bench's controls set. */
export interface Bench {
  spf: string;
  dkim: boolean;
  dmarc: Policy;
}
export const recordsOf = (b: Bench): Records => ({
  spf: SPF_OPTIONS.find(o => o.id === b.spf)?.record ?? null,
  dkim: b.dkim,
  dmarc: b.dmarc,
});
/** Each kind of message's fate under a setting. */
export const fatesOf = (b: Bench): Record<MessageId, Fate> =>
  Object.fromEntries(DAY.map(d => [d.id, verdictOf(d.id, recordsOf(b)).fate])) as Record<MessageId, Fate>;
export function scoreOf(b: Bench) {
  const f = fatesOf(b);
  return {
    realIn: DAY.filter(d => d.real && f[d.id] === 'inbox').reduce((a, d) => a + d.count, 0),
    fakesSeen: DAY.filter(d => !d.real && f[d.id] !== 'bounced').reduce((a, d) => a + d.count, 0),
  };
}
export const meets = (b: Bench) => {
  const s = scoreOf(b);
  return s.realIn === REAL && s.fakesSeen === 0;
};

/** Every setting the controls can make. */
export const BENCHES: Bench[] = SPF_OPTIONS.flatMap(o =>
  [false, true].flatMap(dkim => POLICIES.map(dmarc => ({ spf: o.id, dkim, dmarc }))),
);
/** Solves the bench from scratch: every setting that meets the rule. */
export const solve = () => BENCHES.filter(meets);

/** the pinned solution (KTD10): the test fails if solve() drifts from it */
export const WINNERS = (pinned as { workbench?: Bench[] }).workbench ?? [];
export const wins = (b: Bench) => WINNERS.some(w => w.spf === b.spf && w.dkim === b.dkim && w.dmarc === b.dmarc);

/** where the bench starts: Larkspur's servers only, no DKIM, policy none */
export const START: Bench = { spf: 'own', dkim: false, dmarc: 'none' };
/** The bench in a saved run's state; anything unknown falls back to START's. */
export const benchOf = (s: Partial<Bench>): Bench => ({
  spf: SPF_OPTIONS.some(o => o.id === s.spf) ? s.spf! : START.spf,
  dkim: typeof s.dkim === 'boolean' ? s.dkim : START.dkim,
  dmarc: POLICIES.includes(s.dmarc as Policy) ? s.dmarc! : START.dmarc,
});
