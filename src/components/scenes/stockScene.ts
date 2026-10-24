// The Consistency module's picture: three warehouses (KTD15). Each of Larkspur's warehouses (North at the back, East and
// West in front) keeps its own copy of the stock count on a board tray in front of it: a mustard tile per hinge it
// counts, a cobalt block while it counts the drill press. A phone line on poles joins the three; messages on their way
// hang on its wires as small envelopes, and a wire to a cut-off warehouse is drawn broken, its messages waiting at the
// sender's end. This minute's orders stand over the warehouse that took them: a receipt per sale (tomato when the final
// count lost that sale), a red block per refused order, and a tomato flag when a look read an old count. With
// reservations, a lamp burns on North's roof, the primary. Words only in pills; on phones (scale > 1.5) pills keep just
// the names and the caption carries the numbers.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import { PALS, CERAMIC, WOOD, box, castShadow, cyl, hullInk, toneI, tag, byDepth, line } from '../../lib/iso/core.js';
import {
  PRODUCTS,
  REPS,
  REP_NAME,
  unitsOf,
  type Outcome,
  type Product,
  type Rep,
  type Run,
} from '../../lib/consistency/sim';
import type { Say } from '../story/steps';

export const STOCK_BOARD: Board = [34, 16, 194, 198];

/** What one warehouse shows this minute. */
export interface RepView {
  board: Record<Product, number>;
  /** sales taken here this minute, and how many of them the final count lost */
  sold: number;
  lost: number;
  refused: number;
  /** looks answered here that read an old count */
  stale: number;
}
export interface StockOpts {
  reps: Record<Rep, RepView>;
  /** the warehouse cut off this minute, if the line is down */
  cutOff?: Rep;
  /** messages on their way, by wire "from>to" */
  wires: Record<string, number>;
  /** reservations: North decides every order */
  primary: boolean;
  /** the step's callout, over one of STOCK_PARTS */
  say?: Say;
  /** pill size; phones pass more */
  scale?: number;
}

/** The parts a step's callout may name: each warehouse and the phone line. */
export const STOCK_PARTS = [...REPS, 'line'] as const;

const SITE: Record<Rep, [number, number]> = { north: [70, 48], east: [162, 92], west: [62, 160] };
const WH = { half: 13, top: BH + 18 };
const POLE = WH.top + 12;
export const PRODUCT_PAL: Record<Product, { l: string; m: string; d: string }> = {
  hinge: PALS.mustard,
  drill: PALS.cobalt,
};
const WIRES: [Rep, Rep][] = [
  ['north', 'east'],
  ['north', 'west'],
  ['east', 'west'],
];
const OVER = '#f6c2b4';

const empty = (): RepView => ({ board: { hinge: 0, drill: 0 }, sold: 0, lost: 0, refused: 0, stale: 0 });
/** This minute's orders and looks, by the warehouse they happened at. */
export function viewOf(outcomes: Outcome[], r: Rep, board: Record<Product, number>): RepView {
  const orders = outcomes.filter(o => o.kind === 'order' && o.at === r),
    looks = outcomes.filter(o => o.kind === 'look' && o.served === r);
  return {
    board: { ...board },
    sold: orders.filter(o => o.result === 'sold').length,
    lost: orders.filter(o => o.result === 'sold' && o.lost).length,
    refused: orders.filter(o => o.result === 'refused').length,
    stale: looks.filter(o => o.stale).length,
  };
}
/** The warehouses as of minute t of a run. */
export function stockAt(r: Run, t: number): Omit<StockOpts, 'say' | 'scale'> {
  const k = r.ticks[Math.max(0, Math.min(t, r.ticks.length - 1))];
  return {
    reps: Object.fromEntries(REPS.map(x => [x, viewOf(k.outcomes, x, k.boards[x])])) as Record<Rep, RepView>,
    ...(k.cutOff ? { cutOff: k.cutOff } : {}),
    wires: { ...k.wires },
    primary: PRODUCTS.some(p => r.policy[p].rule === 'primary'),
  };
}
/** Before the morning: every board at its opening stock, nothing moving. */
export const idleOf = (stock: Record<Product, number>): Omit<StockOpts, 'say' | 'scale'> => ({
  reps: Object.fromEntries(REPS.map(x => [x, { ...empty(), board: { ...stock } }])) as Record<Rep, RepView>,
  wires: {},
  primary: false,
});

/** What the picture shows. Pure, so the tests can check it without drawing. */
export function stockState(o: StockOpts) {
  const cutWire = (a: Rep, b: Rep) => !!o.cutOff && (a === o.cutOff || b === o.cutOff);
  return {
    cut: WIRES.filter(([a, b]) => cutWire(a, b)).map(([a, b]) => `${a}-${b}`),
    receipts: Object.fromEntries(REPS.map(r => [r, Math.min(3, o.reps[r].sold)])) as Record<Rep, number>,
    flagged: REPS.filter(r => o.reps[r].stale > 0),
    refused: REPS.filter(r => o.reps[r].refused > 0),
    envelopes: WIRES.flatMap(([a, b]) =>
      [`${a}>${b}`, `${b}>${a}`].map(k => ({ k, n: Math.min(2, o.wires[k] ?? 0), waiting: cutWire(a, b) })),
    ).filter(e => e.n > 0),
  };
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 'S'}`;
const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;
const top = (r: Rep) => [...SITE[r], POLE];
const at = (a: number[], b: number[], k: number) => a.map((v, i) => v + (b[i] - v) * k);

function warehouse(r: Rep, v: RepView, lamp: boolean) {
  const [x, y] = SITE[r],
    h = WH.half;
  let s = box(x - h, y - h, BH, x + h, y + h, WH.top, CERAMIC, toneI, 1);
  s += box(x - h, y - h, WH.top, x + h, y + h, WH.top + 2.5, WOOD, toneI, 0.9);
  s += box(x + h, y - 5, BH, x + h + 0.6, y + 5, BH + 11, PALS.cobalt, toneI, 0.8);
  s += hullInk(boxCorners(x - h, y - h, BH, x + h, y + h, WH.top + 2.5), 2);
  // the pole the phone line hangs from
  s += box(x - 0.8, y - 0.8, WH.top + 2.5, x + 0.8, y + 0.8, POLE + 1, WOOD, toneI, 0.8);
  if (lamp)
    s += `<g class="lamp">${cyl(x + 5, y - 5, WH.top + 2.5, WH.top + 6.5, 2.4, PALS.mustard, toneI, 0.9, 14)}</g>`;
  // the board tray in front: a tile per hinge counted (two rows of four), a block while the drill press is counted
  const sx = x + h + 3;
  let tray = box(sx, y - h, BH, sx + 10, y + h, BH + 1.5, WOOD, toneI, 0.8);
  for (let i = 0; i < 8; i++) {
    const tx = sx + 1 + (i % 2) * 4.2,
      ty = y - h + 1.2 + Math.floor(i / 2) * 4.4,
      on = i < v.board.hinge;
    tray += box(
      tx,
      ty,
      BH + 1.5,
      tx + 3.4,
      ty + 3.4,
      BH + 1.5 + (on ? 2.6 : 0.3),
      on ? PALS.mustard : CERAMIC,
      toneI,
      0.6,
    );
  }
  const drill = v.board.drill > 0;
  tray += box(
    sx + 2,
    y + h - 6,
    BH + 1.5,
    sx + 8,
    y + h - 1,
    BH + 1.5 + (drill ? 6 : 0.3),
    drill ? PALS.cobalt : CERAMIC,
    toneI,
    0.7,
  );
  const tiles = `<g data-prop="board" data-rep="${r}" data-hinge="${v.board.hinge}" data-drill="${v.board.drill}">${tray}</g>`;
  // this minute's orders: receipts over the roof, a red block for each refusal, a flag for a stale look
  let over = '';
  for (let i = 0; i < Math.min(3, v.sold); i++) {
    // a paper card standing beside the pole, its face toward the viewer, a mint paid stripe across it
    const lost = i < v.lost,
      oy = y + 2.5 + i * 8.5,
      z0 = WH.top + 6;
    over += `<g class="receipt${lost ? ' lost' : ''}">${box(x - 0.6, oy, z0, x + 0.6, oy + 7, z0 + 13, lost ? PALS.tomato : CERAMIC, toneI, 1)}${box(x + 0.6, oy + 1, z0 + 8, x + 0.8, oy + 6, z0 + 10, PALS.mint, toneI, 0.4)}</g>`;
  }
  if (v.refused)
    over += `<g class="refused">${box(x - h - 6, y - 3, BH, x - h - 1, y + 3, BH + 9, PALS.tomato, toneI, 0.9)}</g>`;
  if (v.stale)
    over += `<g class="stale-flag">${line(
      [
        [x - h + 2, y + h - 2, WH.top + 2.5],
        [x - h + 2, y + h - 2, WH.top + 14],
      ],
      1.1,
    )}${box(x - h + 2, y + h - 2.3, WH.top + 9, x - h + 9, y + h - 1.7, WH.top + 14, PALS.tomato, toneI, 0.9)}</g>`;
  return [
    {
      at: [x, y, 0],
      svg: `<g data-prop="${r}" data-sold="${v.sold}" data-refused="${v.refused}" data-stale="${v.stale ? 1 : 0}">${s}${over}</g>`,
    },
    { at: [sx + 5, y, 0], svg: tiles },
  ];
}

/** The phone line: a wire per pair, broken at its middle when it runs to the cut-off warehouse. */
function wires(o: StockOpts) {
  const st = stockState(o);
  let s = '';
  for (const [a, b] of WIRES) {
    const A = top(a),
      B = top(b),
      cut = st.cut.includes(`${a}-${b}`);
    if (!cut) s += line([A, B], 1.1);
    else {
      s += line([A, at(A, B, 0.44)], 1.1) + line([at(A, B, 0.56), B], 1.1);
      const m = at(A, B, 0.5);
      s += `<g class="break">${box(m[0] - 2, m[1] - 2, m[2] - 2, m[0] + 2, m[1] + 2, m[2] + 2, PALS.tomato, toneI, 0.9)}</g>`;
    }
  }
  for (const e of st.envelopes) {
    const [from, to] = e.k.split('>') as Rep[];
    for (let i = 0; i < e.n; i++) {
      // waiting at the sender's end of a cut wire; otherwise on the way, a little past the middle
      const p = at(top(from), top(to), e.waiting ? 0.18 + i * 0.1 : 0.55 + i * 0.12);
      s += `<g class="envelope" data-wire="${e.k}"${e.waiting ? ' data-waiting="1"' : ''}>${box(p[0] - 2, p[1] - 1.4, p[2] - 4, p[0] + 2, p[1] + 1.4, p[2] - 0.6, CERAMIC, toneI, 0.7)}</g>`;
    }
  }
  return `<g data-prop="line" data-cut="${o.cutOff ?? ''}">${s}</g>`;
}

/** The scene: shadows, then the warehouses and trays back to front, then the line over them, then the pills. */
export const stockScene = (o: StockOpts) => (ctx: SceneCtx) => {
  const scale = o.scale ?? 1,
    narrow = scale > 1.5;
  let s = '';
  for (const r of REPS) {
    const [x, y] = SITE[r];
    s += castShadow(boxCorners(x - WH.half, y - WH.half, BH, x + WH.half, y + WH.half, WH.top + 2), BH, ctx.top);
  }
  s += byDepth(REPS.flatMap(r => warehouse(r, o.reps[r], o.primary && r === 'north')));
  s += wires(o);
  let pills = '';
  for (const r of REPS) {
    const [x, y] = SITE[r],
      v = o.reps[r],
      name = REP_NAME[r].toUpperCase() + (o.primary && r === 'north' ? ' · PRIMARY' : '');
    const front = r !== 'north';
    pills += pill(
      front ? [x + WH.half, y + WH.half, BH] : [x, y, POLE],
      0,
      front ? 22 : -18,
      narrow
        ? REP_NAME[r].toUpperCase()
        : `${name} · ${plural(v.board.hinge, 'HINGE')} · ${plural(v.board.drill, 'DRILL')}`,
      v.sold > 0,
      scale,
      v.refused || v.stale ? OVER : undefined,
    );
  }
  const mid = at(top('north'), top('west'), 0.5);
  if (o.cutOff && !narrow) pills += pill(mid, -14, -14, 'LINE DOWN', false, scale, OVER);
  pills += sayAt(o.say, 'line', mid, -14, scale);
  for (const r of REPS) pills += sayAt(o.say, r, [...SITE[r], POLE], r === 'north' ? -18 : -14, scale);
  return s + pills;
};

const count = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
/** The picture in words, for its aria-label. */
export function stockLabel(o: StockOpts): string {
  const rep = (r: Rep) => {
    const v = o.reps[r];
    return (
      `${REP_NAME[r]} counts ${unitsOf(v.board.hinge, 'hinge')} and ${unitsOf(v.board.drill, 'drill')}` +
      `${v.sold ? `; ${count(v.sold, 'sale')} this minute${v.lost ? `, ${v.lost} lost from the count` : ''}` : ''}` +
      `${v.refused ? `; ${count(v.refused, 'order')} refused` : ''}${v.stale ? '; a customer read an old count' : ''}`
    );
  };
  const moving = Object.values(o.wires).reduce((a, b) => a + b, 0);
  return (
    `Three warehouses joined by a phone line${o.cutOff ? `, the line to ${REP_NAME[o.cutOff]} down` : ''}` +
    `${o.primary ? '; North is the primary' : ''}. ${REPS.map(rep).join('. ')}. ` +
    `${count(moving, 'message')} on the line.`
  );
}

/** The counts the caption carries (phones show only the names in the pills). */
export function stockReadouts(o: StockOpts): string[] {
  const n = (f: (v: RepView) => number) => REPS.reduce((a, r) => a + f(o.reps[r]), 0);
  return [
    REPS.map(r => `${REP_NAME[r]} ${o.reps[r].board.hinge}/${o.reps[r].board.drill}`).join(', '),
    ...(n(v => v.sold)
      ? [
          count(
            n(v => v.sold),
            'sale',
          ),
        ]
      : []),
    ...(n(v => v.refused) ? [`${n(v => v.refused)} refused`] : []),
    ...(n(v => v.stale) ? [`${n(v => v.stale)} stale`] : []),
    ...(o.cutOff ? ['line down'] : []),
  ];
}

/** The home hero's plot: two small warehouses on a phone line cut in the middle, each tray counting the last hinge,
 * and a receipt over each: the hinge sold twice. */
export function stockPlot(x: number, y: number, top: SceneCtx['top']): string {
  const site = [
    [x - 14, y - 8],
    [x + 12, y + 8],
  ];
  const h = 6,
    zt = BH + 9,
    pz = zt + 8;
  const parts = site.map(([sx, sy]) => {
    let s = box(sx - h, sy - h, BH, sx + h, sy + h, zt, CERAMIC, toneI, 1);
    s += box(sx - h, sy - h, zt, sx + h, sy + h, zt + 1.5, WOOD, toneI, 0.8);
    s += hullInk(boxCorners(sx - h, sy - h, BH, sx + h, sy + h, zt + 1.5), 1.6);
    s += box(sx - 0.6, sy - 0.6, zt + 1.5, sx + 0.6, sy + 0.6, pz, WOOD, toneI, 0.6);
    s += box(sx + h + 1.5, sy - 2, BH, sx + h + 4.5, sy + 1, BH + 2.4, PALS.mustard, toneI, 0.6);
    s += box(sx - 2, sy - 0.5, zt + 2.5, sx + 1, sy + 0.4, zt + 7, CERAMIC, toneI, 0.6);
    return { at: [sx, sy, 0], svg: s };
  });
  const A = [...site[0], pz],
    B = [...site[1], pz],
    m = at(A, B, 0.5);
  return (
    site.map(([sx, sy]) => castShadow(boxCorners(sx - h, sy - h, BH, sx + h, sy + h, zt + 1), BH, top)).join('') +
    byDepth(parts) +
    line([A, at(A, B, 0.42)], 0.9) +
    line([at(A, B, 0.58), B], 0.9) +
    box(m[0] - 1.4, m[1] - 1.4, m[2] - 1.4, m[0] + 1.4, m[1] + 1.4, m[2] + 1.4, PALS.tomato, toneI, 0.7)
  );
}
