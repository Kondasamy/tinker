// Diffusion's learned 2-D denoiser (KTD8) in plain TypeScript: the MLP scripts/train/train_diffusion.py trained on
// points from the hinge outline, the cosine noise schedule, and a seeded sampler. The sampler is shared with the
// ideal denoiser (ideal.ts): both give a guess at the clean x0, and each step moves to the DDPM posterior around it.
import { halfToFloat } from '../lm/load';
import { mulberry32 } from '../transformers/sample';

/** The cosine schedule (Nichol and Dhariwal 2021), squeezed so t = 1 keeps a little signal; meta.json repeats it. */
export const SCHEDULE = { kind: 'cosine', s: 0.008, squeeze: 0.985 };

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

/** The share of signal left at time t: 1 at t = 0, about 0.0005 at t = 1. */
export function alphaBar(t: number): number {
  const { s, squeeze } = SCHEDULE,
    f = (u: number) => Math.cos(((u + s) / (1 + s)) * (Math.PI / 2)) ** 2;
  return f(t * squeeze) / f(0);
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

/** A standard normal draw from a uniform source (Box-Muller). */
export function gaussian(rand: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
}

/**
 * One step from time t to an earlier time s, given the guess x0 at the clean value: a draw from the DDPM posterior
 * q(x_s | x_t, x0) (Ho et al. 2020). At s = 0 it returns x0 itself.
 */
export function stepTo(
  x: Float64Array,
  x0: ArrayLike<number>,
  t: number,
  s: number,
  rand: () => number,
): Float64Array<ArrayBuffer> {
  const at = alphaBar(t),
    as = alphaBar(s),
    a = at / as,
    k0 = (Math.sqrt(as) * (1 - a)) / (1 - at),
    kt = (Math.sqrt(a) * (1 - as)) / (1 - at),
    sd = Math.sqrt(((1 - as) / (1 - at)) * (1 - a)),
    out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = k0 * x0[i] + kt * x[i] + (sd ? sd * gaussian(rand) : 0);
  return out;
}

/** n points drawn from noise in `steps` evenly spaced steps from t = 1 to 0; the same seed gives the same points. */
export function samplePoints(model: PointsModel, n: number, steps: number, seed: number): [number, number][] {
  const rand = mulberry32(seed),
    out: [number, number][] = [];
  for (let p = 0; p < n; p++) {
    let x = Float64Array.of(gaussian(rand), gaussian(rand));
    for (let i = steps; i > 0; i--) {
      const t = i / steps,
        ab = alphaBar(t),
        [ex, ey] = predictNoise(model, x[0], x[1], t),
        k = Math.sqrt(1 - ab);
      x = stepTo(x, [(x[0] - k * ex) / Math.sqrt(ab), (x[1] - k * ey) / Math.sqrt(ab)], t, (i - 1) / steps, rand);
    }
    out.push([x[0], x[1]]);
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
