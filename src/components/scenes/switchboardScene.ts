// Multi-agent's picture: Larkspur's back office around an operator's cord switchboard (docs/modules/multi-agent.md).
// The lead agent (the kit's model machine) stands at the board; five helper desks wait in a row, each with a small
// helper machine on it and a jack at its back. Hiring a helper runs a patch cord from the board's jack for that desk,
// over the board's base and across the floor, up to the desk's jack. A run sends catalogues from the cart to the desks,
// then each helper's reply travels back up its cord to a round port on the board: a reply in the wrong shape is a
// square plug that won't seat and springs back onto the base; two helpers waiting on each other blink their lamps and
// hold a cord between their jacks until the timer runs out. The finished report lands on Ines's tray.
// A living scene (KTD2): scene(prev, state, t, view) → { still, moving }; at t = 1 everything is in the still.
// Words only in pills; every string reaching SVG goes through esc().
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import { modelMachine, person, type Item, type ModelState } from '../../lib/iso/figures';
import {
  CERAMIC,
  DARK,
  INK,
  METAL,
  P,
  PALS,
  PY,
  PZ,
  WOOD,
  box,
  byDepth,
  castShadow,
  cyl,
  ellUV,
  f,
  on,
  rectUV,
  rod,
  shape,
  tag,
  toneI,
} from '../../lib/iso/core.js';
import { calloutOf, lerpPt, pillScale, type Scene, type SceneView } from '../../lib/iso/motion';
import type { Say } from '../story/steps';

export const SWITCH_BOARD: Board = [6, 2, 176, 96];
/** The parts a step's callout or close-up may name. */
export const SWITCH_PARTS = [
  'board',
  'coil',
  'lead',
  'desk',
  'cart',
  'meter',
  'lamps',
  'port',
  'timer',
  'report',
  'desk1',
  'desk2',
  'desk3',
  'desk4',
  'desk5',
] as const;
export type SwitchPart = (typeof SWITCH_PARTS)[number];
export const DESKS = [1, 2, 3, 4, 5];

/** ok: seated; bounced: a square plug sprang back, then a resend seated; wrong: a misread number seated unchecked;
 * caught: set aside by the check, re-read and seated; held: still waiting */
export type PlugKind = 'ok' | 'bounced' | 'wrong' | 'caught' | 'held';
/** What the picture shows. Desks are the picture's 1–5; index 0 of `piles` is the lead's own desk. */
export interface Switch {
  /** desks with a cord from the board */
  wired: number[];
  /** the job has run (else the catalogues still wait on the cart) */
  ran: boolean;
  /** each desk's pile, as a colour index per catalogue: [the lead's desk, desk 1, …, desk 5] */
  piles: number[][];
  /** colour index per catalogue still on the cart */
  cart: number[];
  /** catalogues fallen off a full desk, and which desk (0 = the lead's) */
  spilled: number;
  spillDesk: number;
  /** desk → the desk whose pile it copied (a vague brief) */
  dup: Record<number, number>;
  /** the reply at each desk's port */
  plugs: Record<number, PlugKind>;
  /** desks waiting on each other */
  hold: number[];
  timer: 'off' | 'set' | 'rang';
  report: 'none' | 'done' | 'gap' | 'wrong' | 'waiting';
  tokens?: number;
  minutes?: number | null;
  /** the misread price, for its pill */
  slipped?: string;
  /** catalogues missing from the report */
  missing?: number;
  lead?: ModelState;
  say?: Say;
  /** pills are drawn apart, outside the hand-drawn filter (the stage's overlay: switchPills) */
  bare?: boolean;
}

const PAL = [
  PALS.tomato,
  PALS.cobalt,
  PALS.mustard,
  PALS.mint,
  PALS.blush,
  { l: '#b39ddb', m: '#9580c0', d: '#3a2f52' },
];
const palOf = (i: number) => PAL[i % PAL.length];
const KNOB = { ok: PALS.mint, bounced: PALS.mint, caught: PALS.mint, wrong: PALS.tomato, held: null } as const;

// the switchboard: a cream panel on a wooden base; a column per desk of lamp, round reply port and patch jack
const B = { x0: 14, x1: 90, y0: 10, y1: 16, zb: BH + 16, zt: BH + 48, yb: 27 };
const FACE = B.y1 + 0.06;
const colX = (d: number) => 34 + (d - 1) * 12;
const Z = { lamp: BH + 42, port: BH + 33, jack: BH + 24 };
const DIAL = { x: 22, meter: BH + 38, timer: BH + 25, r: 5 };
const COIL = [86, 21.5];
const LEAD = [128, 18],
  LEAD_K = 0.9,
  LDESK = { x0: 112, x1: 136, y0: 40, y1: 52, z: BH + 10 };
const deskX = (d: number) => 22 + (d - 1) * 27;
const DESK = { y0: 70, y1: 84, z: BH + 10, hw: 12 };
const CART = { x0: 150, x1: 168, y0: 32, y1: 48, z: BH + 8 };
const TRAY = { x0: 148, x1: 168, y0: 76, y1: 90, z: BH + 10 };
const INES = [166, 64];
const runY = (d: number) => 64 - d * 1.6;

type V = number[];
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ph = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

/** A disc on the board's face. */
const disc = (x: number, z: number, r: number, col: string, w = 0.7) =>
  shape(on(PY(FACE), ellUV(x, z, r, r, 14)), col, w);

/** A patch cord's points: over the base (top) and across the floor up to the desk's jack (floor). */
function cordPts(d: number): { top: V[]; floor: V[] } {
  const x = colX(d),
    jx = deskX(d) + 9,
    y = runY(d);
  return {
    top: [
      [x, FACE, Z.jack],
      [x, FACE + 1.5, B.zb + 1.2],
      [x, B.yb - 0.6, B.zb + 0.6],
      [x, B.yb + 0.6, BH + 0.6],
    ],
    floor: [
      [x, B.yb + 0.6, BH + 0.6],
      [x, y, BH + 0.5],
      [jx, y, BH + 0.5],
      [jx, DESK.y0 - 0.6, BH + 0.5],
      [jx, DESK.y0 - 0.6, DESK.z + 0.8],
      [jx, DESK.y0 + 1.6, DESK.z + 1.6],
    ],
  };
}
const len = (a: V, b: V) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
/** The first fraction u of a path's length. */
function cut(pts: V[], u: number): V[] {
  if (u >= 1) return pts;
  const L = pts.slice(1).reduce((n, p, i) => n + len(pts[i], p), 0);
  let left = L * u;
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const l = len(pts[i - 1], pts[i]);
    if (left >= l) {
      out.push(pts[i]);
      left -= l;
    } else {
      out.push(lerpPt(pts[i - 1], pts[i], l ? left / l : 0));
      break;
    }
  }
  return out;
}
const at = (pts: V[], u: number) => cut(pts, u).at(-1)!;
/** A cord drawn along points: an ink sleeve and its colour. */
function cordSvg(pts: V[], col: string, data = '') {
  if (pts.length < 2) return '';
  const d = 'M' + pts.map(p => P(p[0], p[1], p[2]).map(f).join(' ')).join('L');
  return `<g${data}><path d="${d}" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"/></g>`;
}

/** A pile of catalogues lying flat, one colour per catalogue, bottom first. */
function pile(x: number, y: number, z: number, cols: number[], k = 1) {
  let s = '';
  const h = 0.55 * k;
  cols.forEach((c, i) => {
    const m = palOf(c),
      zz = z + i * h,
      j = (i % 3) * 0.35 - 0.35;
    s += box(
      x - 3.5 * k + j,
      y - 2.6 * k,
      zz,
      x + 3.5 * k + j,
      y + 2.6 * k,
      zz + h,
      m,
      toneI,
      i === cols.length - 1 ? 0.7 : 0.35,
    );
  });
  return s;
}
/** Catalogues fallen on the floor, splayed. */
function spill(x: number, y: number, n: number) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = (i * 2.3) % 6.2,
      dx = (i % 3) * 6 - 6 + Math.cos(a),
      dy = Math.floor(i / 3) * 4 + Math.sin(a);
    s += shape(
      [
        [x + dx - 3, y + dy - 2, BH + 0.3],
        [x + dx + 3, y + dy - 2.6, BH + 0.3],
        [x + dx + 3.4, y + dy + 1.8, BH + 0.3],
        [x + dx - 2.6, y + dy + 2.4, BH + 0.3],
      ],
      palOf(i).l,
      0.7,
    );
  }
  return `<g data-spilled="${n}">${s}</g>`;
}

/** A reply capsule: round (the agreed shape) or square (won't seat). */
const capsule = (p: V, kind: PlugKind, square = false) =>
  square
    ? box(p[0] - 2, p[1] - 2, p[2], p[0] + 2, p[1] + 2, p[2] + 2.6, PALS.tomato, toneI, 1.1)
    : cyl(p[0], p[1], p[2], p[2] + 2.6, 2, kind === 'wrong' ? PALS.tomato : PALS.mint, toneI, 1.1, 12);

/** The board's live face for one state: lamps, seated replies, jacks with cords plugged, the hold cord, dials. */
interface Face {
  lamps: Record<number, 'off' | 'ok' | 'hold'>;
  knobs: Record<number, PlugKind | undefined>;
  plugged: number[];
  hold: number[];
  holdCord: 'none' | 'in' | 'dropped';
  bounced: number[];
  caught: number[];
  /** tokens needle, 0..1 of its sweep */
  needle: number;
  /** timer: 0 = not set, else the swept fraction (1 = rang) */
  timer: number;
  timerSet: boolean;
}
function faceSvg(F: Face) {
  let s = '';
  // dials: the token meter (a needle) and the timer (a sweep)
  s += disc(DIAL.x, DIAL.meter, DIAL.r + 1, DARK.m, 1) + disc(DIAL.x, DIAL.meter, DIAL.r, CERAMIC.l, 0.6);
  const a = Math.PI * (1.25 - 1.5 * F.needle);
  s += `<g data-meter="${F.needle.toFixed(2)}">${shape(
    [
      [DIAL.x - 0.5, FACE + 0.05, DIAL.meter],
      [DIAL.x + 0.5, FACE + 0.05, DIAL.meter],
      [DIAL.x + Math.cos(a) * (DIAL.r - 1), FACE + 0.05, DIAL.meter + Math.sin(a) * (DIAL.r - 1)],
    ],
    PALS.tomato.m,
    0.7,
  )}</g>`;
  s +=
    disc(DIAL.x, DIAL.timer, DIAL.r + 1, F.timerSet ? PALS.mustard.m : DARK.m, 1) +
    disc(DIAL.x, DIAL.timer, DIAL.r, CERAMIC.l, 0.6);
  if (F.timer > 0) {
    const n = Math.max(2, Math.round(F.timer * 16));
    const wedge = [[DIAL.x, DIAL.timer]];
    for (let i = 0; i <= n; i++) {
      const b = Math.PI / 2 - (2 * Math.PI * F.timer * i) / n;
      wedge.push([DIAL.x + Math.cos(b) * (DIAL.r - 0.6), DIAL.timer + Math.sin(b) * (DIAL.r - 0.6)]);
    }
    s += shape(on(PY(FACE + 0.05), wedge), F.timer >= 1 ? PALS.tomato.l : PALS.mustard.l, 0.6);
  }
  s += `<g data-timer="${F.timer >= 1 ? 'rang' : F.timerSet ? 'set' : 'off'}"></g>`;
  for (const d of DESKS) {
    const x = colX(d),
      lamp = F.lamps[d] ?? 'off';
    const col = lamp === 'ok' ? PALS.mint.l : lamp === 'hold' ? PALS.mustard.l : CERAMIC.m;
    s += `<g data-lamp="${lamp}"${lamp === 'hold' ? ` class="ma-blink${d === F.hold[1] ? ' ma-late' : ''}"` : ''}>${disc(x, Z.lamp, 2.1, col, lamp === 'hold' ? 1.6 : 0.8)}</g>`;
    s += disc(x, Z.port, 2.9, DARK.d, 1);
    const k = F.knobs[d];
    if (k && k !== 'held') {
      const m = KNOB[k]!;
      s += `<g data-plug="${k}">${disc(x, Z.port, 2.1, m.l, k === 'wrong' ? 1.6 : 0.8)}${disc(x - 0.6, Z.port + 0.6, 0.6, '#fff', 0)}</g>`;
    }
    s += disc(x, Z.jack, 2.2, METAL.m, 0.7) + disc(x, Z.jack, 1.3, DARK.d, 0.5);
    if (F.plugged.includes(d)) s += disc(x, Z.jack, 1.5, palOf(d - 1).m, 0.8);
  }
  return s;
}
/** What lies on the board's base: the spare cord coil, bounced square plugs, caught capsules, the hold cord. */
function baseSvg(F: Face) {
  let s = '';
  // the coil of spare cords the reader drags from
  for (let i = 0; i < 3; i++)
    s += shape(
      on(PZ(B.zb + 0.2 + i * 0.5), ellUV(COIL[0], COIL[1], 3.6 - i * 0.5, 3 - i * 0.4, 14)),
      i % 2 ? PALS.cobalt.l : DARK.l,
      0.8,
    );
  s += `<g data-coil="1">${box(COIL[0] - 1, COIL[1] - 4.4, B.zb, COIL[0] + 1.4, COIL[1] - 2.6, B.zb + 2, METAL, toneI, 0.7)}</g>`;
  for (const d of F.bounced) s += `<g data-plug="bounced">${capsule([colX(d) + 3, 20, B.zb], 'bounced', true)}</g>`;
  for (const d of F.caught) s += `<g data-plug="caught">${capsule([colX(d) + 3, 22.5, B.zb], 'wrong')}</g>`;
  if (F.holdCord === 'in' && F.hold.length === 2) {
    const [a, b] = F.hold.map(colX);
    s += cordSvg(
      [
        [a, FACE, Z.jack],
        [a + 1, FACE + 2, Z.jack - 6],
        [(a + b) / 2, FACE + 3, Z.jack - 8],
        [b - 1, FACE + 2, Z.jack - 6],
        [b, FACE, Z.jack],
      ],
      PALS.mustard.l,
      ' data-hold="1"',
    );
  } else if (F.holdCord === 'dropped' && F.hold.length === 2) {
    const a = colX(F.hold[0]);
    s += cordSvg(
      [
        [a, FACE, Z.jack],
        [a + 1, FACE + 2, B.zb + 0.6],
        [a + 6, 22, B.zb + 0.6],
      ],
      PALS.mustard.l,
      ' data-hold="dropped"',
    );
  }
  return s;
}

function boardArt(F: Face, tops: string) {
  let s = box(B.x0, B.y0, BH, B.x1, B.yb, B.zb, WOOD, toneI, 1.4);
  s += box(B.x0, B.y0, B.zb, B.x1, B.y1, B.zt, WOOD, toneI, 1.4);
  s += shape(on(PY(FACE - 0.03), rectUV(B.x0 + 2, B.zb + 2, B.x1 - 2, B.zt - 2)), '#efe3c4', 1);
  return `<g data-part="board">${s}${faceSvg(F)}${baseSvg(F)}${tops}</g>`;
}

function deskArt(x0: number, x1: number, y0: number, y1: number, z: number, load: string, part: string) {
  let s = '';
  for (const [lx, ly] of [
    [x0 + 1, y0 + 1],
    [x1 - 3, y0 + 1],
    [x0 + 1, y1 - 3],
    [x1 - 3, y1 - 3],
  ])
    s += box(lx, ly, BH, lx + 2, ly + 2, z - 2, WOOD, toneI, 0.8);
  s += box(x0, y0, z - 2, x1, y1, z, WOOD, toneI, 1.2);
  return `<g data-part="${part}">${s}${load}</g>`;
}

/** Points of a part's footprint, for close-ups and in-picture targets. */
export function partBox(part: SwitchPart | 'panel'): number[][] {
  if (part.startsWith('desk') && part !== 'desk') {
    const x = deskX(Number(part.slice(4)));
    return boxCorners(x - DESK.hw, DESK.y0, BH, x + DESK.hw, DESK.y1, DESK.z + 12);
  }
  switch (part) {
    // the hit targets: the spare cord coil on the base, and the panel (a tap runs the job)
    case 'coil':
      return boxCorners(COIL[0] - 5, COIL[1] - 5, B.zb, COIL[0] + 4, COIL[1] + 5, B.zb + 4);
    case 'panel':
      return boxCorners(colX(1) - 6, B.y1, B.zb + 2, colX(5) + 6, B.y1, B.zt - 2);
    case 'board':
      return boxCorners(B.x0, B.y0, BH, B.x1, B.yb, B.zt);
    case 'lead':
      return boxCorners(LEAD[0] - 16, LEAD[1] - 16, BH, LEAD[0] + 16, LEAD[1] + 16, BH + 31);
    case 'desk':
      return boxCorners(LDESK.x0, LDESK.y0, BH, LDESK.x1, LDESK.y1 + 10, LDESK.z + 10);
    case 'cart':
      return boxCorners(CART.x0, CART.y0, BH, CART.x1, CART.y1, CART.z + 18);
    case 'meter':
      return boxCorners(DIAL.x - 8, B.y0, DIAL.meter - 8, DIAL.x + 8, B.yb, DIAL.meter + 8);
    case 'timer':
      return boxCorners(DIAL.x - 8, B.y0, DIAL.timer - 8, DIAL.x + 8, B.yb, DIAL.timer + 8);
    case 'lamps':
      return boxCorners(colX(1) - 6, B.y0, Z.jack - 4, colX(2) + 6, B.y1 + 4, Z.lamp + 4);
    case 'port':
      return boxCorners(colX(1) - 5, B.y0, B.zb, colX(5) + 5, B.yb, Z.lamp);
    default:
      return boxCorners(TRAY.x0, TRAY.y0, BH, TRAY.x1, TRAY.y1, TRAY.z + 8);
  }
}
/** The plug at the end of a spare cord, as drawn on the coil: the piece a drag lifts. */
export const coilPlug = () =>
  cyl(COIL[0] + 1, COIL[1] - 1, B.zb + 1.5, B.zb + 5, 1.4, PALS.cobalt, toneI, 1, 10) +
  cyl(COIL[0] + 1, COIL[1] - 1, B.zb + 5, B.zb + 7, 0.6, METAL, toneI, 0.8, 8);

/** Where a desk's catalogue pile sits (0 = the lead's desk). */
const pileAt = (d: number): V => (d ? [deskX(d) + 6, 79, DESK.z] : [(LDESK.x0 + LDESK.x1) / 2 + 4, 48, LDESK.z]);
const CART_AT: V = [(CART.x0 + CART.x1) / 2, (CART.y0 + CART.y1) / 2, CART.z];
const spillAt = (d: number): V => (d ? [deskX(d), 89] : [126, 56]);

const pill = (p: V, dy: number, text: string, lit: boolean, k: number, dx = 0) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, k)}</g>`;
const num = (n: number) => n.toLocaleString('en-US');

/** The pills and the step's callout: names at rest, and what the run left behind; mid-motion the run's pills wait for
 * the end. The live stage draws them apart, outside the hand-drawn filter (PillLayer); the share image keeps them in. */
export function switchPills(s: Switch, v: SceneView, moving = false) {
  const phone = !!v.phone,
    out: string[] = [];
  const put = (p: string, at3: V, dy: number, text: string | null, lit = false, dx = 0, callout = true) => {
    const k = pillScale(p, v);
    if (text && k) out.push(pill(at3, dy, text, lit, k, dx));
    if (callout) out.push(sayAt(calloutOf(s.say, v), p, at3, dy - 10, k || 1, phone));
  };
  put('lead', [LEAD[0], LEAD[1], BH + 33], -12, 'LEAD', false, 8);
  put(
    'cart',
    [CART_AT[0], CART_AT[1], CART.z + 10],
    -14,
    s.cart.length ? (phone ? 'CART' : `${s.cart.length} CATALOGUES`) : null,
    false,
    6,
  );
  put('board', [colX(3), B.y0, B.zt], -12, null);
  put('coil', [COIL[0], COIL[1], B.zb + 3], -16, null);
  for (const d of DESKS) put(`desk${d}`, [deskX(d), DESK.y1, DESK.z], 14, null);
  put('desk', [LDESK.x0, LDESK.y1, LDESK.z], 16, null);
  const ran = s.ran && !moving;
  put(
    'meter',
    [DIAL.x, B.y0, DIAL.meter + DIAL.r],
    -14,
    ran && s.tokens !== undefined ? (phone ? 'TOKENS' : `${num(s.tokens)} TOKENS`) : null,
    false,
    -14,
  );
  put(
    'timer',
    [DIAL.x - DIAL.r, FACE, DIAL.timer],
    14,
    s.timer === 'off' ? null : s.timer === 'rang' ? (phone ? 'RANG' : 'TIMER RANG') : 'TIMER',
    s.timer === 'rang',
    -22,
  );
  const holdX = s.hold.length ? (colX(s.hold[0]) + colX(s.hold.at(-1)!)) / 2 : colX(1);
  put('lamps', [holdX, FACE, Z.lamp + 2], -12, ran && s.hold.length && s.timer !== 'rang' ? 'ON HOLD' : null, true);
  const odd = DESKS.find(d => ['bounced', 'wrong', 'caught'].includes(s.plugs[d] ?? ''));
  const portText =
    !ran || !odd
      ? null
      : s.plugs[odd] === 'bounced'
        ? 'BOUNCED'
        : s.plugs[odd] === 'caught'
          ? phone
            ? 'CAUGHT'
            : `CAUGHT ${s.slipped ?? ''}`
          : (s.slipped ?? 'WRONG');
  put('port', [odd ? colX(odd) : colX(3), FACE, Z.port + 3], -22, portText, s.plugs[odd ?? 0] === 'wrong', 0);
  if (ran) {
    const dupD = DESKS.find(d => s.dup[d]);
    if (dupD)
      put(
        `desk${dupD}`,
        [deskX(dupD) + 6, 79, DESK.z + 4],
        -18,
        phone ? 'SAME' : `SAME AS ${s.dup[dupD]}`,
        true,
        0,
        false,
      );
    if (s.spilled) {
      const p = spillAt(s.spillDesk);
      const k = pillScale(s.spillDesk ? `desk${s.spillDesk}` : 'desk', v);
      if (k) out.push(pill([p[0], p[1], BH], 14, phone ? 'UNREAD' : `${s.spilled} UNREAD`, true, k));
    }
  }
  const rep =
    s.report === 'done'
      ? phone
        ? 'DONE'
        : `REPORT · ${s.minutes} MIN`
      : s.report === 'gap'
        ? phone
          ? 'GAPS'
          : `${s.missing ?? 0} MISSING`
        : s.report === 'wrong'
          ? phone
            ? 'WRONG'
            : 'WRONG PRICE'
          : s.report === 'waiting'
            ? phone
              ? 'NONE'
              : 'NO REPORT'
            : null;
  put('report', [(TRAY.x0 + TRAY.x1) / 2, TRAY.y1, TRAY.z], 18, ran ? rep : null, s.report !== 'done', -6);
  return out.filter(Boolean).join('');
}

/** Everything that changes with a run, at its place for this moment. */
interface Drawn {
  cords: Record<number, number>; // desk → how much of its cord is laid, 0..1
  piles: { d: number; at: V; cols: number[] }[];
  cart: number[];
  spill: { d: number; n: number } | null;
  face: Face;
  flying: { at: V; kind: PlugKind; square: boolean }[];
  sheet: number | null; // 0..1 from the lead to the tray, null: none
  report: Switch['report'];
}

function faceOf(s: Switch, done: boolean): Face {
  const lamps: Face['lamps'] = {},
    knobs: Face['knobs'] = {};
  for (const d of s.wired) {
    const k = done ? s.plugs[d] : undefined;
    lamps[d] = k === 'held' ? 'hold' : k ? 'ok' : 'off';
    knobs[d] = k;
  }
  return {
    lamps,
    knobs,
    plugged: s.wired,
    hold: s.hold,
    holdCord: done && s.hold.length ? (s.timer === 'rang' ? 'dropped' : 'in') : 'none',
    bounced: done ? s.wired.filter(d => s.plugs[d] === 'bounced') : [],
    caught: done ? s.wired.filter(d => s.plugs[d] === 'caught') : [],
    needle: done && s.tokens ? Math.min(1, s.tokens / 60000) : 0,
    timer: s.timer === 'rang' && done ? 1 : 0,
    timerSet: s.timer !== 'off',
  };
}

const rest = (s: Switch): Drawn => ({
  cords: Object.fromEntries(s.wired.map(d => [d, 1])),
  piles: s.ran ? s.piles.map((cols, d) => ({ d, at: pileAt(d), cols })).filter(p => p.cols.length) : [],
  cart: s.ran ? s.cart : allOnCart(s),
  spill: s.ran && s.spilled ? { d: s.spillDesk, n: s.spilled } : null,
  face: faceOf(s, s.ran),
  flying: [],
  sheet: s.ran && s.report !== 'waiting' && s.report !== 'none' ? 1 : null,
  report: s.report,
});
/** Before a run every catalogue the job reads waits on the cart (copies included once). */
const allOnCart = (s: Switch) => {
  const n = s.piles.reduce((k, p, d) => k + (s.dup[d] ? 0 : p.length), 0) + s.cart.length + s.spilled;
  return Array.from({ length: n }, (_, i) => Math.floor((i * PAL.length) / Math.max(1, n)) % PAL.length);
};

/** The whole picture for these moving parts' places. */
function art(s: Switch, v: SceneView, d: Drawn, layer: 'all' | 'setting' | 'moving') {
  return (ctx: SceneCtx) => {
    const lead = modelMachine(LEAD[0], LEAD[1], LEAD_K, s.ran ? s.lead : undefined);
    const ines = person({ x: INES[0], y: INES[1], facing: 110, look: 'ines', holding: null });
    const helpers = DESKS.map(dk =>
      modelMachine(
        deskX(dk) - 5,
        77,
        0.42,
        s.wired.includes(dk) ? (s.ran ? (s.plugs[dk] === 'held' ? 'warn' : 'ok') : undefined) : undefined,
        undefined,
        {
          z: DESK.z,
          pal: s.wired.includes(dk) ? PALS.blush : METAL,
        },
      ),
    );
    const dyn = layer !== 'setting',
      fixed = layer !== 'moving';
    // cords: laid ones in the still (the floor run under everything, the top over the base); one being laid moves
    let floorCords = '',
      tops = '';
    const laid = s.wired.filter(w => (d.cords[w] ?? 0) >= 1);
    for (const [k, u] of Object.entries(d.cords)) {
      const dk = Number(k),
        { top, floor } = cordPts(dk),
        col = palOf(dk - 1).l;
      if (u >= 1 && fixed) {
        floorCords += cordSvg(floor, col, ` data-cord="${dk}"`);
        tops += cordSvg(top, col);
      } else if (u < 1 && dyn)
        floorCords += cordSvg(cut([...top, ...floor.slice(1)], u), col, ` data-cord="${dk}" data-laying="1"`);
    }
    const face = dyn ? d.face : faceOf({ ...s, wired: laid }, false);
    const pileOn = (dk: number) =>
      d.piles
        .filter(p => p.d === dk)
        .map(p => pile(p.at[0], p.at[1], p.at[2], p.cols))
        .join('');
    const jack = (dk: number) =>
      box(deskX(dk) + 7.5, DESK.y0 + 0.8, DESK.z, deskX(dk) + 10.5, DESK.y0 + 3, DESK.z + 2.2, DARK, toneI, 0.7);
    const items: Item[] = [];
    if (fixed || dyn) {
      items.push({
        box: [
          [B.x0, B.y0, BH],
          [B.x1, B.yb, B.zt],
        ],
        svg: layer === 'moving' ? `<g>${faceSvg(face)}${baseSvg(face)}</g>` : boardArt(face, tops),
      });
    }
    if (fixed) {
      items.push(...lead.items.map(i => ({ ...i, svg: `<g data-part="lead">${i.svg}</g>` })), ...ines.items);
      items.push({
        box: [
          [LDESK.x0, LDESK.y0, BH],
          [LDESK.x1, LDESK.y1, LDESK.z],
        ],
        svg: deskArt(LDESK.x0, LDESK.x1, LDESK.y0, LDESK.y1, LDESK.z, layer === 'all' ? pileOn(0) : '', 'desk'),
      });
      for (const dk of DESKS) {
        const x = deskX(dk);
        items.push({
          box: [
            [x - DESK.hw, DESK.y0, BH],
            [x + DESK.hw, DESK.y1, DESK.z],
          ],
          svg: deskArt(x - DESK.hw, x + DESK.hw, DESK.y0, DESK.y1, DESK.z, jack(dk), `desk${dk}`),
        });
        items.push(...helpers[dk - 1].items.map(i => ({ ...i, svg: `<g data-helper="${dk}">${i.svg}</g>` })));
        if (layer === 'all' && pileOn(dk))
          items.push({
            box: [
              [x + 2, 76, DESK.z],
              [x + 10, 82, DESK.z + 6],
            ],
            svg: pileOn(dk),
          });
      }
      let cartSvg = box(CART.x0, CART.y0, CART.z - 2, CART.x1, CART.y1, CART.z, METAL, toneI, 1.1);
      for (const [wx, wy] of [
        [CART.x0 + 2, CART.y0 + 2],
        [CART.x1 - 2, CART.y0 + 2],
        [CART.x0 + 2, CART.y1 - 2],
        [CART.x1 - 2, CART.y1 - 2],
      ])
        cartSvg +=
          cyl(wx, wy, BH, BH + 2.4, 1.6, DARK, toneI, 0.8, 10) +
          rod([wx, wy, BH + 2], [wx, wy, CART.z - 2], 0.5, METAL);
      cartSvg +=
        rod([CART.x1, CART.y0 + 2, CART.z], [CART.x1 + 2, CART.y0 + 2, CART.z + 12], 0.7, METAL) +
        rod([CART.x1, CART.y1 - 2, CART.z], [CART.x1 + 2, CART.y1 - 2, CART.z + 12], 0.7, METAL) +
        rod([CART.x1 + 2, CART.y0 + 2, CART.z + 12], [CART.x1 + 2, CART.y1 - 2, CART.z + 12], 0.8, METAL);
      if (layer === 'all') cartSvg += pile(CART_AT[0], CART_AT[1], CART.z, d.cart);
      items.push({
        box: [
          [CART.x0, CART.y0, BH],
          [CART.x1 + 2, CART.y1, CART.z + 12],
        ],
        svg: `<g data-part="cart">${cartSvg}</g>`,
      });
      let traySvg = '';
      if (layer === 'all' && d.sheet !== null)
        traySvg = sheet([(TRAY.x0 + TRAY.x1) / 2, (TRAY.y0 + TRAY.y1) / 2, TRAY.z], d.report);
      items.push({
        box: [
          [TRAY.x0, TRAY.y0, BH],
          [TRAY.x1, TRAY.y1, TRAY.z],
        ],
        svg: deskArt(TRAY.x0, TRAY.x1, TRAY.y0, TRAY.y1, TRAY.z, traySvg, 'report'),
      });
    }
    if (layer === 'moving') {
      // the board's live face over the still board, then everything in flight, over the setting
      let s2 = floorCords + byDepth(items);
      for (const p of d.piles) s2 += pile(p.at[0], p.at[1], p.at[2], p.cols);
      s2 += pile(CART_AT[0], CART_AT[1], CART.z, d.cart);
      if (d.spill) s2 += spill(...(spillAt(d.spill.d) as [number, number]), d.spill.n);
      for (const fl of d.flying) s2 += capsule(fl.at, fl.kind, fl.square);
      if (d.sheet !== null) {
        const from: V = [LEAD[0] + 16, LEAD[1] + 4, BH + 18],
          to: V = [(TRAY.x0 + TRAY.x1) / 2, (TRAY.y0 + TRAY.y1) / 2, TRAY.z],
          p = lerpPt(from, to, d.sheet);
        s2 += sheet([p[0], p[1], p[2] + 10 * Math.sin(Math.PI * d.sheet)], d.sheet >= 1 ? d.report : 'none');
      }
      return s2;
    }
    const shadow =
      layer === 'all' || layer === 'setting'
        ? castShadow(boxCorners(B.x0, B.y0, BH, B.x1, B.yb, B.zt), BH, ctx.top) +
          castShadow(boxCorners(CART.x0, CART.y0, BH, CART.x1, CART.y1, CART.z), BH, ctx.top) +
          lead.shadow +
          ines.shadow
        : '';
    const floor =
      floorCords + (layer === 'all' && d.spill ? spill(...(spillAt(d.spill.d) as [number, number]), d.spill.n) : '');
    return shadow + floor + byDepth(items) + (s.bare ? '' : switchPills(s, v, layer !== 'all'));
  };
}

/** The report sheet: a cream page with a seal (mint: complete; tomato: gaps or a wrong price). */
function sheet(p: V, report: Switch['report']) {
  const [x, y, z] = p;
  let s = shape(
    [
      [x - 5, y - 4, z + 0.2],
      [x + 5, y - 4, z + 0.2],
      [x + 5, y + 4, z + 0.2],
      [x - 5, y + 4, z + 0.2],
    ],
    CERAMIC.l,
    0.8,
  );
  for (let i = 0; i < 4; i++)
    s += shape(
      [
        [x - 3.6, y - 3 + i * 1.6, z + 0.25],
        [x + 1.5, y - 3 + i * 1.6, z + 0.25],
        [x + 1.5, y - 2.4 + i * 1.6, z + 0.25],
        [x - 3.6, y - 2.4 + i * 1.6, z + 0.25],
      ],
      report === 'gap' && i === 2 ? CERAMIC.l : DARK.l,
      0,
    );
  if (report !== 'none')
    s += cyl(x + 3, y + 2, z + 0.25, z + 0.7, 1.6, report === 'done' ? PALS.mint : PALS.tomato, toneI, 0.8, 12);
  return `<g data-report="${report}">${s}</g>`;
}

/** The picture at rest: what the stage shows for state s with no motion (the share image too). */
export const switchStill = (s: Switch, v: SceneView = { zoomT: 0 }) => art(s, v, rest(s), 'all');

/** Whether going from prev to s moves anything (a callout alone doesn't). */
export const switchMoves = (prev: Switch, s: Switch) => {
  const { say: _a, ...a } = prev,
    { say: _b, ...b } = s;
  return JSON.stringify(a) !== JSON.stringify(b);
};

/** Multi-agent's living scene. New cords snake from the board to their desks; a run sends the piles from the cart to
 * the desks, the replies up the cords to the ports (a square plug springs back, then its resend seats), the timer
 * sweeps and drops the hold cord, and the report slides onto Ines's tray. */
export const switchScene: Scene<Switch> = (prev, s, t, v) => {
  if (t >= 1 || !switchMoves(prev, s)) return { still: switchStill(s, v), moving: '' };
  const A = rest(prev),
    Bz = rest(s);
  const d: Drawn = { ...Bz, flying: [], face: faceOf(s, false), sheet: null, piles: [], spill: null, cart: Bz.cart };
  // cords: new ones are laid over the first part of the motion; old ones stay
  const cordT = s.ran && !prev.ran && s.wired.every(w => prev.wired.includes(w)) ? 1 : ph(t, 0, 0.35);
  d.cords = Object.fromEntries(s.wired.map(w => [w, prev.wired.includes(w) ? 1 : cordT]));
  if (!s.ran || prev.ran) {
    // no run starting: a change of cords or setup (or a re-run's end state) lands as the cords finish
    const done = t > 0.35;
    return {
      still: art(s, v, d, 'setting'),
      moving: art(
        s,
        v,
        {
          ...(done
            ? Bz
            : {
                ...d,
                cart: A.cart,
                face: faceOf({ ...s, wired: s.wired.filter(w => prev.wired.includes(w)) }, false),
              }),
          cords: d.cords,
          flying: [],
        },
        'moving',
      ),
    };
  }
  // a run: piles fly 0.05–0.35, the spill drops 0.35–0.5, replies travel 0.45–0.8 (the timer first, when it rings),
  // the report slides 0.82–1
  const timed = s.timer === 'rang';
  const [r0, r1] = timed ? [0.6, 0.82] : [0.45, 0.8];
  const piles: Drawn['piles'] = [];
  s.piles.forEach((cols, dk) => {
    if (!cols.length) return;
    const u = ph(t, 0.05 + dk * 0.03, 0.3 + dk * 0.01),
      p = lerpPt(CART_AT, pileAt(dk), u);
    piles.push({ d: dk, at: [p[0], p[1], p[2] + 16 * Math.sin(Math.PI * u)], cols });
  });
  d.piles = piles;
  const left = Math.max(s.cart.length, Math.round(A.cart.length * (1 - ph(t, 0.05, 0.3))));
  d.cart = A.cart.slice(0, left);
  if (s.spilled && t > 0.35) d.spill = { d: s.spillDesk, n: Math.ceil(s.spilled * ph(t, 0.35, 0.5)) };
  const face = faceOf(s, false);
  if (s.hold.length && t > 0.4) {
    face.lamps = { ...face.lamps, ...Object.fromEntries(s.hold.map(h => [h, 'hold'])) };
    face.holdCord = 'in';
  }
  if (timed) {
    face.timer = ph(t, 0.4, 0.58);
    if (t > 0.58) face.holdCord = 'dropped';
  }
  const flying: Drawn['flying'] = [];
  for (const dk of s.wired) {
    const k = s.plugs[dk];
    if (!k || k === 'held') continue;
    const { top, floor } = cordPts(dk),
      path = [...floor.slice().reverse(), ...top.slice().reverse().slice(1), [colX(dk), FACE + 1.5, Z.port - 1.3]];
    const u = ph(t, r0, r1);
    if (k === 'bounced') {
      // the square plug reaches the port by 60% of the leg, springs back onto the base; the round resend follows
      if (u < 0.55) flying.push({ at: at(path, u / 0.55), kind: k, square: true });
      else if (u < 0.7)
        flying.push({ at: lerpPt(at(path, 1), [colX(dk) + 3, 20, B.zb], (u - 0.55) / 0.15), kind: k, square: true });
      else {
        face.bounced.push(dk);
        if (u < 1) flying.push({ at: at(path, (u - 0.7) / 0.3), kind: 'ok', square: false });
      }
    } else if (u < 1 && u > 0) flying.push({ at: at(path, u), kind: k, square: false });
    if (u >= 1) {
      face.knobs[dk] = k;
      face.lamps[dk] = 'ok';
      if (k === 'caught') face.caught.push(dk);
    }
  }
  if (t > r1) face.needle = s.tokens ? Math.min(1, s.tokens / 60000) * ph(t, r1, 1) : 0;
  d.face = face;
  d.flying = flying;
  d.sheet = s.report !== 'waiting' && t > 0.82 ? ph(t, 0.82, 1) : null;
  d.spill = d.spill ?? null;
  return { still: art(s, v, d, 'setting'), moving: art(s, v, d, 'moving') };
};

/** The picture in words, for its aria-label. */
export function switchLabel(s: Switch): string {
  const n = s.wired.length;
  const who = n ? `${n} helper desk${n > 1 ? 's' : ''} wired to the board by patch cords` : 'no helper desks wired yet';
  const what = !s.ran
    ? `${allOnCart(s).length} catalogues wait on the cart.`
    : s.report === 'waiting'
      ? `Lamps ${s.hold.join(' and ')} blink on hold, each helper waiting for the other; no report has arrived.`
      : s.report === 'done'
        ? `The report lies complete on Ines's tray after ${s.minutes} minutes.`
        : s.report === 'gap'
          ? `The report on Ines's tray is missing ${s.missing} catalogues.`
          : `The report on Ines's tray carries a wrong price, ${s.slipped}.`;
  return `Larkspur's back office: the lead agent at a cord switchboard, ${who}. ${what}`;
}
