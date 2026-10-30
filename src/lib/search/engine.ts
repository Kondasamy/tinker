// Search before AI (KTD5): keyword search over Larkspur's documents, run live. The pages are RAG's default chunks (fixed
// 32 words, no overlap), cut here from RAG's committed corpus the way scripts/build-index.mjs cuts them, so a page id is
// RAG's chunk id and keyword and vector scores rank the same things (a test checks the cut against RAG's index). BM25 is
// RAG's own (buildBm25, with this module's word cleaning); the scan, the plain count and tf-idf are this module's.
// Relevance labels are hand-written (data/search/queries.json); precision and recall are computed.
import corpus from '../../../public/data/index/corpus.json' with { type: 'json' };
import queries from '../../../data/search/queries.json' with { type: 'json' };
import { buildBm25, type Bm25 } from '../rag/bm25';
import { cleanKey, wordsOf, type Clean } from './stem';
import { LUCENE_B, LUCENE_K1 } from './facts';

export const PAGE_WORDS = 32;
export interface Page {
  id: number;
  doc: string;
  title: string;
  /** the page's number within its document, from 1 */
  n: number;
  text: string;
}
export const PAGES: Page[] = corpus.flatMap(d => {
  const out: Page[] = [];
  for (let i = 0; ; i += PAGE_WORDS) {
    out.push({ id: 0, doc: d.id, title: d.title, n: out.length + 1, text: d.words.slice(i, i + PAGE_WORDS).join(' ') });
    if (i + PAGE_WORDS >= d.words.length) break;
  }
  return out;
});
PAGES.forEach((p, i) => {
  p.id = i;
});
export const N = PAGES.length;
export const DOCS = corpus.length;
/** A page's short name: its document's title and page number. */
export const pageName = (id: number) => `${PAGES[id].title}, p. ${PAGES[id].n}`;
/** A page id by its reference, "doc#n". */
export function pageOf(ref: string): number {
  const [doc, n] = ref.split('#');
  const p = PAGES.find(x => x.doc === doc && x.n === Number(n));
  if (!p) throw new Error(`no page ${ref}`);
  return p.id;
}

export { num as fmt } from '../format';

// ---- the index ----

/** How a page's words become one score. */
export type Weighting = 'count' | 'tfidf' | 'bm25';
export const K1S = [0.5, 1.2, 3] as const;
export const BS = [0, 0.75, 1] as const;
export type K1 = (typeof K1S)[number];
export type B = (typeof BS)[number];

export interface Settings {
  clean: Clean;
  weighting: Weighting;
  k1: K1;
  b: B;
}
/** Lucene's BM25 defaults (RAG's too), every cleaning on; a test checks they are on the bench's choices. */
export const DEFAULT: Settings = {
  clean: { lower: true, stop: true, stem: true },
  weighting: 'bm25',
  k1: LUCENE_K1 as K1,
  b: LUCENE_B as B,
};

const built = new Map<string, Bm25>();
/** The inverted index over every page, built once per cleaning and BM25 setting. */
export function indexOf(clean: Clean, k1: number = DEFAULT.k1, b: number = DEFAULT.b): Bm25 {
  const key = `${cleanKey(clean)}|${k1}|${b}`;
  let x = built.get(key);
  if (!x) {
    const texts = PAGES.map(p => p.text);
    built.set(key, (x = buildBm25(texts, t => wordsOf(t, clean), k1, b)));
  }
  return x;
}

/** The pages a word is on (its drawer), and how often. */
export const postings = (word: string, clean: Clean) => indexOf(clean).postings(word) ?? { doc: [], tf: [] };
/** How rare a word is: tf-idf's weight, log(N / pages it is on); 0 for a word on no page. */
export function idf(word: string, clean: Clean): number {
  const df = postings(word, clean).doc.length;
  return df ? Math.log(N / df) : 0;
}
/** A query's different words, cleaned, in order. */
export const termsOf = (query: string, clean: Clean) => [...new Set(wordsOf(query, clean))];

/** Every page's score for a query. */
export function scores(query: string, s: Settings): Float32Array {
  if (s.weighting === 'bm25') return indexOf(s.clean, s.k1, s.b).score(query);
  const out = new Float32Array(N);
  for (const w of termsOf(query, s.clean)) {
    const p = postings(w, s.clean),
      weight = s.weighting === 'count' ? 1 : idf(w, s.clean);
    p.doc.forEach((d, i) => {
      out[d] += weight * p.tf[i];
    });
  }
  return out;
}

export interface Hit {
  id: number;
  score: number;
}
/** Pages that score above 0, best first; ties go to the earlier page. */
export function ranked(sc: ArrayLike<number>): Hit[] {
  const out: Hit[] = [];
  for (let id = 0; id < sc.length; id++) if (sc[id] > 0) out.push({ id, score: sc[id] });
  return out.sort((a, b) => b.score - a.score || a.id - b.id);
}
export const search = (query: string, s: Settings = DEFAULT) => ranked(scores(query, s));

/** The clerk with no index: reads every page and keeps those with any of the query's words. */
export function scan(query: string, clean: Clean = DEFAULT.clean) {
  const want = new Set(termsOf(query, clean));
  const found = PAGES.filter(p => wordsOf(p.text, clean).some(w => want.has(w))).map(p => p.id);
  return { read: N, found };
}
/** The same request through the index: one drawer per query word, and the pages filed in them. */
export function lookup(query: string, clean: Clean = DEFAULT.clean) {
  const drawers = termsOf(query, clean);
  const found = [...new Set(drawers.flatMap(w => postings(w, clean).doc))].sort((a, b) => a - b);
  return { drawers, found };
}

// ---- meaning: RAG's vectors (KTD5) ----

/** Blends keyword and meaning scores, each scaled to 0..1 over the pages; w is meaning's share (0: keywords only). */
export function blend(keyword: ArrayLike<number>, meaning: ArrayLike<number>, w: number): Float32Array {
  const unit = (a: ArrayLike<number>) => {
    let lo = Infinity,
      hi = -Infinity;
    for (let i = 0; i < a.length; i++) {
      lo = Math.min(lo, a[i]);
      hi = Math.max(hi, a[i]);
    }
    return (i: number) => (hi > lo ? (a[i] - lo) / (hi - lo) : 0);
  };
  const k = unit(keyword),
    m = unit(meaning);
  // a meaning-only score of 0 still ranks: shift every page above 0 when meaning counts
  return Float32Array.from({ length: keyword.length }, (_, i) => (1 - w) * k(i) + w * m(i) + (w > 0 ? 1e-6 : 0));
}

// ---- the labelled queries ----

export type Kind = 'words' | 'endings' | 'meaning' | 'part';
export interface Query {
  id: string;
  text: string;
  kind: Kind;
  /** the right pages, hand-labelled */
  right: number[];
}
export const QUERIES: Query[] = queries.queries.map(q => ({
  id: q.id,
  text: q.text,
  kind: q.kind as Kind,
  right: q.right.map(pageOf),
}));
export const queryOf = (id: string) => {
  const q = QUERIES.find(x => x.id === id);
  if (!q) throw new Error(`no search query ${id}`);
  return q;
};
export const TOP = 5;

export interface Judged {
  /** right pages in the top 5 */
  hits: number;
  /** of the top 5, the share that is right */
  precision: number;
  /** of the right pages, the share in the top 5 */
  recall: number;
  /** the first right page left out of the top 5, if any */
  missed?: number;
  /** where that page ranked (1-based), 0 if it never matched */
  missedAt: number;
}
/** Precision@5 and recall@5 for one ranking against the labels. */
export function judge(hits: Hit[], right: readonly number[]): Judged {
  const top = hits.slice(0, TOP).map(h => h.id);
  const n = right.filter(r => top.includes(r)).length;
  const missed = right.find(r => !top.includes(r));
  return {
    hits: n,
    precision: n / TOP,
    recall: n / right.length,
    missed,
    missedAt: missed === undefined ? 0 : hits.findIndex(h => h.id === missed) + 1,
  };
}
