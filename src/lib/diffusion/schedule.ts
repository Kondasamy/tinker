// Diffusion's noise schedule and its one step (KTD8), shared by both denoisers: how much of the picture is left at time t,
// forward noising, and the DDPM step from a noisy x to a less noisy one around a guess at the clean picture.
import { mulberry32 } from '../transformers/sample';

/** The cosine schedule (Nichol and Dhariwal 2021), squeezed so t = 1 keeps a little signal; meta.json repeats it. */
export const SCHEDULE = { kind: 'cosine', s: 0.008, squeeze: 0.985 };

/** The step counts a chapter offers, fewest first. */
export const STEPS = [1, 2, 5, 10, 20, 50] as const;
export type Steps = (typeof STEPS)[number];
/** Chapter 1's noise slider: how far along the forward process (0 the drawing, 1 pure noise). */
export const NOISE = [0, 0.1, 0.25, 0.5, 0.75, 1] as const;

/** The share of signal left at time t: 1 at t = 0, about 0.0005 at t = 1. */
export function alphaBar(t: number): number {
  const { s, squeeze } = SCHEDULE,
    f = (u: number) => Math.cos(((u + s) / (1 + s)) * (Math.PI / 2)) ** 2;
  return f(t * squeeze) / f(0);
}

/** A standard normal draw from a uniform source (Box-Muller). */
export function gaussian(rand: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
}

/** Forward noising: √ᾱ·x0 + √(1 − ᾱ)·noise, the noise drawn from the seed. At t = 0 it is x0 itself. */
export function noised(x0: ArrayLike<number>, t: number, seed: number): Float64Array {
  const ab = alphaBar(t),
    rand = mulberry32(seed),
    k = Math.sqrt(ab),
    n = Math.sqrt(1 - ab);
  return Float64Array.from({ length: x0.length }, (_, i) => k * x0[i] + n * gaussian(rand));
}

/** Pearson correlation of two pictures: 1 the same up to brightness, near 0 unrelated. */
export function correlation(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const n = a.length;
  let ma = 0,
    mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i];
    mb += b[i];
  }
  let ab = 0,
    aa = 0,
    bb = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma / n,
      y = b[i] - mb / n;
    ab += x * y;
    aa += x * x;
    bb += y * y;
  }
  return aa && bb ? ab / Math.sqrt(aa * bb) : 0;
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
