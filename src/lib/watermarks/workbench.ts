// Chapter 7's workbench (KTD9): green share γ and nudge δ, against reply quality, edited replies still caught and
// false alarms on human replies, at the checker's line of 4 (data/watermarks/workbench.json). Results per setting
// and WINNERS are pinned in pinned.json and recomputed by measure() and solve() in a test, never at import.
import prompts from '../../../data/watermarks/prompts.json' with { type: 'json' };
import bench from '../../../data/watermarks/workbench.json' with { type: 'json' };
import pinned from '../../../data/watermarks/pinned.json' with { type: 'json' };
import { check, checkText, LINE } from './detect';
import { swapEvery } from './edit';
import { logLikelihood, write, type Writer } from './sample';
import { HUMAN } from './story';

export const BENCH = bench;
export interface Plan {
  gamma: number;
  delta: number;
}
export interface Result extends Plan {
  /** mean log-likelihood per token lost against the unmarked replies (nats) */
  drop: number;
  replies: number;
  /** replies at or above the line, as written */
  caught: number;
  /** replies at or above the line after the edit */
  caughtEdited: number;
  humans: number;
  /** human replies at or above the line */
  falseAlarms: number;
}
export const START = bench.start as Plan;
export const PLANS: Plan[] = bench.gammas.flatMap(gamma => bench.deltas.map(delta => ({ gamma, delta })));
const same = (a: Plan, b: Plan) => a.gamma === b.gamma && a.delta === b.delta;

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
const caught = (zs: (number | null)[]) => zs.filter(z => z !== null && z >= LINE).length;

/** One setting over the reply set (a few seconds: tests only). */
export function measure(writer: Writer, { gamma, delta }: Plan): Result {
  const texts = prompts.prompts.map(p => p.text);
  const quality = (rs: number[][]) => mean(rs.map((r, i) => logLikelihood(writer, texts[i], r)));
  const plain = texts.map((t, i) => write(writer, t, { gamma, delta: 0 }, i + 1)),
    marked = texts.map((t, i) => write(writer, t, { gamma, delta }, i + 1));
  const edited = marked.map((r, i) => swapEvery(writer, texts[i], r, bench.editEvery));
  return {
    gamma,
    delta,
    drop: r4(quality(plain) - quality(marked)),
    replies: marked.length,
    caught: caught(marked.map(r => check(r, gamma).z)),
    caughtEdited: caught(edited.map(r => check(r, gamma).z)),
    humans: HUMAN.length,
    falseAlarms: caught(HUMAN.map(h => checkText(h.reply, gamma).z)),
  };
}

export const RESULTS = pinned.workbench.results as Result[];
export const resultOf = (p: Plan) => RESULTS.find(r => same(r, p))!;
export const passes = (r: Result) =>
  r.caught >= bench.minCaught && r.drop <= bench.maxDrop && r.falseAlarms <= bench.maxFalseAlarms;

/** Of the settings that pass: the most edited replies caught, then the least quality lost. */
export function solve(results: Result[]): Plan[] {
  const ok = results.filter(passes),
    most = Math.max(...ok.map(r => r.caughtEdited)),
    tied = ok.filter(r => r.caughtEdited === most),
    least = Math.min(...tied.map(r => r.drop));
  return tied.filter(r => r.drop === least).map(({ gamma, delta }) => ({ gamma, delta }));
}

export const WINNERS = pinned.workbench.winners as Plan[];
export const wins = (p: Plan) => WINNERS.some(w => same(w, p));
