// The Load balancing module's precise view (the Board tab): a histogram of customers' waits that fills as requests land,
// a bar per wait band, and a p99 marker that moves as it does. Bars keep the whole run's scale from the start, so they
// only grow. Pure layout, so the tests check it without drawing; the kit draws it as React SVG (text nodes only).
import { PALS } from '../../lib/iso/core.js';
import { percentile } from '../../lib/load-balancing/percentile';
import { landedBy, type Result } from '../../lib/load-balancing/sim';

/** the wait bands' lower edges, ms; the last band holds everything from 1 s up */
export const EDGES = [0, 25, 50, 75, 100, 150, 200, 300, 500, 1000];
export const BAR_PAL = { ok: PALS.mint.l, slow: PALS.mustard.l, failed: PALS.tomato.l, p99: PALS.tomato.d };
const DESK = { w: 600, h: 230, pad: 12, left: 30, bottom: 34, fs: 11 },
  PHONE = { w: 340, h: 230, pad: 8, left: 26, bottom: 34, fs: 10 };

/** The band a wait falls in. */
export const bandOf = (ms: number) => {
  let i = 0;
  while (i + 1 < EDGES.length && ms >= EDGES[i + 1]) i++;
  return i;
};
/** Each band's count over some waits. */
export const histogram = (ms: number[]) => {
  const h = EDGES.map(() => 0);
  for (const x of ms) h[bandOf(x)]++;
  return h;
};
export const bandName = (i: number) =>
  i === EDGES.length - 1 ? `${EDGES[i] / 1000} s and over` : `${EDGES[i]} to ${EDGES[i + 1]} ms`;

/** The board at time t (ms) of a run: bars for the requests landed by then, and their p50 and p99. */
export function latencyBoard(r: Result, t: number, { phone = false }: { phone?: boolean } = {}) {
  const L = phone ? PHONE : DESK,
    landed = landedBy(r, t),
    counts = histogram(landed.map(s => s.ms)),
    final = histogram(r.served.map(s => s.ms)),
    top = Math.max(1, ...final),
    x0 = L.pad + L.left,
    bw = (L.w - L.pad - x0) / EDGES.length,
    base = L.h - L.bottom,
    tall = base - L.pad - 16;
  /** where a wait sits on the axis: its band, and how far through it */
  const xOf = (ms: number) => {
    const i = bandOf(ms),
      hi = EDGES[i + 1];
    return x0 + (i + (hi === undefined ? 0.5 : (ms - EDGES[i]) / (hi - EDGES[i]))) * bw;
  };
  const ms = landed.map(s => s.ms);
  const p = (q: number) => (ms.length ? percentile(ms, q) : null);
  const p99 = p(99);
  return {
    w: L.w,
    h: L.h,
    fs: L.fs,
    x0,
    base,
    bars: counts.map((c, i) => ({
      i,
      x: x0 + i * bw + 1.5,
      w: bw - 3,
      h: (c / top) * tall,
      count: c,
      label: i === EDGES.length - 1 ? '1s+' : String(EDGES[i]),
      tone: i >= bandOf(1000) ? 'failed' : i >= bandOf(100) ? 'slow' : 'ok',
    })),
    p50: p(50),
    p99,
    marker: p99 === null ? null : { x: xOf(p99), ms: p99 },
    landed: landed.length,
    total: r.served.length,
  };
}
export type LatencyBoard = ReturnType<typeof latencyBoard>;

const msText = (x: number) => `${Math.round(x).toLocaleString('en-US')} ms`;
/** The percentiles as text: the read-out under the board. */
export const percentilesText = (b: Pick<LatencyBoard, 'p50' | 'p99' | 'landed'>) =>
  b.p50 === null || b.p99 === null
    ? 'No requests answered yet.'
    : `p50 ${msText(b.p50)}, p99 ${msText(b.p99)}, over ${b.landed} requests.`;
/** The board in words, for its label. */
export const boardLabel = (b: LatencyBoard) =>
  `Latency board, a bar per wait band: ${b.bars
    .filter(x => x.count)
    .map(x => `${x.count} at ${bandName(x.i)}`)
    .join(', ')}. ${percentilesText(b)}`;
