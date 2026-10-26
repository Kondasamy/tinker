// Load balancing's percentiles (KTD7): nearest rank, so a percentile is always one of the measured waits.

/** The p-th percentile (0 < p ≤ 100) of xs by nearest rank: the smallest value with at least p% of xs at or below it. */
export function percentile(xs: readonly number[], p: number): number {
  if (!xs.length) throw new Error('percentile of no values');
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.max(0, Math.ceil((p / 100) * s.length) - 1)];
}
