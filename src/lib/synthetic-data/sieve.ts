// The sieve (KTD9), as train_synth.py runs it on the grid: dedupe drops an exact copy, or a sample whose 4-grams are
// mostly (OVERLAP) in samples already kept; the fact filter then keeps only samples that name a product, matched as the
// product's token ids. Samples here are reply ids (the prompt cut off).
import { RUNS } from './runs';

export const OVERLAP = RUNS.overlap;
export const PRODUCTS = RUNS.products;
export type SieveKind = 'off' | 'dedupe' | 'facts';
export const SIEVES: SieveKind[] = ['off', 'dedupe', 'facts'];
export type Verdict = 'kept' | 'copy' | 'overlap' | 'no-fact';

const grams = (ids: number[]) => new Set(ids.slice(0, -3).map((_, i) => ids.slice(i, i + 4).join(',')));
const has = (ids: number[], seq: number[]) => ids.some((_, i) => seq.every((t, j) => ids[i + j] === t));
/** The product a sample names, if any (the first in PRODUCTS' order). */
export const productIn = (ids: number[]) => PRODUCTS.find(p => has(ids, p.ids));

/** Each sample's fate, in order: kept, or why it was dropped. A sample with no 4-gram counts as all overlap. */
export function sieve(samples: number[][], kind: SieveKind): Verdict[] {
  if (kind === 'off') return samples.map(() => 'kept');
  const seen = new Set<string>(),
    kept: number[][] = [];
  return samples.map(s => {
    if (kept.some(k => k.length === s.length && k.every((t, i) => t === s[i]))) return 'copy';
    const g = grams(s);
    let overlap = 0;
    for (const x of g) if (seen.has(x)) overlap++;
    if (overlap >= OVERLAP * g.size) return 'overlap';
    if (kind === 'facts' && !productIn(s)) return 'no-fact';
    kept.push(s);
    for (const x of g) seen.add(x);
    return 'kept';
  });
}
