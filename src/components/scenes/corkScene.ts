// Memory's picture: Larkspur's support room with a cork board on an easel (docs/modules/agent-memory.md). Source
// papers (the handbook, the order system, each customer's chats, a web page) are pinned along the board's top; memory
// cards hang below, each tied by red thread to the paper it came from, or to the card it was learnt from. Pulling a
// paper's thread drops it and every card hanging from it into the bin beside the easel. The assistant (the kit's model
// machine) and the support lead stand by; in chapter 1 a side table holds the chat's candidate cards.
// A living scene (KTD2): scene(prev, state, t, view) → { still, moving }; at t = 1 everything is in the still. Words
// only in pills; every string reaching SVG goes through esc().
import { type Board, type SceneCtx, stageFrame } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import { modelMachine, person } from '../../lib/iso/figures';
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
  withFrame,
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
export type Tone = 'ada' | 'ben' | 'cara' | 'dan' | 'store';
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
  lit?: boolean;
}
export interface Cork {
  sources: CorkSource[];
  cards: CorkCard[];
  /** the side table with chapter 1's candidates */
  tray?: boolean;
  say?: Say;
}

const TONES: Record<Tone, { l: string; m: string; d: string }> = {
  ada: PALS.mustard,
  ben: PALS.cobalt,
  cara: PALS.mint,
  dan: PALS.blush,
  store: { l: '#e9e4f5', m: '#b39ddb', d: '#3a2f52' },
};
const CORK = { l: '#d9a86c', m: '#c48f52', d: '#7a5530' };
const RED = '#c62f2a',
  GLOW = 'var(--accent,#f4b829)';

// the board: a cork face on the plane x = BX, facing the viewer's right
const BX = 48,
  Y0 = 26,
  Y1 = 122,
  Z0 = BH + 16,
  Z1 = BH + 74;
const FACE_X = BX + 0.25;
// papers along the top, cards in a 4 × 4 grid below
const PW = 5.6,
  PH = 6.5,
  PZ0 = Z1 - 9; // a paper's half-width, half-height, centre height
const COLS = 4,
  CW = 9.2,
  CH = 4.2, // a card's half-width (along y) and half-height
  GY = 23.4,
  GZ = 10.6,
  GZ0 = Z0 + 8;
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

/** A paper's centre on the board, by its place along the top. */
function paperAt(i: number, n: number): V {
  const span = Y1 - Y0 - 8,
    step = Math.min(14, span / Math.max(1, n));
  const y = (Y0 + Y1) / 2 - (i - (n - 1) / 2) * step;
  return [FACE_X + 0.3, y, PZ0 + (i % 2 ? -1.5 : 1.5)];
}
const slotAt = (slot: number): V => {
  const col = slot % COLS,
    row = Math.floor(slot / COLS);
  return [FACE_X + 0.2, Y1 - 13 - col * GY, GZ0 + (3 - row) * GZ];
};
const upright = (c: V, hw: number, hh: number): Pose => ({ c, u: [0, hw, 0], v: [0, 0, hh] });
const lying = (c: V, hw: number, hh: number, turn = 0): Pose => {
  const a = (turn * Math.PI) / 180;
  return { c, u: [hw * Math.sin(a), hw * Math.cos(a), 0], v: [hh * Math.cos(a), -hh * Math.sin(a), 0] };
};
/** A card's pose where it rests: on the board, on the side table, or in the bin's pile. */
function cardPose(c: CorkCard): Pose {
  if (c.at === 'board') return upright(slotAt(c.slot), CW, CH);
  if (c.at === 'tray') {
    const col = c.slot % 2,
      row = Math.floor(c.slot / 2);
    return lying([TABLE.x0 + 4.5 + row * 2.3, TABLE.y0 + 9 + col * 16, TABLE.z + 0.3 + row * 0.15], CW * 0.8, CH, 0);
  }
  return binPose(c.slot, CW * 0.55, CH * 0.9);
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
const paperPose = (s: CorkSource, i: number, n: number, binAt: number): Pose =>
  s.at === 'board' ? upright(paperAt(i, n), PW, PH) : binPose(binAt, PW * 0.8, PH * 0.8);

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
    out += shape([at(-0.3, 0.05), at(0.78, 0.05), at(0.78, -0.4), at(-0.3, -0.4)], PALS.mint.l, 0.4);
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
  return s.sources.map((src, i) => ({ src, pose: paperPose(src, i, n, src.at === 'bin' ? cardsIn + binK++ : 0) }));
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
        ? // with room on the viewer's right (toward -y) for the cards' pill column
          box3(
            [
              ...lit.flatMap(c => corners(cardPose(c))),
              add(cardPose(lit[0]).c, [0, -Math.max(...lit.map(c => c.label.length)) * 3.2 - 14, 0]),
            ],
            2,
          )
        : partBox('board');
    }
  }
  return partBox('board');
}

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
  papers.forEach((p, i) => {
    const show = p.src.lit || (!phone && v.zoomT === 0);
    if (!show) return;
    const top = add(p.pose.c, p.pose.v);
    const part = p.src.lit ? 'source' : 'board';
    const sc = k(part);
    if (sc) out.push(pill(top, -10 - (i % 2) * 11 - (p.src.lit && !phone ? 0 : 0), p.src.short, !!p.src.lit, sc));
  });
  // the source callout sits over the first lit paper (or the first paper)
  const head = lit[0] ?? papers[0];
  if (head) out.push(sayAt(calloutOf(s.say, v), 'source', add(head.pose.c, head.pose.v), -32, k('source') || 1, phone));
  // lit cards name themselves, to the viewer's right of the board
  const litCards = moving ? [] : s.cards.filter(c => c.lit && c.at === 'board');
  // in one column just right of the rightmost lit card, top to bottom, a pill's height apart, so none covers another
  const sc = k('card');
  if (sc && litCards.length) {
    const K = stageFrame(CORK_BOARD).inkK * sc,
      fs = 8.6 * K;
    const at = litCards.map(c => ({
      c,
      a: add(cardPose(c).c, cardPose(c).u, -1),
      q: P(...(add(cardPose(c).c, cardPose(c).u, -1) as [number, number, number])),
    }));
    const w = Math.max(...litCards.map(c => c.label.length * fs * 0.62 + fs * 1.5));
    const col = Math.max(...at.map(x => x.q[0])) + 10 * K + w / 2;
    let y = -Infinity;
    for (const x of [...at].sort((m, n) => m.q[1] - n.q[1])) {
      y = Math.max(x.q[1] + 6 * K, y + fs * 2.1);
      out.push(pill(x.a, (y - x.q[1]) / K, x.c.label, true, sc, (col - x.q[0]) / K));
    }
  }
  if (litCards[0])
    out.push(
      sayAt(
        calloutOf(s.say, v),
        'card',
        add(cardPose(litCards[0]).c, cardPose(litCards[0]).v),
        -12,
        k('card') || 1,
        phone,
      ),
    );
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
  for (const c of s.cards) poses.set(c.id, cardPose(c));
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
    still: art(s, v, new Set([id]), false), // drawn in the stage's frame here: the hook passes the piece on as a finished string
    piece: p ? withFrame(stageFrame(CORK_BOARD), () => paperArt(p.src, p.pose, true)) : '',
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
  return { still: art(s, v, skip, false), moving };
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
