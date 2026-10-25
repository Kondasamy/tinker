// Calibration's precise view: the reliability diagram, flat (flat.ts ink and palette). Stated confidence across, how
// often right up; the dashed diagonal is honest. One dot per jar (bin), joined by one accent line, each with a thin
// whisker to the diagonal showing its gap; axis names in pills. Pure: the stage puts a focusable marker per bin over
// `points` and a read-out line under it, so hover is never the only way in.
import { PALS, INK, f } from '../../lib/iso/core.js';
import { flatPill } from '../../lib/iso/flat';
import { accuracyOf, type Bin } from '../../lib/calibration/score';
import { pct } from './jarScene';

export interface ChartPoint {
  bin: Bin;
  x: number;
  y: number;
}
const DESK = { w: 560, h: 330, fs: 9.5, l: 56, r: 24, t: 26, b: 48 },
  PHONE = { w: 320, h: 300, fs: 10.5, l: 48, r: 14, t: 26, b: 48 };

/** The diagram as an SVG string with its size and its points. */
export function reliabilityChart(bins: Bin[], phone = false) {
  const L = phone ? PHONE : DESK;
  const px = (c: number) => L.l + c * (L.w - L.l - L.r),
    py = (a: number) => L.h - L.b - a * (L.h - L.t - L.b);
  let s = `<path class="axes" d="M${L.l} ${L.t}L${L.l} ${L.h - L.b}L${L.w - L.r} ${L.h - L.b}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  for (const v of [0.25, 0.5, 0.75, 1])
    s += `<path d="M${L.l} ${f(py(v))}L${L.w - L.r} ${f(py(v))}" stroke="${INK}" stroke-width=".4" opacity=".25"/>`;
  s += `<path class="honest" d="M${f(px(0))} ${f(py(0))}L${f(px(1))} ${f(py(1))}" stroke="${INK}" stroke-width="1.3" stroke-dasharray="5 4" fill="none"/>`;
  const points: ChartPoint[] = bins.map(bin => ({ bin, x: px(bin.conf), y: py(accuracyOf(bin)) }));
  for (const p of points)
    s += `<path class="gap" d="M${f(p.x)} ${f(p.y)}L${f(p.x)} ${f(py(p.bin.conf))}" stroke="${PALS.tomato.m}" stroke-width="1.6"/>`;
  if (points.length > 1) {
    const d = `M${points.map(p => `${f(p.x)} ${f(p.y)}`).join('L')}`;
    s += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${PALS.cobalt.m}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  for (const p of points)
    s += `<circle class="pt" data-conf="${p.bin.conf.toFixed(3)}" data-n="${p.bin.n}" cx="${f(p.x)}" cy="${f(p.y)}" r="4" fill="${PALS.cobalt.l}" stroke="${INK}" stroke-width="1.2"/>`;
  s +=
    `<g class="axis-pills">${flatPill(L.l - 22, py(0), '0%', L.fs)}${flatPill(L.l - 22, py(1), '100%', L.fs)}` +
    `${flatPill(L.l + 52, L.t - 12, 'HOW OFTEN RIGHT', L.fs)}${flatPill(px(1) - 4, L.h - L.b + 14, '100%', L.fs)}` +
    `${flatPill((L.l + L.w - L.r) / 2, L.h - 12, 'STATED CONFIDENCE', L.fs)}` +
    `${phone ? '' : flatPill(px(0.86), py(0.94) - 4, 'HONEST', L.fs)}</g>`;
  return { svg: s, w: L.w, h: L.h, points };
}

/** One jar in words: the read-out line under the diagram, and each marker's name. */
export const binWords = (b: Bin) =>
  `Stated ${pct(b.conf)} (${pct(b.lo)} to ${pct(b.hi)}): ${b.right} of ${b.n} right, ${pct(accuracyOf(b))}`;

/** The diagram in words, for its label. */
export const reliabilityLabel = (bins: Bin[]) =>
  bins.length
    ? `Reliability diagram: ${bins.map(b => `stated ${pct(b.conf)}, right ${pct(accuracyOf(b))}`).join('; ')}. On the dashed diagonal the two are equal.`
    : 'Reliability diagram: nothing measured yet.';
