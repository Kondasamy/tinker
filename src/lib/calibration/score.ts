// Calibration's scores (KTD8), pure and live: the reliability bins (the jars), ECE, the Brier score, and coverage
// against accuracy for a hand-over threshold. An item is one answer or one guess: its stated confidence and whether it
// was right. Bins are equal-width tenths of confidence, merged with their neighbours (from the sure end down) until
// each holds at least `min` items, so no jar the chapters show rests on a handful of guesses.

export interface Item {
  /** stated confidence, 0 to 1 */
  c: number;
  ok: boolean;
}
export interface Bin {
  /** the tenths it spans: [lo, hi), the last one closed */
  lo: number;
  hi: number;
  n: number;
  right: number;
  /** mean stated confidence */
  conf: number;
}
/** Bin edges: confidence in tenths. */
export const TENTHS = 10;
const tenth = (c: number) => Math.max(0, Math.min(TENTHS - 1, Math.floor(c * TENTHS + 1e-9)));
export const accuracyOf = (b: Pick<Bin, 'n' | 'right'>) => (b.n ? b.right / b.n : 0);

/** The jars: tenths of confidence, merged from the top down until each holds `min` items (the bottom leftover joins
 * the bin above it). Empty tenths fold into a neighbour's span. */
export function bins(items: Item[], min = 1): Bin[] {
  const t = Array.from({ length: TENTHS }, (_, i) => ({
    lo: i / TENTHS,
    hi: (i + 1) / TENTHS,
    n: 0,
    right: 0,
    sum: 0,
  }));
  for (const x of items) {
    const b = t[tenth(x.c)];
    b.n++;
    b.right += +x.ok;
    b.sum += x.c;
  }
  const out: (typeof t)[number][] = [];
  let open: (typeof t)[number] | null = null;
  for (let i = TENTHS - 1; i >= 0; i--) {
    const b = t[i];
    open = open
      ? { lo: b.lo, hi: open.hi, n: open.n + b.n, right: open.right + b.right, sum: open.sum + b.sum }
      : { ...b };
    if (open.n >= min) {
      out.unshift(open);
      open = null;
    }
  }
  // the unsure leftover joins the bin above it; empty tenths below every guess are no jar
  if (open?.n) {
    if (out.length) {
      const a = out[0];
      out[0] = { lo: open.lo, hi: a.hi, n: a.n + open.n, right: a.right + open.right, sum: a.sum + open.sum };
    } else out.push(open);
  }
  return out.map(b => ({ lo: round(b.lo), hi: round(b.hi), n: b.n, right: b.right, conf: b.sum / b.n }));
}
const round = (x: number) => Math.round(x * 1e6) / 1e6;

/** Expected calibration error: each jar's gap between stated confidence and how often it was right, weighted by its
 * share of the items. 0 is honest. */
export function ece(items: Item[], min = 1) {
  const bs = bins(items, min);
  return bs.reduce((e, b) => e + (b.n / items.length) * Math.abs(accuracyOf(b) - b.conf), 0);
}
/** The Brier score: the mean squared gap between stated confidence and what happened (1 right, 0 wrong). 0 is
 * perfect; always saying 50% scores 0.25. */
export const brier = (items: Item[]) => items.reduce((s, x) => s + (x.c - +x.ok) ** 2, 0) / items.length;
export const accuracy = (items: Item[]) => items.filter(x => x.ok).length / items.length;
export const meanConf = (items: Item[]) => items.reduce((s, x) => s + x.c, 0) / items.length;

/** Hand over everything below the threshold: the share kept (coverage) and how often the kept ones are right. */
export function coverage(items: Item[], threshold: number) {
  const kept = items.filter(x => x.c >= threshold - 1e-9);
  return {
    threshold,
    kept: kept.length,
    handed: items.length - kept.length,
    right: kept.filter(x => x.ok).length,
    wrong: kept.filter(x => !x.ok).length,
    coverage: kept.length / items.length,
    accuracy: kept.length ? kept.filter(x => x.ok).length / kept.length : 1,
  };
}

/** A stated confidence at a temperature, for a yes-or-no confidence: its log-odds divided by T. Above 1 pulls it
 * toward 50%, below 1 pushes it toward the ends. */
export function soften(c: number, T: number) {
  const p = Math.min(1 - 1e-9, Math.max(1e-9, c)),
    z = Math.log(p / (1 - p)) / T;
  return 1 / (1 + Math.exp(-z));
}
