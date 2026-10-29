// The A/B testing module's picture: the shop floor (KTD15). Shoppers queue at the front; a turnstile sends each one at
// random down one of two belts, to checkout A (today's) on the left or checkout B (the change) on the right. Beside each
// checkout a tower of mint crates grows with its share of shoppers who buy, and, when the guardrail is watched, a tower
// of tomato crates with its share of orders sent back. At the back a scoreboard holds two bars, A cobalt and B mint, as
// tall as their rates, under the verdict pill. Words only in pills; on phones (scale > 1.5) pills keep just the names
// and the caption carries the numbers.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { ACC, BH, boxCorners, esc, sayAt, calloutsLast } from '../../lib/iso/blocks';
import {
  PALS,
  METAL,
  CERAMIC,
  DARK,
  INK,
  WOOD,
  box,
  cyl,
  rod,
  castShadow,
  hullInk,
  toneI,
  tag,
  byDepth,
  pd,
  vis,
  line,
  shape,
  clipTo,
} from '../../lib/iso/core.js';
import { hexa, mini, person, type Piece, drawPieces } from '../../lib/iso/figures';
import { ASSUMPTIONS, resultAt, type Plan, type Run } from '../../lib/ab-testing/sim';
import type { Say } from '../story/steps';

export const SPLIT_BOARD: Board = [24, 24, 140, 140];

export interface ArmView {
  /** the checkout's name in its pill ("A", or a colour) */
  name: string;
  visitors: number;
  orders: number;
  returns: number;
}
export interface SplitOpts {
  arms: [ArmView, ArmView];
  /** days run so far, and planned */
  day: number;
  days: number;
  /** the scoreboard's verdict pill */
  verdict: string;
  /** the verdict is a finding (lit), or a warning (tomato) */
  tone: 'none' | 'win' | 'warn';
  /** shoppers ride the belts (a test is running) */
  running: boolean;
  /** the returns towers show (the guardrail is watched) */
  guardrail?: boolean;
  /** the step's callout, over one of SPLIT_PARTS */
  say?: Say;
  /** pill size; phones pass more */
  scale?: number;
}

/** The parts a step's callout may name. */
export const SPLIT_PARTS = ['turnstile', 'a', 'b', 'scoreboard'] as const;

const TURN = [100, 100],
  A = [42, 100],
  B = [100, 42],
  SCORE = [42, 42],
  COUNTER_Z = BH + 12,
  CRATE = 3.6;
/** Where each checkout's towers stand: beside the counter, on the side toward the middle. */
const TOWER = {
  a: [
    [A[0] + 1, A[1] - 21],
    [A[0] + 9, A[1] - 21],
  ],
  b: [
    [B[0] - 21, B[1] + 1],
    [B[0] - 21, B[1] + 9],
  ],
};
const BAR_K = 200; // bar height per unit rate: 10% stands 20 tall

const rate = (n: number, of: number) => (of > 0 ? n / of : 0);
/** Crates in a tower: one per 2 points of conversion, one per 2.5 points of returns, eight at most. */
export const ordersCrates = (v: ArmView) => (v.visitors ? Math.min(8, Math.round(rate(v.orders, v.visitors) * 50)) : 0);
export const returnCrates = (v: ArmView) => (v.orders ? Math.min(8, Math.round(rate(v.returns, v.orders) * 40)) : 0);
const pct1 = (x: number) => `${(x * 100).toFixed(1)}%`;

const idle = (name: string): ArmView => ({ name, visitors: 0, orders: 0, returns: 0 });
/** An idle floor: nobody through the turnstile yet. */
export const IDLE: Omit<SplitOpts, 'say' | 'scale'> = {
  arms: [idle('A'), idle('B')],
  day: 0,
  days: 14,
  verdict: 'READY',
  tone: 'none',
  running: false,
};

/** The floor after day index t of a run (t < 0: nothing yet), comparing arm `arm` against A. The verdict reads the
 * test at that day: a significant difference names the winner. */
export function splitAt(
  r: Run,
  p: Plan,
  t: number,
  { arm = 1, name = 'B', guardrail = false, level = ASSUMPTIONS.level } = {},
): Omit<SplitOpts, 'say' | 'scale'> {
  if (t < 0) return { ...IDLE, arms: [idle('A'), idle(name)], days: p.days, guardrail };
  const d = r[Math.min(t, r.length - 1)],
    res = resultAt(r, t, level, arm);
  const view = (i: number, n: string): ArmView => ({
    name: n,
    visitors: d.visitors[i],
    orders: d.orders[i],
    returns: d.returns[i],
  });
  return {
    arms: [view(0, 'A'), view(arm, name)],
    day: Math.min(t, r.length - 1) + 1,
    days: p.days,
    verdict: res.significant ? `${(res.diff > 0 ? name : 'A').toUpperCase()} WINS` : 'NO WINNER',
    tone: res.significant ? 'win' : 'none',
    running: t < p.days - 1,
    guardrail,
  };
}

/** What the floor shows. Pure, so the tests can check it without drawing. */
export function splitState(o: SplitOpts) {
  return {
    crates: o.arms.map(ordersCrates),
    returns: o.guardrail ? o.arms.map(returnCrates) : [0, 0],
    bars: o.arms.map(v => Math.max(1.5, rate(v.orders, v.visitors) * BAR_K)),
    riders: o.running ? 2 : 0,
  };
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;

type Mat = { l: string; m: string; d: string };
/** A local piece: one sortable item and the shadow of its box. */
const local = (b: number[][], svg: string): Piece => ({
  shadow: castShadow(boxCorners(b[0][0], b[0][1], b[0][2], b[1][0], b[1][1], b[1][2]), BH),
  items: [{ box: b, svg }],
  box: b,
});
/** A person wrapped in a class, so the tests can count shoppers. */
const who = (p: Piece, cls: string): Piece => ({
  ...p,
  items: [{ box: p.box, svg: `<g class="${cls}">${byDepth(p.items)}</g>` }],
});

/** A floor path of ink with a coloured stripe, as the apprentice's bench draws its belts. */
function belt(points: number[][], lit: boolean, side: string) {
  const d = pd(
    points.map(([x, y]) => [x, y, BH + 0.3]),
    false,
  );
  return (
    `<g class="belt" data-belt="${side}" data-on="${lit ? 1 : 0}"><path d="${d}" fill="none" stroke="${INK}" stroke-width="${lit ? 6 : 5}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${lit ? ACC : DARK.l}" stroke-width="${lit ? 3.4 : 2.6}" stroke-linecap="round" stroke-linejoin="round"/></g>`
  );
}

/** Shoppers: the queue faces the turnstile; riders walk down their belt toward the checkout. */
const LOOKS = ['shopper1', 'shopper2', 'shopper3', 'shopper4', 'shopper5'];
const shopper = (x: number, y: number, i: number, cls: string, facing: number | '-x' | '-y', pose: 'stand' | 'walk') =>
  who(person({ x, y, facing, pose, look: LOOKS[i % LOOKS.length] }), cls);

/** A waist-high turnstile: a round steel post on a foot plate, a cap, three arms; short guide rails either side. */
function turnstile(): Piece {
  const [x, y] = TURN,
    zt = BH + 13;
  let s = box(x - 5, y - 5, BH, x + 5, y + 5, BH + 1.2, DARK, toneI, 0.9);
  s += cyl(x, y, BH + 1.2, zt, 2.6, METAL, toneI, 1.1, 18) + cyl(x, y, zt, zt + 1.6, 3.2, DARK, toneI, 1, 18);
  for (const [dx, dy] of [
    [7, 0],
    [-3.5, 6],
    [-3.5, -6],
  ])
    s += rod([x, y, zt - 2], [x + dx, y + dy, zt - 2], 0.75, METAL, toneI, 0.9);
  const b = [
    [x - 7.5, y - 7.5, BH],
    [x + 7.5, y + 7.5, zt + 1.6],
  ];
  return local(b, `<g data-prop="turnstile">${s}</g>`);
}

/** A crate: a mint (or tomato) box with a slat line round its visible sides. */
function crateBox(x: number, y: number, z: number, m: Mat) {
  const h = CRATE;
  let s = box(x - h, y - h, z, x + h, y + h, z + 3.6, m, toneI, 0.8);
  for (const [n, pts] of [
    [
      [1, 0, 0],
      [
        [x + h, y - h, z + 1.8],
        [x + h, y + h, z + 1.8],
      ],
    ],
    [
      [-1, 0, 0],
      [
        [x - h, y - h, z + 1.8],
        [x - h, y + h, z + 1.8],
      ],
    ],
    [
      [0, 1, 0],
      [
        [x - h, y + h, z + 1.8],
        [x + h, y + h, z + 1.8],
      ],
    ],
    [
      [0, -1, 0],
      [
        [x - h, y - h, z + 1.8],
        [x + h, y - h, z + 1.8],
      ],
    ],
  ] as [number[], number[][]][])
    if (vis(n)) s += line(pts, 0.5);
  return s;
}
/** A tower of crates on a wooden pallet (the pallet shows when the tower is in use). */
function tower(side: 'a' | 'b', at: number[], n: number, m: Mat, cls: string, pallet: boolean): Piece {
  const [x, y] = at,
    p = 4,
    zp = BH + 1.6;
  let s = '';
  if (pallet) {
    s += box(x - p, y - p, BH, x + p, y + p, zp, WOOD, toneI, 0.8);
    for (const [n2, a, b] of [
      [
        [1, 0, 0],
        [x + p, y - p, BH + 0.8],
        [x + p, y + p, BH + 0.8],
      ],
      [
        [0, 1, 0],
        [x - p, y + p, BH + 0.8],
        [x + p, y + p, BH + 0.8],
      ],
      [
        [-1, 0, 0],
        [x - p, y - p, BH + 0.8],
        [x - p, y + p, BH + 0.8],
      ],
      [
        [0, -1, 0],
        [x - p, y - p, BH + 0.8],
        [x + p, y - p, BH + 0.8],
      ],
    ] as number[][][])
      if (vis(n2)) s += line([a, b], 1.1);
  }
  for (let i = 0; i < n; i++) s += crateBox(x, y, zp + i * 4, m);
  const b = [
    [x - p, y - p, BH],
    [x + p, y + p, zp + Math.max(n, 0.5) * 4],
  ];
  return local(b, `<g class="${cls}" data-arm="${side}" data-n="${n}">${s}</g>`);
}

/** Checkout A, today's: a wooden counter with an old brass till on it, a striped awning on two posts over the clerk's
 * side. The till's sloped key bank faces the shopper (+x); a flag display stands at its back. */
function tillA(v: ArmView): Piece[] {
  const [x, y] = A,
    hx = 8,
    hy = 13,
    zc = COUNTER_Z + 1.5;
  let s = box(x - hx, y - hy, BH, x + hx, y + hy, COUNTER_Z, WOOD, toneI, 1);
  // panels on the shopper's side
  if (vis([1, 0, 0]))
    for (const yy of [y - 4.3, y + 4.3])
      s += line(
        [
          [x + hx, yy, BH + 1],
          [x + hx, yy, COUNTER_Z - 1],
        ],
        0.6,
      );
  s += box(x - hx - 0.6, y - hy - 0.6, COUNTER_Z, x + hx + 0.6, y + hy + 0.6, zc, CERAMIC, toneI, 0.8);
  s += hullInk(boxCorners(x - hx, y - hy, BH, x + hx, y + hy, zc), 2);
  // the till: a base with a drawer, a sloped key bank (low at the front), a flag display behind
  const t0 = x - 1,
    t1 = x + 6,
    ty = y + 3;
  s += box(t0, ty - 4, zc, t1, ty + 4, zc + 2.6, PALS.mustard, toneI, 0.9);
  if (vis([1, 0, 0]))
    s += line(
      [
        [t1, ty - 3, zc + 1.3],
        [t1, ty + 3, zc + 1.3],
      ],
      0.6,
    );
  const k = [
    [t0, ty - 4, zc + 2.6],
    [t1, ty - 4, zc + 2.6],
    [t1, ty + 4, zc + 2.6],
    [t0, ty + 4, zc + 2.6],
    [t0, ty - 4, zc + 7],
    [t1, ty - 4, zc + 4],
    [t1, ty + 4, zc + 4],
    [t0, ty + 4, zc + 7],
  ];
  s += hexa(k, PALS.mustard, 1);
  // key pips on the slope (no numerals)
  const slope = [3, 0, 7];
  if (vis(slope))
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) {
        const u = t0 + 1.4 + i * 2,
          zz = zc + 7 - ((u - t0) * 3) / 7 + 0.15,
          w = ty - 2.6 + j * 2.6;
        s += shape(
          [
            [u - 0.6, w - 0.7, zz + 0.25],
            [u + 0.6, w - 0.7, zz - 0.05],
            [u + 0.6, w + 0.7, zz - 0.05],
            [u - 0.6, w + 0.7, zz + 0.25],
          ],
          CERAMIC.l,
          0.4,
        );
      }
  s += rod([t0 + 1, ty, zc + 6.5], [t0 + 1, ty, zc + 9.5], 0.5, DARK, toneI, 0.7);
  s += box(t0 + 0.4, ty - 2.4, zc + 9.5, t0 + 1.6, ty + 2.4, zc + 12, CERAMIC, toneI, 0.8);
  const counter = local(
    [
      [x - hx - 0.6, y - hy - 0.6, BH],
      [x + hx + 0.6, y + hy + 0.6, zc + 12],
    ],
    `<g data-prop="a" data-visitors="${v.visitors}" data-orders="${v.orders}">${s}</g>`,
  );
  // the awning: two posts at the back corners, a striped canvas sloping down over the clerk's half, a valance
  const az = BH + 31,
    ax0 = x - hx - 1.5,
    ax1 = x + 0.5,
    drop = 5,
    N = 6;
  let w = '';
  for (const yy of [y - hy, y + hy]) w += rod([x - hx + 0.6, yy, BH], [x - hx + 0.6, yy, az], 0.7, DARK, toneI, 0.9);
  for (let i = 0; i < N; i++) {
    const y0 = y - hy - 1 + ((2 * hy + 2) * i) / N,
      y1 = y - hy - 1 + ((2 * hy + 2) * (i + 1)) / N,
      col = i % 2 ? CERAMIC : PALS.tomato;
    w += shape(
      [
        [ax0, y0, az],
        [ax0, y1, az],
        [ax1, y1, az - drop],
        [ax1, y0, az - drop],
      ],
      toneI([0.4, 0, 1], col),
      0.7,
    );
    if (vis([1, 0, 0]))
      w += shape(
        [
          [ax1, y0, az - drop],
          [ax1, y1, az - drop],
          [ax1, y1, az - drop - 2.4],
          [ax1, y0, az - drop - 2.4],
        ],
        toneI([1, 0, 0], col),
        0.7,
      );
  }
  const awning = local(
    [
      [ax0, y - hy - 1, COUNTER_Z + 13],
      [ax1, y + hy + 1, az],
    ],
    `<g class="awning">${w}</g>`,
  );
  // the posts stand on the floor: the awning's shadow is the canvas's, cast from its height
  awning.shadow = castShadow(boxCorners(ax0, y - hy - 1, az - drop, ax1, y + hy + 1, az), BH);
  return [counter, awning];
}

/** Checkout B, the change: a slim self-serve kiosk on a pedestal, its tilted screen showing one page (a mint pay bar
 * under three lines), a card reader on the post, and a slim steel bagging shelf beside it. */
function kioskB(v: ArmView): Piece[] {
  const [x, y] = B,
    kx = x - 6,
    ky = y + 3;
  let s = cyl(kx, ky, BH, BH + 1.2, 4.2, DARK, toneI, 1, 18);
  s += box(kx - 1.6, ky - 1.6, BH + 1.2, kx + 1.6, ky + 1.6, BH + 15, CERAMIC, toneI, 0.9);
  s += box(kx - 1.2, ky + 1.6, BH + 10, kx + 1.2, ky + 2.8, BH + 12.5, DARK, toneI, 0.7);
  // the head: a thin tablet leaning back, its face toward the shopper (+y) and up
  const H = [
    [kx - 6, ky + 2.4, BH + 14.5],
    [kx + 6, ky + 2.4, BH + 14.5],
    [kx + 6, ky + 1, BH + 14.5],
    [kx - 6, ky + 1, BH + 14.5],
    [kx - 6, ky - 1.2, BH + 25],
    [kx + 6, ky - 1.2, BH + 25],
    [kx + 6, ky - 2.6, BH + 25],
    [kx - 6, ky - 2.6, BH + 25],
  ];
  s += hexa(H, PALS.cobalt, 1.1);
  const fn = [0, 10.5, 3.6];
  if (vis(fn)) {
    // a point on the screen: u across (x), t up the slope (0 bottom, 1 top), lifted off the face
    const at = (u: number, t: number) => [kx + u, ky + 2.4 - 3.6 * t + 0.12, BH + 14.5 + 10.5 * t + 0.05];
    s += shape([at(-5, 0.08), at(5, 0.08), at(5, 0.92), at(-5, 0.92)], CERAMIC.l, 0.8);
    for (const t of [0.78, 0.66, 0.54]) s += line([at(-3.8, t), at(t === 0.54 ? 1 : 3.8, t)], 0.5);
    s += shape([at(-3.8, 0.18), at(3.8, 0.18), at(3.8, 0.34), at(-3.8, 0.34)], PALS.mint.l, 0.6);
  }
  const kiosk = local(
    [
      [kx - 6, ky - 4.2, BH],
      [kx + 6, ky + 4.2, BH + 25],
    ],
    `<g data-prop="b" data-visitors="${v.visitors}" data-orders="${v.orders}">${s}</g>`,
  );
  // the bagging shelf: a steel top on four slim legs, a lower rail
  const s0 = x + 2,
    s1 = x + 12,
    y0 = y - 6,
    y1 = y + 6,
    zs = BH + 9;
  let f = '';
  for (const [lx, ly] of [
    [s0 + 1, y0 + 1],
    [s1 - 1, y0 + 1],
    [s0 + 1, y1 - 1],
    [s1 - 1, y1 - 1],
  ])
    f += rod([lx, ly, BH], [lx, ly, zs], 0.55, DARK, toneI, 0.7);
  f += box(s0, y0, zs, s1, y1, zs + 1.2, METAL, toneI, 0.9);
  const shelf = local(
    [
      [s0, y0, BH],
      [s1, y1, zs + 1.2],
    ],
    `<g class="shelf">${f}</g>`,
  );
  return [kiosk, shelf];
}

/** The scoreboard on legs: a dark board on two legs, turned to face the floor, with A's bar (cobalt) to the left on
 * screen and B's (mint) to the right, standing on a ledge; a lamp on top lights for the verdict. */
function scoreboard(bars: number[], tone: SplitOpts['tone']): Piece {
  const [x, y] = SCORE,
    u = [Math.SQRT1_2, -Math.SQRT1_2],
    n = [Math.SQRT1_2, Math.SQRT1_2],
    L = 9,
    zb = BH + 6,
    zt = BH + 30,
    at = (a: number, b: number, z: number) => [x + u[0] * a + n[0] * b, y + u[1] * a + n[1] * b, z];
  const slab = (a0: number, a1: number, b0: number, b1: number, z0: number, z1: number, m: Mat, w = 1) =>
    hexa(
      [
        at(a0, b0, z0),
        at(a1, b0, z0),
        at(a1, b1, z0),
        at(a0, b1, z0),
        at(a0, b0, z1),
        at(a1, b0, z1),
        at(a1, b1, z1),
        at(a0, b1, z1),
      ],
      m,
      w,
    );
  let s = '';
  for (const a of [-L + 1, L - 1]) {
    s += rod(at(a, -1, BH), at(a, -1, zb + 2), 0.9, DARK, toneI, 0.9);
    s += slab(a - 2, a + 2, -2.5, 1.5, BH, BH + 0.8, DARK, 0.7);
  }
  // A's bar to the left on screen (+y), B's to the right (+x); seen from behind, the board hides the bars
  const bar = (a: number, h: number, m: Mat) => slab(a - 1.8, a + 1.8, -0.4, 1.8, zb + 1.4, zb + 1.4 + h, m, 0.9);
  const front =
      slab(-L + 0.8, L - 0.8, -0.6, 2.4, zb, zb + 1.4, WOOD, 0.8) +
      bar(-4, bars[0], PALS.cobalt) +
      bar(4, bars[1], PALS.mint),
    board = slab(-L, L, -2, -0.6, zb, zt, DARK, 1.2);
  s += vis([n[0], n[1], 0]) ? board + front : front + board;
  const lampM = tone === 'win' ? PALS.mint : tone === 'warn' ? PALS.tomato : CERAMIC;
  const lp = at(0, -1.3, zt);
  s += cyl(lp[0], lp[1], zt, zt + 2.4, 1.8, lampM, toneI, 0.9, 14);
  const top = Math.max(zt + 2.4, zb + 1.4 + Math.max(...bars));
  return local(
    [
      [x - L * Math.SQRT1_2 - 2, y - L * Math.SQRT1_2 - 2, BH],
      [x + L * Math.SQRT1_2 + 2, y + L * Math.SQRT1_2 + 2, top],
    ],
    `<g data-prop="scoreboard" data-tone="${tone}" data-bars="${bars.map(b => b.toFixed(1)).join(',')}">${s}</g>`,
  );
}

/** The floor: every shadow (clipped to the board), the belts, then every part sorted by its box, then the pills. */
export const splitScene = (o: SplitOpts) => (ctx: SceneCtx) => {
  const st = splitState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5,
    [tx, ty] = TURN,
    [ta, tb] = [TOWER.a, TOWER.b];
  const pieces: Piece[] = [
    turnstile(),
    ...tillA(o.arms[0]),
    ...kioskB(o.arms[1]),
    tower('a', ta[0], st.crates[0], PALS.mint, 'orders', true),
    tower('a', ta[1], st.returns[0], PALS.tomato, 'returns', !!o.guardrail),
    tower('b', tb[0], st.crates[1], PALS.mint, 'orders', true),
    tower('b', tb[1], st.returns[1], PALS.tomato, 'returns', !!o.guardrail),
    scoreboard(st.bars, o.tone),
    // the queue to the front right, off to the side so the turnstile stays in sight
    ...[0, 1, 2].map(i => shopper(tx + 14 + i * 10, ty - 7 + i * 4, i, 'shopper', 200, 'stand')),
  ];
  // shoppers walking down the belts while the test runs
  for (let i = 0; i < st.riders; i++) {
    pieces.push(shopper(tx - 20 - i * 16, ty, 3 + i, 'shopper rider', '-x', 'walk'));
    pieces.push(shopper(tx, ty - 20 - i * 16, 1 + i * 3, 'shopper rider', '-y', 'walk'));
  }
  let s = clipTo(ctx.top, pieces.map(p => p.shadow).join(''));
  s += belt(
    [
      [tx - 6, ty],
      [A[0] + 9, A[1]],
    ],
    o.running,
    'a',
  );
  s += belt(
    [
      [tx, ty - 6],
      [B[0], B[1] + 9],
    ],
    o.running,
    'b',
  );
  s += byDepth(pieces.flatMap(p => p.items));
  const warn = '#f6c2b4';
  const armPill = (i: number) => {
    const v = o.arms[i],
      side = i === 0 ? 'a' : 'b',
      [x, y] = side === 'a' ? A : B,
      name = v.name.toUpperCase();
    const back = o.guardrail && v.orders ? ` · ${pct1(rate(v.returns, v.orders))} BACK` : '';
    return pill(
      [x, y, COUNTER_Z + 6],
      0,
      -16,
      narrow || !v.visitors ? name : `${name} · ${pct1(rate(v.orders, v.visitors))}${back}`,
      false,
      scale,
    );
  };
  const pills = [
    sayAt(o.say, 'turnstile', [tx, ty, BH + 14], 18, scale),
    sayAt(o.say, 'a', [A[0], A[1], COUNTER_Z + 6], -16, scale),
    sayAt(o.say, 'b', [B[0], B[1], COUNTER_Z + 6], -16, scale),
    sayAt(o.say, 'scoreboard', [SCORE[0], SCORE[1], BH + 30], -14, scale),
    pill(
      [tx, ty, BH + 14],
      0,
      18,
      narrow || !o.day ? 'SPLIT' : `DAY ${o.day} OF ${o.days}`,
      o.running && o.day > 0,
      scale,
    ),
    armPill(0),
    armPill(1),
    pill(
      [SCORE[0], SCORE[1], BH + 30],
      0,
      -14,
      o.verdict,
      o.tone === 'win',
      scale,
      o.tone === 'warn' ? warn : undefined,
    ),
  ];
  return s + calloutsLast(pills);
};

/** The floor in words, for its aria-label. */
export function splitLabel(o: SplitOpts): string {
  const arm = (v: ArmView) =>
    v.visitors
      ? `${v.name}: ${v.orders.toLocaleString('en-US')} of ${v.visitors.toLocaleString('en-US')} shoppers bought (${pct1(rate(v.orders, v.visitors))})` +
        (o.guardrail ? `, ${pct1(rate(v.returns, v.orders))} of orders returned` : '')
      : `${v.name}: no shoppers yet`;
  return (
    `The shop floor: a turnstile splits shoppers at random between checkout ${o.arms[0].name} and checkout ${o.arms[1].name}. ` +
    (o.day ? `Day ${o.day} of ${o.days}. ` : 'Nobody through yet. ') +
    `${o.arms.map(arm).join('. ')}. Scoreboard: ${o.verdict.charAt(0)}${o.verdict.slice(1).toLowerCase()}.`
  );
}

/** The numbers the caption carries (phones show only the names in the pills). */
export function splitReadouts(o: SplitOpts): string[] {
  if (!o.day) return [];
  return [
    `day ${o.day} of ${o.days}`,
    ...o.arms.map(v => `${v.name} ${pct1(rate(v.orders, v.visitors))}`),
    ...(o.guardrail ? o.arms.map(v => `${v.name} returns ${pct1(rate(v.returns, v.orders))}`) : []),
  ];
}

/** The home hero's plot: the shop floor in miniature, old till A under its awning and slim kiosk B either side of the
 * turnstile, each with its mint tower of orders, a shopper coming through. */
export function splitPlot(x: number, y: number, top: SceneCtx['top']): string {
  const v = (name: string): ArmView => ({ name, visitors: 10, orders: 2, returns: 0 }),
    [tx, ty] = TURN;
  const pieces = [
    turnstile(),
    ...tillA(v('A')),
    ...kioskB(v('B')),
    tower('a', TOWER.a[0], 2, PALS.mint, 'orders', true),
    tower('b', TOWER.b[0], 3, PALS.mint, 'orders', true),
    shopper(tx + 12, ty - 4, 0, 'shopper', 200, 'stand'),
  ].map(p => mini(p, [76, 76, BH], [x, y, BH], 0.46));
  return drawPieces(pieces, top);
}
