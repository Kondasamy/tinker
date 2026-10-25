// Opening a web page's precise view (the Waterfall tab): one page load as flat lanes, a row per step in the order the
// browser started them, each bar as long as the step took and placed where it started. A lost packet's wait is drawn
// apart at the bar's start, and a file held back behind another's lost packet (HTTP/2) shows its stall at the end.
// Pure layout in traceWaterfall's shape, so the tests check it without drawing; the kit draws it as React SVG.
import { num } from '../../lib/format';
import { ASSUMPTIONS, phaseName, type Phase, type PhaseKind, type Run } from '../../lib/web-requests/sim';

export const KIND_NAME: Record<PhaseKind, string> = {
  dns: 'directory',
  tcp: 'TCP',
  tls: 'TLS',
  quic: 'QUIC',
  req: 'file',
};
export const KIND_FILL: Record<PhaseKind, string> = {
  dns: '#76a0e2',
  tcp: '#f4b829',
  tls: '#f3a6bb',
  quic: '#f3a6bb',
  req: '#93d3b0',
};

export interface Row {
  i: number;
  phase: Phase;
  name: string;
  x: number;
  w: number;
  /** the lost packet's wait, at the bar's start */
  lostW: number;
  /** the stall behind another stream's loss, at the bar's end */
  stallW: number;
  y: number;
}
const DESK = { w: 600, label: 190, pad: 12, row: 26, top: 24, fs: 11 },
  PHONE = { w: 320, label: 96, pad: 8, row: 26, top: 24, fs: 11 };

/** The layout. */
export function requestWaterfall(r: Run, phone = false) {
  const L = phone ? PHONE : DESK,
    total = Math.max(1, r.total),
    k = (L.w - L.label - L.pad * 2) / total,
    x0 = L.label + L.pad;
  const rows: Row[] = r.phases.map((p, i) => ({
    i,
    phase: p,
    name: phaseName(p),
    x: x0 + p.start * k,
    w: Math.max(2, (p.end - p.start) * k),
    lostW: p.lost ? ASSUMPTIONS.rtoMs * k : 0,
    stallW: p.stalled * k,
    y: L.top + i * L.row,
  }));
  return { ...L, rows, total: r.total, h: L.top + rows.length * L.row + 6, x0, k };
}
export type Waterfall = ReturnType<typeof requestWaterfall>;

const msOf = (x: number) => `${num(Math.round(x))} ms`;
/** A row in words, for the list and the read-out line. */
export const rowName = (row: Row, n: number) => {
  const p = row.phase;
  return (
    `Step ${row.i + 1} of ${n}: ${row.name}, ${msOf(p.end - p.start)}, from ${msOf(p.start)} to ${msOf(p.end)}` +
    (p.lost ? `. A packet was lost and sent again after ${msOf(ASSUMPTIONS.rtoMs)}` : '') +
    (p.stalled ? `. Held back ${msOf(p.stalled)} behind a lost packet` : '')
  );
};

/** The waterfall in words, for its label. */
export const waterfallLabel = (r: Run) =>
  `Waterfall of ${r.customer.name}’s page load: ${r.phases.length} steps, ${msOf(r.total)} in all.`;
