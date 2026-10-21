// Meaning by neighbours (KTD5): cosine over RAG's committed int8 vectors, read through RAG's loader and never rebuilt.
import type { Config, RagIndex } from '../rag/load';
import { resolveConfig } from '../rag/lattice';

/** RAG's default chunks (fixed, 32 words, no overlap): the map Tokens shows. */
export const MAP_FILE = resolveConfig({ strategy: 'fixed', size: 32, overlap: 0 }).file;

/** Cosine similarity; on int8 vectors the global quantization scale cancels out, as in RAG's engine. */
export function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export const chunkVector = (cfg: Config, id: number) => cfg.vectors.subarray(id * cfg.D, (id + 1) * cfg.D);
/** A query or rewrite's vector, by its place in manifest.queries.items. */
export const queryVector = (index: RagIndex, i: number) => {
  const D = index.manifest.models.embedding.dims;
  return index.queries.subarray(i * D, (i + 1) * D);
};

/** The k chunks closest to v, best first; ties go to the lower id, as RAG ranks them. */
export function nearestChunks(cfg: Config, v: ArrayLike<number>, k: number): { id: number; score: number }[] {
  const all = Array.from({ length: cfg.N }, (_, id) => ({ id, score: cosine(chunkVector(cfg, id), v) }));
  return all.sort((a, b) => b.score - a.score || a.id - b.id).slice(0, k);
}
