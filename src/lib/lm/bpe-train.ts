// Byte-level BPE training after minbpe (Karpathy, MIT). No imports, so scripts/train-bpe.mjs can load it in Node.

/** GPT-2's pre-tokenisation: merges never cross these chunks, so " hello" keeps its space. */
export const SPLIT = /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;
export const N_MERGES = 1000;

export type Merge = [number, number];

/** Replaces every (a, b) in ids with id, left to right. */
export function mergePair(ids: number[], a: number, b: number, id: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < ids.length; i++) {
    if (i < ids.length - 1 && ids[i] === a && ids[i + 1] === b) { out.push(id); i++; } else out.push(ids[i]);
  }
  return out;
}

/** Learns nMerges merges; merge i makes token 256 + i. Ties go to the lowest pair, so every run is identical. */
export function train(text: string, nMerges: number): Merge[] {
  const freq = new Map<string, number>();
  for (const w of text.match(SPLIT) ?? []) freq.set(w, (freq.get(w) ?? 0) + 1);
  const enc = new TextEncoder();
  const words = [...freq].map(([w, n]) => ({ ids: [...enc.encode(w)], n }));
  const merges: Merge[] = [];
  for (let m = 0; m < nMerges; m++) {
    const counts = new Map<number, number>();
    for (const { ids, n } of words) {
      for (let i = 0; i < ids.length - 1; i++) {
        const k = ids[i] * 65536 + ids[i + 1];
        counts.set(k, (counts.get(k) ?? 0) + n);
      }
    }
    let best = -1, bestN = 0;
    for (const [k, n] of counts) if (n > bestN || (n === bestN && k < best)) { best = k; bestN = n; }
    if (best < 0) break;
    const a = Math.floor(best / 65536), b = best % 65536;
    merges.push([a, b]);
    for (const w of words) w.ids = mergePair(w.ids, a, b, 256 + m);
  }
  return merges;
}
