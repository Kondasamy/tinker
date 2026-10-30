// The copy-what-you-did policy (KTD5): nearest neighbour over (what the camera gave → what the demonstrator did)
// pairs. Lookup, not training: nothing is fitted, the pairs are kept as they are, and each new frame does what was
// done at the closest one (ties go to the earliest pair). Holding the part or not weighs most, then how far the
// target sits, then which neighbours are blocked.
import { type Action, expert, type Layout, type Obs, observe, play, rollout, type RunOpts, type State } from './world';

export interface Pair {
  o: Obs;
  a: Action;
}
/** How unlike two frames are. */
export const gap = (p: Obs, q: Obs) =>
  (p.holding === q.holding ? 0 : 10) +
  2 * (Math.abs(p.dx - q.dx) + Math.abs(p.dy - q.dy)) +
  p.blocked.reduce((n, b, i) => n + (b === q.blocked[i] ? 0 : 1), 0);

/** The pair closest to a frame, or null with no pairs. */
export function nearest(pairs: Pair[], o: Obs): Pair | null {
  let best: Pair | null = null,
    least = Number.POSITIVE_INFINITY;
  for (const p of pairs) {
    const g = gap(p.o, o);
    if (g < least) [best, least] = [p, g];
  }
  return best;
}
/** The pairs a demo records: each frame the camera gave, and the action taken at it. */
export function pairsOf(l: Layout, actions: Action[], detector?: readonly number[]): Pair[] {
  const states = play(l, actions);
  return actions.slice(0, states.length - 1).map((a, i) => ({ o: observe(l, states[i], detector), a }));
}
/** The expert's demo on a bin: its actions from the start to the tray. */
export const expertDemo = (l: Layout) => rollout(l, s => expert(l, s)).actions;

/** The policy as a chooser over one bin, reading the camera through `detector`. */
export const policyOn =
  (pairs: Pair[], l: Layout, detector?: readonly number[]) =>
  (s: State): Action =>
    nearest(pairs, observe(l, s, detector))?.a ?? 'grip';
/** The policy's run on a bin. */
export const replay = (pairs: Pair[], l: Layout, o: RunOpts & { detector?: readonly number[] } = {}) =>
  rollout(l, policyOn(pairs, l, o.detector), o);
