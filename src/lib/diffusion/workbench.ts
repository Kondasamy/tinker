// Chapter 7's workbench (KTD8): a step count and a guidance scale for each use (thumbnail, catalogue image). A use passes
// when every test picture (each pinned seed, asked for each part) comes out the right part and within the use's
// roughness bar; cost is denoiser predictions per picture, steps × passes. Every plan that passes both uses at the
// lowest cost wins (WINNERS), not one hand-picked answer. Sampling all 24 choices × 24 pictures blocks a page for seconds,
// so the page reads the measurements precomputed in pinned.json; a unit test keeps them equal to the live engine.
import data from '../../../data/diffusion/workbench.json' with { type: 'json' };
import pinned from '../../../data/diffusion/pinned.json' with { type: 'json' };
import { LABELS, nearest } from './drawings';
import { GUIDANCE, passes, sampleDrawing, type Guidance } from './ideal';
import { STEPS, type Steps } from './schedule';

export type UseId = 'thumbnail' | 'catalogue';
export interface Use {
  id: UseId;
  label: string;
  /** the most roughness a picture may have */
  bar: number;
  reason: string;
}
export const USES = data.uses as Use[];
export const USE_IDS = USES.map(u => u.id);
export const SEEDS: number[] = pinned.seeds;

export interface Choice {
  steps: Steps;
  scale: Guidance;
}
export type Plan = Record<UseId, Choice>;
export const CHOICES: Choice[] = STEPS.flatMap(steps => GUIDANCE.map(scale => ({ steps, scale })));
export const choiceKey = (c: Choice) => `${c.steps}x${c.scale}`;
/** Predictions one picture costs. */
export const perPicture = (c: Choice) => c.steps * passes(c.scale);

/** One test picture: the part asked for, whether it came out that part, and its roughness. */
export type Measure = [label: number, rightPart: 0 | 1, rough: number];
/** Every test picture for a choice, sampled live: each part asked for from each pinned seed. */
export const measure = (c: Choice): Measure[] =>
  LABELS.flatMap((label, l) =>
    SEEDS.map(seed => {
      const n = nearest(sampleDrawing(c.steps, seed, label, c.scale));
      return [l, n.drawing.label === label ? 1 : 0, Math.round(n.rms * 1000) / 1000] as Measure;
    }),
  );
const MEASURED = pinned.workbench as unknown as Record<string, Measure[]>;

export interface Result {
  right: number;
  of: number;
  /** test pictures of the right part that were too rough */
  rough: number;
  /** of the right part */
  part: number;
  cost: number;
  ok: boolean;
}
export function resultOf(use: UseId, c: Choice): Result {
  const bar = USES.find(u => u.id === use)!.bar,
    m = MEASURED[choiceKey(c)] ?? [],
    right = m.filter(([, p, r]) => p && r <= bar).length,
    part = m.filter(([, p]) => p).length;
  return { right, of: m.length, rough: part - right, part, cost: perPicture(c), ok: right === m.length };
}

export const costOf = (p: Plan) => USE_IDS.reduce((s, u) => s + perPicture(p[u]), 0);
const passing = (u: UseId) => CHOICES.filter(c => resultOf(u, c).ok);
/** The lowest cost a plan that passes both uses can have. */
export const BEST_COST = USE_IDS.reduce((s, u) => s + Math.min(...passing(u).map(perPicture)), 0);
export const solved = (p: Plan) => USE_IDS.every(u => resultOf(u, p[u]).ok) && costOf(p) === BEST_COST;
/** Every plan tied for the best: each use at one of its cheapest passing choices. */
export const WINNERS: Plan[] = USE_IDS.reduce<Partial<Plan>[]>(
  (plans, u) => {
    const ok = passing(u),
      min = Math.min(...ok.map(perPicture));
    return plans.flatMap(p => ok.filter(c => perPicture(c) === min).map(c => ({ ...p, [u]: c })));
  },
  [{}],
) as Plan[];
