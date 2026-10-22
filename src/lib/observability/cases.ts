// From trace to test (KTD8, chapter 6). A failed trace becomes an eval case: its question, a written reference, and two
// answers to grade: the reply in the trace (the current version) and the fixed version's recorded answer
// (data/observability/fixed.json). Grading is live, by Evals' own code graders: the key fact (keyFactOf) and the
// citation (hasCitation). Evals' data and recordings are read, never edited.
import fixed from '../../../data/observability/fixed.json' with { type: 'json' };
import { hasCitation, keyFactOf, type Reference } from '../evals/graders';
import { replyOf, traceOf } from './traces';

export type Version = 'current' | 'fixed';
export interface Answer {
  text: string;
  citation: string | null;
}
export interface EvalCase {
  id: string;
  question: string;
  reference: Reference;
  answers: Record<Version, Answer>;
  note: string;
}
interface Recorded {
  reference: Reference;
  fixed: Answer;
  note: string;
}
const CASES = fixed.cases as Record<string, Recorded>;
/** what the fixed version changed, in one line */
export const FIXED_VERSION = fixed.version;
export const CASE_IDS = Object.keys(CASES);

/** The eval case a failed trace becomes. Throws when none is recorded (the coverage test proves none is reachable). */
export function evalCase(id: string): EvalCase {
  const r = CASES[id];
  if (!r) throw new Error(`no eval case recorded for trace ${id}`);
  const t = traceOf(id);
  return {
    id,
    question: t.question,
    reference: r.reference,
    note: r.note,
    answers: { current: { text: replyOf(t), citation: t.citation ?? null }, fixed: r.fixed },
  };
}

export interface Graded {
  fact: boolean;
  citation: boolean;
  pass: boolean;
}
/** Evals' code graders on one version's answer: the key fact and a citation, both needed to pass. */
export function gradeCase(id: string, v: Version): Graded {
  const c = evalCase(id),
    a = c.answers[v],
    fact = keyFactOf(c.reference, a.text),
    citation = hasCitation(a);
  return { fact, citation, pass: fact && citation };
}
