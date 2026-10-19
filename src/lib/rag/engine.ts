// Retrieval pipeline over one loaded config: cosine -> BM25 blend -> filter -> top-k -> rerank -> context order.
import type { Config, RagIndex } from './load';
import { resolveConfig, type ChunkParams, type ResolvedConfig } from './lattice';

/** Int16 sentinel for a chunk with no cross-encoder score (the build clamps real scores to +-32767). */
export const UNSCORED = -32768;
/** Rerank re-scores this many filtered candidates (or k if larger) and keeps the best k. */
export const RERANK_POOL = 20;

export interface Question { id: string; query: string; rewrites: string[]; goldSentences: string[]; [k: string]: unknown }
/** {year: {gte: 2025}}, {type: ['policy']}, {department: 'Finance'}; every key must match. */
export type Filter = Record<string, unknown>;
export type ContextOrder = 'ranked' | 'edges' | 'custom';
export interface RunParams {
  question: Question;
  /** index into question.rewrites; omitted = original query */
  rewrite?: number;
  topK: number;
  /** 0 = pure vector, 1 = pure BM25 */
  hybrid?: number;
  filter?: Filter | null;
  /** doc types the docs block cannot read (table, pdf, image parsers off): invisible to retrieval */
  hidden?: string[];
  rerank?: boolean;
  order?: ContextOrder;
  /** chunk ids for order 'custom'; ids not in the result are ignored, missing ones follow in ranked order */
  customOrder?: number[];
}
export interface Ranked { ids: number[]; scores: number[] }
export interface ContextChunk {
  id: number; doc: string; title: string; year: number; start: number; end: number; text: string;
  score: number; rerankScore: number | null; unscored: boolean;
}
export type GoldStatus = 'intact' | 'split' | 'missing';
export interface RunRecord {
  file: string;
  questionId: string;
  queryText: string;
  queryIndex: number;
  /** hybrid keyword weight actually used (0 = pure vector) */
  weight: number;
  stages: { vector: Ranked; bm25: Ranked | null; hybrid: Ranked; filtered: Ranked; topK: Ranked; rerank: Ranked | null };
  context: ContextChunk[];
  unscored: number[];
  recall: { k: number; value: number; gold: { sentence: string; status: GoldStatus; chunkIds: number[] }[] };
}

const rank = (scores: ArrayLike<number>, ids: number[] = Array.from({ length: scores.length }, (_, i) => i)): Ranked => {
  const sorted = [...ids].sort((a, b) => scores[b] - scores[a] || a - b);
  return { ids: sorted, scores: sorted.map((i) => scores[i]) };
};
const minMax = (s: ArrayLike<number>) => {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < s.length; i++) { lo = Math.min(lo, s[i]); hi = Math.max(hi, s[i]); }
  return (i: number) => (hi > lo ? (s[i] - lo) / (hi - lo) : 0);
};

function matches(doc: Record<string, unknown>, filter: Filter) {
  return Object.entries(filter).every(([k, want]) => {
    const v = doc[k];
    if (Array.isArray(want)) return want.includes(v);
    if (want && typeof want === 'object') {
      const r = want as { gte?: number; lte?: number; gt?: number; lt?: number };
      const n = v as number;
      return (r.gte === undefined || n >= r.gte) && (r.lte === undefined || n <= r.lte) && (r.gt === undefined || n > r.gt) && (r.lt === undefined || n < r.lt);
    }
    return v === want;
  });
}

// Word ranges of each gold sentence in the corpus, per index (sentences can occur in several docs).
const goldCache = new WeakMap<RagIndex, Map<string, [number, number, number][]>>();
export function locate(index: RagIndex, sentence: string) {
  let m = goldCache.get(index);
  if (!m) goldCache.set(index, (m = new Map()));
  let hits = m.get(sentence);
  if (!hits) {
    const sw = sentence.split(/\s+/).filter(Boolean);
    hits = [];
    index.corpus.forEach((d, di) => {
      for (let i = 0; i + sw.length <= d.words.length; i++) if (sw.every((w, j) => d.words[i + j] === w)) hits!.push([di, i, i + sw.length]);
    });
    m.set(sentence, hits);
  }
  return hits;
}

export function orderContext(ids: number[], order: ContextOrder, custom: number[] = []) {
  if (order === 'edges') return [...ids.filter((_, i) => i % 2 === 0), ...ids.filter((_, i) => i % 2 === 1).reverse()];
  if (order === 'custom') { const first = [...new Set(custom.filter((id) => ids.includes(id)))]; return [...first, ...ids.filter((id) => !first.includes(id))]; }
  return ids;
}

export function run(index: RagIndex, cfg: Config, p: RunParams): RunRecord {
  const { N, D, ranges, vectors, norms } = cfg;
  const queryText = p.rewrite === undefined ? p.question.query : p.question.rewrites[p.rewrite];
  if (queryText === undefined) throw new Error(`question ${p.question.id} has no rewrite ${p.rewrite}`);
  const queryIndex = index.manifest.queries.items.findIndex((q) => q.questionId === p.question.id && q.text === queryText);
  if (queryIndex < 0) throw new Error(`query not in index: ${queryText}`);
  const k = Math.max(1, Math.min(10, Math.round(p.topK)));
  const w = Math.max(0, Math.min(1, p.hybrid ?? 0));

  // cosine on int8: the global quantization scale cancels out
  const qv = index.queries.subarray(queryIndex * D, (queryIndex + 1) * D);
  let qn = 0;
  for (let i = 0; i < D; i++) qn += qv[i] * qv[i];
  qn = Math.sqrt(qn);
  const cos = new Float32Array(N);
  for (let c = 0; c < N; c++) {
    let s = 0;
    const o = c * D;
    for (let i = 0; i < D; i++) s += vectors[o + i] * qv[i];
    cos[c] = norms[c] && qn ? s / (norms[c] * qn) : 0;
  }
  const vector = rank(cos);

  let bm25: Ranked | null = null;
  let blended: ArrayLike<number> = cos;
  if (w > 0) {
    const raw = cfg.bm25.score(queryText);
    bm25 = rank(raw);
    const nv = minMax(cos), nb = minMax(raw);
    blended = Float32Array.from({ length: N }, (_, i) => (1 - w) * nv(i) + w * nb(i));
  }
  const hybrid = w > 0 ? rank(blended) : vector;

  const docOf = (c: number) => index.corpus[ranges[c * 3]];
  const filter = p.filter && Object.keys(p.filter).length ? p.filter : null;
  const hidden = p.hidden?.length ? p.hidden : null;
  const filtered = filter || hidden
    ? (() => { const keep = hybrid.ids.map((id, i) => [id, hybrid.scores[i]] as const).filter(([id]) => !hidden?.includes(docOf(id).type) && (!filter || matches(docOf(id), filter))); return { ids: keep.map((x) => x[0]), scores: keep.map((x) => x[1]) }; })()
    : hybrid;
  const topK = { ids: filtered.ids.slice(0, k), scores: filtered.scores.slice(0, k) };

  const ce = (c: number) => crossScore(index, cfg, c, queryIndex);
  let rerank: Ranked | null = null;
  let finalIds = topK.ids;
  if (p.rerank) {
    const pool = filtered.ids.slice(0, Math.max(k, RERANK_POOL));
    // unscored chunks sort last, keeping their previous order
    const sorted = pool.map((id, pos) => ({ id, pos, s: ce(id) })).sort((a, b) => (a.s === null ? 1 : 0) - (b.s === null ? 1 : 0) || (b.s ?? 0) - (a.s ?? 0) || a.pos - b.pos);
    rerank = { ids: sorted.map((x) => x.id), scores: sorted.map((x) => x.s ?? -Infinity) };
    finalIds = rerank.ids.slice(0, k);
  }

  const scoreOf = new Map(filtered.ids.map((id, i) => [id, filtered.scores[i]]));
  const context = orderContext(finalIds, p.order ?? 'ranked', p.customOrder).map((id) => chunkOf(index, cfg, id, scoreOf.get(id)!, p.rerank ? ce(id) : undefined));

  return {
    file: cfg.file, questionId: p.question.id, queryText, queryIndex, weight: w,
    stages: { vector, bm25, hybrid, filtered, topK, rerank },
    context,
    unscored: context.filter((c) => c.unscored).map((c) => c.id),
    recall: goldOf(index, cfg, p.question, finalIds, k),
  };
}

/** Best similarity among the chunks, or null when there are none. */
export const topScore = (chunks: ContextChunk[]) => (chunks.length ? Math.max(...chunks.map((c) => c.score)) : null);

/** Precomputed cross-encoder score of chunk `id` against query `queryIndex`, or null when unscored. */
export function crossScore(index: RagIndex, cfg: Config, id: number, queryIndex: number) {
  const s = cfg.scores[id * cfg.Q + queryIndex];
  return s === UNSCORED ? null : s * index.manifest.quantization.scores.scale;
}

/** One context entry. `rerankScore`: undefined = rerank off, null = on but this chunk has no cross-encoder score. */
export function chunkOf(index: RagIndex, cfg: Config, id: number, score: number, rerankScore?: number | null): ContextChunk {
  const d = index.corpus[cfg.ranges[id * 3]];
  return { id, doc: d.id, title: d.title, year: d.year, start: cfg.ranges[id * 3 + 1], end: cfg.ranges[id * 3 + 2], text: cfg.texts[id], score, rerankScore: rerankScore ?? null, unscored: rerankScore === null };
}

/** Where each gold sentence landed among the given chunks: whole in one chunk, cut across chunks, or missing. */
export function goldOf(index: RagIndex, cfg: Config, question: Question, ids: number[], k = ids.length): RunRecord['recall'] {
  const { ranges } = cfg;
  const gold = question.goldSentences.map((sentence) => {
    let status: GoldStatus = 'missing';
    const chunkIds: number[] = [];
    for (const [di, gs, ge] of locate(index, sentence))
      for (const id of ids) {
        const [cd, s, e] = [ranges[id * 3], ranges[id * 3 + 1], ranges[id * 3 + 2]];
        if (cd !== di || e <= gs || s >= ge) continue;
        chunkIds.push(id);
        if (s <= gs && e >= ge) status = 'intact';
        else if (status === 'missing') status = 'split';
      }
    return { sentence, status, chunkIds: [...new Set(chunkIds)] };
  });
  return { k, value: gold.length ? gold.filter((g) => g.status === 'intact').length / gold.length : 0, gold };
}

export interface SessionResult { record: RunRecord | null; config: ResolvedConfig; preparing: boolean }

/**
 * Snaps chunk params to the lattice and runs if that config is loaded. Otherwise it keeps the previous
 * record with preparing = true, starts the load, and calls onReady when it lands so the UI can re-run.
 */
export function createSession(index: RagIndex, onReady?: (file: string) => void) {
  let last: RunRecord | null = null;
  return (p: RunParams & ChunkParams): SessionResult => {
    const config = resolveConfig(p);
    const cfg = index.get(config.file);
    if (cfg) return { record: (last = run(index, cfg, p)), config, preparing: false };
    index.load(config.file).then(() => onReady?.(config.file), () => {});
    return { record: last, config, preparing: true };
  };
}
