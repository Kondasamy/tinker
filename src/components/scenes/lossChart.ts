// Module 9's precise view: a loss curve as a flat chart (flat.ts ink and palette). One line per series (training loss,
// held-out loss), dot per recorded step; axis names and end values in pills. Pure: the stage puts its focusable step
// markers over `steps` and a read-out line under it, so hover is never the only way in (KTD11).
import { PALS, INK, f } from '../../lib/iso/core.js';
import { esc } from '../../lib/iso/blocks';
import { flatPill } from '../../lib/iso/flat';
import type { FineTuneRun } from '../../lib/lm/load';

export interface Series {
  id: string;
  label: string;
  points: { step: number; loss: number }[];
}
export interface ChartOpts {
  series: Series[];
  phone?: boolean;
}
/** A step the reader can land on: its x, and each series' loss there (null where a series has none). */
export interface ChartStep {
  step: number;
  x: number;
  values: { id: string; label: string; loss: number | null; y: number | null }[];
}

/** A run's two curves from meta.json: training loss and held-out loss per recorded step. */
export const runSeries = (run: FineTuneRun): Series[] => [
  { id: 'train', label: 'Training', points: run.lossCurve.map(p => ({ step: p.step, loss: p.train })) },
  { id: 'heldout', label: 'Held-out', points: run.lossCurve.map(p => ({ step: p.step, loss: p.heldout })) },
];

const DESK = { w: 600, h: 300, fs: 9.5, l: 52, r: 96, t: 20, b: 44 },
  PHONE = { w: 300, h: 260, fs: 10.5, l: 46, r: 16, t: 20, b: 44 };
// solid, then dashed: the series differ by more than colour
const STYLE = [
  { c: PALS.cobalt.m, dash: '' },
  { c: PALS.tomato.m, dash: ' stroke-dasharray="6 4"' },
  { c: PALS.mint.d, dash: ' stroke-dasharray="2 3"' },
];
export const loss = (x: number) => x.toFixed(2);

/** The chart as an SVG string with its size and its steps. Every string is escaped here. No division by a zero span,
 * so an empty or one-point curve draws the axes only (or one dot), never NaN. */
export function lossChart({ series, phone = false }: ChartOpts) {
  const L = phone ? PHONE : DESK,
    all = series.flatMap(s => s.points);
  const steps = [...new Set(all.map(p => p.step))].sort((a, b) => a - b);
  const x0 = steps[0] ?? 0,
    x1 = steps.at(-1) ?? 0,
    top = Math.max(1, Math.ceil(Math.max(0, ...all.map(p => p.loss))));
  const px = (step: number) => L.l + (x1 > x0 ? (step - x0) / (x1 - x0) : 0) * (L.w - L.l - L.r);
  const py = (v: number) => L.h - L.b - (v / top) * (L.h - L.t - L.b);
  const ax = `M${L.l} ${L.t}L${L.l} ${L.h - L.b}L${L.w - L.r} ${L.h - L.b}`;
  let s = `<path class="axes" d="${ax}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  // y: 0 and the top, x: the first and last step, and the axis names
  s +=
    `<g class="axis-pills">` +
    flatPill(L.l - 18, py(0), '0', L.fs) +
    flatPill(L.l - 18, py(top), String(top), L.fs) +
    flatPill(L.l + 28, L.t - 6, 'LOSS', L.fs) +
    (steps.length
      ? flatPill(px(x0), L.h - L.b + 14, String(x0), L.fs) +
        (x1 > x0 ? flatPill(px(x1), L.h - L.b + 14, String(x1), L.fs) : '')
      : '') +
    flatPill((L.l + L.w - L.r) / 2, L.h - 10, 'STEP', L.fs) +
    '</g>';
  series.forEach((ser, i) => {
    const st = STYLE[i % STYLE.length],
      pts = ser.points.map(p => [px(p.step), py(p.loss)]);
    s += `<g class="series" data-series="${esc(ser.id)}">`;
    if (pts.length > 1)
      s +=
        `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}" fill="none" stroke="${st.c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"${st.dash}/>`;
    ser.points.forEach((p, k) => {
      s += `<circle class="pt" data-step="${p.step}" data-loss="${p.loss}" cx="${f(pts[k][0])}" cy="${f(pts[k][1])}" r="2.6" fill="${st.c}" stroke="${INK}" stroke-width="1"/>`;
    });
    // the series' name by its last point (phones: in the key under the chart instead)
    const end = pts.at(-1);
    if (end && !phone) s += flatPill(end[0] + 46, end[1], ser.label.toUpperCase(), L.fs);
    s += '</g>';
  });
  const marks: ChartStep[] = steps.map(step => ({
    step,
    x: px(step),
    values: series.map(ser => {
      const p = ser.points.find(q => q.step === step);
      return { id: ser.id, label: ser.label, loss: p ? p.loss : null, y: p ? py(p.loss) : null };
    }),
  }));
  return { svg: s, w: L.w, h: L.h, steps: marks, styles: series.map((_, i) => STYLE[i % STYLE.length]) };
}

/** One step in words: the read-out line under the chart, and each marker's name. */
export const stepWords = (m: ChartStep) =>
  `Step ${m.step}: ${m.values
    .filter(v => v.loss !== null)
    .map(v => `${v.label.toLowerCase()} loss ${loss(v.loss!)}`)
    .join(', ')}`;

/** The chart in words, for its label. */
export function chartLabel(series: Series[]): string {
  const drawn = series.filter(s => s.points.length);
  if (!drawn.length) return 'Loss chart: no steps recorded yet.';
  return `Loss chart over training steps. ${drawn.map(s => `${s.label} loss goes from ${loss(s.points[0].loss)} at step ${s.points[0].step} to ${loss(s.points.at(-1)!.loss)} at step ${s.points.at(-1)!.step}`).join('; ')}.`;
}
