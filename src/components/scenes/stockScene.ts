// The Consistency module's picture: three warehouses (KTD15). Each of Larkspur's warehouses (North at the back, East and
// West in front) keeps its own copy of the stock count on a board tray in front of it: a mustard tile per hinge it
// counts, a cobalt block while it counts the drill press, and a clerk beside it. A phone line on telegraph poles joins
// the three; messages on their way hang pegged on its wires as envelopes, and a wire to a cut-off warehouse is drawn
// broken, its messages waiting at the sender's end. This minute's orders show at the warehouse that took them: a
// receipt per sale pinned up its pole (tomato when the final
// count lost that sale), a red block per refused order, and a tomato flag when a look read an old count. With
// reservations, a lamp burns on North's roof, the primary. Words only in pills; on phones (scale > 1.5) pills keep just
// the names and the caption carries the numbers.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  PALS,
  CERAMIC,
  METAL,
  DARK,
  WOOD,
  box,
  castShadow,
  toneI,
  tag,
  byDepth,
  line,
  rod,
  shape,
  matOf,
  vis,
} from '../../lib/iso/core.js';
import {
  building,
  drawPieces,
  lamp as lamp_,
  mini,
  person,
  pole,
  type Piece,
  type Roof,
  floor,
} from '../../lib/iso/figures';
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
const WH = { half: 13, top: BH + 22 };
// where the pills point: over each warehouse, and the wire's middle (projected; see PD below)
const POLE = BH + 30;
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
type Mat = { l: string; m: string; d: string };

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

// Each warehouse a different building: North a red barn (gable), East a brick store (parapet), West a round-roofed
// shed (barrel). Doors on the +y wall, the count tray in front of +x.
const LOOK: Record<Rep, { roof: Roof; pal: Mat; roofPal: Mat }> = {
  north: { roof: 'gable', pal: PALS.tomato, roofPal: matOf('#8a7462') },
  east: { roof: 'parapet', pal: matOf('#c98a5e'), roofPal: PALS.tomato },
  west: { roof: 'dome', pal: CERAMIC, roofPal: METAL },
};
const CLERK: Record<Rep, string> = { north: 'shopper4', east: 'shopper2', west: 'shopper5' };
// The telegraph pole stands at the warehouse's front corner, its crossarm at the height that puts the wire's ends
// (and so its middle) on the same screen points the pills have always pointed at: (x + d, y + d, z + d) projects
// like (x, y, z).
const PD = 16,
  PH = POLE + PD - BH + 1.8;
const poleAt = (r: Rep): [number, number] => [SITE[r][0] + PD, SITE[r][1] + PD];
/** the insulator tops on r's crossarm (the pole faces +x, so its arm runs along y) */
const insulators = (r: Rep) => {
  const [px, py] = poleAt(r);
  return [-8, -4, 4, 8].map(b => [px, py + b, BH + PH - 1.8]);
};
/** each wire's two ends: the insulator on each pole nearest the other pole, none used twice */
function wireEnds() {
  const used = new Set<string>(),
    pick = (r: Rep, to: Rep) => {
      const [tx, ty] = poleAt(to),
        best = insulators(r)
          .filter(p => !used.has(`${r}${p[1]}`))
          .sort((p, q) => Math.hypot(p[0] - tx, p[1] - ty) - Math.hypot(q[0] - tx, q[1] - ty))[0];
      used.add(`${r}${best[1]}`);
      return best;
    };
  return Object.fromEntries(WIRES.map(([a, b]) => [`${a}-${b}`, [pick(a, b), pick(b, a)]])) as Record<
    string,
    number[][]
  >;
}
const piece = (svg: string, box: number[][], shadow = ''): Piece => ({ shadow, items: [{ box, svg }], box });

function warehouse(r: Rep, v: RepView, lamp: boolean): Piece[] {
  const [x, y] = SITE[r],
    h = WH.half,
    L = LOOK[r];
  const shed = building({
    x,
    y,
    d: 2 * h,
    w: 2 * h,
    h: WH.top - BH,
    roof: L.roof,
    front: '+y',
    windows: 1,
    pal: L.pal,
    roofPal: L.roofPal,
  });
  const roofTop = shed.box[1][2];
  // the tag carries the part's data; the building's own group sits inside it
  shed.items = [
    {
      ...shed.items[0],
      svg: `<g data-prop="${r}" data-sold="${v.sold}" data-refused="${v.refused}" data-stale="${v.stale ? 1 : 0}">${shed.items[0].svg}</g>`,
    },
  ];
  const out: Piece[] = [
    shed,
    pole({ x: poleAt(r)[0], y: poleAt(r)[1], h: PH }),
    person({ x: x + h + 5, y: y - h - 5, facing: '+y', look: CLERK[r], holding: null }),
  ];
  if (lamp) out.push(lamp_({ x, y: y - 6, z: roofTop - 1, h: 3, lit: true }));
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
  out.push(
    piece(
      `<g data-prop="board" data-rep="${r}" data-hinge="${v.board.hinge}" data-drill="${v.board.drill}">${tray}</g>`,
      [
        [sx, y - h, BH],
        [sx + 10, y + h, BH + 7.5],
      ],
    ),
  );
  // this minute's orders: receipts pinned up the pole, a red block for each refusal, a flag for a stale look
  const [px, py] = poleAt(r);
  for (let i = 0; i < Math.min(3, v.sold); i++) {
    // a paper card on the pole's front, its face toward the viewer, a mint paid stripe across it
    const lost = i < v.lost,
      oy = py - 11 + i * 7.5,
      z0 = WH.top + 2,
      x0 = px + 1.6;
    out.push(
      piece(
        `<g class="receipt${lost ? ' lost' : ''}">${box(x0, oy, z0, x0 + 1.2, oy + 6.5, z0 + 12, lost ? PALS.tomato : CERAMIC, toneI, 1)}${box(x0 + 1.2, oy + 1, z0 + 7, x0 + 1.4, oy + 5.5, z0 + 9, PALS.mint, toneI, 0.4)}</g>`,
        [
          [x0, oy, z0],
          [x0 + 1.4, oy + 6.5, z0 + 12],
        ],
      ),
    );
  }
  if (v.refused) {
    const b = boxCorners(x - h - 6, y - 3, BH, x - h - 1, y + 3, BH + 9);
    out.push(
      piece(
        `<g class="refused">${box(x - h - 6, y - 3, BH, x - h - 1, y + 3, BH + 9, PALS.tomato, toneI, 0.9)}</g>`,
        [b[0], b[7]],
        castShadow(b, BH),
      ),
    );
  }
  if (v.stale) {
    // a flagpole planted at the back-left corner, a tomato flag at its head
    const fx = x - h - 2,
      fy = y + h + 2,
      zt = roofTop + 6;
    out.push(
      piece(
        `<g class="stale-flag">${rod([fx, fy, BH], [fx, fy, zt], 0.5, DARK, toneI, 0.8)}${box(fx, fy - 0.3, zt - 5, fx + 7, fy + 0.3, zt, PALS.tomato, toneI, 0.9)}</g>`,
        [
          [fx - 0.5, fy - 0.5, BH],
          [fx + 7, fy + 0.5, zt],
        ],
      ),
    );
  }
  return out;
}

/** An envelope pegged under the wire at p: a paper card along the wire (d), a V flap on the side facing the viewer. */
function envelope(p: number[], d: number[]) {
  const k = 2.8,
    q = (a: number, zz: number) => [p[0] + d[0] * a, p[1] + d[1] * a, p[2] + zz];
  const n = [-d[1], d[0], 0],
    face = vis(n) ? n : n.map(v => -v);
  return (
    line([q(0, 0), q(0, -1.4)], 1) +
    shape([q(-k, -1.2), q(k, -1.2), q(k, -5.8), q(-k, -5.8)], toneI(face, CERAMIC), 0.7) +
    line([q(-k, -1.2), q(0, -3.6), q(k, -1.2)], 0.5)
  );
}

/** The phone line: a wire per pair between the poles' insulators, broken at its middle when it runs to the
 * cut-off warehouse, the two ends sagging. */
function wires(o: StockOpts) {
  const st = stockState(o),
    E = wireEnds(),
    ends = (a: Rep, b: Rep) => (E[`${a}-${b}`] ?? [...E[`${b}-${a}`]].reverse()) as number[][];
  let s = '';
  for (const [a, b] of WIRES) {
    const [A, B] = ends(a, b),
      cut = st.cut.includes(`${a}-${b}`);
    if (!cut) s += line([A, at(A, B, 0.5).map((v, i) => (i === 2 ? v - 1.2 : v)), B], 1.1);
    else {
      const sag = (k: number) => at(A, B, k).map((v, i) => (i === 2 ? v - 6 : v));
      s += line([A, sag(0.44)], 1.1) + line([sag(0.56), B], 1.1);
      const m = at(A, B, 0.5);
      s += `<g class="break">${box(m[0] - 2, m[1] - 2, m[2] - 2, m[0] + 2, m[1] + 2, m[2] + 2, PALS.tomato, toneI, 0.9)}</g>`;
    }
  }
  for (const e of st.envelopes) {
    const [from, to] = e.k.split('>') as Rep[],
      [A, B] = ends(from, to),
      len = Math.hypot(B[0] - A[0], B[1] - A[1]),
      d = [(B[0] - A[0]) / len, (B[1] - A[1]) / len];
    for (let i = 0; i < e.n; i++) {
      // waiting at the sender's end of a cut wire; otherwise on the way, a little past the middle
      const p = at(A, B, e.waiting ? 0.18 + i * 0.1 : 0.55 + i * 0.12);
      s += `<g class="envelope" data-wire="${e.k}"${e.waiting ? ' data-waiting="1"' : ''}>${envelope(p, d)}</g>`;
    }
  }
  return `<g data-prop="line" data-cut="${o.cutOff ?? ''}">${s}</g>`;
}

/** The scene: every shadow, then the warehouses, poles, clerks and trays in one sort, the wires over them (strung
 * between the crossarms, above everything else), then the pills. */
export const stockScene = (o: StockOpts) => (ctx: SceneCtx) => {
  const scale = o.scale ?? 1,
    narrow = scale > 1.5;
  let s = drawPieces(
    REPS.flatMap(r => warehouse(r, o.reps[r], o.primary && r === 'north')),
    ctx.top,
  );
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

/** The home hero's plot: two of the warehouses in miniature (North's barn, East's brick store), each with its clerk,
 * count tray and telegraph pole, the line between them cut in the middle. */
export function stockPlot(x: number, y: number, top: SceneCtx['top']): string {
  const k = 0.4,
    sites: [Rep, number, number][] = [
      ['north', x - 14, y - 10],
      ['east', x + 10, y + 10],
    ],
    view: RepView = { ...empty(), board: { hinge: 4, drill: 1 } },
    move = (r: Rep, sx: number, sy: number, p: number[]) => [
      sx + (p[0] - SITE[r][0]) * k,
      sy + (p[1] - SITE[r][1]) * k,
      BH + (p[2] - BH) * k,
    ];
  const pieces = sites.flatMap(([r, sx, sy]) =>
      warehouse(r, view, false).map(p => mini(p, [...SITE[r], BH], [sx, sy, BH], k)),
    ),
    [A, B] = sites.map(([r, sx, sy]) => move(r, sx, sy, [...poleAt(r), BH + PH - 1.8])),
    m = at(A, B, 0.5);
  return (
    floor(pieces.map(p => p.shadow).join(''), top) +
    byDepth(pieces.flatMap(p => p.items)) +
    line([A, at(A, B, 0.42)], 0.9) +
    line([at(A, B, 0.58), B], 0.9) +
    box(m[0] - 1.4, m[1] - 1.4, m[2] - 1.4, m[0] + 1.4, m[1] + 1.4, m[2] + 1.4, PALS.tomato, toneI, 0.7)
  );
}
