// Pre-recorded model answers keyed by evidence signature (KTD6, R21). One reviewed file per question.
export type Verdict = 'correct' | 'wrong' | 'notfound' | 'madeup';
export interface Answer {
  verdict: Verdict;
  text: string;
  /** exact corpus sentence the answer rests on, or null */
  citation: string | null;
  /** one line on what went wrong; required unless correct */
  why?: string;
}
export type Lookup = Answer | { verdict: 'norecord' };

const files = import.meta.glob<Record<string, Answer>>('/data/answers/*.json', { eager: true, import: 'default' });
export const ANSWERS: Record<string, Record<string, Answer>> = Object.fromEntries(
  Object.entries(files).map(([path, table]) => [path.slice(path.lastIndexOf('/') + 1, -'.json'.length), table]),
);

/** The recorded answer for this evidence, or `norecord` so the UI can say none exists (retrieval still shows). */
export function lookup(questionId: string, signature: string): Lookup {
  return ANSWERS[questionId]?.[signature] ?? { verdict: 'norecord' };
}
