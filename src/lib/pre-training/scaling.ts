// Chapter 6's published scaling fits, as Hoffmann et al. (2022) give them (data/pre-training/scaling.json): the
// exponents of Table 2 (how the compute-optimal model size and training tokens grow with compute, theirs and Kaplan
// et al.'s) and Table 3's compute-optimal rows. Labelled as their fits; Larkspur mini is never placed on them, since its
// losses are on other text in other units (R7).
import data from '../../../data/pre-training/scaling.json' with { type: 'json' };

export type FitId = 'kaplan' | 'chinchilla';
export interface Fit {
  label: string;
  /** N_opt ∝ C^a */
  a: number;
  /** D_opt ∝ C^b */
  b: number;
}
export const FITS = data.fits as Record<FitId, Fit>;
export const FIT_IDS = Object.keys(FITS) as FitId[];
export const SCALING_SOURCE = { source: data.source, accessed: data.accessed };

/** For k times the compute, how many times bigger the fit makes the model and how many times more tokens it trains on. */
export const grow = (fit: Fit, k: number) => ({ params: k ** fit.a, tokens: k ** fit.b });

export interface Row {
  params: number;
  flops: number;
  tokens: number;
}
/** Table 3: approach 1's compute-optimal training FLOPs and tokens per model size. */
export const TABLE3 = data.table3 as Row[];
/** The usual estimate of training compute, 6 × parameters × tokens (the paper's FLOPs(N, D) ≈ 6ND). */
export const sixND = (r: Pick<Row, 'params' | 'tokens'>) => 6 * r.params * r.tokens;

/** Compute budgets chapter 6's control steps over: 1×, 10×, 100× and 1,000× today's. */
export const BUDGETS = [1, 10, 100, 1000];
