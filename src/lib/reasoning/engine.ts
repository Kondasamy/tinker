// Reasoning's engine (KTD5). Recorded, per question × effort: the thinking and the answer, each with a one-line note
// (data/reasoning/answers.json, hand-written: they illustrate Snell 2024 and Gema 2025, they were not measured). Live:
// the token counts (the site's BPE), the grade (Evals' key-fact check: Evals' references for Evals' questions, keyFactOf
// for Reasoning's own), the cost (relative units: one output token is 1, thinking billed as output) and the wait (from
// Larkspur's assumed rate in assumptions.json). Evals' data is only read.
import { encode } from '../lm/bpe';
import { decide, keyFact, keyFactOf, type Gate, type Reference } from '../evals/graders';
import { QUESTIONS as EVALS_QUESTIONS } from '../evals/suite';
import data from '../../../data/reasoning/questions.json' with { type: 'json' };
import references from '../../../data/reasoning/references.json' with { type: 'json' };
import answers from '../../../data/reasoning/answers.json' with { type: 'json' };
import assumptions from '../../../data/reasoning/assumptions.json' with { type: 'json' };

/** Effort levels, lowest first. They name the APIs' effort settings, not a token count. */
export const EFFORTS = ['none', 'low', 'medium', 'high'] as const;
export type Effort = (typeof EFFORTS)[number];

export type KindId = 'lookup' | 'multistep' | 'distractor';
export interface Kind {
  id: KindId;
  label: string;
  short: string;
  about: string;
}
export interface Question {
  id: string;
  kind: KindId;
  query: string;
  given: string;
}
export interface Recorded {
  thinking: string;
  answer: string;
  note: string;
}

export const KINDS = data.kinds as Kind[];
const REFS = references as Record<string, Reference>;
/** Every question: Evals' lookups take Evals' own words; the rest are Reasoning's. */
export const QUESTIONS: Question[] = data.questions.map(q => ({
  id: q.id,
  kind: q.kind as KindId,
  given: q.given,
  query: 'query' in q ? q.query! : EVALS_QUESTIONS.find(e => e.id === q.id)!.query,
}));
export const question = (id: string) => QUESTIONS.find(q => q.id === id)!;
export const ofKind = (k: KindId) => QUESTIONS.filter(q => q.kind === k);
export const kindOf = (k: KindId) => KINDS.find(x => x.id === k)!;

/** Larkspur's planning rate for the wait: an assumption, not a provider figure (outside the facts gate). */
export const ASSUMPTIONS = assumptions;

const ANSWERS = answers as Record<string, Partial<Record<Effort, Recorded>>>;
/** Every recorded key, `question|effort`: the coverage test proves each is reachable. */
export const RECORDED = Object.entries(ANSWERS).flatMap(([q, by]) => Object.keys(by).map(e => `${q}|${e}`));

/** The recorded answer; throws on a missing one (the coverage test proves none is reachable). */
export function answer(q: string, e: Effort): Recorded {
  const a = ANSWERS[q]?.[e];
  if (!a) throw new Error(`no recorded answer for ${q} ${e}`);
  return a;
}

/** The key-fact check: Evals' reference for its questions, Reasoning's own otherwise. */
export const factOk = (q: string, text: string) => (REFS[q] ? keyFactOf(REFS[q], text) : keyFact(q, text));

export interface Run extends Recorded {
  question: string;
  effort: Effort;
  right: boolean;
  thinkingTokens: number;
  answerTokens: number;
  cost: number;
  wait: number;
}
/** One question at one effort: the recorded words, counted, graded, costed and timed live. */
export function run(q: string, e: Effort): Run {
  const a = answer(q, e),
    thinkingTokens = a.thinking ? encode(a.thinking).length : 0,
    answerTokens = encode(a.answer).length;
  const cost = thinkingTokens + answerTokens;
  return {
    ...a,
    question: q,
    effort: e,
    right: factOk(q, a.answer),
    thinkingTokens,
    answerTokens,
    cost,
    wait: ASSUMPTIONS.firstTokenSeconds + cost / ASSUMPTIONS.tokensPerSecond,
  };
}

export interface Point {
  effort: Effort;
  right: number;
  of: number;
  accuracy: number;
  cost: number;
  wait: number;
}
/** Accuracy, total cost and average wait per effort over a set of questions. */
export const sweep = (qs: string[], efforts: readonly Effort[] = EFFORTS): Point[] =>
  efforts.map(effort => {
    const rs = qs.map(q => run(q, effort)),
      right = rs.filter(r => r.right).length;
    return {
      effort,
      right,
      of: qs.length,
      accuracy: qs.length ? right / qs.length : 0,
      cost: rs.reduce((n, r) => n + r.cost, 0),
      wait: rs.reduce((n, r) => n + r.wait, 0) / (rs.length || 1),
    };
  });

/** Chapter 6's gate: Evals' rule, a pass-rate bar and no question that passed with no thinking may fail. */
export const GATE: Gate = { threshold: 80, noRegressions: true };
/** The baseline every effort is gated against: no thinking. */
export const BASELINE: Effort = 'none';
/** Evals' decide over one kind's questions at one effort, against the baseline. */
export function gateKind(k: KindId, e: Effort, gate = GATE) {
  const grade = (x: Effort) => ofKind(k).map(q => run(q.id, x).right);
  return decide(grade(BASELINE), grade(e), gate);
}
/** The lowest effort the gate ships for a kind, or null when none does. */
export const lowestPassing = (k: KindId, gate = GATE) => EFFORTS.find(e => gateKind(k, e, gate).ship) ?? null;

// ---- coverage domains (KTD12): what each chapter's controls can reach ----

export interface Domain {
  questions: string[];
  efforts: readonly Effort[];
}
const ids = (k: KindId) => ofKind(k).map(q => q.id);
/** Chapter 1 and 2's question: a quote where the volume price applies per order line. */
export const SPLIT = 'quote-split-lines';
/** Chapter 5's pair: a lookup and a multi-step question at the same efforts. */
export const HINT_PAIR = ['same-day-cutoff', 'delivery-cutoff'];
export const DOMAINS: Record<string, Domain> = {
  '01-answer-now-or-think-first': { questions: [SPLIT], efforts: ['none', 'medium'] },
  '02-thinking-is-tokens': { questions: [SPLIT], efforts: EFFORTS },
  '03-the-effort-dial': { questions: ids('multistep'), efforts: EFFORTS },
  '04-when-more-thinking-hurts': { questions: ids('distractor'), efforts: EFFORTS },
  '05-effort-is-a-hint': { questions: HINT_PAIR, efforts: EFFORTS },
  '06-measure-then-pick': { questions: QUESTIONS.map(q => q.id), efforts: EFFORTS },
};
/** Chapter 7: an effort per kind, every question. */
export const WORKBENCH_DOMAINS: Domain = { questions: QUESTIONS.map(q => q.id), efforts: EFFORTS };
export const combos = (d: Domain) => d.questions.flatMap(q => d.efforts.map(e => [q, e] as [string, Effort]));
