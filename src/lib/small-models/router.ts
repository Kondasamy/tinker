// Small models, chapters 4–7 (KTD6): two tiers of Larkspur's assistant, small and large, over Evals' twelve questions.
// Their answers are recorded (data/small-models/answers.json); each small answer carries a hand-set confidence, a
// stand-in score set to show the trade-off, as Guardrails' classifier scores are. Grading is live (Evals' key-fact
// check against data/evals/references.json) and the release gate is Evals' decide. Costs are relative units: a large
// answer is 1, a small one the dated vendor price ratio in facts.json. Evals' data is only read.
import { decide, keyFact, type Decision, type Gate } from '../evals/graders';
import { QUESTIONS } from '../evals/suite';
import { fact } from './facts';
import answers from '../../../data/small-models/answers.json' with { type: 'json' };

export type Tier = 'small' | 'large';
export const TIERS: Tier[] = ['small', 'large'];
export interface Recorded { text: string; note: string; confidence?: number }
const ANSWERS = answers as Record<Tier, Record<string, Recorded>>;

/** Evals' questions, in chapter order. */
export const QUESTION_IDS = QUESTIONS.map((q) => q.id);
export const questionText = (id: string) => QUESTIONS.find((q) => q.id === id)?.query ?? id;

/** The recorded answer; throws on a missing one (the coverage test proves none is reachable). */
export function answer(tier: Tier, question: string): Recorded {
  const a = ANSWERS[tier]?.[question];
  if (!a) throw new Error(`no recorded answer for ${tier} ${question}`);
  return a;
}
/** The small tier's stand-in confidence for one answer, in [0, 1]. */
export const confidence = (question: string) => answer('small', question).confidence!;
/** Evals' key-fact check on a tier's recorded answer, run live. */
export const passes = (tier: Tier, question: string) => keyFact(question, answer(tier, question).text);

/** What one answer costs, relative to a large answer (1). The small tier's price is the vendor pair's ratio. */
export const SMALL_COST = Number(fact('price-pair').value);
export const COST: Record<Tier, number> = { small: SMALL_COST, large: 1 };

/** The thresholds a chapter can set: below it, the small tier's answer goes up to the large tier. 0 sends nothing up;
 * 1 sends everything up (no small answer is fully sure). */
export const THRESHOLDS = [0, 0.5, 0.6, 0.7, 0.8, 0.9, 1];

/** A policy: one tier for everything, or the router (small first, up to large below the threshold). */
export type Policy = { tier: Tier } | { threshold: number };
export const ALL_LARGE: Policy = { tier: 'large' }, ALL_SMALL: Policy = { tier: 'small' };

export interface Routed { question: string; tier: Tier; escalated: boolean; confidence: number; pass: boolean; cost: number; answer: Recorded }
/** One question under a policy. A routed answer that falls back pays for both tries: the small one, then the large. */
export function route(question: string, p: Policy): Routed {
  const conf = confidence(question);
  if ('tier' in p) return { question, tier: p.tier, escalated: false, confidence: conf, pass: passes(p.tier, question), cost: COST[p.tier], answer: answer(p.tier, question) };
  const up = conf < p.threshold, tier: Tier = up ? 'large' : 'small';
  return { question, tier, escalated: up, confidence: conf, pass: passes(tier, question), cost: COST.small + (up ? COST.large : 0), answer: answer(tier, question) };
}

/** A policy over a set of questions: a row per question, then right answers and total cost. */
export function run(p: Policy, questions = QUESTION_IDS) {
  const rows = questions.map((q) => route(q, p));
  return { rows, right: rows.filter((r) => r.pass).length, cost: rows.reduce((n, r) => n + r.cost, 0), up: rows.filter((r) => r.escalated).length, of: rows.length };
}

/** The small tier's most confident wrong answer: the one a threshold has to pass to catch (chapters 4–6 read it). */
export const SURE_AND_WRONG = run(ALL_SMALL).rows.filter((r) => !r.pass).sort((a, b) => b.confidence - a.confidence)[0].question;

/** A point on the quality and cost frontier. */
export interface Point { id: string; label: string; threshold: number | null; right: number; of: number; cost: number; up: number }
const pointOf = (p: Policy): Point => {
  const r = run(p), t = 'threshold' in p ? p.threshold : null;
  return { id: t === null ? `all-${(p as { tier: Tier }).tier}` : `t${t}`, label: t === null ? `All ${(p as { tier: Tier }).tier}` : `Below ${t}`, threshold: t, right: r.right, of: r.of, cost: r.cost, up: r.up };
};
/** The router at every threshold, in order, then all-large for comparison. */
export const frontier = (): Point[] => [...THRESHOLDS.map((threshold) => pointOf({ threshold })), pointOf(ALL_LARGE)];

/** Larkspur's release gate for the router: Evals' decide with a 90% bar, and no question all-large gets right may fail. */
export const GATE: Gate = { threshold: 90, noRegressions: true };
/** A policy through Evals' release gate, against all-large as the baseline. */
export function gate(p: Policy, g: Gate = GATE): Decision {
  const pass = (x: Policy) => run(x).rows.map((r) => r.pass);
  return decide(pass(ALL_LARGE), pass(p), g);
}
/** The cheapest threshold whose router ships, or null when none does. */
export const cheapestShipping = () => {
  const ok = THRESHOLDS.filter((threshold) => gate({ threshold }).ship);
  return ok.length ? ok.reduce((a, b) => (run({ threshold: a }).cost <= run({ threshold: b }).cost ? a : b)) : null;
};

/** The finite values each chapter's controls can take; the coverage test walks every one. */
export const DOMAINS: Record<string, { policies: Policy[]; questions: string[] }> = {
  '04-send-it-the-easy-ones': { policies: [ALL_SMALL, ALL_LARGE], questions: QUESTION_IDS },
  '05-fall-back-when-unsure': { policies: THRESHOLDS.map((threshold) => ({ threshold })), questions: QUESTION_IDS },
  '06-gate-the-switch': { policies: [ALL_LARGE, ...THRESHOLDS.map((threshold) => ({ threshold }))], questions: QUESTION_IDS },
};
