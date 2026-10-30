// Robots that act's story data: Mira's pinned demos (stand-ins, demos.json), the bins each chapter uses (bins.json),
// and the words the read-outs use. Names come from data, never from copy.
import demos from '../../../data/robots/demos.json' with { type: 'json' };
import { type Action, BINS, type End, HELD_OUT, layoutOf, TRAIN } from './world';
import { type Pair, pairsOf } from './policy';

export const PERSON = demos.by;
/** Mira's demos, one per training bin, as pinned. */
export const DEMOS = demos.demos.map(d => d.split(' ') as Action[]);
/** Mira's first n demos as the policy's pairs. */
export const demoPairs = (n: number): Pair[] => DEMOS.slice(0, n).flatMap((d, i) => pairsOf(TRAIN[i], d));

/** Chapter 5: the bin, the forced slip and the demos it starts from. */
export const SNOWBALL = { ...BINS.snowball, layout: layoutOf(BINS.snowball.bin) };
/** Chapter 4's fresh bin: the first held-out bin. */
export const FRESH_BIN = HELD_OUT.find(l => l.seed === BINS.fresh)!;

/** How a run ended, in words. */
export function endText(end: End, steps: number) {
  if (end === 'done') return `Part in the tray in ${steps} steps.`;
  if (end === 'off-grid') return `Off the grid at step ${steps}: the claw drove past the bin's edge.`;
  return `Stuck: ${steps} steps and no part in the tray.`;
}
