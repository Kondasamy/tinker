// The evals test subject (KTD2): named RAG pipeline versions run live over RAG's 12 questions. Each row is the
// recorded answer for the evidence that version handed the model, so a version only reads existing answers.
import type { RagIndex } from '../rag/load';
import { run } from '../rag/engine';
import { resolveConfig, type ChunkParams } from '../rag/lattice';
import { signature, NO_CONTEXT, type KeyedQuestion } from '../rag/signature';
import { lookup, type Answer, type Verdict } from '../rag/answers';
import ch3 from '../../../data/questions/ch3.json';
import ch4 from '../../../data/questions/ch4.json';
import ch5 from '../../../data/questions/ch5.json';
import ch6 from '../../../data/questions/ch6.json';

/** The test set: every RAG question, in chapter order. */
export const QUESTIONS = [...ch3, ...ch4, ...ch5, ...ch6] as KeyedQuestion[];

export type VersionId = 'v0' | 'v1' | 'v2' | 'v3';
export interface Version {
  id: VersionId;
  label: string;
  /** what changed, in one line */
  note: string;
  /** null = no retrieval: the model answers alone (every signature is `nocontext`) */
  knobs: (ChunkParams & { topK: number; rerank: boolean }) | null;
}
// Picked by computing every candidate over the 12 questions (U1 step 1): v1 → v2 fixes card-data-retention and
// dock-sensor-warranty and breaks k2-volume-price; v3 fixes four of v1's misses and breaks none.
export const VERSIONS: Record<VersionId, Version> = {
  v0: { id: 'v0', label: 'v0', note: 'The model alone, with no documents', knobs: null },
  v1: {
    id: 'v1',
    label: 'v1',
    note: '32-word pieces, the best 3 sent (RAG’s defaults)',
    knobs: { strategy: 'fixed', size: 32, overlap: 0, topK: 3, rerank: false },
  },
  v2: {
    id: 'v2',
    label: 'v2',
    note: 'Bigger pieces: 48 words',
    knobs: { strategy: 'fixed', size: 48, overlap: 0, topK: 3, rerank: false },
  },
  v3: {
    id: 'v3',
    label: 'v3',
    note: '48-word pieces, the reranker on, the best 5 sent',
    knobs: { strategy: 'fixed', size: 48, overlap: 0, topK: 5, rerank: true },
  },
};
export const VERSION_IDS = Object.keys(VERSIONS) as VersionId[];

/** The index file a version needs loaded before `runSuite`, or null when it retrieves nothing. */
export const fileOf = (v: VersionId) => (VERSIONS[v].knobs ? resolveConfig(VERSIONS[v].knobs!).file : null);

export interface Row {
  question: string;
  signature: string;
  answer: Answer;
  verdict: Verdict;
}

/** One row per question. Throws if the version's config is not loaded or an answer is missing (the coverage test proves neither happens). */
export function runSuite(index: RagIndex, v: VersionId): Row[] {
  const k = VERSIONS[v].knobs,
    file = fileOf(v),
    cfg = file ? index.get(file) : null;
  if (file && !cfg) throw new Error(`load ${file} before running ${v}`);
  return QUESTIONS.map(q => {
    const sig = k
      ? signature(index, q, run(index, cfg!, { question: q, topK: k.topK, rerank: k.rerank }).context)
      : NO_CONTEXT;
    const a = lookup(q.id, sig);
    if (a.verdict === 'norecord') throw new Error(`no recorded answer for ${q.id} ${sig}`);
    return { question: q.id, signature: sig, answer: a as Answer, verdict: a.verdict };
  });
}

/** The reference grade: the recorded answer's verdict. */
export const isCorrect = (v: Verdict) => v === 'correct';

export const passed = (rows: Row[]) => rows.filter(r => isCorrect(r.verdict)).length;

/** Questions `after` gets right that `before` got wrong (fixed), and the other way round (broken). */
export function compare(before: Row[], after: Row[]) {
  const was = new Map(before.map(r => [r.question, isCorrect(r.verdict)]));
  const now = after.map(r => ({ id: r.question, ok: isCorrect(r.verdict) }));
  return {
    fixed: now.filter(r => r.ok && !was.get(r.id)).map(r => r.id),
    broken: now.filter(r => !r.ok && was.get(r.id)).map(r => r.id),
  };
}

export type Rubric = 'r1' | 'r2';
export type Order = 'ab' | 'ba';
/** A side-by-side case (KTD4): one question, two versions' answers. */
export interface Pair {
  question: string;
  a: VersionId;
  b: VersionId;
}
export const PAIRS: Pair[] = [
  { question: 'card-data-retention', a: 'v1', b: 'v2' },
  { question: 'k2-volume-price', a: 'v1', b: 'v2' },
  { question: 'payment-methods', a: 'v1', b: 'v2' },
  { question: 'dock-sensor-warranty', a: 'v1', b: 'v2' },
];

/** What grades a release: the recorded answer's verdict, or the model judge under a rubric. */
export type ReleaseGrader = 'verdict' | Rubric;
/** The shipped version every candidate is compared against. */
export const BASELINE: VersionId = 'v1';
const WORKBENCH_VERSIONS: VersionId[] = ['v0', 'v2', 'v3'];
/** Chapter 7's controls: candidate, grader, pass-rate threshold (percent), and whether a question that passed on the
 * baseline may fail. The coverage test walks every combination (via DOMAINS['07-release-day'] and evals-workbench). */
export const WORKBENCH_DOMAINS = {
  versions: WORKBENCH_VERSIONS,
  graders: ['verdict', 'r1', 'r2'] as ReleaseGrader[],
  thresholds: [50, 60, 75, 90],
  noRegressions: [false, true],
};

/** The finite values each chapter's controls can take, read by the chapters themselves; the coverage test grades every
 * combination. */
export interface Domain {
  versions: VersionId[];
  rubrics: Rubric[];
  pairs?: boolean;
}
export const DOMAINS: Record<string, Domain> = {
  '01-it-worked-when-i-tried-it': { versions: ['v1', 'v2'], rubrics: [] },
  // chapter 3's answers: the model alone (v0) and the shipped version (v1), judged under r1
  '03-graders': { versions: ['v0', 'v1'], rubrics: ['r1'] },
  '04-judge-the-judge': { versions: ['v0', 'v1', 'v2'], rubrics: ['r1', 'r2'], pairs: true },
  // the workbench's candidates and the baseline, under each judge rubric it offers
  '07-release-day': { versions: ['v1', ...WORKBENCH_VERSIONS], rubrics: ['r1', 'r2'] },
};
