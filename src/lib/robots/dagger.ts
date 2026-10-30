// Corrections and practice (KTD5, KTD9), as rules citing their papers. DAgger (Ross, Gordon and Bagnell, 2011): run
// the policy, have the expert say what it should have done at every frame the policy itself reached, add those pairs,
// repeat. Domain randomisation (Tobin et al., 2017): practise in the simulator under varied conditions, so the real
// bay looks like one more variation. Here practice is the expert driving simulated bins, with slips on and the light
// varied when chosen; its pairs join the policy's, and the camera's detector accepts every light it practised under.
import { BINS, expert, type Layout, layoutOf, observe, rollout, type RunOpts } from './world';
import { type Pair, policyOn } from './policy';

/** One DAgger round over some bins: the policy's run on each, every frame it reached labelled by the expert (a frame
 * seen again, as when it stalls, is labelled once). */
export function correctionsOf(pairs: Pair[], bins: Layout[], o: RunOpts & { detector?: readonly number[] } = {}) {
  const seen = new Set<string>();
  return bins.flatMap(l => {
    const run = rollout(l, policyOn(pairs, l, o.detector), o);
    return run.states
      .slice(0, -1)
      .filter(s => !s.end)
      .map(s => ({ o: observe(l, s, o.detector), a: expert(l, s) }))
      .filter(p => !seen.has(JSON.stringify(p)) && !!seen.add(JSON.stringify(p)));
  });
}
/** `rounds` DAgger rounds: each adds its corrections to the pairs. */
export function dagger(
  pairs: Pair[],
  bins: Layout[],
  rounds: number,
  o: RunOpts & { detector?: readonly number[] } = {},
) {
  let out = pairs;
  for (let i = 0; i < rounds; i++) out = [...out, ...correctionsOf(out, bins, o)];
  return out;
}

export interface Practice {
  /** randomise the bay's light in practice */
  light: boolean;
  /** randomise slips in practice */
  slip: boolean;
}
export const NO_PRACTICE: Practice = { light: false, slip: false };
/** The simulated practice bins: the game models the claw, the part, the tray, the light and slips, not the crates.
 * Each has its practice light spread over bins.json's range when randomised. */
export function practiceBins(p: Practice): Layout[] {
  const [lo, hi] = BINS.practice.light;
  return BINS.practice.seeds.map((seed, i) => ({
    ...layoutOf(seed, { crates: 0 }),
    light: p.light ? lo + ((hi - lo) * i) / (BINS.practice.seeds.length - 1) : 1,
  }));
}
/** The detector after practice: the base range, widened to every light practised under. */
export function detectorOf(p: Practice): number[] {
  const lights = practiceBins(p).map(l => l.light);
  return [Math.min(BINS.detector[0], ...lights), Math.max(BINS.detector[1], ...lights)];
}
/** The pairs practice adds: the expert on every practice bin, slipping at the practice rate when randomised. */
export function practicePairs(p: Practice): Pair[] {
  const det = detectorOf(p);
  return practiceBins(p).flatMap(l => {
    const run = rollout(l, s => expert(l, s), { slip: p.slip ? BINS.practice.slip : 0 });
    return run.actions.map((a, i) => ({ o: observe(l, run.states[i], det), a }));
  });
}
