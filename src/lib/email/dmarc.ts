// How Hollis's server judges a message (KTD6): SPF on the envelope sender and the IP that handed it over, DKIM's
// result, then DMARC (RFC 7489): a pass counts only when its domain aligns with the From line's (relaxed: the same
// organisational domain). A failure meets the From domain's policy: none lets it on, quarantine sends it to junk,
// reject bounces it. What gets on meets the receiver's own rule (mail nothing vouches for goes to junk) and the spam
// filter's score.
import story from '../../../data/email/story.json' with { type: 'json' };
import { txt, type Policy, type Records } from './dns';
import type { DkimResult } from './dkim';
import { domainOf, envelopeOf, fromOf, type Message } from './parse';
import { spf, type SpfResult } from './spf';
import { spamScore } from './spam';

export type Fate = 'inbox' | 'junk' | 'bounced';
export interface Verdict {
  spf: SpfResult;
  /** the domain SPF checked: the envelope sender's */
  spfDomain: string;
  dkim: DkimResult['result'];
  dkimDomain?: string;
  /** none: the From domain publishes no DMARC record */
  dmarc: 'pass' | 'fail' | 'none';
  policy: Policy | null;
  score: number;
  fate: Fate;
  /** what decided the fate */
  why: 'policy' | 'unvouched' | 'spam' | 'clean';
}

// shortcut: the organisational domain is the last two labels, right for .example names; real receivers use the
// public suffix list.
export const orgOf = (domain: string) => domain.toLowerCase().split('.').slice(-2).join('.');

/** The verdict on a message that reached the receiver from `ip`. */
export function judge(m: Message, ip: string, rec: Records, dkim: DkimResult): Verdict {
  const from = domainOf(fromOf(m)),
    spfDomain = domainOf(envelopeOf(m)),
    s = spf(spfDomain, ip, rec);
  const dkimDomain = dkim.result === 'none' ? undefined : dkim.domain;
  const aligned =
    (s === 'pass' && orgOf(spfDomain) === orgOf(from)) ||
    (dkim.result === 'pass' && orgOf(dkimDomain!) === orgOf(from));
  const record = txt(`_dmarc.${orgOf(from)}`, rec),
    policy = (record?.match(/p=(none|quarantine|reject)/)?.[1] as Policy | undefined) ?? null;
  const dmarc = !record ? 'none' : aligned ? 'pass' : 'fail',
    score = spamScore(m);
  const base = { spf: s, spfDomain, dkim: dkim.result, dkimDomain, dmarc, policy, score } as const;
  if (dmarc === 'fail' && policy === 'reject') return { ...base, fate: 'bounced', why: 'policy' };
  if (dmarc === 'fail' && policy === 'quarantine') return { ...base, fate: 'junk', why: 'policy' };
  if (s !== 'pass' && dkim.result !== 'pass') return { ...base, fate: 'junk', why: 'unvouched' };
  if (score >= story.spamThreshold) return { ...base, fate: 'junk', why: 'spam' };
  return { ...base, fate: 'inbox', why: 'clean' };
}
