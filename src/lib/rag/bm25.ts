export const tokenize = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z0-9$]+/)
    .filter(Boolean);

/** Okapi BM25 (k1 1.2, b 0.75) over a fixed set of texts; score() returns one score per text. `tok` splits texts and queries alike. */
export function buildBm25(texts: string[], tok: (s: string) => string[] = tokenize, k1 = 1.2, b = 0.75) {
  const N = texts.length;
  const postings = new Map<string, { doc: number[]; tf: number[] }>();
  const len = new Float32Array(N);
  texts.forEach((t, d) => {
    const toks = tok(t);
    len[d] = toks.length;
    const tf = new Map<string, number>();
    for (const w of toks) tf.set(w, (tf.get(w) ?? 0) + 1);
    for (const [w, n] of tf) {
      let p = postings.get(w);
      if (!p) postings.set(w, (p = { doc: [], tf: [] }));
      p.doc.push(d);
      p.tf.push(n);
    }
  });
  const avg = len.reduce((a, x) => a + x, 0) / Math.max(1, N);
  return {
    /** The texts a term is in, and how often: read-only. */
    postings: (term: string): Readonly<{ doc: readonly number[]; tf: readonly number[] }> | undefined =>
      postings.get(term),
    score(query: string): Float32Array {
      const out = new Float32Array(N);
      for (const w of new Set(tok(query))) {
        const p = postings.get(w);
        if (!p) continue;
        const idf = Math.log(1 + (N - p.doc.length + 0.5) / (p.doc.length + 0.5));
        p.doc.forEach((d, i) => {
          const f = p.tf[i];
          out[d] += (idf * f * (k1 + 1)) / (f + k1 * (1 - b + (b * len[d]) / avg));
        });
      }
      return out;
    },
  };
}
export type Bm25 = ReturnType<typeof buildBm25>;
