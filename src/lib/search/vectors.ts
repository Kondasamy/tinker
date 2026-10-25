// Meaning for Search (KTD5): the test searches' vectors, embedded once offline (scripts/embed-search-queries.mjs), against
// RAG's committed chunk vectors, read through Tokens' neighbours.ts. Nothing is re-embedded and RAG's index never changes.
import type { Config } from '../rag/load';
import { chunkVector, cosine } from '../tokens/neighbours';

export const DIMS = 384;
const HEAD = 20; // sha1 of the query texts

/** The sha1 the file was written for, as hex, and one Int8 vector per query, in queries.json order. */
export function parseVectors(ab: ArrayBuffer) {
  const head = new Uint8Array(ab, 0, HEAD),
    n = (ab.byteLength - HEAD) / DIMS;
  if (!Number.isInteger(n)) throw new Error(`vectors.bin: ${ab.byteLength} bytes is not a whole number of vectors`);
  return {
    sha1: Array.from(head, b => b.toString(16).padStart(2, '0')).join(''),
    vectors: Array.from({ length: n }, (_, i) => new Int8Array(ab, HEAD + i * DIMS, DIMS)),
  };
}

/** Every page's cosine with a query's vector: the meaning score. */
export const meaningScores = (cfg: Config, v: ArrayLike<number>) =>
  Float32Array.from({ length: cfg.N }, (_, id) => cosine(chunkVector(cfg, id), v));
