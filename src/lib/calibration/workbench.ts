// Chapter 7's workbench: for each kind of question, a temperature (which rescales the confidence shown beside each
// answer) and a hand-over threshold (on the assistant's stated confidence, which the dial never reorders). The desk's rules (data/calibration/workbench.json, the
// team's choices): within each kind the answers sent are wrong at most the allowed share of the time, the confidences
// shown are honest on average (their mean within the bar of how often they are right), and all the hand-overs fit the desk's capacity. Of the plans that keep every
// rule, the ones that hand over fewest win (WINNERS, pinned in pinned.json; a test recomputes them).
import { KINDS, KIND_IDS, THRESHOLDS, itemsOf, ofKind, type KindId, type Threshold } from './answers';
import { TEMPERATURES, type Temperature } from './measure';
import { accuracy, coverage, meanConf } from './score';
import rules from '../../../data/calibration/workbench.json' with { type: 'json' };
import pinned from '../../../data/calibration/pinned.json' with { type: 'json' };

export const RULES = rules;
export interface Choice {
  T: Temperature;
  threshold: Threshold;
}
export type Plan = Record<KindId, Choice>;

/** One kind under one choice: hand-overs, answers sent, wrong ones sent, the gap at T, and which rules it keeps. */
export function cell(k: KindId, c: Choice) {
  const shown = itemsOf(ofKind(k), c.T),
    cov = coverage(itemsOf(ofKind(k)), c.threshold),
    gap = Math.abs(meanConf(shown) - accuracy(shown));
  const safe = cov.kept === 0 || cov.wrong / cov.kept <= rules.wrongRate + 1e-9,
    honest = gap <= rules.honestGap + 1e-9;
  return { ...cov, of: shown.length, gap, shownMean: meanConf(shown), safe, honest };
}
export function totals(p: Plan) {
  const rows = KINDS.map(k => ({ kind: k, choice: p[k.id], ...cell(k.id, p[k.id]) }));
  const handed = rows.reduce((n, r) => n + r.handed, 0);
  const ok = rows.every(r => r.safe && r.honest) && handed <= rules.capacity;
  return { rows, handed, ok, fits: handed <= rules.capacity };
}

export const CHOICES: Choice[] = TEMPERATURES.flatMap(T => THRESHOLDS.map(threshold => ({ T, threshold })));
/** Every plan, kind by kind (9 × 5 choices per kind). */
export const PLANS: Plan[] = KIND_IDS.reduce<Plan[]>(
  (ps, k) => ps.flatMap(p => CHOICES.map(c => ({ ...p, [k]: c }))),
  [{} as Plan],
);
/** Solve from scratch: every plan that keeps the rules with the fewest hand-overs (the test checks the pin). */
export function solve() {
  const ok = PLANS.map(totals).filter(t => t.ok);
  const least = Math.min(...ok.map(t => t.handed));
  return PLANS.filter(p => {
    const t = totals(p);
    return t.ok && t.handed === least;
  });
}
/** The pinned answer: the fewest hand-overs, and every plan that reaches it. */
export const LEAST: number = pinned.workbench.least;
export const WINNERS: Plan[] = (pinned.workbench.winners as Record<KindId, number[]>[]).map(
  w => Object.fromEntries(KIND_IDS.map(k => [k, { T: w[k][0], threshold: w[k][1] }])) as Plan,
);
export const planKey = (p: Plan) => KIND_IDS.map(k => `${k}:${p[k].T}/${p[k].threshold}`).join(' ');
export const solved = (p: Plan) => {
  const t = totals(p);
  return t.ok && t.handed === LEAST;
};
