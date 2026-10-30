// The steelyard's sums (KTD8): each criterion is scaled 0 to 1 across the machines in play (best 1, worst 0), times
// its poise's weight, and summed. The beam tips toward the highest sum, further the bigger its lead; a tie leaves it
// level with an empty pan.
import { IDS, machineIn, qualityOf, REPLY, type MachineId, type Source } from './machines';
import { per1000, wholeReply, type Request } from './price';

export type Criterion = 'quality' | 'cost' | 'wait';
export const CRITERIA: Criterion[] = ['quality', 'cost', 'wait'];
export type Weights = Record<Criterion, number>;
/** a poise's notches along the beam */
export const WEIGHTS = [0, 1, 2, 3, 4];
export const MAX_WEIGHT = WEIGHTS.at(-1)!;

export interface Row {
  id: MachineId;
  /** 0 to 1, higher better */
  quality: number;
  /** dollars per 1,000 answers, lower better */
  price: number;
  /** seconds for the whole reply, lower better */
  wait: number;
  /** seconds to the first word */
  first: number;
}
/** A support reply's row for each machine, quality from `source`. */
export const rowsOf = (source: Source, r: Request = REPLY): Row[] =>
  IDS.map(id => {
    const m = machineIn(id, source);
    return { id, quality: qualityOf(id, source), price: per1000(m, r), wait: wholeReply(m, r), first: m.ttft };
  });

const KEY: Record<Criterion, 'quality' | 'price' | 'wait'> = { quality: 'quality', cost: 'price', wait: 'wait' };
/** Each row's criterion scaled 0 (worst here) to 1 (best here); all equal scale to 1. */
export function scaled(rows: Row[], c: Criterion): number[] {
  const v = rows.map(r => r[KEY[c]]),
    lo = Math.min(...v),
    hi = Math.max(...v);
  if (hi - lo < 1e-12) return v.map(() => 1);
  return v.map(x => (c === 'quality' ? (x - lo) / (hi - lo) : (hi - x) / (hi - lo)));
}
/** Each machine's weighted sum. */
export function scoresOf(rows: Row[], w: Weights): Record<MachineId, number> {
  const s = CRITERIA.map(c => scaled(rows, c));
  return Object.fromEntries(rows.map((r, i) => [r.id, CRITERIA.reduce((t, c, k) => t + w[c] * s[k][i], 0)])) as Record<
    MachineId,
    number
  >;
}
const EPS = 1e-9;
/** The machine the beam tips toward (null on a tie at the top), and its lead as a share of all the weight. */
export function weigh(rows: Row[], w: Weights) {
  const scores = scoresOf(rows, w),
    order = [...rows.map(r => r.id)].sort((a, b) => scores[b] - scores[a]),
    lead = order.length > 1 ? scores[order[0]] - scores[order[1]] : scores[order[0]],
    total = CRITERIA.reduce((t, c) => t + w[c], 0);
  const winner = lead > EPS ? order[0] : null;
  return { scores, winner, order, lead: winner && total ? lead / total : 0 };
}
/** the beam's tilt in degrees: none on a tie, else from MIN_TILT up to MAX_TILT as the lead grows */
export const MIN_TILT = 4,
  MAX_TILT = 14;
export const tiltOf = (lead: number, winner: MachineId | null) =>
  winner ? MIN_TILT + (MAX_TILT - MIN_TILT) * Math.min(1, lead) : 0;
