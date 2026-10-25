// Module 19's precise view: the toy policy as a flat bar chart (flat.ts ink and palette). One pair of bars per written
// answer: its probability before (pale) and after (cobalt) the update, its letter under it, and its reward when graded.
// Pure: the stage puts a focusable marker per answer over `bars` and a read-out line under it, so hover is never the only
// way in (KTD15).
import { PALS, INK, f } from '../../lib/iso/core.js';
import { flatPill } from '../../lib/iso/flat';

export interface BarIn {
  id: string;
  before: number;
  after: number;
  reward?: number;
  gaming?: boolean;
}
export interface Bar extends BarIn {
  x: number;
  /** the after bar's height in the drawing */
  h: number;
}

const DESK = { w: 560, h: 280, fs: 9.5, l: 48, r: 20, t: 26, b: 52 },
  PHONE = { w: 320, h: 260, fs: 10.5, l: 42, r: 12, t: 26, b: 52 };
export const pct = (p: number) => `${Math.round(p * 100)}%`;

const rect = (x: number, y: number, w: number, h: number, fill: string, dash = '') =>
  `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(Math.max(0, h))}" fill="${fill}" stroke="${INK}" stroke-width="1.4"${dash}/>`;

/** The chart as an SVG string with its size and its bars. Labels are letters and numbers only. */
export function policyBars(bars: BarIn[], phone = false) {
  const L = phone ? PHONE : DESK,
    n = Math.max(1, bars.length),
    slot = (L.w - L.l - L.r) / n,
    bw = Math.min(28, slot * 0.3);
  const py = (p: number) => L.h - L.b - p * (L.h - L.t - L.b);
  let s = `<path class="axes" d="M${L.l} ${L.t}L${L.l} ${L.h - L.b}L${L.w - L.r} ${L.h - L.b}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += `<g class="axis-pills">${flatPill(L.l - 20, py(0), '0%', L.fs)}${flatPill(L.l - 20, py(1), '100%', L.fs)}</g>`;
  const out: Bar[] = bars.map((b, i) => {
    const x = L.l + slot * (i + 0.5);
    s += `<g class="bar" data-answer="${b.id}" data-after="${b.after.toFixed(4)}">`;
    s += rect(x - bw - 2, py(b.before), bw, py(0) - py(b.before), PALS.cobalt.l, ' stroke-dasharray="4 3"');
    s += rect(x + 2, py(b.after), bw, py(0) - py(b.after), b.gaming ? PALS.tomato.m : PALS.cobalt.m);
    s += flatPill(x, L.h - L.b + 14, b.id, L.fs);
    if (b.reward !== undefined) s += flatPill(x, L.h - L.b + 36, `+${b.reward}`, L.fs, b.reward > 0);
    s += '</g>';
    return { ...b, x, h: py(0) - py(b.after) };
  });
  return { svg: s, w: L.w, h: L.h, bars: out, top: L.t, base: py(0) };
}

/** One answer in words: the read-out line under the chart, and each marker's name. */
export const barWords = (b: BarIn) =>
  `Answer ${b.id}: ${pct(b.before)} before, ${pct(b.after)} after${b.reward === undefined ? '' : `, reward ${b.reward}`}${b.gaming ? ' (games the grader)' : ''}`;

/** The chart in words, for its label. */
export const barsLabel = (bars: BarIn[]) =>
  bars.length
    ? `The toy policy, before and after: ${bars.map(b => `${b.id} ${pct(b.before)} to ${pct(b.after)}`).join(', ')}.`
    : 'The toy policy: no answers yet.';
