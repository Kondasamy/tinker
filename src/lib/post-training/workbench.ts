// Chapter 7's workbench: a grader built from RULES (a finite domain of 2^rules sets), run with GRPO from the reference
// policy for ROUNDS seeded rounds on every checkable question. A rule set works when every question's best answer ends
// most likely, so no gaming answer wins. Every rule set that works is in WINNERS, not one hand-picked answer.
import { grpoRun, seedOf, winnerOf } from './policy';
import { QUESTIONS, RULES, bestOf, question, refOf, rewardsOf, type RuleId } from './graders';

/** The questions a grader can check (the tone question can't be told apart by any rule; chapter 5). */
export const BENCH = QUESTIONS.filter(q => q.kind === 'checkable').map(q => q.id);

/** Every rule set, in RULES order. */
export const RULE_SETS: RuleId[][] = RULES.reduce<RuleId[][]>((sets, r) => sets.flatMap(s => [s, [...s, r.id]]), [[]]);
const key = (rules: RuleId[]) => RULES.filter(r => rules.includes(r.id)).map(r => r.id);

/** One question under a grader: the answer that ends most likely, and whether it is the best one or a gaming one. */
export function row(q: string, rules: RuleId[]) {
  const after = grpoRun(refOf(q), rewardsOf(q, rules), seedOf(q)).at(-1)!.after,
    w = winnerOf(after),
    c = question(q).candidates[w];
  return { question: q, after, winner: w, best: w === bestOf(q), gamed: !!c.gaming };
}
const memo = new Map<string, ReturnType<typeof row>[]>();
/** A grader over every checkable question: a row each, and how many end on their best answer. */
export function outcome(rules: RuleId[]) {
  const k = key(rules).join('+');
  let rows = memo.get(k);
  if (!rows) memo.set(k, (rows = BENCH.map(q => row(q, rules))));
  return { rows, right: rows.filter(r => r.best).length, gamed: rows.filter(r => r.gamed).length, of: rows.length };
}
export const solved = (rules: RuleId[]) => outcome(rules).right === BENCH.length;
export const WINNERS = RULE_SETS.filter(solved);
