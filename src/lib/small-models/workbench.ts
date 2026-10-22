// Chapter 7's workbench: a routing policy per kind of question. Each kind goes to the small tier, the large tier or the
// router, and one threshold (from THRESHOLDS) sets where the router sends answers up: a finite domain of
// 3^kinds × thresholds. A kind scores the team's points per right answer (data/small-models/workbench.json, with its
// reason) minus what its answers cost, in relative units. Every policy tied for the best score wins (WINNERS).
import { run, THRESHOLDS, type Policy, type Tier } from './router';
import data from '../../../data/small-models/workbench.json' with { type: 'json' };

export type Choice = Tier | 'router';
export const CHOICES: Choice[] = ['small', 'router', 'large'];
export type KindId = 'lookups' | 'policy' | 'hard';
export interface Kind {
  id: KindId;
  label: string;
  about: string;
  questions: string[];
}
export const KINDS = data.kinds as Kind[];
export const KIND_IDS = KINDS.map(k => k.id);
/** Points for one right answer, and why the team set it there. */
export const POINTS = data.pointsPerRight,
  POINTS_WHY = data.pointsWhy;

export type Plan = Record<KindId, Choice> & { threshold: number };
const policyOf = (c: Choice, threshold: number): Policy => (c === 'router' ? { threshold } : { tier: c });

/** One kind under one choice: its rows (pass or fail and why), right answers, cost and score. */
export function cell(kind: KindId, c: Choice, threshold: number) {
  const k = KINDS.find(x => x.id === kind)!,
    r = run(policyOf(c, threshold), k.questions);
  return { ...r, score: POINTS * r.right - r.cost };
}
export function totals(plan: Plan) {
  const rows = KINDS.map(k => ({ kind: k, choice: plan[k.id], ...cell(k.id, plan[k.id], plan.threshold) }));
  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + f(r), 0);
  return { rows, right: sum(r => r.right), of: sum(r => r.of), cost: sum(r => r.cost), score: sum(r => r.score) };
}

/** Every plan the bench can make. */
export const PLANS: Plan[] = KIND_IDS.reduce<Plan[]>(
  (plans, k) => plans.flatMap(p => CHOICES.map(c => ({ ...p, [k]: c }))),
  THRESHOLDS.map(threshold => ({ threshold }) as Plan),
);
export const BEST = Math.max(...PLANS.map(p => totals(p).score));
/** Tied for the best score (costs are fractions, so ties allow for rounding). */
export const solved = (p: Plan) => Math.abs(totals(p).score - BEST) < 1e-9;
export const WINNERS = PLANS.filter(solved);
/** The workbench's domain for the coverage test: every policy a plan can give a kind. */
export const WORKBENCH_DOMAINS = { choices: CHOICES, thresholds: THRESHOLDS, kinds: KIND_IDS };
