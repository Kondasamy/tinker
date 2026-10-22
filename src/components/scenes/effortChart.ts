// Module 11's precise view: accuracy against effort as a flat chart (flat.ts ink and palette). One line per question set,
// one dot per effort level; axis names in pills. Pure: the stage puts a focusable marker per level over `levels` and a
// read-out line under it (accuracy and cost), so hover is never the only way in (KTD16).
import { PALS, INK, f } from '../../lib/iso/core.js';
import { esc } from '../../lib/iso/blocks';
import { flatPill } from '../../lib/iso/flat';
import { EFFORTS, type Effort, type Point } from '../../lib/reasoning/engine';

export interface Series {
  id: string;
  label: string;
  points: Point[];
}
export interface Level {
  effort: Effort;
  x: number;
  values: { id: string; label: string; point: Point; y: number }[];
}

const DESK = { w: 600, h: 300, fs: 9.5, l: 52, r: 130, t: 24, b: 44 },
  PHONE = { w: 300, h: 260, fs: 10.5, l: 46, r: 20, t: 24, b: 44 };
const STYLE = [
  { c: PALS.cobalt.m, dash: '' },
  { c: PALS.tomato.m, dash: ' stroke-dasharray="6 4"' },
  { c: PALS.mint.d, dash: ' stroke-dasharray="2 3"' },
];
export const pct = (a: number) => `${Math.round(a * 100)}%`;

/** The chart as an SVG string with its size and its levels. Every string is escaped here. */
export function effortChart(series: Series[], phone = false) {
  const L = phone ? PHONE : DESK,
    n = EFFORTS.length;
  const px = (i: number) => L.l + 14 + (i / (n - 1)) * (L.w - L.l - L.r - 28);
  const py = (a: number) => L.h - L.b - a * (L.h - L.t - L.b);
  let s = `<path class="axes" d="M${L.l} ${L.t}L${L.l} ${L.h - L.b}L${L.w - L.r} ${L.h - L.b}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  s +=
    `<g class="axis-pills">${flatPill(L.l - 20, py(0), '0%', L.fs)}${flatPill(L.l - 20, py(1), '100%', L.fs)}${flatPill(L.l + 40, L.t - 10, 'ACCURACY', L.fs)}` +
    EFFORTS.map((e, i) => flatPill(px(i), L.h - L.b + 14, e.toUpperCase(), L.fs)).join('') +
    `${flatPill((L.l + L.w - L.r) / 2, L.h - 10, 'EFFORT', L.fs)}</g>`;
  const ends: number[] = []; // end pills already placed (their y), so two series ending together don't overlap
  series.forEach((ser, k) => {
    const st = STYLE[k % STYLE.length],
      pts = ser.points.map(p => [px(EFFORTS.indexOf(p.effort)), py(p.accuracy)]);
    const d = `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}`;
    s += `<g class="series" data-series="${esc(ser.id)}">`;
    if (pts.length > 1)
      s += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${st.c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"${st.dash}/>`;
    ser.points.forEach((p, i) => {
      s += `<circle class="pt" data-effort="${p.effort}" data-accuracy="${p.accuracy}" cx="${f(pts[i][0])}" cy="${f(pts[i][1])}" r="3" fill="${st.c}" stroke="${INK}" stroke-width="1"/>`;
    });
    const end = pts.at(-1);
    if (end && !phone) {
      const t = ser.label.toUpperCase();
      let y = end[1];
      while (ends.some(e => Math.abs(e - y) < 18)) y += 18;
      ends.push(y);
      s += flatPill(end[0] + 16 + t.length * L.fs * 0.33, y, t, L.fs);
    }
    s += '</g>';
  });
  const levels: Level[] = EFFORTS.map((effort, i) => ({
    effort,
    x: px(i),
    values: series.flatMap(ser => {
      const p = ser.points.find(q => q.effort === effort);
      return p ? [{ id: ser.id, label: ser.label, point: p, y: py(p.accuracy) }] : [];
    }),
  })).filter(l => l.values.length);
  return { svg: s, w: L.w, h: L.h, levels };
}

/** One level in words: the read-out line under the chart, and each marker's name. */
export const levelWords = (l: Level) =>
  `Effort ${l.effort}: ${l.values.map(v => `${v.label.toLowerCase()} ${v.point.right} of ${v.point.of} right (${pct(v.point.accuracy)}), cost ${v.point.cost} tokens`).join('; ')}`;

/** The chart in words, for its label. */
export function effortLabel(series: Series[]): string {
  const drawn = series.filter(s => s.points.length);
  if (!drawn.length) return 'Accuracy by effort: nothing run yet.';
  return `Accuracy by effort. ${drawn.map(s => `${s.label}: ${s.points.map(p => `${p.effort} ${pct(p.accuracy)}`).join(', ')}`).join('; ')}.`;
}
