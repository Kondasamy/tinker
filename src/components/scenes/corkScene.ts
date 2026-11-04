// Memory's picture: Larkspur's support room with a cork board on an easel (docs/modules/agent-memory.md). Source
// papers (the handbook, the order system, each customer's chats, a web page) are pinned along the board's top; memory
// cards hang below, each tied by red thread to the paper it came from, or to the card it was learnt from. Pulling a
// paper's thread drops it and every card hanging from it into the bin beside the easel. The assistant (the kit's model
// machine) and the support lead stand by; in chapter 1 a side table holds the chat's candidate cards.
// A living scene (KTD2): scene(prev, state, t, view) → { still, moving }; at t = 1 everything is in the still. Words
// only in pills; every string reaching SVG goes through esc().
import { type Board, type SceneCtx, stageFrame } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt, sayFits } from '../../lib/iso/blocks';
import { drawPieces, mini, modelMachine, person } from '../../lib/iso/figures';
import {
  CERAMIC,
  DARK,
  METAL,
  PALS,
  WOOD,
  box,
  byDepth,
  castShadow,
  ellUV,
  on,
  PZ,
  pd,
  rod,
  shape,
  tag,
  toneI,
  P,
  loft,
} from '../../lib/iso/core.js';
import { calloutOf, lerpPt, pillScale, type Scene, type SceneView } from '../../lib/iso/motion';
import type { Say } from '../story/steps';

export const CORK_BOARD: Board = [26, 8, 106, 132];
/** The parts a step's callout or close-up may name: the lit source paper, the lit cards, the bin. */
export const CORK_PARTS = ['board', 'source', 'card', 'bin', 'tray', 'model'] as const;
export type CorkPart = (typeof CORK_PARTS)[number];

/** Whose card it is, by colour: a customer, the store, or the attacker. */
export type Tone = 'ada' | 'ben' | 'cara' | 'dan' | 'store' | 'web';
/** What a source paper looks like: a staff printout, a customer's chat, a web page. */
export type Paper = 'staff' | 'customer' | 'web';
export interface CorkSource {
  id: string;
  short: string;
  paper: Paper;
  /** pinned along the top, or pulled into the bin */
  at: 'board' | 'bin';
  lit?: boolean;
  /** the page was taken down: the paper turns grey, its threads stay */
  gone?: boolean;
  /** its fixed column along the top, so a paper pinned later shifts nothing (default: centred by its place) */
  col?: number;
  /** a customer's chats: the colour of that customer's cards, on its second bubble */
  tone?: Tone;
}
export interface CorkCard {
  id: string;
  label: string;
  tone: Tone;
  /** a source id or a card id: what its thread ties to */
  from: string;
  at: 'tray' | 'board' | 'bin';
  /** board slot (0–15) or tray place (0–11); in the bin, its place in the pile */
  slot: number;
  /** its order in the month (default: slot): the order cards hang in under their paper */
  rank?: number;
  /** a pill kept on it in the bin (what fell, or why) */
  note?: string;
  lit?: boolean;
}
export interface Cork {
  sources: CorkSource[];
  cards: CorkCard[];
  /** the side table with chapter 1's candidates */
  tray?: boolean;
  /** cards whose place on the board stays empty after they fall, so nothing below them slides up */
  hold?: string[];
  say?: Say;
}

const TONES: Record<Tone, { l: string; m: string; d: string }> = {
  ada: PALS.mustard,
  ben: PALS.cobalt,
  cara: PALS.mint,
  dan: PALS.blush,
  store: { l: '#e9e4f5', m: '#b39ddb', d: '#3a2f52' },
  // whatever a web page taught, whoever it is about
  web: { l: '#f7a35c', m: '#d9853f', d: '#4d2a12' },
};
const CORK = { l: '#d9a86c', m: '#c48f52', d: '#7a5530' };
const RED = '#c62f2a',
  GLOW = 'var(--accent,#f4b829)';

// the board: a cork face on the plane x = BX, facing the viewer's right
const BX = 48,
  Y0 = 26,
  Y1 = 122,
  Z0 = BH + 12,
  Z1 = BH + 64;
const FACE_X = BX + 0.25;
// papers along the top, one per column; each card hangs in its own paper's column (spilling to the nearest column
// with room), NC columns of NR rows
const NC = 7,
  NR = 4,
  PITCH = (Y1 - Y0 - 6) / NC;
const PW = 5.6,
  PH = 6,
  PZ0 = Z1 - 8; // a paper's half-width, half-height, centre height
const CW = PITCH / 2 - 0.9,
  CH = 3.2, // a card's half-width (along y) and half-height
  ZTOP = PZ0 - PH - 3 - CH,
  GZ = (ZTOP - (Z0 + 3 + CH)) / (NR - 1);
// a card lying on the table or in the bin
const LW = 7.4,
  LH = 4;
const BIN = { x: 70, y: 88, r: 11, h: 15 };
const TABLE = { x0: 84, x1: 104, y0: 44, y1: 76, z: BH + 18 };
const MODEL = [80, 22],
  LEAD = [74, 122];

type V = number[];
interface Pose {
  c: V;
  u: V;
  v: V;
}
const add = (a: V, b: V, k = 1) => a.map((x, i) => x + b[i] * k);
const corners = (p: Pose) => [
  add(add(p.c, p.u, -1), p.v, -1),
  add(add(p.c, p.u), p.v, -1),
  add(add(p.c, p.u), p.v),
  add(add(p.c, p.u, -1), p.v),
];

/** A column's centre along the board (column 0 on the viewer's left). */
const colY = (col: number) => Y1 - 3 - PITCH * (col + 0.5);
/** The column of the i-th of n papers: centred along the top. */
const paperCol = (i: number, n: number) => i + Math.floor((NC - n) / 2);
const colOf = (src: CorkSource, i: number, n: number) => src.col ?? paperCol(i, n);
const paperAt = (col: number): V => [FACE_X + 0.3, colY(col), PZ0 + (col % 2 ? -1 : 1)];
const cellAt = (col: number, row: number): V => [FACE_X + 0.2, colY(col), ZTOP - row * GZ];

const LAYOUT = new WeakMap<Cork, Map<string, V>>();
/** Where each card on the board hangs: under its own paper (its thread's root), top down, in arrival (slot) order; a
 * full column spills to the nearest column with room. Worked out from the whole board, once per state. */
function cellsOf(s: Cork): Map<string, V> {
  const hit = LAYOUT.get(s);
  if (hit) return hit;
  const n = s.sources.length,
    used = Array.from({ length: NC }, () => 0),
    out = new Map<string, V>();
  const rootOf = (c: CorkCard) => {
    let from = c.from;
    for (let i = 0; i <= s.cards.length; i++) {
      const parent = s.cards.find(x => x.id === from);
      if (!parent) return from;
      from = parent.from;
    }
    return from;
  };
  const up = s.cards.filter(c => c.at === 'board' || s.hold?.includes(c.id));
  s.sources.forEach((src, i) => {
    const home = colOf(src, i, n);
    for (const c of up.filter(x => rootOf(x) === src.id).sort((a, b) => (a.rank ?? a.slot) - (b.rank ?? b.slot))) {
      const cols = [...Array(NC).keys()].sort((a, b) => Math.abs(a - home) - Math.abs(b - home) || a - b);
      const col = cols.find(k => used[k] < NR) ?? home;
      out.set(c.id, cellAt(col, used[col]++));
    }
  });
  LAYOUT.set(s, out);
  return out;
}
const upright = (c: V, hw: number, hh: number): Pose => ({ c, u: [0, hw, 0], v: [0, 0, hh] });
const lying = (c: V, hw: number, hh: number, turn = 0): Pose => {
  const a = (turn * Math.PI) / 180;
  return { c, u: [hw * Math.sin(a), hw * Math.cos(a), 0], v: [hh * Math.cos(a), -hh * Math.sin(a), 0] };
};
/** A card's pose where it rests: on the board, on the side table, or in the bin's pile. */
function cardPose(c: CorkCard, s: Cork): Pose {
  if (c.at === 'board') return upright(cellsOf(s).get(c.id) ?? cellAt(0, 0), CW, CH);
  if (c.at === 'tray') {
    const col = c.slot % 2,
      row = Math.floor(c.slot / 2);
    return lying([TABLE.x0 + 4.5 + row * 2.3, TABLE.y0 + 9 + col * 16, TABLE.z + 0.3 + row * 0.15], LW, LH, 0);
  }
  return binPose(c.slot, LW * 0.7, LH * 0.9);
}
const JIT = [
  [0, 0, 8],
  [2, -2, -24],
  [-2, 2, 40],
  [1, 3, -60],
  [-3, -1, 70],
  [3, 1, 15],
];
const binPose = (k: number, hw: number, hh: number) => {
  const [dx, dy, a] = JIT[k % JIT.length];
  return lying([BIN.x + dx, BIN.y + dy, BH + BIN.h - 5 + Math.min(k, 24) * 0.3], hw, hh, a);
};
const paperPose = (s: CorkSource, col: number, binAt: number): Pose =>
  s.at === 'board' ? upright(paperAt(col), PW, PH) : binPose(binAt, PW * 0.8, PH * 0.8);

/** A pin at the top middle of an upright piece (where its thread ties). */
const pinOf = (p: Pose, top: boolean): V => add(add(p.c, p.v, top ? 0.72 : -0.72), [0.4, 0, 0]);

function cardArt(c: CorkCard, p: Pose, pin: boolean) {
  const m = TONES[c.tone],
    q = corners(p);
  let s = '';
  if (c.lit) s += `<path d="${pd(q)}" fill="none" stroke="${GLOW}" stroke-width="4.5" stroke-linejoin="round"/>`;
  s += shape(q, m.l, c.lit ? 1.8 : 0.9);
  // a header band and two scribbled lines: text-free
  const at = (a: number, b: number) => add(add(p.c, p.u, a), p.v, b);
  s += shape([at(-1, 1), at(1, 1), at(1, 0.55), at(-1, 0.55)], m.m, 0);
  s += `<path d="${pd([at(-0.75, 0.1), at(0.7, 0.1)], false)} ${pd([at(-0.75, -0.4), at(0.35, -0.4)], false)}" stroke="${m.d}" stroke-width=".55" fill="none" stroke-linecap="round"/>`;
  if (pin) s += pinArt(pinOf(p, true));
  return `<g data-card="${esc(c.id)}" data-at="${c.at}"${c.lit ? ' data-lit="1"' : ''}>${s}</g>`;
}
const pinArt = (at: V) =>
  `<path d="${pd([add(at, [0, -0.9, 0]), add(at, [0, 0, 0.9]), add(at, [0, 0.9, 0]), add(at, [0, 0, -0.9])])}" fill="${RED}" stroke="#231e16" stroke-width=".5"/>`;

function paperArt(s: CorkSource, p: Pose, pin: boolean) {
  const q = corners(p),
    at = (a: number, b: number) => add(add(p.c, p.u, a), p.v, b);
  const base = s.gone ? '#bdb8a6' : s.paper === 'web' ? '#cfd8ea' : CERAMIC.l;
  let out = '';
  if (s.lit) out += `<path d="${pd(q)}" fill="none" stroke="${GLOW}" stroke-width="4.5" stroke-linejoin="round"/>`;
  out += shape(q, base, s.lit ? 1.8 : 0.9);
  if (s.paper === 'web') {
    // a browser bar across the top, and a picture block
    out += shape([at(-1, 1), at(1, 1), at(1, 0.7), at(-1, 0.7)], s.gone ? DARK.l : PALS.cobalt.m, 0.5);
    out += shape(
      [at(-0.7, 0.45), at(0.1, 0.45), at(0.1, -0.15), at(-0.7, -0.15)],
      s.gone ? CERAMIC.d : PALS.blush.l,
      0.4,
    );
  } else if (s.paper === 'customer') {
    // a chat: two speech bubbles
    out += shape([at(-0.75, 0.75), at(0.35, 0.75), at(0.35, 0.3), at(-0.75, 0.3)], CERAMIC.m, 0.4);
    out += shape(
      [at(-0.3, 0.05), at(0.78, 0.05), at(0.78, -0.4), at(-0.3, -0.4)],
      s.tone ? TONES[s.tone].l : PALS.mint.l,
      0.4,
    );
  } else {
    // a staff printout: ruled bands
    for (const b of [0.6, 0.15, -0.3])
      out += shape([at(-0.8, b), at(0.8, b), at(0.8, b - 0.2), at(-0.8, b - 0.2)], PALS.mint.l, 0);
  }
  if (s.gone)
    out += `<path d="${pd([at(-0.9, 0.9), at(0.9, -0.9)], false)} ${pd([at(0.9, 0.9), at(-0.9, -0.9)], false)}" stroke="${DARK.m}" stroke-width=".9" fill="none"/>`;
  if (pin) out += pinArt(pinOf(p, true));
  return `<g data-source="${esc(s.id)}" data-at="${s.at}"${s.lit ? ' data-lit="1"' : ''}${s.gone ? ' data-gone="1"' : ''}>${out}</g>`;
}

/** A red thread from a card's pin up to what it hangs from, sagging a little. */
function thread(a: V, b: V, lit: boolean) {
  const mid = [
    (a[0] + b[0]) / 2 + 0.6,
    (a[1] + b[1]) / 2,
    (a[2] + b[2]) / 2 - 1.2 - Math.hypot(a[1] - b[1], a[2] - b[2]) * 0.03,
  ];
  const d = pd([a, mid, b], false);
  return (
    (lit ? `<path d="${d}" fill="none" stroke="${GLOW}" stroke-width="3.2" stroke-linecap="round"/>` : '') +
    `<path d="${d}" fill="none" stroke="${RED}" stroke-width="${lit ? 1.4 : 0.75}" stroke-linecap="round"/>`
  );
}

/** Where each source sits: its place among the papers, and its pose. */
function papersOf(s: Cork) {
  const n = s.sources.length;
  let binK = 0;
  const cardsIn = s.cards.filter(c => c.at === 'bin').length;
  return s.sources.map((src, i) => ({
    src,
    col: colOf(src, i, n),
    pose: paperPose(src, colOf(src, i, n), src.at === 'bin' ? cardsIn + binK++ : 0),
  }));
}
/** The thread end a card ties to: its parent card's pin, or its paper's pin. */
function anchorOf(s: Cork, c: CorkCard, poses: Map<string, Pose>): { at: V; lit: boolean } | null {
  const parent = s.cards.find(x => x.id === c.from);
  if (parent)
    return parent.at === 'board' ? { at: pinOf(poses.get(parent.id)!, true), lit: !!(c.lit && parent.lit) } : null;
  const src = s.sources.find(x => x.id === c.from);
  if (src?.at !== 'board') return null;
  return { at: pinOf(poses.get(src.id)!, false), lit: !!(c.lit && src.lit) };
}

function easelArt(inner: string) {
  // two front legs, one back leg, a ledge under the cork, the frame, the cork face, then what is pinned to it
  let s = rod([BX + 18, Y0 + 8, BH], [BX + 1, Y0 + 10, Z1 - 4], 1.4, WOOD, toneI, 1.2);
  s += rod([BX + 18, Y1 - 8, BH], [BX + 1, Y1 - 10, Z1 - 4], 1.4, WOOD, toneI, 1.2);
  s += rod([BX - 14, (Y0 + Y1) / 2, BH], [BX - 1, (Y0 + Y1) / 2, Z1 - 6], 1.2, WOOD, toneI, 1);
  s += box(BX - 2.2, Y0 - 2.5, Z0 - 2.5, BX, Y1 + 2.5, Z1 + 2.5, WOOD, toneI, 1.6);
  s += shape(
    [
      [FACE_X, Y0, Z0],
      [FACE_X, Y1, Z0],
      [FACE_X, Y1, Z1],
      [FACE_X, Y0, Z1],
    ],
    CORK.l,
    0.8,
  );
  s += box(BX, Y0 - 1, Z0 - 4.5, BX + 5, Y1 + 1, Z0 - 2.5, WOOD, toneI, 1.1);
  return `<g data-part="board">${s}${inner}</g>`;
}

function binArt(contents: string) {
  const ring = (z: number, r: number) => on(PZ(z), ellUV(BIN.x, BIN.y, r, r, 22));
  const A = ring(BH, BIN.r - 2),
    B = ring(BH + BIN.h, BIN.r);
  const floor = shape(ring(BH + 0.4, BIN.r - 2.2), DARK.m, 0);
  const shell =
    loft(A, B, (n: number[]) => toneI(n, METAL), true) +
    floor +
    contents +
    loft(A, B, (n: number[]) => toneI(n, METAL));
  return `<g data-part="bin">${shell}<path d="${pd(B)}" fill="none" stroke="#231e16" stroke-width="1.3"/></g>`;
}

function tableArt(load: string) {
  const { x0, x1, y0, y1, z } = TABLE;
  let s = '';
  for (const [lx, ly] of [
    [x0 + 2, y0 + 2],
    [x1 - 4, y0 + 2],
    [x0 + 2, y1 - 4],
    [x1 - 4, y1 - 4],
  ])
    s += box(lx, ly, BH, lx + 2, ly + 2, z - 2, WOOD, toneI, 0.8);
  s += box(x0, y0, z - 2, x1, y1, z, WOOD, toneI, 1.3);
  return `<g data-part="tray">${s}${load}</g>`;
}

/** Points of a part's footprint, for close-ups and in-picture targets. */
export function partBox(part: CorkPart | string, s?: Cork): number[][] {
  const papers = s ? papersOf(s) : [];
  const box3 = (pts: V[], pad = 1.5) => {
    const lo = [0, 1, 2].map(k => Math.min(...pts.map(p => p[k])) - pad),
      hi = [0, 1, 2].map(k => Math.max(...pts.map(p => p[k])) + pad);
    return boxCorners(lo[0], lo[1], lo[2], hi[0], hi[1], hi[2]);
  };
  if (part.startsWith('src:')) {
    const p = papers.find(x => x.src.id === part.slice(4));
    return p ? box3(corners(p.pose), 2) : boxCorners(FACE_X, Y0, PZ0 - PH, FACE_X + 1, Y0 + 2 * PW, PZ0 + PH);
  }
  switch (part) {
    case 'board':
      return boxCorners(BX - 2, Y0, Z0, BX + 2, Y1, Z1);
    case 'bin':
      return boxCorners(BIN.x - BIN.r, BIN.y - BIN.r, BH, BIN.x + BIN.r, BIN.y + BIN.r, BH + BIN.h);
    case 'tray':
      return boxCorners(TABLE.x0, TABLE.y0, BH, TABLE.x1, TABLE.y1, TABLE.z + 2);
    case 'model':
      return boxCorners(MODEL[0] - 14, MODEL[1] - 14, BH, MODEL[0] + 14, MODEL[1] + 14, BH + 29);
    case 'source': {
      const lit = papers.filter(p => p.src.lit && p.src.at === 'board');
      return lit.length
        ? box3(
            lit.flatMap(p => corners(p.pose)),
            2,
          )
        : partBox('board');
    }
    case 'card': {
      const lit = (s?.cards ?? []).filter(c => c.lit);
      return lit.length
        ? // with room below for the cards' pill stack (at the close-up's pill scale)
          box3(
            [
              ...lit.flatMap(c => corners(cardPose(c, s!))),
              add(cardPose(lit[0], s!).c, [0, 0, -(stackDrop(lit.length + 1, 2) + CH)]),
            ],
            2,
          )
        : partBox('board');
    }
  }
  return partBox('board');
}

/** How far below the lowest lit card (in screen units) a stack of n pills reaches, at pill scale sc. */
const stackDrop = (n: number, sc: number) => {
  const K = stageFrame(CORK_BOARD).inkK * sc;
  return 9 * K + n * 8.6 * K * 2.1;
};
const pill = (p: V, dy: number, text: string, lit: boolean, k: number, dx = 0) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, k)}</g>`;

/** The pills alone (names, the bin count, the callout), drawn outside the ink filter as a PillLayer on the live
 * stage; mid-motion the lit cards wait to be named. */
export function corkPills(s: Cork, v: SceneView, moving = false) {
  const k = (p: string) => pillScale(p, v),
    phone = !!v.phone,
    out: string[] = [];
  const on2 = (part: string, at: V, dy: number, text: string, lit: boolean, dx = 0, always = true) => {
    const sc = k(part);
    if (sc && always) out.push(pill(at, dy, text, lit, sc, dx));
    out.push(sayAt(calloutOf(s.say, v), part, at, dy - 10, sc || 1, phone));
  };
  const papers = papersOf(s).filter(p => p.src.at === 'board');
  const lit = papers.filter(p => p.src.lit);
  // every paper's name on desktop (staggered); on phones, and while zoomed, only the lit ones
  // staggered by column, high and low in turn, so neighbours' pills never touch
  const stagger = (col: number) => -10 - (col % 2) * 13;
  for (const p of papers) {
    const show = p.src.lit || (!phone && v.zoomT === 0);
    if (!show) continue;
    const sc = k(p.src.lit ? 'source' : 'board');
    if (sc) out.push(pill(add(p.pose.c, p.pose.v), stagger(p.col), p.src.short, !!p.src.lit, sc));
  }
  // the source callout stands above the first lit paper's own pill (or the first paper's), its leader starting at
  // that pill's top so it never runs through the name
  const head = lit[0] ?? papers[0];
  if (head) {
    const sc = k('source') || 1,
      K = stageFrame(CORK_BOARD).inkK * sc;
    const top = add(add(head.pose.c, head.pose.v), [0, 0, (-stagger(head.col) + 8) * K]);
    out.push(sayAt(calloutOf(s.say, v), 'source', top, 0, sc, phone));
  }
  // lit cards name themselves, to the viewer's right of the board
  const litCards = moving ? [] : s.cards.filter(c => c.lit && c.at === 'board');
  // stacked under the lowest lit card, in the board's empty lower rows, a pill's height apart (none covers another
  // or a card), each with a leader from its card's foot; the step's card callout takes the next row
  const sc = k('card') || 1;
  if (litCards.length) {
    const K = stageFrame(CORK_BOARD).inkK * sc,
      fs = 8.6 * K;
    const at = litCards.map(c => {
      const a = add(cardPose(c, s).c, cardPose(c, s).v, -1);
      return { c, a, q: P(...(a as [number, number, number])) };
    });
    const x = at.reduce((t, e) => t + e.q[0], 0) / at.length;
    let y = Math.max(...at.map(e => e.q[1])) + 9 * K + fs;
    if (k('card'))
      for (const e of [...at].sort((m, n) => m.q[0] - n.q[0])) {
        out.push(pill(e.a, (y - e.q[1]) / K, e.c.label, true, sc, (x - e.q[0]) / K));
        y += fs * 2.1;
      }
    const say = calloutOf(s.say, v);
    if (say && sayFits(say, 'card', phone)) {
      const e = at[at.length - 1];
      out.push(
        `<g class="callout" aria-hidden="true" pointer-events="none">${tag(e.a, (x - e.q[0]) / K, (y - e.q[1]) / K, esc(say.text), true, sc)}</g>`,
      );
    }
  }
  // a fallen card that keeps its name in the bin (what fell, or why), to the bin's left
  const noted = s.cards.filter(c => c.at === 'bin' && c.note).at(-1);
  // on phones the larger pill sits right of the bin's centre, clear of a lit card's pill to the left
  if (noted && k('bin'))
    out.push(pill(add(cardPose(noted, s).c, [0, 0, 1]), -26, noted.note!, true, k('bin'), phone ? 14 : -30));
  const inBin = s.cards.filter(c => c.at === 'bin').length;
  on2(
    'bin',
    [BIN.x + BIN.r * 0.7, BIN.y + BIN.r * 0.7, BH + BIN.h * 0.5],
    30,
    phone ? `BIN ${inBin}` : `BIN: ${inBin}`,
    inBin > 0,
    22,
  );
  on2('model', [MODEL[0], MODEL[1], BH + 29], -14, phone ? 'BOT' : 'ASSISTANT', false, 8);
  if (s.tray)
    on2('tray', [TABLE.x1 - 2, (TABLE.y0 + TABLE.y1) / 2, TABLE.z], 28, phone ? 'CHAT' : 'FROM THE CHAT', false, 10);
  on2('board', [BX, Y1, Z0], 30, 'BOARD', false, -8, false);
  return [
    ...out.filter(p => p && !p.startsWith('<g class="callout"')),
    ...out.filter(p => p.startsWith('<g class="callout"')),
  ].join('');
}

/** Each piece's pose at rest. */
function rest(s: Cork) {
  const poses = new Map<string, Pose>();
  for (const p of papersOf(s)) poses.set(p.src.id, p.pose);
  for (const c of s.cards) poses.set(c.id, cardPose(c, s!));
  return poses;
}

/** The pinned layer: papers, then cards, then the threads over them (only what hangs on the board). */
function pinned(s: Cork, poses: Map<string, Pose>, skip: Set<string>) {
  let out = '';
  for (const p of papersOf(s))
    if (p.src.at === 'board' && !skip.has(p.src.id)) out += paperArt(p.src, poses.get(p.src.id)!, true);
  const up = s.cards.filter(c => c.at === 'board' && !skip.has(c.id));
  // lower rows first, so a card's header isn't covered by the row below's threads; lit last
  for (const c of [...up].sort((a, b) => +!!a.lit - +!!b.lit)) out += cardArt(c, poses.get(c.id)!, true);
  for (const c of [...up].sort((a, b) => +!!a.lit - +!!b.lit)) {
    const a = anchorOf(s, c, poses);
    if (a && !skip.has(c.from)) out += thread(pinOf(poses.get(c.id)!, true), a.at, a.lit);
  }
  return out;
}
// the pile bottom up: the cards in the order they fell, then any pulled paper on top
const binned = (s: Cork, poses: Map<string, Pose>, skip: Set<string>) =>
  s.cards
    .filter(c => c.at === 'bin' && !skip.has(c.id))
    .sort((a, b) => a.slot - b.slot)
    .map(c => cardArt({ ...c, lit: false }, poses.get(c.id)!, false))
    .join('') +
  s.sources
    .filter(x => x.at === 'bin' && !skip.has(x.id))
    .map(x => paperArt(x, poses.get(x.id)!, false))
    .join('');
const onTable = (s: Cork, poses: Map<string, Pose>, skip: Set<string>) =>
  s.cards
    .filter(c => c.at === 'tray' && !skip.has(c.id))
    .map(c => cardArt(c, poses.get(c.id)!, false))
    .join('');

function setting(top: SceneCtx['top']) {
  const m = modelMachine(MODEL[0], MODEL[1], 0.8),
    lead = person({ x: LEAD[0], y: LEAD[1], facing: 200, look: 'supportLead' });
  return {
    shadow:
      castShadow(boxCorners(BIN.x - BIN.r, BIN.y - BIN.r, BH, BIN.x + BIN.r, BIN.y + BIN.r, BH + BIN.h), BH, top) +
      m.shadow +
      lead.shadow,
    items: [...m.items.map(i => ({ ...i, svg: `<g data-part="model">${i.svg}</g>` })), ...lead.items],
  };
}

function art(s: Cork, v: SceneView, skip: Set<string>, withPills: boolean) {
  return (ctx: SceneCtx) => {
    const poses = rest(s);
    const set = setting(ctx.top);
    const items = [
      ...set.items,
      {
        box: [
          [BX - 14, Y0 - 3, BH],
          [BX + 18, Y1 + 3, Z1 + 3],
        ],
        svg: easelArt(pinned(s, poses, skip)),
      },
      {
        box: [
          [BIN.x - BIN.r, BIN.y - BIN.r, BH],
          [BIN.x + BIN.r, BIN.y + BIN.r, BH + BIN.h],
        ],
        svg: binArt(binned(s, poses, skip)),
      },
    ];
    if (s.tray)
      items.push({
        box: [
          [TABLE.x0, TABLE.y0, BH],
          [TABLE.x1, TABLE.y1, TABLE.z + 1],
        ],
        svg: tableArt(onTable(s, poses, skip)),
      });
    return set.shadow + byDepth(items) + (withPills ? corkPills(s, v) : '');
  };
}

/** The picture at rest; the share image keeps its pills inline, the live stage draws them apart (corkPills). */
export const corkStill = (s: Cork, v: SceneView = { zoomT: 0 }, withPills = true) => art(s, v, new Set(), withPills);
/** The still with one paper lifted off (while the reader drags it), and that paper as drawn at rest. */
export function corkLift(s: Cork, v: SceneView, id: string) {
  const p = papersOf(s).find(x => x.src.id === id);
  return {
    still: art(s, v, new Set([id]), false),
    // a function: the hook draws it inside the stage's frame, where projected points get the frame's offset
    piece: () => (p ? paperArt(p.src, p.pose, true) : ''),
  };
}

const placeOf = (x: { at: string; slot?: number }) => `${x.at}:${x.slot ?? ''}`;
/** Whether going from prev to s moves a piece (a change of lit or gone alone lands at once). */
export function corkMoves(prev: Cork, s: Cork) {
  const was = new Map([...prev.cards, ...prev.sources].map(x => [x.id, placeOf(x)]));
  return (
    [...s.cards, ...s.sources].some(x => was.has(x.id) && was.get(x.id) !== placeOf(x)) ||
    [...s.cards].some(c => !was.has(c.id))
  );
}

/** Memory's living scene: cards fly from the table onto the board, or fall off it into the bin, a pulled paper
 * first. Pieces in flight are the moving layer, drawn over the room; everything else stays in the still. */
export const corkScene: Scene<Cork> = (prev, s, t, v) => {
  if (t >= 1 || !corkMoves(prev, s)) return { still: corkStill(s, v, false), moving: '' };
  const A = rest(prev),
    B = rest(s);
  const was = new Map([...prev.cards, ...prev.sources].map(x => [x.id, placeOf(x)]));
  const flying = [...s.sources, ...s.cards].filter(x => !was.has(x.id) || was.get(x.id) !== placeOf(x));
  const skip = new Set(flying.map(x => x.id));
  // papers go first, then the cards in turn; each piece swings flat as it falls
  const order = [...flying].sort((a, b) => +('label' in a) - +('label' in b));
  const b0 = (id: string) => B.get(id)!;
  const moving = () =>
    order
      .map((x, i) => {
        const u = Math.max(0, Math.min(1, (t - i * (0.4 / Math.max(1, order.length))) / 0.6));
        const a = A.get(x.id) ?? B.get('from' in x ? x.from : '') ?? b0(x.id),
          b = B.get(x.id)!;
        const c = lerpPt(a.c, b.c, u);
        c[0] += 10 * Math.sin(Math.PI * u);
        const p: Pose = { c, u: lerpPt(a.u, b.u, u), v: lerpPt(a.v, b.v, u) };
        return 'label' in x ? cardArt({ ...x, lit: false }, p, false) : paperArt(x as CorkSource, p, false);
      })
      .join('');
  // lit cards glow once the motion lands, not while pieces are in flight
  const calm = { ...s, cards: s.cards.map(c => (c.lit ? { ...c, lit: false } : c)) };
  return { still: art(calm, v, skip, false), moving };
};

/** The picture in words, for its aria-label. */
export function corkLabel(s: Cork): string {
  const on = s.cards.filter(c => c.at === 'board').length,
    bin = s.cards.filter(c => c.at === 'bin').length,
    papers = s.sources.filter(x => x.at === 'board').map(x => x.short.toLowerCase());
  const lit = s.cards.filter(c => c.lit).map(c => c.label.toLowerCase());
  return (
    `Larkspur's support room: a cork board on an easel with ${on} memory card${on === 1 ? '' : 's'} tied by red thread to ` +
    `${papers.length ? `source papers (${papers.join(', ')})` : 'no source papers'}; ${bin} card${bin === 1 ? '' : 's'} in the bin.` +
    (lit.length ? ` Lit: ${lit.join(', ')}.` : '') +
    (s.tray ? ` ${s.cards.filter(c => c.at === 'tray').length} candidate cards wait on the side table.` : '')
  );
}

/** The home hero's stand plot: the cork board on its easel, two papers and a few cards threaded to them, set down small. */
const PLOT: Cork = {
  sources: [
    { id: 'a', short: '', paper: 'staff', at: 'board', col: 1 },
    { id: 'b', short: '', paper: 'customer', at: 'board', col: 3, tone: 'cara' },
    { id: 'c', short: '', paper: 'web', at: 'board', col: 5 },
  ],
  cards: [
    { id: 'a1', label: '', tone: 'store', from: 'a', at: 'board', slot: 0 },
    { id: 'a2', label: '', tone: 'store', from: 'a1', at: 'board', slot: 1 },
    { id: 'b1', label: '', tone: 'cara', from: 'b', at: 'board', slot: 2 },
    { id: 'c1', label: '', tone: 'web', from: 'c', at: 'board', slot: 3 },
  ],
};
export function corkPlot(x: number, y: number, top: SceneCtx['top']): string {
  const item = {
    box: [
      [BX - 14, Y0 - 3, BH],
      [BX + 18, Y1 + 3, Z1 + 3],
    ],
    svg: easelArt(pinned(PLOT, rest(PLOT), new Set())),
  };
  const shadow = castShadow(boxCorners(BX - 14, Y0 + 8, BH, BX + 18, Y1 - 8, BH + 4), BH, top);
  return drawPieces([mini({ shadow, items: [item] }, [BX, (Y0 + Y1) / 2, BH], [x, y, BH], 0.24)]);
}
