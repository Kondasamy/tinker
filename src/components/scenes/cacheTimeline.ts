// The Caching module's precise view (the Timeline tab): the day in quarter hours, time running right. A lane per
// warehouse holds a cell per quarter hour: mint when every request was served from the shelf, mustard when any went to
// the depot, with a tomato mark when a stale copy was served. Under them a depot row shows the trips each quarter hour
// against its capacity line, tomato when overloaded. Each quarter hour is one focusable column. Pure layout, so the tests
// check it without drawing; the kit draws it as React SVG (text nodes only).
import { PALS } from '../../lib/iso/core.js';
import { ASSUMPTIONS, EDGES, clock, type Edge, type Result } from '../../lib/caching/sim';
import { EDGE_NAME } from './depotScene';

export const CELL_PAL = {
  hit: PALS.mint.l,
  miss: PALS.mustard.l,
  stale: PALS.tomato.l,
  over: PALS.tomato.l,
  trips: PALS.cobalt.l,
};
const DESK = { w: 600, pad: 10, label: 44, row: 16, gap: 4, bars: 54, axis: 18, fs: 10 },
  PHONE = { w: 340, pad: 6, label: 38, row: 16, gap: 4, bars: 54, axis: 18, fs: 10 };

export type CellKind = 'none' | 'hit' | 'miss';
export interface Column {
  t: number;
  x: number;
  w: number;
  cells: { edge: Edge; y: number; kind: CellKind; stale: boolean }[];
  bar: { y: number; h: number; over: boolean };
}

/** The timeline's layout: a column per quarter hour. The bars' scale fits the busiest quarter hour, never below the
 * depot's capacity, so the capacity line is always drawn. */
export function cacheTimeline(r: Result, { phone = false }: { phone?: boolean } = {}) {
  const L = phone ? PHONE : DESK,
    x0 = L.pad + L.label,
    n = r.ticks.length,
    w = (L.w - L.pad - x0) / n,
    lanesTop = L.pad,
    barsTop = lanesTop + EDGES.length * (L.row + L.gap) + 6,
    barsBottom = barsTop + L.bars,
    top = Math.max(ASSUMPTIONS.capacity * 1.25, r.peakTrips),
    yOf = (trips: number) => barsBottom - (trips / top) * L.bars;
  const columns: Column[] = r.ticks.map(k => ({
    t: k.t,
    x: x0 + k.t * w,
    w,
    cells: EDGES.map((edge, i) => {
      const v = k.edges[edge];
      return {
        edge,
        y: lanesTop + i * (L.row + L.gap),
        kind: v.requests === 0 ? 'none' : v.misses > 0 ? 'miss' : 'hit',
        stale: v.stale > 0,
      };
    }),
    bar: { y: yOf(k.trips), h: barsBottom - yOf(k.trips), over: k.overloaded },
  }));
  const h = barsBottom + L.axis + 4;
  // an hour mark every two hours
  const ticks = r.ticks.filter(k => k.t % 8 === 0).map(k => ({ x: x0 + k.t * w, label: clock(k.t) }));
  return {
    columns,
    w: L.w,
    h,
    x0,
    fs: L.fs,
    row: L.row,
    label: L.label,
    lanes: EDGES.map((e, i) => ({ edge: e, name: EDGE_NAME[e], y: lanesTop + i * (L.row + L.gap) })),
    bars: { top: barsTop, bottom: barsBottom, capY: yOf(ASSUMPTIONS.capacity) },
    axisY: barsBottom + 4,
    ticks,
  };
}
export type CacheTimeline = ReturnType<typeof cacheTimeline>;

const count = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
/** One quarter hour in words, for the read-out line. */
export function tickName(r: Result, t: number): string {
  const k = r.ticks[t];
  const edge = (e: Edge) => {
    const v = k.edges[e];
    if (!v.requests) return `${EDGE_NAME[e]}: no requests`;
    return `${EDGE_NAME[e]}: ${count(v.requests, 'request')}, ${v.hits} from the shelf, ${v.misses} to the depot${v.stale ? `, ${v.stale} stale` : ''}`;
  };
  return `${clock(t)}. ${EDGES.map(edge).join('; ')}. Depot: ${count(k.trips, 'trip')}${k.overloaded ? ', overloaded' : ''}.`;
}

/** The timeline in words, for its label. */
export const timelineLabel = (r: Result) =>
  `Cache timeline, a column per quarter hour from ${clock(0)} to ${clock(r.ticks.length - 1)}: ${Math.round(r.hitRate * 100)}% served from a shelf, ` +
  `${count(r.trips, 'trip')} to the depot, ${r.stale} stale reads, ${r.overloadedTicks} quarter hours overloaded.`;
