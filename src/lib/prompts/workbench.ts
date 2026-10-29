// Chapter 7's workbench (KTD4, KTD9): build a prompt from cards and send it to Larkspur's six tickets. A ticket passes
// when its reply has the key fact, is JSON the router reads with the right team, and keeps the house rule. Of the
// prompts that pass the most tickets, the shortest wins (workbench.json). Results per prompt and WINNERS are pinned
// in pinned.json and recomputed by measure() and solve() in a test, never at import.
import { encode } from '../lm/bpe';
import bench from '../../../data/prompts/workbench.json' with { type: 'json' };
import pinned from '../../../data/prompts/pinned.json' with { type: 'json' };
import { assemble, combos, WORKBENCH_DOMAINS } from './assemble';
import type { Docket } from './cards';
import { gradeReply, passes } from './grade';
import { NORECORD, replyOf } from './story';

export const BENCH = bench;
export const CHAPTER = '07-workbench';
export const START = bench.start as Docket;
const { ticket, model, ...slots } = WORKBENCH_DOMAINS;
export const BENCH_TICKETS = ticket;
/** Every prompt the workbench's cards can build. */
export const PLANS: Docket[] = combos({ ...slots, ticket: [ticket[0]], model }).map(
  ({ role, task, examples, format, rules }) => ({ role, task, examples, format, rules }),
);
export interface Result extends Docket {
  /** tickets passed, of six */
  passed: number;
  /** Larkspur mini's tokens over all six prompts */
  tokens: number;
}
const same = (a: Docket, b: Docket) =>
  a.role === b.role && a.task === b.task && a.examples === b.examples && a.format === b.format && a.rules === b.rules;

/** Each ticket's grade under one prompt; throws on a missing reply (the coverage test proves none). */
export function ticketsOf(d: Docket) {
  return BENCH_TICKETS.map(t => {
    const s = { ...d, ticket: t, model: model[0] },
      r = replyOf(CHAPTER, s);
    if (r === NORECORD) throw new Error(`no reply for ${t}`);
    return { ticket: t, reply: r, grade: gradeReply(s, r.text) };
  });
}
/** Prompt length: Larkspur mini's tokens over the six prompts. */
export const tokensOf = (d: Docket) =>
  BENCH_TICKETS.reduce((n, t) => n + encode(assemble({ ...d, ticket: t })).length, 0);
export const measure = (d: Docket): Result => ({
  ...d,
  passed: ticketsOf(d).filter(t => passes(t.grade)).length,
  tokens: tokensOf(d),
});

export const RESULTS = pinned.workbench.results as Result[];
export const resultOf = (d: Docket) => RESULTS.find(r => same(r, d))!;

/** Of the prompts that pass the most tickets, the fewest tokens. */
export function solve(results: Result[]): Docket[] {
  const most = Math.max(...results.map(r => r.passed));
  const top = results.filter(r => r.passed === most),
    least = Math.min(...top.map(r => r.tokens));
  return top
    .filter(r => r.tokens === least)
    .map(({ role, task, examples, format, rules }) => ({ role, task, examples, format, rules }));
}
export const WINNERS = pinned.workbench.winners as Docket[];
export const wins = (d: Docket) => WINNERS.some(w => same(w, d));
