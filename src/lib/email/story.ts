// Names, messages and verdicts for How email arrives (R18): every name and address is read from data/email/, never
// typed into copy. The fixture messages load as text; DKIM's verdict on each comes from data/email/pinned.json (the
// engine test verifies them all again), so the chapters can judge a message without waiting on Web Crypto.
import story from '../../../data/email/story.json' with { type: 'json' };
import pinned from '../../../data/email/pinned.json' with { type: 'json' };
import { mxOf, type Records } from './dns';
import { tagsOf, type DkimResult } from './dkim';
import { judge, type Verdict } from './dmarc';
import { header, hops, parse, serialize } from './parse';

const RAW = import.meta.glob<string>('../../../data/email/messages/*.eml', {
  query: '?raw',
  import: 'default',
  eager: true,
});
export type MessageId = 'order' | 'invoice' | 'forged' | 'spoofed' | 'forwarded' | 'newsletter' | 'prize';
export const MESSAGES = Object.fromEntries(
  Object.entries(RAW).map(([path, text]) => [path.match(/([\w-]+)\.eml$/)![1], text]),
) as Record<MessageId, string>;

export const COMPANY = story.company;
export const DOMAIN = story.domain;
export const CUSTOMER = story.customer;
export const FORGER = story.forger.domain;
export const VENDOR = story.vendor;
export const FORWARDER = story.forwarder.domain;
export const SELECTOR = story.selector;
export const OWN_SPF = story.spf.own;
export const VENDOR_SPF = story.spf.vendor;
export const RECEIVER_RULE = story.receiverRule;
export const SPAM_THRESHOLD = story.spamThreshold;
export const RECEIVER_MX = mxOf(CUSTOMER.domain)!;
/** The record sets the chapters use, by name. */
export const RECORDS = pinned.records as Record<string, Records>;

/** The message as Larkspur sent it under these records: without DKIM, its own signature is never added. */
export function messageAs(id: MessageId, rec: Records): string {
  if (rec.dkim) return MESSAGES[id];
  const m = parse(MESSAGES[id]);
  m.headers = m.headers.filter(h => h.name.toLowerCase() !== 'dkim-signature' || tagsOf(h.value).d !== DOMAIN);
  return serialize(m);
}

/** The IP that handed the message to the receiver's MX: the one SPF checks. */
export const ipOf = (id: MessageId) => hops(parse(MESSAGES[id])).find(h => h.by === RECEIVER_MX)!.ip;

/** DKIM's verdict on a message, pinned. */
export function dkimOf(id: MessageId, rec: Records): DkimResult {
  const sig = header(parse(messageAs(id, rec)), 'dkim-signature'),
    r = (pinned.dkim as Record<string, string>)[id];
  return sig && (r === 'pass' || r === 'fail') ? { result: r, domain: tagsOf(sig).d } : { result: 'none' };
}

/** How Hollis's server judges one fixture message under Larkspur's records. */
export const verdictOf = (id: MessageId, rec: Records, dkim = dkimOf(id, rec)): Verdict =>
  judge(parse(messageAs(id, rec)), ipOf(id), rec, dkim);
