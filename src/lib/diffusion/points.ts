// Diffusion's learned 2-D denoiser (KTD8) in plain TypeScript: the MLP scripts/train/train_diffusion.py trained on
// points from the hinge outline, the cosine noise schedule, and a seeded sampler. The sampler is shared with the
// ideal denoiser (schedule.ts): both give a guess at the clean x0, and each step moves to the DDPM posterior around it.
import { halfToFloat } from '../lm/load';
import { mulberry32 } from '../transformers/sample';
import { alphaBar, gaussian, type SCHEDULE, stepTo } from './schedule';

/** [x1, y1, x2, y2]: one line of the hinge outline. */
export type Segment = [number, number, number, number];
export interface PointsMeta {
  model: {
    d_time: number;
    max_freq: number;
    d_space: number;
    max_space_freq: number;
    d_hidden: number;
    n_hidden: number;
    params: number;
  };
  schedule: typeof SCHEDULE;
  bytes: number;
  tensors: { name: string; shape: number[]; offset: number }[];
  outline: Segment[];
  goldens: { x: [number, number]; t: number; eps: [number, number] }[];
}
export interface PointsModel {
  config: PointsMeta['model'];
  tensors: Record<string, Float32Array>;
}

export function parsePoints(meta: PointsMeta, buf: ArrayBuffer): PointsModel {
  if (buf.byteLength !== meta.bytes) throw new Error(`points.bin: ${buf.byteLength} bytes, meta says ${meta.bytes}`);
  const u16 = new Uint16Array(buf),
    tensors: Record<string, Float32Array> = {};
  for (const t of meta.tensors) {
    const n = t.shape.reduce((a, b) => a * b, 1),
      at = t.offset / 2;
    tensors[t.name] = Float32Array.from({ length: n }, (_, i) => halfToFloat(u16[at + i]));
  }
  return { config: meta.model, tensors };
}

const gelu = (x: number) => 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));

function layer(x: Float64Array, w: Float32Array, b: Float32Array, act: boolean): Float64Array {
  const nIn = x.length,
    y = new Float64Array(b.length);
  for (let o = 0; o < b.length; o++) {
    let s = b[o];
    for (let i = 0, r = o * nIn; i < nIn; i++) s += w[r + i] * x[i];
    y[o] = act ? gelu(s) : s;
  }
  return y;
}

/** The noise the network sees in the noisy point (x, y) at time t. */
export function predictNoise(model: PointsModel, x: number, y: number, t: number): [number, number] {
  const c = model.config,
    P = model.tensors,
    input: number[] = [x, y];
  // [sin(f v), cos(f v)] for d / 2 frequencies f from 1 to maxFreq, spaced geometrically (train_diffusion.py's sinusoids)
  const sinusoids = (v: number, d: number, maxFreq: number) => {
    const fs = Array.from({ length: d / 2 }, (_, k) => v * Math.exp((Math.log(maxFreq) * k) / (d / 2 - 1)));
    input.push(...fs.map(Math.sin), ...fs.map(Math.cos));
  };
  sinusoids(x, c.d_space / 2, c.max_space_freq);
  sinusoids(y, c.d_space / 2, c.max_space_freq);
  sinusoids(t, c.d_time, c.max_freq);
  let z = layer(Float64Array.from(input), P['inp.weight'], P['inp.bias'], true);
  const { n_hidden } = c;
  for (let l = 0; l < n_hidden; l++) z = layer(z, P[`hidden.${l}.weight`], P[`hidden.${l}.bias`], true);
  const out = layer(z, P['out.weight'], P['out.bias'], false);
  return [out[0], out[1]];
}

/** A batch of points on their way from noise to the outline: all advance one step at a time (`stepPoints`), so a page
 * can spread the work over frames. */
export interface PointRun {
  /** x, y per point */
  xy: Float64Array;
  steps: number;
  /** steps taken so far */
  done: number;
  rand: () => number;
}
export function startPoints(n: number, steps: number, seed: number): PointRun {
  const rand = mulberry32(seed);
  return { xy: Float64Array.from({ length: 2 * n }, () => gaussian(rand)), steps, done: 0, rand };
}
/** Move points [from, to) of the run one step on (the run's next step); `nextStep` then counts the step taken. */
export function stepPointRange(model: PointsModel, run: PointRun, from: number, to: number) {
  const i = run.steps - run.done,
    t = i / run.steps,
    s = (i - 1) / run.steps,
    ab = alphaBar(t),
    k = Math.sqrt(1 - ab);
  for (let p = from; p < to; p++) {
    const x = run.xy[2 * p],
      y = run.xy[2 * p + 1],
      [ex, ey] = predictNoise(model, x, y, t),
      next = stepTo(
        Float64Array.of(x, y),
        [(x - k * ex) / Math.sqrt(ab), (y - k * ey) / Math.sqrt(ab)],
        t,
        s,
        run.rand,
      );
    run.xy[2 * p] = next[0];
    run.xy[2 * p + 1] = next[1];
  }
}
export const nextStep = (run: PointRun) => {
  run.done++;
};
export const pointsOf = (run: PointRun): [number, number][] =>
  Array.from({ length: run.xy.length / 2 }, (_, p) => [run.xy[2 * p], run.xy[2 * p + 1]]);

/** n points drawn from noise in `steps` evenly spaced steps from t = 1 to 0; the same seed gives the same points. */
export function samplePoints(model: PointsModel, n: number, steps: number, seed: number): [number, number][] {
  const run = startPoints(n, steps, seed);
  while (run.done < steps) {
    stepPointRange(model, run, 0, n);
    nextStep(run);
  }
  return pointsOf(run);
}

/** How close counts as on a training point: about a drawn dot's width. */
export const ON = 0.02;
/** Chapter 4's training points for the ideal denoiser: n points evenly spaced along the outline. */
export function trainingPoints(outline: Segment[], n = 24): [number, number][] {
  const lens = outline.map(([x1, y1, x2, y2]) => Math.hypot(x2 - x1, y2 - y1)),
    total = lens.reduce((a, b) => a + b, 0),
    out: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    let d = ((k + 0.5) * total) / n,
      j = 0;
    while (d > lens[j]) d -= lens[j++];
    const [x1, y1, x2, y2] = outline[j],
      u = d / lens[j];
    out.push([x1 + u * (x2 - x1), y1 + u * (y2 - y1)]);
  }
  return out;
}

/** How far a point is from the nearest line of the outline. */
export function distanceToOutline(outline: Segment[], x: number, y: number): number {
  let best = Infinity;
  for (const [x1, y1, x2, y2] of outline) {
    const dx = x2 - x1,
      dy = y2 - y1,
      u = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(x - x1 - u * dx, y - y1 - u * dy));
  }
  return best;
}

/** Chapter 2's roughness: the mean distance from the sampled points to the outline (0 is a perfect drawing). */
export function roughness(outline: Segment[], points: [number, number][]): number {
  return points.reduce((sum, [x, y]) => sum + distanceToOutline(outline, x, y), 0) / points.length;
}
