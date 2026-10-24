// Diffusion's ideal denoiser (KTD8): for a small set of training drawings, the best possible guess at the clean
// picture has a closed form, the average of the drawings weighted by how likely each is to have made the noisy one.
// No trained model: it runs live on exact 32×32 bitmaps of Larkspur's part drawings, filled here in plain TypeScript
// (no canvas), so every browser and Node see the same pixels.
import { mulberry32 } from '../transformers/sample';
import { alphaBar, gaussian, stepTo } from './points';

export const SIZE = 32;
export type Label = 'hinge' | 'drill' | 'bracket';
/** A filled rectangle [x0, y0, x1, y1] or circle [cx, cy, r] in pixel units (y down); `clear` cuts a hole. */
type Shape =
  | { rect: [number, number, number, number]; clear?: true }
  | { circle: [number, number, number]; clear?: true };
export interface Drawing {
  id: string;
  label: Label;
  /** SIZE × SIZE, row by row: 1 ink, -1 paper (the range the noise is added in). */
  pixels: Float64Array;
}

const hole = (cx: number, cy: number, r = 1.6): Shape => ({ circle: [cx, cy, r], clear: true });
const SHAPES: { id: string; label: Label; shapes: Shape[] }[] = [
  {
    id: 'hinge-square',
    label: 'hinge',
    shapes: [{ rect: [4, 8, 28, 24] }, { rect: [14, 5, 18, 27] }, hole(8, 12), hole(8, 20), hole(24, 12), hole(24, 20)],
  },
  {
    id: 'hinge-tall',
    label: 'hinge',
    shapes: [
      { rect: [8, 4, 24, 28] },
      { rect: [14.5, 2, 17.5, 30] },
      ...[9, 16, 23].flatMap(y => [hole(11, y), hole(21, y)]),
    ],
  },
  {
    id: 'drill-pistol',
    label: 'drill',
    shapes: [
      { rect: [6, 8, 22, 15] },
      { rect: [22, 10, 25, 13] },
      { rect: [25, 11, 30, 12] },
      { rect: [11, 15, 16, 26] },
      { rect: [9, 26, 18, 29] },
    ],
  },
  {
    id: 'drill-long',
    label: 'drill',
    shapes: [{ rect: [3, 6, 20, 14] }, { rect: [20, 8, 24, 12] }, { rect: [24, 9, 30, 11] }, { rect: [9, 14, 14, 24] }],
  },
  {
    id: 'bracket-left',
    label: 'bracket',
    shapes: [
      { rect: [6, 6, 11, 26] },
      { rect: [6, 21, 26, 26] },
      hole(8.5, 10),
      hole(8.5, 16),
      hole(16, 23.5),
      hole(22, 23.5),
    ],
  },
  {
    id: 'bracket-right',
    label: 'bracket',
    shapes: [{ rect: [21, 4, 25, 27] }, { rect: [5, 23, 25, 27] }, hole(23, 8), hole(23, 15), hole(10, 25)],
  },
];

function fill(shapes: Shape[]): Float64Array {
  const px = new Float64Array(SIZE * SIZE).fill(-1);
  for (let j = 0; j < SIZE; j++)
    for (let i = 0; i < SIZE; i++) {
      const x = i + 0.5,
        y = j + 0.5;
      for (const s of shapes) {
        const inside =
          'rect' in s
            ? x >= s.rect[0] && x < s.rect[2] && y >= s.rect[1] && y < s.rect[3]
            : (x - s.circle[0]) ** 2 + (y - s.circle[1]) ** 2 <= s.circle[2] ** 2;
        if (inside) px[j * SIZE + i] = s.clear ? -1 : 1;
      }
    }
  return px;
}

export const DRAWINGS: Drawing[] = SHAPES.map(({ id, label, shapes }) => ({ id, label, pixels: fill(shapes) }));

const sqDist = (a: ArrayLike<number>, b: ArrayLike<number>) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return s;
};

/** The drawing closest to x, and the root-mean-square distance per pixel to it. */
export function nearest(x: ArrayLike<number>, pool: Drawing[] = DRAWINGS): { drawing: Drawing; rms: number } {
  let best = pool[0],
    d = Infinity;
  for (const p of pool) {
    const e = sqDist(x, p.pixels);
    if (e < d) [best, d] = [p, e];
  }
  return { drawing: best, rms: Math.sqrt(d / x.length) };
}

/**
 * The ideal guess at the clean picture behind x at time t: the pool's drawings averaged with weights
 * exp(-|x - √ᾱ d|² / 2(1 - ᾱ)), the posterior under the forward noise. At t = 0 it is the nearest drawing exactly.
 */
export function idealGuess(x: ArrayLike<number>, t: number, pool: Drawing[] = DRAWINGS): Float64Array {
  const ab = alphaBar(t);
  if (ab >= 1) return Float64Array.from(nearest(x, pool).drawing.pixels);
  const k = Math.sqrt(ab),
    logw = pool.map(p => {
      let s = 0;
      for (let i = 0; i < x.length; i++) s += (x[i] - k * p.pixels[i]) ** 2;
      return -s / (2 * (1 - ab));
    }),
    max = Math.max(...logw),
    w = logw.map(l => Math.exp(l - max)),
    sum = w.reduce((a, b) => a + b, 0),
    out = new Float64Array(x.length);
  pool.forEach((p, n) => {
    for (let i = 0; i < out.length; i++) out[i] += (w[n] / sum) * p.pixels[i];
  });
  return out;
}

/** A drawing made from noise in `steps` steps; a label restricts the average to that class. Same seed, same picture. */
export function sampleDrawing(steps: number, seed: number, label?: Label): Float64Array {
  const rand = mulberry32(seed),
    pool = label ? DRAWINGS.filter(d => d.label === label) : DRAWINGS;
  let x = Float64Array.from({ length: SIZE * SIZE }, () => gaussian(rand));
  for (let i = steps; i > 0; i--) x = stepTo(x, idealGuess(x, i / steps, pool), i / steps, (i - 1) / steps, rand);
  return x;
}
