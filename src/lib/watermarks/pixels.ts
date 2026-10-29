// The toy pixel mark (KTD3, labelled a toy): a seeded ±1 pattern added to a 64×64 grey picture, a spread-spectrum
// mark in miniature. The checker knows only the seed: it takes away each pixel's 3×3 neighbourhood average, which
// leaves fine detail and the pattern but not the picture's broad shapes, then correlates what's left with the pattern.
// A crop shifts the picture off the pattern and a blur smooths the pattern away; both are pinned in pinned.json.
import picture from '../../../data/watermarks/picture.json' with { type: 'json' };
import { mulberry32 } from '../transformers/sample';
import { LINE } from './detect';

export interface Pic {
  w: number;
  h: number;
  /** grey levels 0–255, row by row */
  px: Uint8Array;
}
/** [from, to] */
type Shade = number[];
type Shape =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; shade: Shade }
  | { kind: 'circle'; cx: number; cy: number; r: number; shade: Shade };
interface Spec {
  size: number;
  /** top to bottom */
  background: Shade;
  shapes: Shape[];
}

const lerp = ([a, b]: Shade, t: number) => Math.round(a + (b - a) * t);
const clamp = (v: number) => Math.max(0, Math.min(255, v));

/** Draws the picture's shapes in order over its background; a shape's shade runs left to right across it. */
export function render(spec: Spec): Pic {
  const n = spec.size,
    px = new Uint8Array(n * n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      let v = lerp(spec.background, y / (n - 1));
      for (const s of spec.shapes) {
        if (s.kind === 'rect' && x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h)
          v = lerp(s.shade, (x - s.x) / Math.max(1, s.w - 1));
        if (s.kind === 'circle' && (x - s.cx) ** 2 + (y - s.cy) ** 2 <= s.r ** 2) v = lerp(s.shade, 0.5);
      }
      px[y * n + x] = v;
    }
  return { w: n, h: n, px };
}

export const PICTURE = render(picture as Spec);
export const SIZE = picture.size;

/** The seeded ±1 pattern, one value per pixel of a SIZE×SIZE picture. */
export function pattern(seed: number): Int8Array {
  const rand = mulberry32(seed);
  return Int8Array.from({ length: SIZE * SIZE }, () => (rand() < 0.5 ? -1 : 1));
}

/** Adds strength × pattern to every pixel, clamped to 0–255. */
export function mark(pic: Pic, seed: number, strength: number): Pic {
  const p = pattern(seed);
  return { ...pic, px: Uint8Array.from(pic.px, (v, i) => clamp(v + strength * p[i])) };
}

const at = (pic: Pic, x: number, y: number) =>
  pic.px[Math.min(pic.h - 1, Math.max(0, y)) * pic.w + Math.min(pic.w - 1, Math.max(0, x))];
/** 3×3 neighbourhood average, edges repeated. */
const smooth = (pic: Pic, x: number, y: number) => {
  let s = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += at(pic, x + dx, y + dy);
  return s / 9;
};

export interface PixelCheck {
  /** correlation with the pattern in standard deviations: about 0 for any picture without the mark */
  z: number;
  verdict: 'marked' | 'unsure';
}

/** Correlates the picture's fine detail with the pattern, pixel (x, y) against pattern (x, y), from the top left. */
export function detect(pic: Pic, seed: number): PixelCheck {
  const p = pattern(seed),
    r: number[] = [],
    q: number[] = [];
  for (let y = 0; y < Math.min(pic.h, SIZE); y++)
    for (let x = 0; x < Math.min(pic.w, SIZE); x++) {
      r.push(at(pic, x, y) - smooth(pic, x, y));
      q.push(p[y * SIZE + x]);
    }
  const n = r.length,
    mean = r.reduce((a, b) => a + b, 0) / n,
    sd = Math.sqrt(r.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  const dot = r.reduce((a, v, i) => a + (v - mean) * q[i], 0);
  const z = sd === 0 ? 0 : dot / (sd * Math.sqrt(n));
  return { z, verdict: z >= LINE ? 'marked' : 'unsure' };
}

/** Cuts `n` pixels off the top and the left, as a crop does; the picture shrinks. */
export function crop(pic: Pic, n = 4): Pic {
  const w = pic.w - n,
    h = pic.h - n,
    px = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px[y * w + x] = pic.px[(y + n) * pic.w + x + n];
  return { w, h, px };
}

/** A 3×3 box blur, rounded back to whole grey levels. */
export function blur(pic: Pic): Pic {
  const px = new Uint8Array(pic.px.length);
  for (let y = 0; y < pic.h; y++) for (let x = 0; x < pic.w; x++) px[y * pic.w + x] = Math.round(smooth(pic, x, y));
  return { ...pic, px };
}

/** One pixel one grey level lighter (or darker at white): invisible, but a different file. */
export function nudgePixel(pic: Pic, i = 0): Pic {
  const px = pic.px.slice();
  px[i] = px[i] === 255 ? 254 : px[i] + 1;
  return { ...pic, px };
}
