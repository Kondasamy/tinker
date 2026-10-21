// Module 12's precise view: the quality and cost frontier as a flat chart (flat.ts ink and palette, after lossChart).
// x is cost in relative units (one large answer = 1), y is right answers out of the questions. The router's points, one
// per threshold, are joined by a line; all-large stands apart as a square. Axis names and the ends in pills. Pure: the
// stage puts a focusable marker over each point and a read-out line under it, so hover is never the only way in.
import { PALS, INK, f } from '../../lib/iso/core.js';
import { esc } from '../../lib/iso/blocks';
import { flatPill } from '../../lib/iso/flat';
import type { Point } from '../../lib/small-models/router';

export interface FrontierOpts { points: Point[]; phone?: boolean }
export interface Placed extends Point { x: number; y: number }

const DESK = { w: 600, h: 300, fs: 9.5, l: 52, r: 40, t: 24, b: 44 }, PHONE = { w: 300, h: 260, fs: 10.5, l: 40, r: 18, t: 24, b: 44 };
/** Costs to one decimal: they are fractions of a large answer. */
export const units = (x: number) => (Math.round(x * 10) / 10).toString();

/** The chart as an SVG string with its size and its placed points. Every string is escaped here. An empty list draws
 * the axes only, never NaN. */
export function frontierChart({ points, phone = false }: FrontierOpts) {
  const L = phone ? PHONE : DESK, of = Math.max(1, ...points.map(p => p.of)), top = Math.max(1, Math.ceil(Math.max(0, ...points.map(p => p.cost))));
  const px = (c: number) => L.l + (c / top) * (L.w - L.l - L.r), py = (r: number) => L.h - L.b - (r / of) * (L.h - L.t - L.b);
  const placed: Placed[] = points.map(p => ({ ...p, x: px(p.cost), y: py(p.right) }));
  let s = `<path class="axes" d="M${L.l} ${L.t}L${L.l} ${L.h - L.b}L${L.w - L.r} ${L.h - L.b}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += '<g class="axis-pills">' + flatPill(L.l - 16, py(0), '0', L.fs) + flatPill(L.l - 16, py(of), String(of), L.fs)
    + flatPill(L.l + 40, L.t - 10, 'RIGHT', L.fs) + flatPill(px(top), L.h - L.b + 14, String(top), L.fs)
    + flatPill((L.l + L.w - L.r) / 2, L.h - 10, 'COST', L.fs) + '</g>';
  const line = placed.filter(p => p.threshold !== null);
  if (line.length > 1) {
    const d = 'M' + line.map(p => `${f(p.x)} ${f(p.y)}`).join('L');
    s += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`
      + `<path d="${d}" fill="none" stroke="${PALS.cobalt.m}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  for (const p of placed) {
    s += p.threshold === null
      ? `<rect class="pt" data-point="${esc(p.id)}" x="${f(p.x - 4.5)}" y="${f(p.y - 4.5)}" width="9" height="9" fill="${PALS.tomato.m}" stroke="${INK}" stroke-width="1.2"/>`
      : `<circle class="pt" data-point="${esc(p.id)}" cx="${f(p.x)}" cy="${f(p.y)}" r="3.4" fill="${PALS.cobalt.m}" stroke="${INK}" stroke-width="1.2"/>`;
  }
  // name the all-large square and the line's two ends (phones: in the read-out instead)
  if (!phone) for (const p of placed.filter((q, i) => q.threshold === null || i === 0 || q === line.at(-1)))
    s += flatPill(p.x, p.y - 16, p.label.toUpperCase(), L.fs);
  return { svg: s, w: L.w, h: L.h, points: placed };
}

/** One point in words: the read-out line under the chart, and each marker's name. */
export const pointWords = (p: Point) =>
  `${p.threshold === null ? p.label : `Router, up below ${p.threshold}`}: ${p.right} of ${p.of} right, cost ${units(p.cost)}${p.threshold === null ? '' : `, ${p.up} sent up`}`;

/** The chart in words, for its label. */
export function frontierLabel(points: Point[]): string {
  if (!points.length) return 'Quality and cost chart: no points yet.';
  return `Quality and cost chart: right answers against cost, one point per policy. ${points.map(pointWords).join('; ')}.`;
}
