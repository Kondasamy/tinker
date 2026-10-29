// Chapter 7's workbench (KTD11): context frames (k1 or k2) and a re-sync interval (a real frame every N steps, or
// never), run open loop over Larkspur's test routes (data/video-models/workbench.json). A frame is right when its one
// robot and one crate both sit where the real ones do; robot alone would favour k1, which keeps a robot but loses the
// crate's way. Results per plan and WINNERS are pinned in pinned.json and recomputed by measure() and solve() in a
// test, never at import. Cost is model passes in compute units (compute.ts), and real frames.
import bench from '../../../data/video-models/workbench.json' with { type: 'json' };
import pinned from '../../../data/video-models/pinned.json' with { type: 'json' };
import type { Net } from './net';
import { crateCells, dream, type ModelId, robotRight } from './rollout';
import { rollout } from './world';

export const BENCH = bench;
export const MODELS: ModelId[] = ['k1', 'k2'];
export const EVERY = bench.every;
export interface Plan {
  model: ModelId;
  /** a real frame every N steps; 0 never */
  every: number;
}
export interface Result extends Plan {
  /** frames right of all frames dreamed (frames 2..steps over every route) */
  right: number;
  frames: number;
  passes: number;
  real: number;
}
export const START = bench.start as Plan;
export const PLANS: Plan[] = MODELS.flatMap(model => EVERY.map(every => ({ model, every })));

/** Both the robot and the crate in place. */
export const frameRight = (real: Uint8Array, g: Uint8Array) => {
  const c = crateCells(g);
  return robotRight(real, g) && c.length === 1 && c[0] === crateCells(real)[0];
};

/** Run one plan over every test route (about a second per plan: tests and build time only). */
export function measure(nets: Record<ModelId, Net>, p: Plan): Result {
  const out: Result = { ...p, right: 0, frames: 0, passes: 0, real: 0 };
  for (let i = 0; i < bench.routes; i++) {
    const r = rollout(bench.firstSeed + i, bench.steps),
      d = dream(nets[p.model], r, { every: p.every });
    d.frames.slice(2).forEach((f, j) => {
      out.frames++;
      if (d.synced[j + 2]) out.real++;
      if (frameRight(r.frames[j + 2], f)) out.right++;
    });
    out.passes += d.passes;
  }
  return out;
}

export const RESULTS = pinned.workbench.results as Result[];
export const resultOf = (p: Plan) => RESULTS.find(r => r.model === p.model && r.every === p.every)!;
export const share = (r: Result) => r.right / r.frames;
export const passes = (r: Result) => share(r) >= bench.bar;

/** Of the plans that clear the bar: the fewest real frames, then the fewest model passes' multiplies. */
export function solve(results: Result[], mults: Record<ModelId, number>): Plan[] {
  const ok = results.filter(passes);
  const fewest = Math.min(...ok.map(r => r.real));
  const cost = (r: Result) => r.passes * mults[r.model];
  const tied = ok.filter(r => r.real === fewest),
    least = Math.min(...tied.map(cost));
  return tied.filter(r => cost(r) === least).map(({ model, every }) => ({ model, every }));
}

export const WINNERS = pinned.workbench.winners as Plan[];
export const wins = (p: Plan) => WINNERS.some(w => w.model === p.model && w.every === p.every);
