// Module 2's picture: Larkspur's back office as an isometric diorama. Four stations (the employee's desk, the host app's
// sorting desk, the model, the order system's filing cabinet) joined to the host by conveyor belts. The message being
// sent rides its belt as an envelope (coloured by kind, stamped like its card), so the picture follows the same
// transcript the Messages view draws. Checks stand on the belts: a schema arch between model and host, an ownership
// arch and an approval barrier between host and orders. Chapter 1 has no belt to the orders: nothing joins them yet.
import type { SceneCtx, Board } from '../../lib/iso/IsoStage';
import type { Msg } from '../../lib/iso/flat';
import { BH, renderers, blockShadow, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import type { Say } from '../story/steps';
import {
  INK,
  PALS,
  METAL,
  CERAMIC,
  DARK,
  WOOD,
  P,
  pd,
  on,
  PZ,
  PX,
  byDepth,
  box,
  cyl,
  rod,
  shape,
  line,
  ink,
  hullInk,
  castShadow,
  toneI,
  tag,
  inkK,
  depthOf,
  rrUV,
  rectUV,
  vis,
  tone,
  fill,
  extrude,
  openShell,
} from '../../lib/iso/core.js';
import { hexa, person, pottedPlant, type Piece } from '../../lib/iso/figures';
import { crate } from './crateScene';

export const OFFICE_BOARD: Board = [100, 0, 286, 258];
type Station = 'emp' | 'host' | 'model' | 'orders';
// a cross on the board's axes, so gates across a belt face the viewer: the model in front to the right (+x), the employee
// in front to the left (+y), the order system behind to the right (-y)
const AT: Record<Station, number[]> = { host: [142, 134], model: [262, 134], orders: [142, 22], emp: [142, 236] };
const EDGE: Record<Station, number> = { host: 22, model: 19, orders: 18, emp: 14 }; // where a belt meets the station
const HT: Record<Station, number> = { host: 34, model: 32, orders: 44, emp: 20 }; // tallest part, for pill heights
const BW = 12; // belt width
/** The parts a step's callout (`say.block`) may name: the stations and the checks on the belts. */
export const OFFICE_PARTS = ['emp', 'host', 'model', 'orders', 'schema', 'owner', 'gate'] as const;
const KIND_PAL = { request: PALS.cobalt, result: PALS.mint, error: PALS.tomato, blocked: METAL };

// a belt runs from the host's edge (t = 0) to the station's edge (t = 1)
const ends = (st: Station) => {
  const [hx, hy] = AT.host,
    [sx, sy] = AT[st],
    L = Math.hypot(sx - hx, sy - hy),
    d = [(sx - hx) / L, (sy - hy) / L];
  return {
    a: [hx + d[0] * EDGE.host, hy + d[1] * EDGE.host],
    b: [sx - d[0] * EDGE[st], sy - d[1] * EDGE[st]],
    d,
    n: [-d[1], d[0]],
  };
};
const along = (st: Station, t: number, off = 0) => {
  const { a, b, n } = ends(st);
  return [a[0] + (b[0] - a[0]) * t + n[0] * off, a[1] + (b[1] - a[1]) * t + n[1] * off];
};

/** A conveyor belt on the board: a low roller bed between side rails; `cut`: not built yet, a dashed outline only. */
const belt = (st: Station, cut: boolean) => {
  const { a, b, n } = ends(st);
  return beltAt(a, b, n, cut);
};
/** A belt from board point a to b; n: its sideways direction. Real-object notes: a dark bed on the board; steel
 * rollers across it every 6 units, half sunk so a parcel rides on their tops; a low mustard rail along each side,
 * the far one drawn before the rollers and the near one after. */
export function beltAt(a: number[], b: number[], n: number[], cut: boolean) {
  const w = BW / 2,
    z = BH + 0.25;
  const q = [
    [a[0] + n[0] * w, a[1] + n[1] * w, z],
    [b[0] + n[0] * w, b[1] + n[1] * w, z],
    [b[0] - n[0] * w, b[1] - n[1] * w, z],
    [a[0] - n[0] * w, a[1] - n[1] * w, z],
  ];
  if (cut) return ink(pd(q), 1.1).replace('/>', ' stroke-dasharray="4 4"/>');
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]),
    at = (t: number, k: number, zz: number) => [
      a[0] + ((b[0] - a[0]) * t) / L + n[0] * k,
      a[1] + ((b[1] - a[1]) * t) / L + n[1] * k,
      zz,
    ];
  // a side rail: a thin bar standing on the bed's edge, k = ±1
  const rail = (k: number) => {
    const o = k * (w - 0.6),
      e = 0.6 * k;
    return hexa(
      [
        at(0, o - e, z),
        at(L, o - e, z),
        at(L, o + e, z),
        at(0, o + e, z),
        at(0, o - e, z + 2.2),
        at(L, o - e, z + 2.2),
        at(L, o + e, z + 2.2),
        at(0, o + e, z + 2.2),
      ],
      PALS.mustard,
      0.7,
    );
  };
  // the near rail is the one on the viewer's side in this turn
  const near = depthOf(at(0, w, z)) > depthOf(at(0, -w, z)) ? 1 : -1;
  let s = shape(q, DARK.m, 1.2) + rail(-near);
  // each roller a painted bar (an ink stroke under a steel one): a rod's look at a sliver of its SVG
  for (let t = 4; t < L - 2; t += 6) {
    const d = pd([at(t, -(w - 1.2), z + 0.5), at(t, w - 1.2, z + 0.5)], false);
    s += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="2.3" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${METAL.l}" stroke-width="1.1" stroke-linecap="round"/>`;
  }
  return s + rail(near);
}

export type Part = { at: number[]; svg: string; box?: number[][] };
const LIT = '#ffb627';
const LIT_PAL = { l: LIT, m: LIT, d: PALS.mustard.m };
const span = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => [
  [x0, y0, z0],
  [x1, y1, z1],
];

/** The employee's counter: a wooden counter with a desk phone on it (base, handset on its cradle, a curly cord) and a
 * note pad; the phone's call light glows while a message is at the counter. The employee stands behind it (person).
 * Prompts' docket board stands one at its support desk. */
export function counterAt([x, y]: number[], lit: boolean): Part {
  const z1 = BH + 14;
  let s =
    box(x - 18, y - 12, BH, x + 18, y + 12, z1 - 1.5, WOOD, toneI, 1) +
    box(x - 19, y - 13, z1 - 1.5, x + 19, y + 13, z1, WOOD, toneI, 1) +
    // the counter's front panel, seen from the viewer's side
    shape(
      on(PX(x + 18.05), [
        [y - 9, BH + 2.5],
        [y + 9, BH + 2.5],
        [y + 9, z1 - 4],
        [y - 9, z1 - 4],
      ]),
      WOOD.m,
      0.7,
    );
  // the phone: a sloped base, the handset lying across its cradle, a coiled cord down the far side
  const px = x - 6,
    py = y - 1;
  s += hexa(
    [
      [px - 5, py - 5, z1],
      [px + 5, py - 5, z1],
      [px + 5, py + 5, z1],
      [px - 5, py + 5, z1],
      [px - 5, py - 5, z1 + 5],
      [px + 3, py - 5, z1 + 3],
      [px + 3, py + 5, z1 + 3],
      [px - 5, py + 5, z1 + 5],
    ],
    PALS.tomato,
    0.9,
  );
  s += cyl(px + 3.6, py + 3, z1, z1 + 1.4, 1.2, lit ? LIT_PAL : DARK, toneI, 0.7, 10);
  const coil: number[][] = [],
    c0 = [px - 3, py - 6.5, z1 + 6],
    c1 = [px - 7.5, py - 3, z1 + 2];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48,
      g = t * 7 * 2 * Math.PI,
      droop = Math.sin(Math.PI * t) * 3;
    coil.push([
      c0[0] + (c1[0] - c0[0]) * t + Math.cos(g) * 0.8,
      c0[1] + (c1[1] - c0[1]) * t,
      c0[2] + (c1[2] - c0[2]) * t - droop + Math.sin(g) * 0.8,
    ]);
  }
  s += line(coil, 0.6);
  s +=
    rod([px - 2, py - 6.5, z1 + 5.6], [px - 2, py + 6.5, z1 + 5.6], 1.1, PALS.tomato, toneI, 0.9, 1.1, 8) +
    rod([px - 2, py - 7, z1 + 5.2], [px - 2, py - 4.6, z1 + 6.2], 1.8, PALS.tomato, toneI, 0.9, 1.8, 8) +
    rod([px - 2, py + 4.6, z1 + 6.2], [px - 2, py + 7, z1 + 5.2], 1.8, PALS.tomato, toneI, 0.9, 1.8, 8);
  s += box(x + 7, y - 9, z1, x + 15, y - 1, z1 + 1.2, CERAMIC, toneI, 0.7); // a note pad
  return {
    at: [x, y, 0],
    box: span(x - 19, y - 13, BH, x + 19, y + 13, z1 + 8),
    svg: s + hullInk(boxCorners(x - 19, y - 13, BH, x + 19, y + 13, z1), 2.2),
  };
}

/** The host app (and MCP's apps): a mail-sorting machine at (x, y). Real-object notes: a rounded steel-blue cabinet on a dark plinth; its front is
 * a wall of pigeonhole slots, some with a letter in them; an open hopper on top where post goes in; a lamp on a post
 * that lights while it handles a message; the call counter's studs on its top, lit as calls are made. */
export function sortingMachine(x: number, y: number, lit: boolean, calls?: number, cap?: number): Part {
  const x0 = x - 20,
    x1 = x + 20,
    y0 = y - 20,
    y1 = y + 20,
    zb = BH + 2.5,
    zt = BH + 26,
    m = PALS.cobalt;
  const PROF = rrUV(y0, zb, y1, zt, 7, 5);
  let s = box(x0 + 1.5, y0 + 1.5, BH, x1 - 1.5, y1 - 1.5, zb, DARK, toneI, 0.9);
  // the rounded body: the end cap toward the viewer, the rounded sides, one heavy silhouette
  for (const [cx, n] of [
    [x0, [-1, 0, 0]],
    [x1, [1, 0, 0]],
  ] as [number, number[]][])
    if (vis(n)) s += fill(pd(on(PX(cx), PROF)), tone(n, m)) + ink(pd(on(PX(cx), PROF)), 1.6);
  s += extrude(PROF, x0, x1, m) + hullInk([...on(PX(x0), PROF), ...on(PX(x1), PROF)], 2.6);
  // the pigeonholes on the front: three rows of four, a letter waiting in most
  const sx = vis([1, 0, 0]) ? 1 : -1,
    fx = (sx > 0 ? x1 : x0) + sx * 0.1;
  s += shape(on(PX(fx), rrUV(y0 + 4, zb + 3.5, y1 - 4, zt - 3, 2.5, 3)), m.m, 1);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 4; c++) {
      const u0 = y0 + 6 + c * 7.3,
        v0 = zb + 5 + r * 5.6;
      s += shape(on(PX(fx + sx * 0.05), rectUV(u0, v0, u0 + 5.8, v0 + 4.2)), DARK.d, 0.7);
      if ((r * 4 + c) % 3 !== 1)
        s += shape(on(PX(fx + sx * 0.1), rectUV(u0 + 0.8, v0, u0 + 5, v0 + 2.6 + ((r + c) % 2) * 0.8)), CERAMIC.l, 0.5);
    }
  // the hopper: an open tray, wider at the rim, on the back of the top
  const ring = (z: number, g: number) => [
    [x - 17 - g, y - 11 - g, z],
    [x - 5 + g, y - 11 - g, z],
    [x - 5 + g, y + 11 + g, z],
    [x - 17 - g, y + 11 + g, z],
  ];
  const A = ring(zt - 0.5, 0),
    B = ring(BH + 34, 2);
  s +=
    openShell(A, B, (n: number[]) => toneI(n, METAL), fill(pd(ring(zt + 1, 0.4)), DARK.m)) +
    ink(pd(B), 1) +
    hullInk([...A, ...B], 1.8);
  // the call counter: one stud per call the cap allows, lit as calls are made
  if (cap)
    for (let i = 0; i < cap; i++)
      s += cyl(
        x + 4 + (i % 3) * 5,
        y - 12 + Math.floor(i / 3) * 5,
        zt,
        zt + 1.6,
        1.8,
        i < (calls ?? 0) ? LIT_PAL : DARK,
        toneI,
        0.7,
        10,
      );
  s +=
    rod([x + 12, y + 12, zt], [x + 12, y + 12, zt + 9], 0.9, METAL) +
    rod([x + 12, y + 12, zt + 9], [x + 6, y + 8, zt + 12], 3, lit ? LIT_PAL : PALS.mustard, toneI, 0.9, 1.5);
  return { at: [x, y, 0], box: span(x0, y0, BH, x1, y1, BH + 34), svg: `<g class="sorter">${s}</g>` };
}

/** The model: the LLM block, with the tool definitions it was sent fanned out on top like a menu. */
function model(state: 'ok' | 'warn' | 'bad' | undefined, tools: number): Part {
  const [x, y] = AT.model,
    z1 = BH + 32;
  let s = renderers.llm({ x, y, state });
  for (let i = 0; i < tools; i++)
    s +=
      box(
        x - 13 + i * 5,
        y - 13 + i * 4,
        z1 + i * 1.6,
        x + 3 + i * 5,
        y + 7 + i * 4,
        z1 + i * 1.6 + 1.4,
        CERAMIC,
        toneI,
        0.8,
      ) +
      shape(
        on(PZ(z1 + i * 1.6 + 1.45), [
          [x - 13 + i * 5, y - 13 + i * 4],
          [x - 8 + i * 5, y - 13 + i * 4],
          [x - 8 + i * 5, y + 7 + i * 4],
          [x - 13 + i * 5, y + 7 + i * 4],
        ]),
        [PALS.cobalt, PALS.mint, PALS.tomato][i % 3].l,
        0.6,
      );
  return { at: [x, y, 0], box: span(x - 17, y - 17, BH, x + 17, y + 17, BH + 42), svg: s };
}

/** The order system (and MCP's servers): a steel filing cabinet on a plinth, under a lipped top. Each drawer has a raised front, a label
 * holder and a bar handle; the middle drawer slides out while a call reads or changes the orders. */
export function fileCabinet(x: number, y: number, open: boolean): Part {
  const x1 = x + 16,
    z1 = BH + 44;
  let s =
    box(x - 15, y - 15, BH, x1 - 1, y + 15, BH + 2, DARK, toneI, 0.9) +
    box(x - 16, y - 16, BH + 2, x1, y + 16, z1 - 1.5, METAL, toneI, 1) +
    box(x - 16.6, y - 16.6, z1 - 1.5, x1 + 0.6, y + 16.6, z1, METAL, toneI, 1);
  const front = vis([1, 0, 0]);
  const drawer = (X: number, z: number) =>
    shape(
      on(PX(X), [
        [y - 13, z],
        [y + 13, z],
        [y + 13, z + 12],
        [y - 13, z + 12],
      ]),
      METAL.l,
      0.9,
    ) +
    shape(on(PX(X + 0.05), rectUV(y - 4, z + 8, y + 4, z + 10.5)), CERAMIC.l, 0.6) +
    rod([X + 1.4, y - 5, z + 5.5], [X + 1.4, y + 5, z + 5.5], 0.8, DARK, toneI, 0.9, 0.8, 8) +
    rod([X, y - 5, z + 5.5], [X + 1.4, y - 5, z + 5.5], 0.5, DARK, toneI, 0.6, 0.5, 6) +
    rod([X, y + 5, z + 5.5], [X + 1.4, y + 5, z + 5.5], 0.5, DARK, toneI, 0.6, 0.5, 6);
  for (let i = 0; i < 3; i++) {
    const z = BH + 3.5 + i * 13;
    if (i === 1 && open) continue;
    if (front) s += drawer(x1 + 0.05, z);
  }
  if (open) {
    const z = BH + 16.5;
    s +=
      shape(
        on(PX(x1 + 0.05), [
          [y - 13, z],
          [y + 13, z],
          [y + 13, z + 12],
          [y - 13, z + 12],
        ]),
        DARK.d,
        0.8,
      ) +
      box(x1, y - 12, z + 0.5, x1 + 14, y + 12, z + 10, METAL, toneI, 0.9) +
      box(x1 + 3, y - 9, z + 10, x1 + 4.5, y + 9, z + 15, PALS.mustard, toneI, 0.7) +
      box(x1 + 7, y - 9, z + 10, x1 + 8.5, y + 9, z + 13, CERAMIC, toneI, 0.7) +
      drawer(x1 + 14.05, z);
  }
  return {
    at: [x, y, 0],
    box: span(x - 16.6, y - 16.6, BH, x1 + (open ? 16 : 2), y + 16.6, z1),
    svg: s + hullInk(boxCorners(x - 16, y - 16, BH, x1 + (open ? 16 : 2), y + 16, z1), 2.4),
  };
}

/** Larkspur's stock in the empty front corner: slatted crates of hardware and a potted plant (decoration only). */
function stock(): Piece[] {
  const crates: Part = {
    at: [244, 214, 0],
    box: span(227, 205, BH, 265, 223, BH + 28),
    svg:
      crate(236, 214, undefined, BH, 9, 14) +
      crate(236, 214, undefined, BH + 14, 9, 14) +
      crate(256, 214, undefined, BH, 9, 14),
  };
  return [
    {
      shadow: castShadow(boxCorners(227, 205, BH, 265, 223, BH + 28), BH),
      items: [crates as Piece['items'][number]],
      box: crates.box!,
    },
    pottedPlant({ x: 262, y: 244 }),
  ];
}

/** The employee, mug in hand, standing at the counter's open end and turned toward the phone. */
const employee = () => person({ x: AT.emp[0] + 27, y: AT.emp[1] + 3, facing: 200, look: 'employee' });

/** An arch over a belt: two posts and a bar, a lamp on top (green: passed, red: refused). */
const arch = (st: Station, t: number, lamp: 'ok' | 'bad' | null) => archAt(along(st, t), ends(st).n, lamp);
/** An arch across a belt at board point p; n: the belt's sideways direction. */
export function archAt([px, py]: number[], n: number[], lamp: 'ok' | 'bad' | null): Part {
  const w = BW / 2 + 3,
    zt = BH + 20;
  const a = [px + n[0] * w, py + n[1] * w],
    b = [px - n[0] * w, py - n[1] * w];
  const post = (q: number[]) => box(q[0] - 1.6, q[1] - 1.6, BH, q[0] + 1.6, q[1] + 1.6, zt, PALS.mustard, toneI, 0.9);
  const col = lamp === 'ok' ? PALS.mint : lamp === 'bad' ? PALS.tomato : DARK;
  return {
    at: [px, py, 0],
    svg:
      post(a) +
      post(b) +
      rod([a[0], a[1], zt], [b[0], b[1], zt], 1.8, PALS.mustard) +
      cyl(px, py, zt + 1.5, zt + 4, 2.4, col, toneI, 0.8, 14),
  };
}

/** A barrier across a belt: a post and an arm, down (closed) or raised (approved). */
const barrier = (st: Station, t: number, up: boolean, waiting: boolean) =>
  barrierAt(along(st, t), ends(st).n, up, waiting);
/** A barrier across a belt at board point p; n: the belt's sideways direction. */
export function barrierAt([px, py]: number[], n: number[], up: boolean, waiting: boolean): Part {
  const w = BW / 2 + 4,
    z = BH + 12;
  const p = [px + n[0] * w, py + n[1] * w];
  // raised: straight up, so it never reads as a closed arm seen at an angle
  const end = up ? [p[0], p[1], z + 30] : [px - n[0] * w, py - n[1] * w, z];
  let s =
    box(p[0] - 2.5, p[1] - 2.5, BH, p[0] + 2.5, p[1] + 2.5, z + 2, METAL, toneI, 0.9) +
    rod([p[0], p[1], z + 1], end, 1.5, PALS.tomato);
  // white bands on the arm, so it reads as a barrier and not a pipe
  for (const k of [0.3, 0.65]) {
    const q = [p[0] + (end[0] - p[0]) * k, p[1] + (end[1] - p[1]) * k, z + 1 + (end[2] - z - 1) * k];
    s += rod(
      q,
      [q[0] + (end[0] - p[0]) * 0.12, q[1] + (end[1] - p[1]) * 0.12, q[2] + (end[2] - z - 1) * 0.12],
      1.55,
      CERAMIC,
    );
  }
  s += cyl(
    p[0],
    p[1],
    z + 2,
    z + 5,
    2.2,
    waiting ? { l: LIT, m: LIT, d: PALS.mustard.m } : up ? PALS.mint : PALS.tomato,
    toneI,
    0.8,
    14,
  );
  return { at: [px, py, 0], svg: s };
}

/** A message envelope on a belt; `note`: a slip of paper poking out (a planted instruction). Travels in from its sender. */
export function envelope(m: Msg, p: number[], from: number[], note: boolean): Part {
  const [x, y] = p,
    z = BH + 0.3,
    pal = KIND_PAL[m.kind];
  let s =
    castShadow(boxCorners(x - 5, y - 4, z, x + 5, y + 4, z + 5), z) +
    box(x - 5, y - 4, z, x + 5, y + 4, z + 5, pal, toneI, 1) +
    line(
      [
        [x - 5, y - 4, z + 5.05],
        [x, y, z + 5.05],
        [x - 5, y + 4, z + 5.05],
      ],
      0.9,
    );
  if (m.kind === 'blocked')
    s += ink(
      pd(
        on(PZ(z + 5.1), [
          [x - 5, y - 4],
          [x + 5, y - 4],
          [x + 5, y + 4],
          [x - 5, y + 4],
        ]),
      ),
      1.2,
    ).replace('/>', ' stroke-dasharray="2 2"/>');
  // the planted note: a pink slip standing up out of the envelope, scribbled on
  if (note)
    s +=
      shape(
        [
          [x - 3, y - 1, z + 5],
          [x + 4, y - 3, z + 5],
          [x + 6, y - 3, z + 19],
          [x - 1, y - 1, z + 19],
        ],
        PALS.blush.l,
        1,
      ) +
      [16, 13, 10]
        .map(h =>
          line(
            [
              [x - 0.4, y - 1.4, z + h],
              [x + 4.4, y - 2.8, z + h],
            ],
            0.7,
          ).replace(INK, PALS.tomato.d),
        )
        .join('');
  const [X, Y] = P(x, y, z),
    [FX, FY] = P(from[0], from[1], z);
  return {
    at: [x, y, 1],
    svg: `<g class="capsule" style="--dx:${(FX - X).toFixed(1)}px;--dy:${(FY - Y).toFixed(1)}px">${s}</g>`,
  };
}

export interface OfficeOpts {
  msgs: Msg[];
  /** messages sent so far; the last one is on the belt */
  upTo?: number;
  /** tool definitions the host sends the model; 0 = none, and no belt to the order system */
  tools: number;
  host?: string;
  /** the front desk's name pill (default EMPLOYEE) */
  emp?: string;
  /** checks standing on the belts */
  schema?: boolean;
  owner?: boolean;
  gate?: boolean;
  /** the host's call cap, shown as studs on its desk */
  cap?: number;
  /** extra words on the order system's pill (a refund limit) */
  orders?: string;
  /** results from the order system carry a planted note */
  note?: boolean;
  /** station and check name pills, and the stock in the corner (default on); the home hero leaves them out */
  names?: boolean;
  scale?: number;
  /** the step's callout, a lit pill over one of OFFICE_PARTS */
  say?: Say;
}

const stationOf = (id: string): Station | undefined => (id in AT ? (id as Station) : undefined);

/** What the picture shows after `upTo` messages: who is busy, where each envelope is, how the checks stand. */
export function officeState({ msgs, upTo = msgs.length, tools, gate }: OfficeOpts) {
  const sent = msgs.slice(0, upTo),
    last = sent[sent.length - 1];
  // the envelopes in flight: the last message, or every message of its batch (parallel calls)
  const flying = last
    ? sent
        .map((m, i) => ({ m, i }))
        .filter(({ m, i }) => i === upTo - 1 || (last.batch !== undefined && m.batch === last.batch))
    : [];
  const gated = [...sent].reverse().find(m => m.from === 'host' && m.to === 'emp' && m.stamp);
  // the model's screen keeps showing what it last wrote: '...' while it reads, OK for a call or answer, ??? for a guess (no tools)
  const said = [...sent].reverse().find(m => m.from === 'model' || m.to === 'model');
  const screen: 'ok' | 'warn' | 'bad' | undefined =
    !said || said.to === 'model'
      ? undefined
      : said.stamp === 'INVALID' || said.stamp === 'STOPPED'
        ? 'bad'
        : tools
          ? 'ok'
          : 'warn';
  return {
    last,
    flying,
    screen,
    busy: last ? stationOf(last.to) : undefined,
    open: !!last && (last.to === 'orders' || last.from === 'orders'),
    calls: sent.filter(m => m.from === 'host' && m.to === 'orders').length,
    up: !!gate && gated?.stamp === 'APPROVED',
    waiting: !!gate && gated?.stamp === 'WAITING' && last === gated,
  };
}

/** The office's SVG split for a scene that adds props: its art, its name pills (the props go between the two), and
 * its step callout, which goes on last, over the scene's own pills. */
export function splitOffice(svg: string) {
  const lit = svg.indexOf('<g class="callout"'),
    callout = lit < 0 ? '' : svg.slice(lit),
    rest = lit < 0 ? svg : svg.slice(0, lit),
    cut = rest.search(/<g class="(block|check|msg)-tag"/);
  return { art: cut < 0 ? rest : rest.slice(0, cut), names: cut < 0 ? '' : rest.slice(cut), callout };
}

/** The diorama. Pills: each station's name (lit while it is busy), and the message on the belt with its stamp. */
export const officeScene =
  (o: OfficeOpts) =>
  ({ top }: SceneCtx) => {
    const { tools, host = 'HOST APP', schema, owner, gate, cap, scale = 1, note } = o;
    const st = officeState(o),
      narrow = scale > 1;
    const extras: Piece[] = [employee(), ...(o.names === false ? [] : stock())];
    let s =
      blockShadow('llm', ...(AT.model as [number, number]), top) +
      castShadow(boxCorners(AT.host[0] - 20, AT.host[1] - 20, BH, AT.host[0] + 20, AT.host[1] + 20, BH + 34), BH, top) +
      castShadow(
        boxCorners(AT.orders[0] - 16, AT.orders[1] - 16, BH, AT.orders[0] + 16, AT.orders[1] + 16, BH + 44),
        BH,
        top,
      ) +
      castShadow(boxCorners(AT.emp[0] - 18, AT.emp[1] - 12, BH, AT.emp[0] + 18, AT.emp[1] + 12, BH + 20), BH, top) +
      extras.map(e => e.shadow).join('');
    s += (['model', 'emp', 'orders'] as Station[]).map(k => belt(k, k === 'orders' && !tools)).join('');
    const parts: Part[] = [
      ...extras.flatMap(e =>
        e.items.map(i => ({ ...i, at: i.at ?? [0, 1, 2].map(k => (i.box[0][k] + i.box[1][k]) / 2) })),
      ),
      counterAt(AT.emp, st.busy === 'emp'),
      sortingMachine(AT.host[0], AT.host[1], st.busy === 'host', st.calls, cap),
      model(st.screen, tools),
      fileCabinet(AT.orders[0], AT.orders[1], st.open),
    ];
    const lastBad = st.last?.stamp === 'INVALID';
    if (schema)
      parts.push(
        arch('model', 0.3, st.last?.from === 'model' && st.last.to === 'host' ? (lastBad ? 'bad' : 'ok') : null),
      );
    if (owner)
      parts.push(arch('orders', 0.3, st.last?.from === 'orders' ? (st.last.stamp === 'REFUSED' ? 'bad' : 'ok') : null));
    if (gate) parts.push(barrier('orders', 0.62, st.up, st.waiting));
    const pills: string[] = [];
    const callouts: string[] = [];
    const sign = (st2: Station, t: number, text: string, part: string) => {
      if (o.names === false) return;
      const [x, y] = along(st2, t);
      pills.push(
        `<g class="check-tag" aria-hidden="true" pointer-events="none">${tag([x, y, BH], 0, 16, text, false, scale)}</g>`,
      );
      callouts.push(sayAt(o.say, part, [x, y, BH], 16, scale));
    };
    if (schema) sign('model', 0.3, 'SCHEMA CHECK', 'schema');
    if (owner) sign('orders', 0.3, narrow ? 'OWNER' : 'OWNERSHIP CHECK', 'owner');
    if (gate) sign('orders', 0.62, `APPROVAL · ${st.up ? 'OPEN' : st.waiting ? 'WAITING' : 'CLOSED'}`, 'gate');
    st.flying.forEach(({ m }, j) => {
      const a = stationOf(m.from),
        b = stationOf(m.to),
        spoke = a === 'host' ? b : a;
      if (!a || !b || !spoke || spoke === 'host') return;
      const toward = b === 'host' ? 0 : 1; // belt parameter of the receiving end
      // arriving: most of the way along; an INVALID call is held on the model's side of the schema arch, a STOPPED one never leaves the model
      // toward the model it stops short: the model block, in front, would hide the far end of its belt;
      // and back from the orders it stops clear of the host desk, which stands in front of that belt's near end
      let t = toward ? (spoke === 'model' ? 0.6 : 0.78) : spoke === 'orders' ? 0.4 : 0.22;
      if (m.stamp === 'INVALID' && schema) t = 0.46;
      if (m.stamp === 'STOPPED') t = 0.6;
      // a batch rides side by side across the belt, so it stays clear of the checks along it
      const side = st.flying.length > 1 ? (j - (st.flying.length - 1) / 2) * 11 : 0;
      const p = along(spoke, t, side);
      const from = a === 'host' ? along(spoke, 0) : along(spoke, 1);
      const planted = !!note && m.kind === 'result' && (m.from === 'orders' || (m.from === 'host' && m.to === 'model'));
      parts.push(envelope(m, p, from, planted));
      // only the stamp rides on the envelope: the message's words are in the caption under the picture (and the drawer)
      if (j === 0 && (m.stamp || st.flying.length > 1))
        pills.push(
          `<g class="msg-tag" aria-hidden="true" pointer-events="none">${tag([p[0], p[1], BH + 6], 0, -16, m.stamp ?? 'AT ONCE', true, scale)}</g>`,
        );
    });
    s += byDepth(parts);
    const name = (k: Station, text: string) => {
      const p3 = [AT[k][0], AT[k][1], BH + HT[k]],
        dy = -14 - ((44 - HT[k]) / (inkK() * scale)) * 0.6;
      callouts.push(sayAt(o.say, k, p3, dy, scale));
      return `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p3, 0, dy, esc(text), st.busy === k, scale)}</g>`;
    };
    if (o.names === false) return s + pills.join('');
    s +=
      name('emp', o.emp ?? 'EMPLOYEE') +
      name('host', host.toUpperCase() + (cap ? ` · ${st.calls}/${cap} CALLS` : '')) +
      name('model', narrow ? 'MODEL' : `MODEL${tools ? ` · ${tools} TOOL${tools === 1 ? '' : 'S'}` : ' · NO TOOLS'}`) +
      name('orders', `ORDER SYSTEM${tools ? '' : ' · NOT LINKED'}${o.orders ? ` · ${o.orders}` : ''}`);
    return s + pills.join('') + callouts.join('');
  };

/** The picture in words, for its aria-label. */
export function officeLabel(o: OfficeOpts): string {
  const st = officeState(o),
    host = o.host ?? 'Host app';
  const name = (id: string) =>
    (({ emp: 'the employee', host, model: 'the model', orders: 'the order system' }) as Record<string, string>)[id] ??
    id;
  const checks = [
    o.schema && 'a schema check between the model and the host',
    o.owner && 'an ownership check before the order system',
    o.gate && `an approval barrier, ${st.up ? 'raised' : st.waiting ? 'down, waiting for a person' : 'down'}`,
  ].filter(Boolean);
  const head = `Larkspur's back office: the employee's desk, ${host}, the model${o.tools ? ` holding ${o.tools} tool definition${o.tools === 1 ? '' : 's'}` : ' with no tools'}, and the order system${o.tools ? '' : ', with nothing joining it to the host'}, joined by conveyor belts.${checks.length ? ` On the belts: ${checks.join('; ')}.` : ''}`;
  if (!st.last) return `${head} Nothing sent yet.`;
  const now =
    st.flying.length > 1
      ? `${st.flying.length} calls on the belt at once`
      : `from ${name(st.last.from)} to ${name(st.last.to)}: "${st.last.text}"${st.last.stamp ? `, stamped ${st.last.stamp.toLowerCase()}` : ''}`;
  return `${head} Message ${o.upTo ?? o.msgs.length} on the belt, ${now}.${o.cap ? ` Calls made: ${st.calls} of ${o.cap}.` : ''}`;
}
