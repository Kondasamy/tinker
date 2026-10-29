// Ring all-reduce over real numbers (KTD8): n workers in a ring, each vector cut into n chunks ("buckets").
// Reduce-scatter: at hop k worker i passes chunk (i − k) mod n to worker i + 1, who adds it to its own; after n − 1 hops
// worker i holds the full sum of chunk (i + 1) mod n. All-gather: n − 1 more hops pass the finished chunks on, each
// overwriting. Dividing by n gives every worker the plain mean. Each worker sends 2(n − 1) chunks: 2(n − 1)/n of the
// vector, however many workers there are.

export interface Send {
  from: number;
  to: number;
  chunk: number;
}
export interface Hop {
  phase: 'reduce' | 'gather';
  /** 1-based within its phase */
  hop: number;
  sends: Send[];
  /** contributions summed into each worker's chunk so far, [worker][chunk], 1..n: the bucket's fill */
  counts: number[][];
  /** each worker's vector after this hop (sums, not yet divided) */
  values: Float64Array[];
}
export interface Ring {
  n: number;
  /** chunk c covers [bounds[c], bounds[c + 1]) */
  bounds: number[];
  hops: Hop[];
  /** the mean every worker ends with */
  result: Float64Array[];
  /** bytes each worker sent (8 per number) */
  sent: number[];
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** All-reduce workers' vectors to their mean, keeping every hop for the picture. */
export function ringAllReduce(vectors: ArrayLike<number>[]): Ring {
  const n = vectors.length,
    len = vectors[0].length;
  if (n < 2 || vectors.some(v => v.length !== len)) throw new Error('ring needs 2+ vectors of one length');
  const bounds = Array.from({ length: n + 1 }, (_, c) => Math.round((c * len) / n));
  const buf = vectors.map(v => Float64Array.from(v));
  const counts = Array.from({ length: n }, () => Array<number>(n).fill(1));
  const sent = Array<number>(n).fill(0);
  const hops: Hop[] = [];
  for (const phase of ['reduce', 'gather'] as const)
    for (let k = 0; k < n - 1; k++) {
      // what each worker sends is read before anyone writes, as on a real ring
      const sends = buf.map((_, i) => ({
        from: i,
        to: mod(i + 1, n),
        chunk: mod(i - k + (phase === 'gather' ? 1 : 0), n),
      }));
      const payload = sends.map(s => buf[s.from].slice(bounds[s.chunk], bounds[s.chunk + 1]));
      const fills = sends.map(s => counts[s.from][s.chunk]);
      sends.forEach((s, j) => {
        const dst = buf[s.to],
          lo = bounds[s.chunk];
        payload[j].forEach((x, o) => {
          dst[lo + o] = phase === 'reduce' ? dst[lo + o] + x : x;
        });
        counts[s.to][s.chunk] = phase === 'reduce' ? counts[s.to][s.chunk] + fills[j] : fills[j];
        sent[s.from] += payload[j].length * 8;
      });
      hops.push({ phase, hop: k + 1, sends, counts: counts.map(r => [...r]), values: buf.map(v => v.slice()) });
    }
  return { n, bounds, hops, result: buf.map(v => v.map(x => x / n)), sent };
}

/** The plain mean, element by element: what the ring must equal. */
export const meanOf = (vectors: ArrayLike<number>[]) =>
  Float64Array.from({ length: vectors[0].length }, (_, j) => vectors.reduce((a, v) => a + v[j], 0) / vectors.length);

/** Bucket fills after k hops (0..2(n−1)), each 0..1: contributions in the chunk over n. */
export const fillsAfter = (r: Ring, k: number) =>
  k === 0
    ? Array.from({ length: r.n }, () => Array<number>(r.n).fill(1 / r.n))
    : r.hops[k - 1].counts.map(row => row.map(c => c / r.n));

/** Seconds for a ring all-reduce of `bytes` over n workers on a link of `speed` bytes a second. */
export const ringSeconds = (bytes: number, n: number, speed: number) =>
  n < 2 ? 0 : (((2 * (n - 1)) / n) * bytes) / speed;
