// Why did it fail?: replay a hand-written failed run with one thing changed (KTD3). Each step writes one slot from
// the slots before it (data/causal-evals/runs.json says how); a replay reruns every step in order, with one step
// swapped for its alternative, taken out (ablation), or made to time out (fault injection), and the run's dice
// rolled again from a seed. The outcome is where the marble lands: the right thing sent, the wrong thing, nothing,
// or stuck at a step that timed out with no retry.
import DATA from '../../../data/causal-evals/runs.json' with { type: 'json' };
import { mulberry32 } from '../transformers/sample';

export interface RunStep {
  id: string;
  /** a short name for the piece's pill */
  name: string;
  /** what the step did in the run, and what its swap does instead */
  did: string;
  swap: string;
  out: string;
  as: string;
  alt: string;
  from?: string;
  map?: Record<string, string> | '=';
  odds?: Record<string, Record<string, number>>;
  needs?: string[];
}
export interface Run {
  id: string;
  name: string;
  ask: string;
  /** the value of the last slot when the run goes right */
  right: string;
  outcomes: Record<'right' | 'wrong' | 'none', string>;
  /** the dice the hand-written run rolled */
  seed: number;
  steps: RunStep[];
}

export const LABEL = DATA.label;
export const RUNS = DATA.runs as Run[];
export const runOf = (id: string) => {
  const r = RUNS.find(x => x.id === id);
  if (!r) throw new Error(`no run "${id}"`);
  return r;
};
/** The run chapters 1–6 replay: the wrong replacement blade. */
export const BLADE = runOf('blade');

export type Outcome = 'right' | 'wrong' | 'none' | 'stuck';
/** One change to a replay: a step swapped, taken out, or timed out (with or without a retry). */
export type Change =
  | { kind: 'swap' | 'remove'; step: number }
  | { kind: 'timeout'; step: number; retry?: boolean }
  | null;

export interface Replay {
  outcome: Outcome;
  /** each step's output (null: wrote nothing) */
  slots: (string | null)[];
  /** the step the run stopped at (a timeout with no retry), else null */
  halt: number | null;
}

/** Roll one of weighted choices with the run's dice (insertion order, so a seed always gives the same pick). */
function roll(odds: Record<string, number>, rnd: () => number) {
  const r = rnd() * Object.values(odds).reduce((a, b) => a + b, 0);
  let acc = 0;
  for (const [v, w] of Object.entries(odds)) if (r < (acc += w)) return v;
  return Object.keys(odds).at(-1)!;
}

/** Rerun every step with one change (or a few, at different steps), rolling the dice from `seed` (default: the
 * run's own dice). */
export function replay(run: Run, change: Change | Change[] = null, seed = run.seed): Replay {
  const changes = (Array.isArray(change) ? change : [change]).filter(c => c !== null);
  const rnd = mulberry32(seed);
  const vals: Record<string, string | null> = {};
  const slots: (string | null)[] = [];
  for (const [i, st] of run.steps.entries()) {
    const here = changes.find(c => c.step === i) ?? null;
    if (here?.kind === 'timeout' && !here.retry)
      return { outcome: 'stuck', slots: [...slots, ...run.steps.slice(i).map(() => null)], halt: i };
    const read = st.from ? vals[st.from] : undefined;
    const missing = read === null || (st.needs ?? []).some(n => vals[n] == null);
    let v: string | null;
    if (here?.kind === 'remove') v = null;
    else if (here?.kind === 'swap') v = st.alt === '=' ? (read ?? null) : st.alt;
    else if (missing) v = null;
    else if (st.from && st.map === '=') v = read!;
    else if (st.from && typeof st.map === 'object' && read! in st.map) v = st.map[read!];
    else if (st.from && st.odds?.[read!]) v = roll(st.odds[read!], rnd);
    else v = st.as;
    vals[st.out] = v;
    slots.push(v);
  }
  const last = slots.at(-1);
  return { outcome: last == null ? 'none' : last === run.right ? 'right' : 'wrong', slots, halt: null };
}

/** The steps whose output differs from the hand-written run's (a change's ripple down the run). */
export const touched = (run: Run, r: Replay) =>
  r.slots.flatMap((v, i) => (r.halt === null && v !== null && v !== run.steps[i].as ? [i] : []));

export const REPEATS = 20;
/** Seeds for repeated replays: 1 to n, fresh dice each. */
export const SEEDS = Array.from({ length: REPEATS }, (_, i) => i + 1);

/** How many of n replays (fresh dice each) land on each outcome. */
export function tally(run: Run, change: Change | Change[], seeds = SEEDS) {
  const t: Record<Outcome, number> = { right: 0, wrong: 0, none: 0, stuck: 0 };
  for (const s of seeds) t[replay(run, change, s).outcome]++;
  return t;
}

/**
 * The cause, as Who&When defines the decisive error: the earliest step whose swap turns the failure into a success.
 * "Turns" means in every one of the repeated replays, so a lucky roll never counts.
 */
export function causeOf(run: Run) {
  const flips = run.steps.map((_, i) => tally(run, { kind: 'swap', step: i }).right === REPEATS);
  return flips.indexOf(true);
}
/** Every step whose swap fixes every repeat (the workbench checks there is just the one). */
export const fixers = (run: Run) =>
  run.steps.flatMap((_, i) => (tally(run, { kind: 'swap', step: i }).right === REPEATS ? [i] : []));

/** The workbench's replay budget across its four runs. */
export const BUDGET = 12;
/** A replay on the bench: refused once the budget is spent (the reason, for the status line), else counted. */
export function spend(used: number): { ok: true; used: number } | { ok: false; why: string } {
  return used >= BUDGET
    ? { ok: false, why: `All ${BUDGET} replays are spent: name the causes you have found.` }
    : { ok: true, used: used + 1 };
}
