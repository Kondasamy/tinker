// Chapter 7's workbench: Larkspur's decision. Each kind of request goes to one version (prompted, RAG or fine-tuned), a
// finite domain of 3^kinds plans. Quality is read off the recorded answers, graded live (Evals' key-fact check, or the
// sign-off for replies with no facts); cost and upkeep are the team's fixed notes in data/fine-tuning/workbench.json.
// A plan's score is quality minus cost minus upkeep, summed over the kinds. Every plan tied for the best score wins
// (WINNERS, computed over the whole domain as Guardrails' are), not one hand-picked answer.
import { ALL_QUESTIONS, gradeVersion, QUESTION_IDS, VERSION_IDS, type VersionId } from './engine';
import data from '../../../data/fine-tuning/workbench.json' with { type: 'json' };

export type KindId = 'voice' | 'facts' | 'changed';
export interface Kind { id: KindId; label: string; about: string; grade: 'signed' | 'fact'; questions: string[] }
export interface Note { cost: number; costWhy: string; upkeep: number; upkeepWhy: string }
export type Plan = Record<KindId, VersionId>;

/** Most quality points a kind can score: every one of its recorded answers passes. */
export const QUALITY = data.quality;
export const KINDS: Kind[] = data.kinds.map((k) => ({
  ...(k as Omit<Kind, 'questions'>),
  questions: k.questions === 'all' ? ALL_QUESTIONS : k.questions === 'evals' ? QUESTION_IDS : (k.questions as string[]),
}));
export const KIND_IDS = KINDS.map((k) => k.id);
export const NOTES = data.notes as Record<VersionId, Record<KindId, Note>>;

/** One kind under one version: how many of its answers pass, and the points. */
export function cell(kind: KindId, v: VersionId) {
  const k = KINDS.find((x) => x.id === kind)!, g = gradeVersion(v, k.questions);
  const passed = g.filter((x) => (k.grade === 'signed' ? x.signed : x.fact)).length, n = NOTES[v][kind];
  const quality = (QUALITY * passed) / g.length;
  return { passed, of: g.length, quality, cost: n.cost, upkeep: n.upkeep, score: quality - n.cost - n.upkeep, note: n };
}

/** A plan's totals: one row per kind, then the sums. */
export function totals(plan: Plan) {
  const rows = KINDS.map((k) => ({ kind: k, version: plan[k.id], ...cell(k.id, plan[k.id]) }));
  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + f(r), 0);
  return { rows, quality: sum((r) => r.quality), cost: sum((r) => r.cost), upkeep: sum((r) => r.upkeep), score: sum((r) => r.score) };
}

/** Every plan the bench can make: each kind takes any of the three versions. */
export const PLANS: Plan[] = KIND_IDS.reduce<Plan[]>(
  (plans, k) => plans.flatMap((p) => VERSION_IDS.map((v) => ({ ...p, [k]: v }))), [{} as Plan]);
export const BEST = Math.max(...PLANS.map((p) => totals(p).score));
/** Tied for the best score (quality can be a fraction, so ties allow for rounding). */
export const solved = (p: Plan) => Math.abs(totals(p).score - BEST) < 1e-9;
/** Every plan tied for the best score. */
export const WINNERS = PLANS.filter(solved);
