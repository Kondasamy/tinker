// Agent to agent (chapter 3): an A2A-shaped task between Reyes Decks' buying agent and Larkspur's sales agent. The
// states follow A2A's published lifecycle (fact `a2a-states`); a move the lifecycle doesn't allow throws. The seller's
// turns are recorded (turns.ts); the host moves the task and answers a question back with the order's details.
import { fact } from './facts';
import { ANSWER, itemOf } from './story';
import { type Recording, type Request, type SellerTurn, taskSig } from './turns';

export type TaskState = 'submitted' | 'working' | 'input-required' | 'completed' | 'failed' | 'canceled';
export const STATES = JSON.parse(fact('a2a-states').value!) as TaskState[];

/** Where each state may go next; the three ends go nowhere. */
export const NEXT: Record<TaskState, TaskState[]> = {
  submitted: ['working', 'failed', 'canceled'],
  working: ['input-required', 'completed', 'failed', 'canceled'],
  'input-required': ['working', 'failed', 'canceled'],
  completed: [],
  failed: [],
  canceled: [],
};
export const isEnd = (s: TaskState) => NEXT[s].length === 0;

/** The next state, or a throw if the lifecycle doesn't allow the move. */
export function move(from: TaskState, to: TaskState): TaskState {
  if (!NEXT[from].includes(to)) throw new Error(`illegal task move: ${from} → ${to}`);
  return to;
}

/** the most turns the host lets the seller take */
export const MAX_TURNS = 3;

export interface TaskRun {
  request: Request;
  /** every state the task passed through, in order */
  states: TaskState[];
  /** each seller turn with the signature it was looked up by */
  turns: { sig: string; turn: SellerTurn }[];
  /** the buying agent's answers to questions back */
  answers: string[];
  status: TaskState | 'norecord';
  /** the order line a completed task ends with, when it names a real item */
  order?: { sku: string; qty: number };
}

/** Plays the task over the recording; `cancel` has the buying agent cancel at the first question instead of answering. */
export function runTask(rec: Recording<SellerTurn>, request: Request, cancel = false): TaskRun {
  const r: TaskRun = { request, states: ['submitted'], turns: [], answers: [], status: 'submitted' };
  const go = (to: TaskState) => {
    r.states.push(move(r.states.at(-1)!, to));
    r.status = to;
  };
  go('working');
  const hist: string[] = [];
  for (let n = 0; n < MAX_TURNS; n++) {
    const sig = taskSig(request, hist);
    const turn = rec.turns[sig];
    if (!turn) {
      r.status = 'norecord';
      return r;
    }
    r.turns.push({ sig, turn });
    go(turn.state);
    if (turn.state === 'completed') {
      if (turn.sku && itemOf(turn.sku) && turn.qty && turn.qty > 0) r.order = { sku: turn.sku, qty: turn.qty };
      return r;
    }
    if (turn.state === 'failed') return r;
    if (cancel) {
      go('canceled');
      return r;
    }
    r.answers.push(ANSWER);
    hist.push('asked');
    go('working');
  }
  go('failed');
  return r;
}
