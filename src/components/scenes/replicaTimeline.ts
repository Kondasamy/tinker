// The Consistency module's precise view (the Timeline tab): the morning a minute at a time, time running right, a lane
// per warehouse. Each minute's cell carries what happened there: a sale (mint; tomato with a marker when the final
// count lost it, a conflict), a refused order (a tomato cross), a sold-out order (grey), a look (a white ring; tomato
// when it read an old count), and a cobalt tick when a copy of someone else's change arrived. The cut-off warehouse's
// lane is shaded while the line is down. Each minute is one focusable column. Pure layout, so the tests check it without
// drawing; the kit draws it as React SVG (text nodes only).
import { PALS } from '../../lib/iso/core.js';
import {
  PRODUCT_NAME,
  REPS,
  REP_NAME,
  clock,
  unitsOf,
  type Outcome,
  type Rep,
  type Run,
} from '../../lib/consistency/sim';

export const MARK_PAL = {
  sold: PALS.mint.l,
  lost: PALS.tomato.l,
  refused: PALS.tomato.m,
  soldout: '#d8d3c4',
  read: '#fffdf6',
  stale: PALS.tomato.l,
  arrive: PALS.cobalt.m,
  cut: PALS.tomato.l,
};
export type MarkKind = 'sold' | 'lost' | 'refused' | 'soldout' | 'read' | 'stale';
const DESK = { w: 600, pad: 10, label: 44, row: 22, gap: 6, axis: 18, fs: 10 },
  PHONE = { w: 340, pad: 6, label: 38, row: 22, gap: 6, axis: 18, fs: 10 };

export const markOf = (o: Outcome): MarkKind =>
  o.kind === 'look'
    ? o.stale
      ? 'stale'
      : 'read'
    : o.result === 'sold'
      ? o.lost
        ? 'lost'
        : 'sold'
      : o.result === 'refused'
        ? 'refused'
        : 'soldout';
const where = (o: Outcome) => (o.kind === 'look' ? o.served : o.at);

export interface Cell {
  rep: Rep;
  y: number;
  marks: MarkKind[];
  /** a copy of another warehouse's change arrived this minute */
  arrived: boolean;
  /** this warehouse is cut off this minute */
  cut: boolean;
}
export interface Column {
  t: number;
  x: number;
  w: number;
  cells: Cell[];
}

/** The timeline's layout: a column per minute, a cell per warehouse. */
export function replicaTimeline(r: Run, { phone = false }: { phone?: boolean } = {}) {
  const L = phone ? PHONE : DESK,
    x0 = L.pad + L.label,
    n = r.ticks.length,
    w = (L.w - L.pad - x0) / n,
    yOf = (i: number) => L.pad + i * (L.row + L.gap);
  const columns: Column[] = r.ticks.map((k, t) => ({
    t,
    x: x0 + t * w,
    w,
    cells: REPS.map((rep, i) => {
      const mine = k.outcomes.filter(o => where(o) === rep),
        prev = t ? r.ticks[t - 1].boards[rep] : undefined,
        wrote = k.outcomes.some(o => o.kind === 'order' && o.result === 'sold' && o.at === rep);
      return {
        rep,
        y: yOf(i),
        marks: mine.map(markOf),
        arrived: !!prev && !wrote && (prev.hinge !== k.boards[rep].hinge || prev.drill !== k.boards[rep].drill),
        cut: k.cutOff === rep,
      };
    }),
  }));
  const lanesBottom = yOf(REPS.length) - L.gap;
  return {
    columns,
    w: L.w,
    h: lanesBottom + L.axis + 4,
    x0,
    fs: L.fs,
    row: L.row,
    lanes: REPS.map((rep, i) => ({ rep, name: REP_NAME[rep], y: yOf(i) })),
    bottom: lanesBottom,
    axisY: lanesBottom + 4,
    // a clock mark every five minutes
    ticks: r.ticks.filter(k => k.t % 5 === 0).map(k => ({ x: x0 + k.t * w, label: clock(k.t) })),
  };
}
export type ReplicaTimeline = ReturnType<typeof replicaTimeline>;

const SAID: Record<MarkKind, (o: Outcome) => string> = {
  sold: o => `${o.who} bought a ${PRODUCT_NAME[o.product]}`,
  lost: o => `${o.who} bought a ${PRODUCT_NAME[o.product]}, a sale the final count lost`,
  refused: o => `${o.who}’s ${PRODUCT_NAME[o.product]} order was refused`,
  soldout: o => `${o.who} found the ${PRODUCT_NAME[o.product]} sold out`,
  read: o => `${o.who} saw ${unitsOf(o.seen ?? 0, o.product)}`,
  stale: o => `${o.who} saw ${unitsOf(o.seen ?? 0, o.product)}, an old count`,
};
/** What a look or order says in words. */
export const outcomeName = (o: Outcome) =>
  o.kind === 'look' && o.result === 'unavailable'
    ? `${o.who} could not check the ${PRODUCT_NAME[o.product]}`
    : SAID[markOf(o)](o);

/** One minute in words, for the read-out line. */
export function tickName(r: Run, t: number): string {
  const k = r.ticks[t];
  const rep = (x: Rep) => {
    const b = k.boards[x],
      here = k.outcomes.filter(o => where(o) === x).map(outcomeName);
    return `${REP_NAME[x]} ${unitsOf(b.hinge, 'hinge')}, ${unitsOf(b.drill, 'drill')}${here.length ? ` (${here.join('; ')})` : ''}`;
  };
  return `${clock(t)}${k.cutOff ? `, line to ${REP_NAME[k.cutOff]} down` : ''}. ${REPS.map(rep).join('. ')}.`;
}

/** The timeline in words, for its label. */
export const timelineLabel = (r: Run) =>
  `Replica timeline, a column per minute from ${clock(0)} to ${clock(r.ticks.length - 1)}: ` +
  `${r.sold.hinge + r.sold.drill} sales, ${r.oversold.hinge + r.oversold.drill} oversold, ` +
  `${r.refused.hinge + r.refused.drill} refused, ${r.stale} stale reads.`;
