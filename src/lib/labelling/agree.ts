// How far two labellers agree, and how far above luck (Cohen's kappa), plus scoring a labeller against known answers
// (chapters 2 and 4). Labels are lists in the same item order.

/** The share of items two labellers gave the same label. */
export const agreement = (a: readonly string[], b: readonly string[]) =>
  a.filter((x, i) => x === b[i]).length / a.length;

/** The agreement two labellers would reach by luck if each picked labels at their own rates. */
export function chance(a: readonly string[], b: readonly string[]) {
  const n = a.length,
    count = (xs: readonly string[], l: string) => xs.filter(x => x === l).length;
  return [...new Set([...a, ...b])].reduce((s, l) => s + (count(a, l) / n) * (count(b, l) / n), 0);
}

/** Cohen's kappa (1960): how far agreement rises above luck; 1 is perfect, 0 no better than luck. */
export function kappa(a: readonly string[], b: readonly string[]) {
  const pe = chance(a, b);
  return pe === 1 ? 1 : (agreement(a, b) - pe) / (1 - pe);
}

/** The agreement matrix: cell [i][j] counts items a labelled `labels[i]` and b labelled `labels[j]`. */
export const matrix = (a: readonly string[], b: readonly string[], labels: readonly string[]) =>
  labels.map(r => labels.map(c => a.filter((x, i) => x === r && b[i] === c).length));

/** The share of the items at `at` (every item if omitted) a labeller got right. */
export function accuracy(labels: readonly string[], truth: readonly string[], at?: readonly number[]) {
  const idx = at ?? truth.map((_, i) => i);
  return idx.filter(i => labels[i] === truth[i]).length / idx.length;
}
