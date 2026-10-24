// Diffusion's ideal denoiser (KTD8): for a small set of training drawings, the best possible guess at the clean
// picture has a closed form, the average of the drawings weighted by how likely each is to have made the noisy one.
// No trained model. The same formula over a handful of 2-D points is chapter 4's ideal denoiser: it can only copy.
import { mulberry32 } from '../transformers/sample';
import { DRAWINGS, nearest, SIZE, type Drawing, type Label } from './drawings';
import { alphaBar, gaussian, stepTo } from './schedule';

/** Chapter 5's guidance scales: 0 ignores the label, 1 follows it as trained, above 1 pushes past it. */
export const GUIDANCE = [0, 1, 2, 4] as const;
export type Guidance = (typeof GUIDANCE)[number];
/** Predictions a step needs: guidance above 1 mixes the labelled and the unlabelled guess, so it needs both. */
export const passes = (scale: number) => (scale === 0 || scale === 1 ? 1 : 2);

/** Weighted average of `pool` (each a flat vector) under the forward noise: the posterior mean of the clean value,
 * each item's weight scaled by its prior (1 each by default). */
function posteriorMean(x: ArrayLike<number>, t: number, pool: ArrayLike<number>[], prior?: number[]): Float64Array {
  const ab = alphaBar(t),
    k = Math.sqrt(ab),
    logw = pool.map((p, n) => {
      let s = 0;
      for (let i = 0; i < x.length; i++) s += (x[i] - k * p[i]) ** 2;
      return -s / (2 * (1 - ab)) + (prior ? Math.log(prior[n]) : 0);
    }),
    max = Math.max(...logw),
    w = logw.map(l => Math.exp(l - max)),
    sum = w.reduce((a, b) => a + b, 0),
    out = new Float64Array(x.length);
  pool.forEach((p, n) => {
    for (let i = 0; i < out.length; i++) out[i] += (w[n] / sum) * p[i];
  });
  return out;
}

/**
 * The ideal guess at the clean picture behind x at time t: the pool's drawings averaged with weights
 * exp(-|x - √ᾱ d|² / 2(1 - ᾱ)), the posterior under the forward noise. At t = 0 it is the nearest drawing exactly.
 */
export function idealGuess(x: ArrayLike<number>, t: number, pool: Drawing[] = DRAWINGS): Float64Array {
  if (alphaBar(t) >= 1) return Float64Array.from(nearest(x, pool).drawing.pixels);
  return posteriorMean(
    x,
    t,
    pool.map(p => p.pixels),
  );
}

/**
 * The labelled guess. A real model only partly learns what a label means, so this toy's labelled denoiser does too: it
 * weighs the label's drawings LABEL_PRIOR times the others instead of keeping only them. Larkspur's toy choice, set so
 * that guidance has something to fix; the copy says so.
 */
export const LABEL_PRIOR = 3;
export function labelledGuess(x: ArrayLike<number>, t: number, label: Label): Float64Array {
  if (alphaBar(t) >= 1) return Float64Array.from(nearest(x).drawing.pixels);
  return posteriorMean(
    x,
    t,
    DRAWINGS.map(d => d.pixels),
    DRAWINGS.map(d => (d.label === label ? LABEL_PRIOR : 1)),
  );
}

/**
 * Classifier-free guidance on the ideal denoiser: unlabelled guess u (every drawing), labelled guess c, mixed as
 * u + scale·(c − u). That is Ho and Salimans' (1 + w)·c − w·u with scale = 1 + w; the guess at the
 * clean picture is linear in the predicted noise, so mixing guesses is mixing noise predictions.
 */
export function guidedGuess(x: ArrayLike<number>, t: number, label?: Label, scale = 1): Float64Array {
  if (!label || scale === 0) return idealGuess(x, t);
  const c = labelledGuess(x, t, label);
  if (scale === 1) return c;
  const u = idealGuess(x, t);
  return c.map((v, i) => u[i] + scale * (v - u[i]));
}

/** Every frame of a sample made from noise in `steps` steps: the noise first, the picture last. Same seed, same frames. */
export function trajectory(steps: number, seed: number, label?: Label, scale = 1): Float64Array[] {
  const rand = mulberry32(seed);
  let x = Float64Array.from({ length: SIZE * SIZE }, () => gaussian(rand));
  const out = [x];
  for (let i = steps; i > 0; i--) {
    x = stepTo(x, guidedGuess(x, i / steps, label, scale), i / steps, (i - 1) / steps, rand);
    out.push(x);
  }
  return out;
}

/** A drawing made from noise in `steps` steps; a label steers it at the given guidance scale. */
export const sampleDrawing = (steps: number, seed: number, label?: Label, scale = 1): Float64Array =>
  trajectory(steps, seed, label, scale)[steps];

/** Chapter 2's roughness for pictures: the root-mean-square distance per pixel to the nearest clean drawing. */
export const pictureRoughness = (x: ArrayLike<number>) => nearest(x).rms;

/** The ideal denoiser over a few 2-D training points: n points from noise in `steps` steps. It can only copy them. */
export function sampleIdealPoints(
  train: [number, number][],
  n: number,
  steps: number,
  seed: number,
): [number, number][] {
  const rand = mulberry32(seed),
    out: [number, number][] = [];
  for (let p = 0; p < n; p++) {
    let x = Float64Array.of(gaussian(rand), gaussian(rand));
    for (let i = steps; i > 0; i--) x = stepTo(x, posteriorMean(x, i / steps, train), i / steps, (i - 1) / steps, rand);
    out.push([x[0], x[1]]);
  }
  return out;
}
