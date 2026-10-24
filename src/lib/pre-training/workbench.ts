// Chapter 7's workbench: a data mix (one of the recorded runs) and a step to stop at, a finite domain of
// mixes × stops. A plan scores the run's held-out loss at that step, read off its recorded curve and rounded to the two
// decimals the chapter shows. Every plan tied for the lowest wins (WINNERS), not one hand-picked answer.
import { RUN_IDS, RUNS, runOf, type RunId } from './engine';

export const MIXES = RUN_IDS;
/** Where a run may stop: steps on every run's recorded curve, including the half run's held-out minimum. */
export const STOPS = [250, 600, 1000, 1500, 2000, 2500, 3000];
export interface Plan {
  mix: RunId;
  stop: number;
}

export const MIX_LABEL: Record<RunId, string> = {
  clean: 'All documents',
  duplicated: 'One document ×10',
  leaked: 'Test questions in',
  half: 'Half the documents',
};

/** The run's held-out loss at a step of its recorded curve; throws on a step it never recorded. */
export function heldoutAt(mix: RunId, stop: number) {
  const p = runOf(mix).lossCurve.find(c => c.step === stop);
  if (!p) throw new Error(`${mix} has no recorded step ${stop}`);
  return p.heldout;
}
const round2 = (x: number) => Math.round(x * 100) / 100;
export const scoreOf = (p: Plan) => round2(heldoutAt(p.mix, p.stop));

export const PLANS: Plan[] = MIXES.flatMap(mix => STOPS.map(stop => ({ mix, stop })));
export const BEST = Math.min(...PLANS.map(scoreOf));
export const solved = (p: Plan) => scoreOf(p) === BEST;
export const WINNERS = PLANS.filter(solved);

/** Why a mix scores what it does at a step, in one sentence. */
export function why(mix: RunId, stop: number): string {
  const later = STOPS.filter(s => s > stop).some(s => heldoutAt(mix, s) < heldoutAt(mix, stop) - 0.005);
  const min = runOf(mix).heldoutMin.step;
  if (mix === 'duplicated')
    return `One document was copied ${RUNS.duplicated.copies} times, so the model spent its steps memorising it.`;
  if (mix === 'leaked') return 'The test questions it trained on do nothing for text it has never seen.';
  if (mix === 'half' && stop > min)
    return `Half the documents: held-out loss was lowest at step ${min}; after it, the model memorised.`;
  if (later) return 'Stopped while held-out loss was still falling.';
  if (mix === 'half') return `Its best step, ${min}, but half the documents teach less than all of them.`;
  return 'Every document once, stopped where held-out loss had stopped falling.';
}

/** The result table: one row per mix at the plan's step, the plan's own row marked. */
export const rows = (p: Plan) =>
  MIXES.map(mix => ({
    mix,
    label: MIX_LABEL[mix],
    heldout: scoreOf({ mix, stop: p.stop }),
    chosen: mix === p.mix,
    why: why(mix, p.stop),
  }));
