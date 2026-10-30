// Module 14's precise view (the Waterfall tab): one trace as flat lanes, a row per span in reading order, indented by
// depth, each bar as long as the span took and placed where it started. The first failure, once shown, is stamped.
// Pure layout, so the tests check it without drawing; the kit draws it as React SVG (text nodes only).
import { num } from '../../lib/format';
import { durationOf, ordered, rootOf, type SpanKind, type Trace } from '../../lib/observability/traces';

export const KIND_NAME: Record<SpanKind, string> = {
  agent: 'whole run',
  retrieval: 'search',
  chat: 'model call',
  tool: 'tool call',
  reply: 'reply',
};

export interface Row {
  i: number;
  id: string;
  kind: SpanKind;
  name: string;
  depth: number;
  ms: number;
  start: number;
  /** the bar, in the drawing's units */
  x: number;
  w: number;
  y: number;
}
const DESK = { w: 600, label: 200, pad: 12, row: 34, top: 26, fs: 11 },
  PHONE = { w: 320, label: 92, pad: 8, row: 40, top: 26, fs: 12 };

/** The layout. An empty trace draws no rows (never divides by zero). */
export function traceWaterfall(t: Trace, phone = false) {
  const L = phone ? PHONE : DESK,
    total = t.spans.length ? Math.max(1, durationOf(rootOf(t))) : 1;
  const k = (L.w - L.label - L.pad * 2) / total,
    x0 = L.label + L.pad;
  const rows: Row[] = ordered(t).map(({ span: s, depth }, i) => ({
    i,
    id: s.id,
    kind: s.kind,
    name: s.name,
    depth,
    ms: durationOf(s),
    start: s.start,
    x: x0 + s.start * k,
    w: Math.max(2, durationOf(s) * k),
    y: L.top + i * L.row,
  }));
  return {
    rows,
    total,
    w: L.w,
    h: L.top + rows.length * L.row + 8,
    label: L.label,
    pad: L.pad,
    row: L.row,
    fs: L.fs,
    x0,
    k,
  };
}
export type Waterfall = ReturnType<typeof traceWaterfall>;

/** A row's name, for the list and the read-out line. */
export const rowName = (r: Row, n: number) =>
  `Span ${r.i + 1} of ${n}: ${r.name} (${KIND_NAME[r.kind]}), ${num(r.ms)} ms, starting at ${num(r.start)} ms`;

/** The waterfall in words, for its label. */
export const waterfallLabel = (t: Trace, w: Waterfall) =>
  `Trace of ${t.customer}’s question: ${w.rows.length} spans over ${num(w.total)} ms.`;
