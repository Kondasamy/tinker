// Undo for agents' engine (KTD3): a saga runner over Larkspur's four-step return, hand-written in
// data/agent-undo/story.json. Each step may have an opposite (a compensating step); on a failure the steps done so far
// are undone newest first; the email can't be undone, only followed by a second letter. Save points let a restart
// resume instead of redoing; an idempotency key makes a retried call happen once. The workbench scores a policy
// (order, opposites, key, save points) over twenty hand-written failure injections.
import STORY from '../../../data/agent-undo/story.json' with { type: 'json' };

export type StepId = 'stock' | 'refund' | 'email' | 'courier';
export interface StepDef {
  id: StepId;
  name: string;
  short: string;
  does: string;
  /** the opposite (compensating) step; null: it can't be undone */
  opposite: string | null;
  /** the email's stand-in for an opposite: a second letter */
  followUp?: string;
}
export const STEP_DEFS = STORY.steps as StepDef[];
/** R6f's order: restock, refund, email, courier */
export const ORDER: StepId[] = STEP_DEFS.map(s => s.id);
export const stepOf = (id: StepId) => STEP_DEFS.find(s => s.id === id)!;
export const RETURN = STORY.return;
export const LABEL = STORY.label;
export const FAILURE = STORY.failure;
export const REFUND_OPPOSITES = STORY.refundOpposites;

export type Kind = 'fail' | 'timeout' | 'crash';
export interface Injection {
  id: string;
  /** the step it hits: fail = refused, nothing happened; timeout = it went through but the answer was lost, so it is
   * retried; crash = the assistant restarts right after it */
  at: StepId;
  kind: Kind;
  note: string;
}
export const INJECTIONS = STORY.injections as Injection[];
/** the story's failure: the courier booking refuses */
export const COURIER_FAILS: Injection = INJECTIONS[0];

export interface Policy {
  order: StepId[];
  /** which steps have an opposite set (for the email: the second letter) */
  undo: Record<StepId, boolean>;
  /** a save point after every step, with its key kept in the log */
  saves: boolean;
  /** every call carries an idempotency key */
  keys: boolean;
}
const NONE: Record<StepId, boolean> = { stock: false, refund: false, email: false, courier: false };
const ALL: Record<StepId, boolean> = { stock: true, refund: true, email: true, courier: true };
export const policy = (o: Partial<Policy> = {}): Policy => ({
  order: ORDER,
  undo: NONE,
  saves: false,
  keys: false,
  ...o,
});
export const ALL_UNDO = ALL;

/** How a station looks after the run: done, undone (its opposite ran), failed, done twice, or amended by a letter. */
export type Mark = 'done' | 'undone' | 'failed' | 'twice' | 'letter' | 'waiting';
/** One stop of the car, in time order: where it is and what it leaves there. */
export interface Ev {
  at: StepId | 'valley';
  mark?: Mark;
  /** letters in the post box after this stop */
  letters?: number;
  /** the assistant stopped here (a crash) */
  stopped?: boolean;
}
export interface Outcome {
  events: Ev[];
  marks: Partial<Record<StepId, Mark>>;
  letters: number;
  failed: StepId | null;
  /** steps whose effect still stands although the run was abandoned (no opposite) */
  left: StepId[];
  /** steps that happened twice */
  twice: StepId[];
  finished: boolean;
  /** every step done once, or every done step amended: nothing left half-done, nothing doubled */
  clean: boolean;
  /** what the customer feels: a doubled email or pickup, an email that turned out wrong (1 with a second letter,
   * 2 without) */
  harm: number;
}

/** Run the return under a policy, with at most one injected failure. */
export function run(p: Policy, inj?: Pick<Injection, 'at' | 'kind'>): Outcome {
  const events: Ev[] = [];
  const marks: Partial<Record<StepId, Mark>> = {};
  const done: StepId[] = [];
  const twice = new Set<StepId>();
  let letters = 0,
    failed: StepId | null = null;
  const doIt = (id: StepId, again = false) => {
    if (id === 'email') letters++;
    if (again) twice.add(id);
    marks[id] = again ? 'twice' : 'done';
    events.push({ at: id, mark: marks[id], letters });
  };
  for (const id of p.order) {
    if (inj?.at === id && inj.kind === 'fail') {
      failed = id;
      marks[id] = 'failed';
      events.push({ at: id, mark: 'failed', letters });
      break;
    }
    doIt(id);
    done.push(id);
    // the answer was lost and the call is sent again: without a key the far side does it a second time
    if (inj?.at === id && inj.kind === 'timeout' && !p.keys) doIt(id, true);
    if (inj?.at === id && inj.kind === 'crash') {
      events.push({ at: id, stopped: true, letters });
      // with save points the log says what was done: resume after it; without, start again from the bottom
      if (!p.saves) {
        events.push({ at: 'valley', letters });
        for (const d of done) doIt(d, true);
      }
    }
  }
  const left: StepId[] = [];
  if (failed) {
    for (const d of [...done].reverse()) {
      if (!p.undo[d]) {
        left.push(d);
        continue;
      }
      if (d === 'email') {
        letters++;
        marks[d] = 'letter';
      } else marks[d] = 'undone';
      events.push({ at: d, mark: marks[d], letters });
    }
    // with nothing undone the car stays where it failed
    if (left.length < done.length) events.push({ at: 'valley', letters });
  }
  const emailWrong = failed !== null && done.includes('email');
  const harm =
    (emailWrong ? (p.undo.email ? 1 : 2) : 0) + (twice.has('email') ? 1 : 0) + (twice.has('courier') ? 1 : 0);
  return {
    events,
    marks,
    letters,
    failed,
    left,
    twice: [...twice],
    finished: !failed,
    clean: twice.size === 0 && left.length === 0,
    harm,
  };
}

/** A policy's score over every injection: clean finishes (more is better), then customer harm (less is better). */
export function score(p: Policy) {
  const outs = INJECTIONS.map(i => run(p, i));
  return { clean: outs.filter(o => o.clean).length, harm: outs.reduce((a, o) => a + o.harm, 0), outs };
}

/** Every order of the four stations. */
export const ORDERS: StepId[][] = (() => {
  const out: StepId[][] = [];
  const go = (rest: StepId[], acc: StepId[]) => {
    if (!rest.length) out.push(acc);
    rest.forEach((r, i) => go([...rest.slice(0, i), ...rest.slice(i + 1)], [...acc, r]));
  };
  go(ORDER, []);
  return out;
})();
const FLAGS = ['stock', 'refund', 'email', 'courier', 'saves', 'keys'] as const;
/** A policy as one number: its order's index × 64, plus a bit per switch (opposites, save points, key). */
export function codeOf(p: Policy): number {
  const oi = ORDERS.findIndex(o => o.join() === p.order.join());
  const on = (f: (typeof FLAGS)[number]) => (f === 'saves' ? p.saves : f === 'keys' ? p.keys : p.undo[f]);
  return oi * 64 + FLAGS.reduce((a, f, i) => a | (on(f) ? 1 << i : 0), 0);
}
export function policyOf(code: number): Policy {
  const bit = (i: number) => (code & (1 << i)) !== 0;
  return {
    order: ORDERS[Math.floor(code / 64)],
    undo: { stock: bit(0), refund: bit(1), email: bit(2), courier: bit(3) },
    saves: bit(4),
    keys: bit(5),
  };
}
export const OPENING = policy();

/** The best score over every policy, and every policy (as codes) that reaches it. */
export function solve() {
  let best = { clean: -1, harm: Infinity },
    winners: number[] = [];
  for (let c = 0; c < ORDERS.length * 64; c++) {
    const s = score(policyOf(c));
    if (s.clean > best.clean || (s.clean === best.clean && s.harm < best.harm)) {
      best = { clean: s.clean, harm: s.harm };
      winners = [c];
    } else if (s.clean === best.clean && s.harm === best.harm) winners.push(c);
  }
  return { best, winners };
}
