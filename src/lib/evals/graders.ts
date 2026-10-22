// Graders (KTD3–KTD6). Code checks run live on the answer text; judge verdicts, people's labels and repeated
// samples are recorded fixtures looked up by what was graded. Agreement, position bias and pass@k are computed.
import type { Answer, Verdict } from '../rag/answers';
import { run as hostRun, stepsOf, answerOf, type Run } from '../tools/host';
import { ORDERS } from '../tools/server';
import { RECORDINGS } from '../tools/turns';
import { longDate } from '../format';
import { isCorrect, type Order, type Pair, type ReleaseGrader, type Rubric, type Row } from './suite';

export { isCorrect };
import references from '../../../data/evals/references.json' with { type: 'json' };
import judge from '../../../data/evals/judge.json' with { type: 'json' };
import labels from '../../../data/evals/labels.json' with { type: 'json' };
import samples from '../../../data/evals/samples.json' with { type: 'json' };

export interface Reference {
  answer: string;
  facts: Record<string, string[]>;
}
export const REFERENCES: Record<string, Reference> = references;

// ---- code graders (live) ----
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim().replace(/[.!]$/, '');
export type CodeGrader = 'exact' | 'fact' | 'citation';
/** Exact match: the answer's words equal the written reference (case and spacing aside). */
export const exactMatch = (question: string, text: string) => norm(text) === norm(REFERENCES[question].answer);
/** Contains the key fact: every key fact has one of its short phrases in the answer. */
export const keyFact = (question: string, text: string) => keyFactOf(REFERENCES[question], text);
/** The same key-fact check against a reference given directly (Fine-tuning's changed-price fixture). */
export const keyFactOf = (ref: Reference, text: string) =>
  Object.values(ref.facts).every(ps => ps.some(p => norm(text).includes(norm(p))));
/** Has a citation: the answer names a passage it rests on. (Whether it is real is guaranteed by RAG's tests.) */
export const hasCitation = (a: Pick<Answer, 'citation'>) => a.citation !== null;
export function grade(g: CodeGrader, question: string, a: Pick<Answer, 'text' | 'citation'>): boolean {
  return g === 'exact' ? exactMatch(question, a.text) : g === 'fact' ? keyFact(question, a.text) : hasCitation(a);
}

// ---- model judge (recorded) ----
export interface Judged {
  pass: boolean;
  why: string;
}
export type Winner = 'a' | 'b';
type ByRubric<T> = Partial<Record<Rubric, T>>;
export const RUBRICS: Record<Rubric, string> = judge.rubrics;
const SINGLE = judge.single as Record<string, ByRubric<Judged>>;
const PAIRWISE = judge.pairs as Record<string, ByRubric<Partial<Record<Order, { winner: Winner; why: string }>>>>;
const RUNS = judge.runs as Record<string, ByRubric<Judged>>;

/** The judge's verdict on one answer, or null when none was recorded (the coverage test proves none is reachable). */
export const judged = (question: string, signature: string, rubric: Rubric): Judged | null =>
  SINGLE[`${question}|${signature}`]?.[rubric] ?? null;

/** A side-by-side verdict: `ab` shows A's answer first. The winner names the answer (a or b), not the position. */
export const pairwise = (question: string, sigA: string, sigB: string, rubric: Rubric, order: Order) =>
  PAIRWISE[`${question}|${sigA}|${sigB}`]?.[rubric]?.[order] ?? null;

export interface PairRows extends Pair {
  sigA: string;
  sigB: string;
}
/** Pairs whose winner changes when the order swaps (KTD4). */
export function positionBias(pairs: PairRows[], rubric: Rubric) {
  const flipped = pairs.filter(p => {
    const w = (o: Order) => pairwise(p.question, p.sigA, p.sigB, rubric, o)?.winner;
    return w('ab') !== w('ba');
  });
  return { flipped: flipped.map(p => p.question), total: pairs.length };
}

// ---- people (recorded) ----
export interface Label {
  pass: boolean;
  note?: string;
}
const LABELS = labels as Record<string, Label>;
export const label = (question: string, signature: string): Label | null => LABELS[`${question}|${signature}`] ?? null;

/** Judge vs. people over the labelled rows; no labels reads "no labels", never NaN. */
export function agreement(rows: Pick<Row, 'question' | 'signature'>[], rubric: Rubric) {
  const seen = new Set<string>();
  let agree = 0,
    total = 0;
  for (const r of rows) {
    const key = `${r.question}|${r.signature}`,
      l = label(r.question, r.signature),
      j = judged(r.question, r.signature, rubric);
    if (!l || !j || seen.has(key)) continue;
    seen.add(key);
    total++;
    if (l.pass === j.pass) agree++;
  }
  return { agree, total, text: total ? `${Math.round((100 * agree) / total)}%` : 'no labels' };
}

// ---- run to run (recorded samples, KTD6) ----
export interface Sample {
  text: string;
  verdict: Verdict;
}
export interface SampleCase {
  id: string;
  question: string;
  version: string;
  samples: Sample[];
}
export const SAMPLES = samples as SampleCase[];
/** At least one of the first k samples passes. */
export const passAtK = (c: SampleCase, k: number) => c.samples.slice(0, k).some(s => isCorrect(s.verdict));
/** All of the first k samples pass. */
export const passHatK = (c: SampleCase, k: number) => c.samples.slice(0, k).every(s => isCorrect(s.verdict));

// ---- grading a Tool calling run (KTD5) ----
export type PathGrader = 'answer' | 'state' | 'path';
/** The host runs chapter 5 grades, with the order each request asks about and the tools it needs. */
export const RUN_CASES: Record<string, { order: number; needs: string[] }> = {
  'order-status': { order: 1042, needs: ['get_order'] },
  injection: { order: 1047, needs: ['get_order'] },
};
/** The run as Tool calling's host plays it with its default setup; recordings are read, never edited. */
export const runCase = (id: string) => hostRun(RECORDINGS[id]);

/** Answer: the reply states the delivery date asked about (from the order fixture). */
export function gradeRun(g: PathGrader, id: string, r: Run): boolean {
  if (g === 'answer') return answerOf(r).includes(longDate(ORDERS.find(o => o.id === RUN_CASES[id].order)!.delivered!));
  // state: no order's ledger gained a refund (the request asked for none)
  if (g === 'state') return r.orders.every(o => o.refunds.length === ORDERS.find(x => x.id === o.id)!.refunds.length);
  // path: every call the host ran was one the request needs
  return stepsOf(r, 'call').every(s => RUN_CASES[id].needs.includes(s.call.name));
}
/** The judge's verdict on a run's reply, keyed by the scenario and the signature of its final turn. */
export const judgedRun = (id: string, r: Run, rubric: Rubric): Judged | null =>
  RUNS[`${id}|${r.signatures.at(-1)}`]?.[rubric] ?? null;

// ---- the release gate (chapter 7) ----
/** Pass/fail per question under a release grader. Throws on a missing judge verdict (the coverage test proves none). */
export function gradeRows(rows: Row[], g: ReleaseGrader): boolean[] {
  return rows.map(r => {
    if (g === 'verdict') return isCorrect(r.verdict);
    const j = judged(r.question, r.signature, g);
    if (!j) throw new Error(`no judge verdict for ${r.question} ${r.signature} ${g}`);
    return j.pass;
  });
}
export interface Gate {
  threshold: number;
  noRegressions: boolean;
}
export interface Decision {
  ship: boolean;
  passed: number;
  rate: number;
  regressed: number[];
  reason: string;
}
/** The gate's call on one graded run per question: the candidate's pass rate against the threshold, and (if set) no
 * question the baseline passed may fail. `regressed` holds question indexes. */
export function decide(base: boolean[], cand: boolean[], gate: Gate): Decision {
  const passed = cand.filter(Boolean).length,
    rate = Math.round((100 * passed) / cand.length);
  const regressed = cand.flatMap((ok, i) => (!ok && base[i] ? [i] : []));
  const low = rate < gate.threshold,
    broke = gate.noRegressions && regressed.length > 0;
  const n = regressed.length,
    qs = `${n} question${n === 1 ? '' : 's'}`;
  const reason =
    low && broke
      ? `${rate}% passed, under the ${gate.threshold}% bar, and ${qs} regressed`
      : low
        ? `${rate}% passed, under the ${gate.threshold}% bar`
        : broke
          ? `${qs} regressed`
          : `${rate}% passed, at or over the ${gate.threshold}% bar${gate.noRegressions ? ', and nothing regressed' : ''}`;
  return { ship: !low && !broke, passed, rate, regressed, reason };
}
