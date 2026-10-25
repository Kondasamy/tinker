// Calibration, chapters 1, 6 and 7 (KTD8): a stand-in set of sixty answers by Larkspur's support assistant, each with a
// hand-set confidence (data/calibration/answers.json), written to show the overconfidence Guo et al. report. The copy
// labels it a stand-in wherever it shows. Grading is live: Evals' key-fact check, against Evals' reference where an
// answer names one, otherwise against this module's references. Evals' data is only read.
import { keyFact, keyFactOf, type Reference } from '../evals/graders';
import { soften, type Item } from './score';
import data from '../../../data/calibration/answers.json' with { type: 'json' };
import references from '../../../data/calibration/references.json' with { type: 'json' };

export type KindId = 'orders' | 'policy' | 'products';
export interface Kind {
  id: KindId;
  label: string;
  about: string;
}
export interface Answer {
  id: string;
  kind: KindId;
  question: string;
  text: string;
  /** hand-set stand-in, 0 to 1 */
  confidence: number;
  note: string;
  /** an Evals question whose reference grades it */
  evals?: string;
}
export const KINDS = data.kinds as Kind[];
export const KIND_IDS = KINDS.map(k => k.id);
export const ANSWERS = data.answers as Answer[];
const REFS = references as Record<string, Reference>;

/** Evals' key-fact check, run live on the recorded text. */
export function isRight(a: Answer) {
  if (a.evals) return keyFact(a.evals, a.text);
  const ref = REFS[a.id];
  if (!ref) throw new Error(`no reference for ${a.id}`);
  return keyFactOf(ref, a.text);
}
const graded = new Map(ANSWERS.map(a => [a.id, isRight(a)]));
export const right = (a: Answer) => graded.get(a.id)!;

/** The answers as items: their stated confidence (at a temperature: 1 leaves it as written) and whether right. */
export const itemsOf = (as: Answer[] = ANSWERS, T = 1): Item[] =>
  as.map(a => ({ c: T === 1 ? a.confidence : soften(a.confidence, T), ok: right(a) }));
export const ofKind = (k: KindId) => ANSWERS.filter(a => a.kind === k);

/** The fewest answers a jar holds for this small set. */
export const MIN_ANSWERS = 5;
/** Hand over every answer below the threshold to a person. 0 hands over nothing. */
export const THRESHOLDS = [0, 0.7, 0.8, 0.9, 0.95] as const;
export type Threshold = (typeof THRESHOLDS)[number];
