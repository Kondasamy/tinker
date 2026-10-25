// Search chapter 7's workbench: tune Larkspur's search box against the labelled test searches (data/search/queries.json).
// A plan is a word cleaning (8), how much a repeat helps (k1, 3), how much a long page counts against it (b, 3) and how
// much meaning counts (5): 360 plans. It scores the right pages its top 5 finds over every test search. Meaning reads
// RAG's committed vectors, which the page loads, so the winners are pinned in data/search/pinned.json; a unit test
// recomputes them from the live engine (KTD12). The puzzle accepts every plan tied for the best (WINNERS).
import pinned from '../../../data/search/pinned.json' with { type: 'json' };
import { BS, K1S, QUERIES, blend, judge, ranked, scores, type B, type Judged, type K1 } from './engine';
import { CLEANS, cleanKey, type Clean } from './stem';

export const MEANINGS = [0, 0.25, 0.5, 0.75, 1] as const;
export type Meaning = (typeof MEANINGS)[number];
export interface Plan {
  clean: Clean;
  k1: K1;
  b: B;
  meaning: Meaning;
}
export const planKey = (p: Plan) => `${cleanKey(p.clean)}|${p.k1}|${p.b}|${p.meaning}`;
export const PLANS: Plan[] = CLEANS.flatMap(clean =>
  K1S.flatMap(k1 => BS.flatMap(b => MEANINGS.map(meaning => ({ clean, k1, b, meaning })))),
);
/** Where the bench starts: words as typed, RAG's BM25 settings, no meaning. */
export const START: Plan = { clean: CLEANS[0], k1: 1.2, b: 0.75, meaning: 0 };
export const RIGHT = QUERIES.reduce((n, q) => n + q.right.length, 0);

/** Every page's meaning score per test search, in QUERIES order (cosines with RAG's chunk vectors). */
export type Meanings = readonly ArrayLike<number>[];

/** One test search under a plan, judged against its labels. */
export function rowOf(p: Plan, qi: number, meanings: Meanings | null): Judged {
  const q = QUERIES[qi],
    kw = scores(q.text, { clean: p.clean, weighting: 'bm25', k1: p.k1, b: p.b });
  if (p.meaning > 0 && !meanings) throw new Error('meaning scores are not loaded');
  return judge(ranked(p.meaning === 0 ? kw : blend(kw, meanings![qi], p.meaning)), q.right);
}
/** Right pages in the top 5, over every test search. */
export const scoreOf = (p: Plan, meanings: Meanings | null) =>
  QUERIES.reduce((n, _, qi) => n + rowOf(p, qi, meanings).hits, 0);

/** The pinned answer, recomputed by tests/unit/search-workbench.test.ts. */
export const BEST: number = pinned.workbench.best;
export const WINNERS: string[] = pinned.workbench.winners;
export const wins = (p: Plan) => WINNERS.includes(planKey(p));
export const planOf = (key: string): Plan => {
  const p = PLANS.find(x => planKey(x) === key);
  if (!p) throw new Error(`no plan ${key}`);
  return p;
};

/** Every plan tied for the most right pages: what the pin must equal. */
export function solve(meanings: Meanings) {
  const all = PLANS.map(p => ({ key: planKey(p), n: scoreOf(p, meanings) }));
  const best = Math.max(...all.map(x => x.n));
  return { best, winners: all.filter(x => x.n === best).map(x => x.key) };
}

/** A saved plan, read defensively: anything unknown falls back to the start. */
export function benchPlan(x: unknown): Plan {
  const o = (x ?? {}) as Partial<Plan>;
  const c = (o.clean ?? {}) as Partial<Clean>;
  const pick = <T>(list: readonly T[], v: unknown, d: T) => (list.includes(v as T) ? (v as T) : d);
  return {
    clean: { lower: c.lower === true, stop: c.stop === true, stem: c.stem === true },
    k1: pick(K1S, o.k1, START.k1),
    b: pick(BS, o.b, START.b),
    meaning: pick(MEANINGS, o.meaning, START.meaning),
  };
}
