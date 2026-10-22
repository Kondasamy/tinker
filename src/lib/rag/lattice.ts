// Chunking lattice (KTD4): must match SIZES/OVERLAPS in scripts/build-index.mjs.
export const SIZES = [8, 16, 24, 32, 48, 64, 96] as const;
export const OVERLAPS = [0, 10, 25, 50] as const;
export type Strategy = 'fixed' | 'sentence';

/** Nearest lattice value; ties go to the lower one (20 -> 16). */
export function snap(v: number, values: readonly number[]): { value: number; snapped: boolean } {
  let best = values[0];
  for (const x of values) if (Math.abs(x - v) < Math.abs(best - v)) best = x;
  return { value: best, snapped: best !== v };
}

export interface ChunkParams {
  strategy: Strategy;
  size: number;
  overlap: number;
}

export function resolveConfig(p: ChunkParams) {
  const size = snap(p.size, SIZES),
    overlap = snap(p.overlap, OVERLAPS);
  return {
    strategy: p.strategy,
    size: size.value,
    overlap: overlap.value,
    file: p.strategy === 'fixed' ? `fixed-${size.value}-${overlap.value}.bin` : `sentence-${size.value}.bin`,
    snapped: size.snapped || overlap.snapped,
    requested: { size: p.size, overlap: p.overlap },
  };
}
export type ResolvedConfig = ReturnType<typeof resolveConfig>;
