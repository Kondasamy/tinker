// The spam filter's score: naive Bayes over word counts in a small labelled, hand-written set
// (data/email/spam-set.json), counted when the page loads. Counting is not training a model (R3). Each word a message
// shares with the set moves the odds by how much more often spam uses it than real mail does (add-one smoothing).
import set from '../../../data/email/spam-set.json' with { type: 'json' };
import { header, type Message } from './parse';

export const tokens = (s: string) => s.toLowerCase().match(/[a-z]+/g) ?? [];

const counts = (spam: boolean) => {
  const docs = set.messages.filter(m => m.spam === spam),
    df = new Map<string, number>();
  for (const d of docs) for (const w of new Set(tokens(d.text))) df.set(w, (df.get(w) ?? 0) + 1);
  return { n: docs.length, df };
};
const SPAM = counts(true),
  HAM = counts(false);
const p = (c: typeof SPAM, w: string) => ((c.df.get(w) ?? 0) + 1) / (c.n + 2);

/** The words of a message the set has seen, each with how far it moves the log odds towards spam. */
export function weights(text: string): [string, number][] {
  return [...new Set(tokens(text))]
    .filter(w => SPAM.df.has(w) || HAM.df.has(w))
    .map(w => [w, Math.log(p(SPAM, w) / p(HAM, w))] as [string, number]);
}

const textOf = (m: Message) => `${header(m, 'subject') ?? ''}\n${m.body}`;

/** The chance the filter gives that a message is spam, from its subject and body, to four places. Naive Bayes adds
 * every word's push, so its chances sit near 0 or 1. */
export function spamScore(m: Message): number {
  const odds = Math.log(SPAM.n / HAM.n) + weights(textOf(m)).reduce((a, [, x]) => a + x, 0);
  return Math.round(10000 / (1 + Math.exp(-odds))) / 10000;
}

/** The words that push hardest towards spam, most first. */
export const spamWords = (m: Message, n = 3) =>
  weights(textOf(m))
    .filter(([, x]) => x > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([w]) => w);

/** A score as the page shows it. */
export const scoreText = (x: number) => (x < 0.01 ? 'under 1%' : x > 0.99 ? 'over 99%' : `${Math.round(x * 100)}%`);
