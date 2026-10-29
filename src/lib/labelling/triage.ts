// Larkspur's triage model (chapters 5 and 6): naive Bayes over word counts per intent, as Email's spam score counts
// spam words (src/lib/email/spam.ts). Counting words in labelled tickets is not training in the browser (R3). An
// intent's score is its share of the labelled tickets, plus each word's log chance of turning up in that intent's
// tickets (add-one smoothing). The model is as sure as its top intent is ahead of the next (the margin).
import type { Intent, Ticket } from './story';

const STOP = new Set(
  'a an and are be but can do for get got had has have how i if in is it its me my no not of on or our so the them then there they this to too was we what when where will with you your'.split(
    ' ',
  ),
);
/** A ticket's words, lower case, without the commonest little words, and with a plural s dropped. */
export const tokens = (s: string) =>
  (s.toLowerCase().match(/[a-z]+/g) ?? []).filter(w => !STOP.has(w)).map(w => (w.length > 3 ? w.replace(/s$/, '') : w));

export interface Model {
  n: Map<Intent, number>;
  /** for each intent, in how many of its tickets each word turns up */
  df: Map<Intent, Map<string, number>>;
  intents: Intent[];
  total: number;
}

/** Count the words of labelled tickets: `label` is the intent each ticket was given (its answer if omitted). */
export function train(tickets: readonly Ticket[], intents: readonly Intent[], label = (t: Ticket) => t.intent): Model {
  const n = new Map<Intent, number>(intents.map(i => [i, 0])),
    df = new Map<Intent, Map<string, number>>(intents.map(i => [i, new Map()]));
  for (const t of tickets) {
    const l = label(t),
      d = df.get(l)!;
    n.set(l, n.get(l)! + 1);
    for (const w of tokens(t.text)) d.set(w, (d.get(w) ?? 0) + 1);
  }
  return { n, df, intents: [...intents], total: tickets.length };
}

/** Each intent's score for a text, highest first (ties in rack order). */
export function scores(m: Model, text: string): [Intent, number][] {
  const vocab = new Set(m.intents.flatMap(i => [...m.df.get(i)!.keys()]));
  const words = tokens(text).filter(w => vocab.has(w));
  return m.intents
    .map(i => {
      const df = m.df.get(i)!,
        sum = [...df.values()].reduce((a, b) => a + b, 0);
      const s = words.reduce(
        (a, w) => a + Math.log(((df.get(w) ?? 0) + 1) / (sum + vocab.size)),
        Math.log((m.n.get(i)! + 1) / (m.total + m.intents.length)),
      );
      return [i, s] as [Intent, number];
    })
    .sort((a, b) => b[1] - a[1]);
}

export const classify = (m: Model, text: string) => scores(m, text)[0][0];
/** How far the top intent's score is ahead of the next: small means unsure. */
export const margin = (m: Model, text: string) => {
  const s = scores(m, text);
  return s[0][1] - s[1][1];
};
export const accuracyOn = (m: Model, tickets: readonly Ticket[]) =>
  tickets.filter(t => classify(m, t.text) === t.intent).length / tickets.length;

/** The n tickets the model is least sure of, least sure first (ties in ticket order). */
export const leastSure = (m: Model, tickets: readonly Ticket[], n: number) =>
  tickets
    .map((t, k) => ({ t, k, d: margin(m, t.text) }))
    .sort((a, b) => a.d - b.d || a.k - b.k)
    .slice(0, n)
    .map(x => x.t);

/** Least-sure-first: from `start`, label the ticket the model trained so far is least sure of, one at a time. */
export function activeOrder(start: readonly Ticket[], pool: readonly Ticket[], intents: readonly Intent[]): Ticket[] {
  const order: Ticket[] = [],
    left = [...pool];
  while (left.length) {
    const next = leastSure(train([...start, ...order], intents), left, 1)[0];
    order.push(next);
    left.splice(left.indexOf(next), 1);
  }
  return order;
}

/** Held-out accuracy after each extra label in `order`, from `start` alone (index 0) to every ticket labelled. */
export const curve = (
  start: readonly Ticket[],
  order: readonly Ticket[],
  test: readonly Ticket[],
  intents: readonly Intent[],
) =>
  order
    .map((_, k) => k)
    .concat(order.length)
    .map(k => accuracyOn(train([...start, ...order.slice(0, k)], intents), test));

/** How many extra labels a curve needs before it first reaches `bar` (Infinity if it never does). */
export const labelsToReach = (c: readonly number[], bar: number) => {
  const k = c.findIndex(a => a >= bar);
  return k < 0 ? Number.POSITIVE_INFINITY : k;
};

/** The median of a list of numbers. */
export const median = (xs: readonly number[]) => {
  const s = [...xs].sort((a, b) => a - b),
    h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};
