// Post-training's questions and graders (KTD4). Each question's answers are hand-written and recorded
// (data/post-training/candidates.json, with a note each); grading runs live. A grader is a set of rules, and an
// answer's reward is how many it passes. Two rules are Evals' code graders (keyFactOf, exactMatchOf) against
// data/post-training/references.json; the rest are weak surface checks a gaming answer can satisfy. Evals' code and
// Fine-tuning's sign-off check are only read.
import { exactMatchOf, keyFactOf, type Reference } from '../evals/graders';
import { signsOff } from '../fine-tuning/engine';
import data from '../../../data/post-training/candidates.json' with { type: 'json' };
import references from '../../../data/post-training/references.json' with { type: 'json' };

export interface Candidate {
  id: string;
  text: string;
  note: string;
  /** the toy policy's starting probability, set by hand */
  ref: number;
  best?: boolean;
  gaming?: boolean;
  base?: boolean;
}
export interface Question {
  id: string;
  /** checkable: a grader can tell right from wrong; tone: every answer carries the fact, only people can compare */
  kind: 'checkable' | 'tone';
  query: string;
  candidates: Candidate[];
}
export const QUESTIONS = data.questions as Question[];
export const REFERENCES: Record<string, Reference> = references;
/** Chapter by chapter: the base-or-assistant and weak-grader question, the GRPO question and the tone question. */
export const REFUND = 'refund-window',
  PRICE = 'k2-price',
  TONE = 'late-again';

export function question(id: string): Question {
  const q = QUESTIONS.find(x => x.id === id);
  if (!q) throw new Error(`unknown question: ${id}`);
  return q;
}
/** The toy policy's starting point (the reference policy) for one question. */
export const refOf = (id: string) => question(id).candidates.map(c => c.ref);
export const bestOf = (id: string) => question(id).candidates.findIndex(c => c.best);
export const gamingOf = (id: string) => question(id).candidates.findIndex(c => c.gaming);

export type RuleId = 'fact' | 'exact' | 'number' | 'signoff' | 'short';
export interface Rule {
  id: RuleId;
  label: string;
}
/** The rules a grader is built from, in the workbench's order. */
export const RULES: Rule[] = [
  { id: 'fact', label: 'Has the key fact' },
  { id: 'exact', label: 'Matches the reference word for word' },
  { id: 'number', label: 'Has a number' },
  { id: 'signoff', label: 'Signs off' },
  { id: 'short', label: 'Under 20 words' },
];
export const SHORT_WORDS = 20;
const words = (t: string) => t.trim().split(/\s+/).length;

/** One rule on one answer, run live. */
export function passes(rule: RuleId, q: string, text: string): boolean {
  switch (rule) {
    case 'fact':
      return keyFactOf(REFERENCES[q], text);
    case 'exact':
      return exactMatchOf(REFERENCES[q], text);
    case 'number':
      return /\d/.test(text);
    case 'signoff':
      return signsOff(text);
    case 'short':
      return words(text) < SHORT_WORDS;
  }
}
/** The full grader (the key fact) and the team's cheap one (a number and a sign-off). */
export const FULL: RuleId[] = ['fact'],
  WEAK: RuleId[] = ['number', 'signoff'];
/** Each answer's reward under a grader: how many of its rules it passes. */
export const rewardsOf = (q: string, rules: RuleId[]) =>
  question(q).candidates.map(c => rules.filter(r => passes(r, q, c.text)).length);
