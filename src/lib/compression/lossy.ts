// Compression's lossy step (KTD6): throw some detail away on purpose, then pack what is left losslessly. Two knobs on
// the small picture: blocks (each square of pixels takes its average colour) and colour levels (each channel rounded
// to fewer shades). Both make repeats the pair can point back to. Scored by the mean pixel difference. JPEG works on
// the same idea in a cleverer way (copy says so). Pure and synchronous.
import { sizeOf } from './coders';
import type { Picture } from './files';

/** The knobs' settings: shades per channel (256 keeps every one) and block size in pixels (1 keeps every pixel). */
export const LEVELS = [256, 32, 16, 8, 4] as const;
export const BLOCKS = [1, 2, 4] as const;
export interface Loss {
  levels: number;
  block: number;
}
export const NO_LOSS: Loss = { levels: 256, block: 1 };

/** The picture with each block averaged, then each channel rounded to the middle of its shade. */
export function lossy(p: Picture, { levels, block }: Loss): Picture {
  const out = new Uint8Array(p.rgb.length),
    q = 256 / levels;
  for (let by = 0; by < p.h; by += block)
    for (let bx = 0; bx < p.w; bx += block)
      for (let k = 0; k < 3; k++) {
        let sum = 0,
          n = 0;
        for (let y = by; y < Math.min(p.h, by + block); y++)
          for (let x = bx; x < Math.min(p.w, bx + block); x++, n++) sum += p.rgb[(y * p.w + x) * 3 + k];
        const avg = Math.round(sum / n),
          v = levels >= 256 ? avg : Math.min(255, Math.floor(avg / q) * q + Math.floor(q / 2));
        for (let y = by; y < Math.min(p.h, by + block); y++)
          for (let x = bx; x < Math.min(p.w, bx + block); x++) out[(y * p.w + x) * 3 + k] = v;
      }
  return { ...p, rgb: out };
}

/** The mean difference per colour channel, as a percentage of the full range: 0 is the same picture. */
export function differenceOf(a: Picture, b: Picture): number {
  let d = 0;
  for (let i = 0; i < a.rgb.length; i++) d += Math.abs(a.rgb[i] - b.rgb[i]);
  return Math.round((d / a.rgb.length / 255) * 1000) / 10;
}

export const lossKey = (l: Loss) => `${l.levels}x${l.block}`;
/** The picture after a setting: its pixels, its packed size (the pair, losslessly, on what is left) and its difference. */
export function lossOf(p: Picture, l: Loss) {
  const pic = lossy(p, l);
  return { pic, size: sizeOf('pair', pic.rgb, `picture:${lossKey(l)}`), diff: differenceOf(p, pic) };
}
