// Meaning by neighbours (KTD5): cosine over RAG's committed int8 vectors, read through RAG's loader and never rebuilt.
import type { Config, RagIndex } from '../rag/load';
import { resolveConfig } from '../rag/lattice';
import type { Question } from '../rag/engine';
import ch3 from '../../../data/questions/ch3.json' with { type: 'json' };
import ch4 from '../../../data/questions/ch4.json' with { type: 'json' };
import ch5 from '../../../data/questions/ch5.json' with { type: 'json' };
import ch6 from '../../../data/questions/ch6.json' with { type: 'json' };

/** RAG's committed questions (chapters 3–6), the ones the index holds vectors for. */
export const QUESTIONS = [...ch3, ...ch4, ...ch5, ...ch6] as Question[];
export const questionOf = (id: string) => {
  const q = QUESTIONS.find((x) => x.id === id);
  if (!q) throw new Error(`no RAG question ${id}`);
  return q;
};

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

/** A query's place in manifest.queries.items: the question's own wording, or its rewrite. */
export const queryIndexOf = (index: RagIndex, questionId: string, kind: 'query' | 'rewrite' = 'query') => {
  const i = index.manifest.queries.items.findIndex((q) => q.questionId === questionId && q.kind === kind);
  if (i < 0) throw new Error(`no ${kind} for ${questionId} in the index`);
  return i;
};

const wordsOf = (t: string) => new Set(t.toLowerCase().match(/[a-z0-9']+/g) ?? []);
/** The different words two texts share, ignoring case, in a's order. */
export const commonWords = (a: string, b: string) => { const w = wordsOf(b); return [...wordsOf(a)].filter((x) => w.has(x)); };
export const sharedWords = (a: string, b: string) => commonWords(a, b).length;

export interface Candidate { id: number; score: number; shared: number }
/** Chapter 6's choices for a question: its `k` nearest chunks by meaning and the `k` others that share the most words
 * with it, in chunk order so the order gives nothing away. */
export function candidates(cfg: Config, v: ArrayLike<number>, text: string, k = 2): Candidate[] {
  const near = nearestChunks(cfg, v, k).map((n) => n.id);
  const wordy = Array.from({ length: cfg.N }, (_, id) => ({ id, n: sharedWords(text, cfg.texts[id]) }))
    .filter((x) => !near.includes(x.id)).sort((a, b) => b.n - a.n || a.id - b.id).slice(0, k).map((x) => x.id);
  return [...near, ...wordy].sort((a, b) => a - b)
    .map((id) => ({ id, score: cosine(chunkVector(cfg, id), v), shared: sharedWords(text, cfg.texts[id]) }));
}

/** Every candidate tied at the highest cosine: each one is a right answer. */
export function closest(cs: readonly Candidate[]): number[] {
  const top = Math.max(...cs.map((c) => c.score));
  return cs.filter((c) => c.score === top).map((c) => c.id);
}
