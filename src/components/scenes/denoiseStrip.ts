// Diffusion's precise view (KTD15): the strip, a row of prints in flat ink (flat.ts's pill and ink), one per chosen step
// of a sample from the noise to the last step, or one per sample (chapter 5's grid). Each frame is the exact 32×32
// pixels, or the 2-D dots with training rings. Pure: the kit lays a focusable marker over each frame and reads its words
// out under the strip, so hover is never the only way in. Every string is escaped by flatPill.
import { CERAMIC, INK, PALS, f, mix } from '../../lib/iso/core.js';
import { flatPill } from '../../lib/iso/flat';
import { SIZE } from '../../lib/diffusion/drawings';
import type { Print } from './darkroomScene';

export interface StripFrame {
  print: Print;
  /** the short pill under the frame (STEP 10, NOISE, a part's name) */
  pill: string;
  /** the frame in words: the read-out line and the marker's name */
  words: string;
}
export interface Placed {
  x: number;
  y: number;
  size: number;
  words: string;
}

const MOST = 6;
/** The steps a strip shows for a sample of `steps` steps: every step up to five, else six evenly spaced. */
export const frameSteps = (steps: number) =>
  steps < MOST
    ? Array.from({ length: steps + 1 }, (_, i) => i)
    : Array.from({ length: MOST }, (_, k) => Math.round((k * steps) / (MOST - 1)));

const LEVELS = 6;
const GREYS = Array.from({ length: LEVELS }, (_, i) => mix(CERAMIC.l, INK, i / (LEVELS - 1)));

function printSvg(p: Print, x: number, y: number, size: number) {
  let s = `<rect x="${f(x)}" y="${f(y)}" width="${f(size)}" height="${f(size)}" fill="${CERAMIC.l}" stroke="${INK}" stroke-width="1.4"/>`;
  if (p.kind === 'pixels') {
    const c = size / SIZE,
      d: string[] = Array.from({ length: LEVELS }, () => '');
    for (let j = 0; j < SIZE; j++)
      for (let i = 0; i < SIZE; i++) {
        const v = Math.max(-1, Math.min(1, p.px[j * SIZE + i])),
          g = Math.round(((v + 1) / 2) * (LEVELS - 1));
        if (g) d[g] += `M${f(x + i * c)} ${f(y + j * c)}h${f(c)}v${f(c)}h${f(-c)}Z`;
      }
    s += d.map((dd, g) => (dd ? `<path d="${dd}" fill="${GREYS[g]}"/>` : '')).join('');
  } else {
    const h = size / 2,
      to = ([a, b]: [number, number]) => [x + h + a * h * 0.85, y + h - b * h * 0.85];
    let dots = '';
    for (const q of p.pts) {
      const [u, v] = to(q);
      if (u >= x && u <= x + size && v >= y && v <= y + size) dots += `M${f(u - 0.9)} ${f(v - 0.9)}h1.8v1.8h-1.8Z`;
    }
    s += `<path d="${dots}" fill="${INK}"/>`;
    for (const q of p.train ?? []) {
      const [u, v] = to(q);
      s += `<circle cx="${f(u)}" cy="${f(v)}" r="3" fill="none" stroke="${PALS.tomato.d}" stroke-width="1.2"/>`;
    }
  }
  return s;
}

/** The strip as an SVG string with its size and where each frame sits. Phones wrap three to a row. */
export function denoiseStrip(frames: StripFrame[], phone = false) {
  const per = phone ? 3 : MOST,
    size = phone ? 84 : 86,
    gap = phone ? 10 : 14,
    fs = phone ? 10.5 : 9.5,
    rowH = size + 30,
    pad = 10,
    cols = Math.min(per, frames.length),
    rows = Math.ceil(frames.length / per),
    w = pad * 2 + cols * size + (cols - 1) * gap,
    h = pad * 2 + rows * rowH;
  let svg = '';
  const placed: Placed[] = frames.map((fr, n) => {
    const x = pad + (n % per) * (size + gap),
      y = pad + Math.floor(n / per) * rowH;
    svg += `<g class="frame" data-frame="${n}">${printSvg(fr.print, x, y, size)}${flatPill(x + size / 2, y + size + 14, fr.pill, fs)}</g>`;
    return { x, y, size, words: fr.words };
  });
  return { svg, w, h, frames: placed };
}
