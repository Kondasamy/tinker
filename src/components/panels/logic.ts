// Pure helpers behind the drawer panels (answer, evidence, chunk strip, 2D map). No React, so unit tests import them directly.
import type { Outcome } from '../canvas/state';
import type { Lookup } from '../../lib/rag/answers';
import { topScore, type Ranked, type RunRecord } from '../../lib/rag/engine';

export const LOAD_FAILED = 'Couldn’t load these chunks. Change a setting or reload to retry.';

export const VERDICT_LABEL: Record<Lookup['verdict'], string> = {
  correct: 'CORRECT', wrong: 'WRONG', madeup: 'MADE UP', notfound: 'NOT FOUND', norecord: 'NO RECORDED ANSWER',
};
export const stampClass = (v: Lookup['verdict']) => (v === 'correct' ? 'correct' : v === 'notfound' || v === 'norecord' ? 'warn' : 'wrong');

/** One sentence for the aria-live region: the verdict plus what retrieval did. */
export function summary(o: Outcome | null): string {
  if (!o) return 'Loading the retrieval index…';
  if (o.failed) return LOAD_FAILED;
  if (o.preparing || !o.answer) return 'Preparing these chunks…';
  const verdict = `Answer: ${VERDICT_LABEL[o.answer.verdict]}.`;
  const best = o.record && topScore(o.record.context);
  if (!o.record || best === null) return `${verdict} Nothing reached the model.`;
  const n = o.record.context.length;
  return `${verdict} ${n} chunk${n === 1 ? '' : 's'} retrieved, best similarity ${best.toFixed(3)}.`;
}

/** Negation words the panels highlight: a chunk that ends on one has lost what it negates. */
export const isNegation = (w: string) => /^(NOT|NEVER|NO)$/.test(w.replace(/[^A-Za-z]/g, ''));

/** A chunk starting mid-sentence (lowercase first letter) or ending without sentence punctuation is a fragment. */
export const fragment = (text: string) => ({ head: /^[a-z]/.test(text), tail: !/[.!?:"”)]$/.test(text.trim()) });

export interface Cut { at: number; hard: boolean; negation: boolean }
/**
 * Chunk boundaries strictly inside [from, to) of one document. A cut is hard when no chunk spans it
 * (the text is really severed there); with overlap, a neighbouring chunk covers it and it is soft.
 */
export function cutsIn(spans: [number, number][], words: string[], from: number, to: number): Cut[] {
  const at = new Set<number>();
  for (const [s, e] of spans) for (const p of [s, e]) if (p > from && p < to) at.add(p);
  return [...at].sort((a, b) => a - b).map(p => {
    const hard = !spans.some(([s, e]) => s < p && e > p);
    return { at: p, hard, negation: hard && isNegation(words[p - 1] ?? '') };
  });
}

/** Int8 cosine, showing its parts. The shared quantization scale cancels in the ratio. */
export function cosineParts(q: ArrayLike<number>, c: ArrayLike<number>) {
  let dot = 0, qq = 0, cc = 0;
  for (let i = 0; i < q.length; i++) { dot += q[i] * c[i]; qq += q[i] * q[i]; cc += c[i] * c[i]; }
  const qn = Math.sqrt(qq), cn = Math.sqrt(cc);
  return { dot, qn, cn, cos: qn && cn ? dot / (qn * cn) : 0 };
}

/** The query's position on the PCA map: ((v·scale − mean)·pc1, (v·scale − mean)·pc2), as the build does for chunks. */
export function projectQuery(qv: ArrayLike<number>, scale: number, mean: ArrayLike<number>, pc1: ArrayLike<number>, pc2: ArrayLike<number>): [number, number] {
  let x = 0, y = 0;
  for (let i = 0; i < qv.length; i++) { const d = qv[i] * scale - mean[i]; x += d * pc1[i]; y += d * pc2[i]; }
  return [x, y];
}

/** Fits points into a size×size box with padding, same scale on both axes (so on-screen distance stays honest). */
export function fit(points: [number, number][], size: number, pad: number) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of points) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const k = (size - 2 * pad) / Math.max(x1 - x0, y1 - y0, 1e-9);
  const ox = pad + (size - 2 * pad - (x1 - x0) * k) / 2, oy = pad + (size - 2 * pad - (y1 - y0) * k) / 2;
  return ([x, y]: [number, number]): [number, number] => [ox + (x - x0) * k, oy + (y1 - y) * k];
}

/** Distance in CSS pixels between two map points given in viewBox units, for a map drawn pxPerUnit pixels per unit. */
export const screenDistance = (a: [number, number], b: [number, number], pxPerUnit: number) => Math.hypot(a[0] - b[0], a[1] - b[1]) * pxPerUnit;

/**
 * Retrieval quality for the meters: recall@k = gold sentences that reached the model (whole or cut) / all gold
 * sentences. Counting cut ones keeps it a pure retrieval measure; whether the cut hurt shows in the answer verdict.
 */
export function recallOf(r: RunRecord) {
  const g = r.recall.gold, found = g.filter(x => x.status !== 'missing').length;
  return { k: r.recall.k, found, total: g.length, value: g.length ? found / g.length : 0 };
}

/** The hybrid blend for one chunk (R3): both scores min-max scaled over every chunk, then mixed by the keyword weight. */
export function blendParts(r: RunRecord, id: number) {
  const scaled = (x: Ranked, v: number) => { const hi = x.scores[0], lo = x.scores[x.scores.length - 1]; return hi > lo ? (v - lo) / (hi - lo) : 0; };
  const v = r.stages.vector, b = r.stages.bm25;
  const cos = v.scores[v.ids.indexOf(id)], nv = scaled(v, cos);
  const bm25 = b ? b.scores[b.ids.indexOf(id)] : 0, nb = b ? scaled(b, bm25) : 0;
  return { cos, nv, bm25, nb, w: r.weight, blended: (1 - r.weight) * nv + r.weight * nb };
}
