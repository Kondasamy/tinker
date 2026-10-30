// A/B testing's statistics (KTD11): the two-proportion test, the interval for the difference, the sample-size rule and a
// Bonferroni correction. The chapters never show these formulas in the narration; they live in "the maths" fold-aways.
import { fact } from './facts';

/** The standard normal curve's share below z (Abramowitz & Stegun 7.1.26, error under 1.5e-7). */
export function normalCdf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2,
    t = 1 / (1 + 0.3275911 * x);
  const erf =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/** The z beyond which a two-sided test at this level calls a difference significant (1.96 at 0.05), by bisection. */
export function zFor(level: number): number {
  let lo = 0,
    hi = 10;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (2 * (1 - normalCdf(mid)) > level) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface Comparison {
  /** B's rate minus A's */
  diff: number;
  /** the interval for the difference at the level (95% at 0.05) */
  lo: number;
  hi: number;
  z: number;
  /** two-sided p-value */
  p: number;
  significant: boolean;
}

/** Two-proportion z-test of B against A (pooled), and the unpooled interval for B − A. */
export function compare(nA: number, xA: number, nB: number, xB: number, level: number): Comparison {
  const pA = nA ? xA / nA : 0,
    pB = nB ? xB / nB : 0,
    diff = pB - pA,
    pool = nA + nB ? (xA + xB) / (nA + nB) : 0,
    seTest = Math.sqrt(pool * (1 - pool) * (1 / Math.max(nA, 1) + 1 / Math.max(nB, 1))),
    seInt = Math.sqrt((pA * (1 - pA)) / Math.max(nA, 1) + (pB * (1 - pB)) / Math.max(nB, 1)),
    z = seTest > 0 ? diff / seTest : 0,
    p = 2 * (1 - normalCdf(Math.abs(z))),
    k = zFor(level);
  return { diff, lo: diff - k * seInt, hi: diff + k * seInt, z, p, significant: p < level };
}

/** The 16 in Kohavi et al.'s rule of thumb (fact `sample-size`). */
export const RULE = Number(fact('sample-size').value);

/** Visitors needed per variant to find a change of `delta` from a rate `p` 80% of the time at the 95% level: Kohavi et
 * al.'s rule of thumb, 16σ²/Δ², with σ² = p(1 − p) for a conversion (fact `sample-size`). */
export const sampleSize = (p: number, delta: number) => Math.round((RULE * p * (1 - p)) / (delta * delta));

/** Bonferroni: with k comparisons, each is held to the level divided by k. */
export const bonferroni = (level: number, k: number) => level / k;
