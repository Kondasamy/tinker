// Skills' picture: Larkspur's returns desk beside a revolving binder carousel (docs/modules/skills.md). The carousel is a
// lazy-susan stand of six ring binders, spines out, one per skill; the assistant (the kit's model machine) and Rosa stand
// behind the desk, and a tray of tickets waits at its end. Asking a ticket turns the carousel to the picked binder,
// which swings out and opens on the desk; in the long prompt every binder comes out at once and buries the desk.
// A living scene (KTD2): scene(prev, state, t, view) → { still, moving }; at t = 1 everything is in the still.
// Words only in pills; every string reaching SVG goes through esc().
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import { hexa, modelMachine, person, type ModelState } from '../../lib/iso/figures';
import {
  CERAMIC,
  DARK,
  METAL,
  PALS,
  WOOD,
  box,
  byDepth,
  castShadow,
  cyl,
  depthOf,
  rod,
  shape,
  tag,
  toneI,
  vis,
} from '../../lib/iso/core.js';
import { calloutOf, lerp, lerpPt, pillScale, type Scene, type SceneView } from '../../lib/iso/motion';
import { SKILLS } from '../../lib/skills/skills';
import type { Say } from '../story/steps';

export const CAROUSEL_BOARD: Board = [12, 16, 176, 94];
/** The parts a step's callout or close-up may name. */
export const CAROUSEL_PARTS = ['carousel', 'desk', 'binder', 'ticket', 'model'] as const;
export type CarouselPart = (typeof CAROUSEL_PARTS)[number];

/** What the picture shows: one ticket asked (or none yet) and where every binder is. */
export interface Carousel {
  /** prompt: the 40-page prompt, every binder out at once; skills: one binder at a time */
  mode: 'prompt' | 'skills';
  /** the ticket on the desk (a request id), or none asked yet */
  ticket: string | null;
  /** skills: the binder open on the desk (a skill id), or none (no label matched) */
  open: string | null;
  /** the skill whose spine faces the desk (the last one opened) */
  facing: string;
  /** prompt: the binder lit inside the pile */
  lit?: string | null;
  /** words loaded for the ticket on the desk, for the desk's pill */
  words?: number;
  say?: Say;
}

const PAL = [
  PALS.tomato,
  PALS.cobalt,
  PALS.mustard,
  PALS.mint,
  PALS.blush,
  { l: '#b39ddb', m: '#9580c0', d: '#3a2f52' },
];
const palOf = (id: string) => PAL[SKILLS.findIndex(s => s.id === id) % PAL.length];

// the carousel: a round base, a shelf the binders stand on, a centre post
const CX = 42,
  CY = 64,
  R = 13,
  SHELF = BH + 7,
  POST = BH + 30;
// a binder upright in its slot: depth (radial), thickness (round the ring), height
const BD = 12,
  BW = 5,
  BHT = 17;
const FRONT = 4; // degrees: the slot that faces the desk
const DESK = { x0: 92, x1: 170, y0: 56, y1: 88, z1: BH + 14 };
const TOP = DESK.z1;
const TRAY = { x0: 96, x1: 108, y0: 62, y1: 76 };
const SPOT = [131, 72]; // the open binder
const TICKET_AT = [156, 70]; // the asked ticket, beside the open binder
const PILE_TICKET = [136, 72];
// prompt mode: where each binder lands in the pile, [x, y, yaw]; the first (refunds) lands first, at the bottom
const PILE = [
  [134, 71, 6],
  [148, 76, -18],
  [123, 77, 24],
  [142, 64, -8],
  [125, 66, 14],
  [138, 73, -26],
];
const MODEL = [150, 36],
  ROSA = [106, 40];

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const rad = (d: number) => (d * Math.PI) / 180;
const idx = (id: string) =>
  Math.max(
    0,
    SKILLS.findIndex(s => s.id === id),
  );
/** The carousel's turn (degrees) with this skill's spine toward the desk. */
const rotFor = (id: string) => FRONT - idx(id) * 60;
/** From one turn to another the short way round. */
const turn = (a: number, b: number, t: number) => a + (((((b - a) % 360) + 540) % 360) - 180) * t;
const slotAt = (i: number, rot: number) => {
  const a = rad(rot + i * 60);
  return [CX + R * Math.cos(a), CY + R * Math.sin(a), SHELF, a];
};

/** A binder standing in its slot, spine out: a coloured box with a blank label plate on the spine. */
function upright(x: number, y: number, z: number, a: number, id: string) {
  const F = [Math.cos(a), Math.sin(a), 0],
    S = [-Math.sin(a), Math.cos(a), 0];
  const at = (f: number, s: number, h: number) => [x + F[0] * f + S[0] * s, y + F[1] * f + S[1] * s, z + h];
  const c = [
    at(-BD / 2, -BW / 2, 0),
    at(BD / 2, -BW / 2, 0),
    at(BD / 2, BW / 2, 0),
    at(-BD / 2, BW / 2, 0),
    at(-BD / 2, -BW / 2, BHT),
    at(BD / 2, -BW / 2, BHT),
    at(BD / 2, BW / 2, BHT),
    at(-BD / 2, BW / 2, BHT),
  ];
  let s = hexa(c, palOf(id), 1);
  if (vis(F)) {
    const f = BD / 2 + 0.05;
    s += shape([at(f, -1.4, BHT - 8), at(f, 1.4, BHT - 8), at(f, 1.4, BHT - 3), at(f, -1.4, BHT - 3)], CERAMIC.l, 0.6);
    s += shape([at(f, -0.8, 3), at(f, 0.8, 3), at(f, 0.8, 4.6), at(f, -0.8, 4.6)], DARK.d, 0.4);
  }
  return `<g data-binder="${esc(id)}" data-at="slot">${s}</g>`;
}

const W = 11, // a cover's width
  L = 16; // the spine's length
/** A binder lying on the desk, its hinge along the local side axis, open by o (0 shut, 1 flat open). */
function flat(x: number, y: number, z: number, yaw: number, o: number, id: string, lit = false) {
  const a = rad(yaw),
    F = [Math.cos(a), Math.sin(a), 0],
    S = [-Math.sin(a), Math.cos(a), 0];
  const at = (f: number, s: number, h: number) => [x + F[0] * f + S[0] * s, y + F[1] * f + S[1] * s, z + h];
  const m = palOf(id),
    th = Math.PI * o,
    hz = 2.6;
  let s = shape([at(-W, -L / 2, 0.2), at(0, -L / 2, 0.2), at(0, L / 2, 0.2), at(-W, L / 2, 0.2)], m.m, lit ? 2.2 : 1);
  s += box(...(boxCorners2(at, -W + 0.8, -L / 2 + 0.8, 0.3, -0.6, L / 2 - 0.8, hz - 0.2) as Six), CERAMIC, toneI, 0.6);
  if (o > 0.85)
    s += shape(
      [
        at(0.6, -L / 2 + 0.8, 0.5),
        at(W - 0.8, -L / 2 + 0.8, 0.5),
        at(W - 0.8, L / 2 - 0.8, 0.5),
        at(0.6, L / 2 - 0.8, 0.5),
      ],
      CERAMIC.l,
      0.6,
    );
  s += rod(at(0, -L / 2 + 2, hz), at(0, L / 2 - 2, hz), 0.5, METAL, toneI, 0.6);
  const e = (h: number) => [-W * Math.cos(th), h + W * Math.sin(th) * 0.98];
  const [ef, eh] = e(hz);
  const cover = [
    at(0, -L / 2, hz),
    at(0, L / 2, hz),
    at(ef, L / 2, o > 0.98 ? 0.3 : eh),
    at(ef, -L / 2, o > 0.98 ? 0.3 : eh),
  ];
  s += shape(cover, lit ? PALS.mustard.l : m.l, lit ? 2.2 : 1.1);
  return `<g data-binder="${esc(id)}" data-at="desk" data-open="${o >= 1 ? 1 : 0}"${lit ? ' data-lit="1"' : ''}>${s}</g>`;
}
type Six = [number, number, number, number, number, number];
/** An axis-aligned box in a binder's local frame, given as world corners (yaw is small, so the box is near enough). */
function boxCorners2(
  at: (f: number, s: number, h: number) => number[],
  f0: number,
  s0: number,
  h0: number,
  f1: number,
  s1: number,
  h1: number,
) {
  const p = at(f0, s0, h0),
    q = at(f1, s1, h1);
  return [Math.min(p[0], q[0]), Math.min(p[1], q[1]), p[2], Math.max(p[0], q[0]), Math.max(p[1], q[1]), q[2]];
}

/** A ticket: a cream slip with a printed stripe. */
const ticketArt = (x: number, y: number, z: number) =>
  `<g data-ticket="1">${shape(
    [
      [x - 5, y - 3.5, z],
      [x + 5, y - 3.5, z],
      [x + 5, y + 3.5, z],
      [x - 5, y + 3.5, z],
    ],
    CERAMIC.l,
    0.8,
  )}${shape(
    [
      [x - 3.5, y - 1.5, z + 0.05],
      [x + 2, y - 1.5, z + 0.05],
      [x + 2, y - 0.3, z + 0.05],
      [x - 3.5, y - 0.3, z + 0.05],
    ],
    PALS.cobalt.l,
    0.3,
  )}</g>`;

/** The ticket waiting on top of the tray's stack (what the reader drags). */
export const trayTicket = () => ticketArt((TRAY.x0 + TRAY.x1) / 2, (TRAY.y0 + TRAY.y1) / 2, TOP + 3.2);

function tray(withTop: boolean) {
  const { x0, x1, y0, y1 } = TRAY;
  let s = box(x0, y0, TOP, x1, y1, TOP + 1, WOOD, toneI, 0.9);
  s += box(x0 + 1.5, y0 + 2, TOP + 1, x1 - 1.5, y1 - 2, TOP + 3, CERAMIC, toneI, 0.6);
  return `<g data-part="ticket">${s}${withTop ? trayTicket() : ''}</g>`;
}

/** The desk: four legs, a thick top; what lies on it is drawn with it, in order, as one item. */
function deskArt(load: string) {
  const { x0, x1, y0, y1, z1 } = DESK,
    zt = z1 - 3;
  let s = '';
  for (const [lx, ly] of [
    [x0 + 2, y0 + 2],
    [x1 - 5, y0 + 2],
    [x0 + 2, y1 - 5],
    [x1 - 5, y1 - 5],
  ])
    s += box(lx, ly, BH, lx + 3, ly + 3, zt, WOOD, toneI, 0.9);
  s += box(x0 - 1, y0 - 1, zt, x1 + 1, y1 + 1, z1, WOOD, toneI, 1.4);
  return `<g data-part="desk">${s}${load}</g>`;
}

/** Each binder's place: in its slot (at the carousel's turn) or on the desk. */
type Pose = { slot: true } | { x: number; y: number; z: number; yaw: number; o: number };
function posesOf(s: Carousel): Pose[] {
  return SKILLS.map((k, i) => {
    if (s.mode === 'prompt' && s.ticket)
      return { x: PILE[i][0], y: PILE[i][1], z: TOP + 0.4 + i * 1.6, yaw: PILE[i][2], o: 1 };
    if (s.mode === 'skills' && s.open === k.id) return { x: SPOT[0], y: SPOT[1], z: TOP + 0.4, yaw: 0, o: 1 };
    return { slot: true };
  });
}
const ticketPos = (s: Carousel) => (s.mode === 'prompt' ? PILE_TICKET : TICKET_AT);

/** The carousel as one item: base, shelf, then the post and the binders in its slots, far ones first. */
function carouselArt(rot: number, inSlot: boolean[]) {
  let s = cyl(CX, CY, BH, BH + 2, R + 6, DARK, toneI, 1.2, 28) + rod([CX, CY, BH + 2], [CX, CY, SHELF - 2], 2, METAL);
  s += cyl(CX, CY, SHELF - 2, SHELF, R + 9, WOOD, toneI, 1.4, 32);
  const parts = SKILLS.map((k, i) => {
    if (!inSlot[i]) return null;
    const [x, y, z, a] = slotAt(i, rot);
    return { d: depthOf([x, y, z]), svg: upright(x, y, z, a, k.id) };
  }).filter(Boolean) as { d: number; svg: string }[];
  parts.push({
    d: depthOf([CX, CY, SHELF]),
    svg: rod([CX, CY, SHELF], [CX, CY, POST], 1.6, METAL) + cyl(CX, CY, POST, POST + 2, 3, METAL, toneI, 1, 16),
  });
  s += parts
    .sort((p, q) => p.d - q.d)
    .map(p => p.svg)
    .join('');
  return `<g data-part="carousel" data-turn="${rot.toFixed(0)}">${s}</g>`;
}

/** Points of a part's footprint, for close-ups and in-picture targets. */
export function partBox(part: CarouselPart, s?: Carousel): number[][] {
  switch (part) {
    case 'carousel':
      return boxCorners(CX - R - 9, CY - R - 9, BH, CX + R + 9, CY + R + 9, POST + 2);
    case 'desk':
      return boxCorners(DESK.x0 + 16, DESK.y0, BH, DESK.x1, DESK.y1, TOP + 12);
    case 'ticket':
      return boxCorners(TRAY.x0, TRAY.y0, TOP, TRAY.x1, TRAY.y1, TOP + 4);
    case 'model':
      return boxCorners(MODEL[0] - 17, MODEL[1] - 17, BH, MODEL[0] + 17, MODEL[1] + 17, BH + 36);
    case 'binder': {
      const i = s?.lit ? idx(s.lit) : -1;
      const [x, y] = s?.mode === 'prompt' && i >= 0 ? PILE[i] : SPOT;
      return boxCorners(x - W - 2, y - L / 2 - 2, TOP, x + W + 2, y + L / 2 + 2, TOP + 8);
    }
  }
}

const pill = (p: number[], dy: number, text: string, on: boolean, k: number, dx = 0) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), on, k)}</g>`;

/** Shadows and the pieces that never move in a motion: the people, the machine and the desk's frame. */
function setting(s: Carousel, top: SceneCtx['top']) {
  const state: ModelState | undefined = !s.ticket ? undefined : s.mode === 'prompt' || !s.open ? 'warn' : 'ok';
  const m = modelMachine(MODEL[0], MODEL[1], 1, state),
    rosa = person({ x: ROSA[0], y: ROSA[1], facing: 60, look: 'rosa' });
  return {
    shadow:
      castShadow(boxCorners(CX - R - 9, CY - R - 9, BH, CX + R + 9, CY + R + 9, POST), BH, top) +
      castShadow(boxCorners(DESK.x0, DESK.y0, BH, DESK.x1, DESK.y1, DESK.z1), BH, top) +
      m.shadow +
      rosa.shadow,
    items: [...m.items.map(i => ({ ...i, svg: `<g data-part="model">${i.svg}</g>` })), ...rosa.items],
  };
}

/** The pills; mid-motion (moving) the binder's and the desk's wait for the end, where their numbers belong. */
function pills(s: Carousel, v: SceneView, moving = false) {
  const k = (p: string) => pillScale(p, v),
    phone = !!v.phone,
    out: string[] = [];
  const on = (p: string, at: number[], dy: number, text: string, lit: boolean, dx = 0) => {
    const sc = k(p);
    if (sc) out.push(pill(at, dy, text, lit, sc, dx));
    out.push(sayAt(calloutOf(s.say, v), p, at, dy - 10, sc || 1, phone));
  };
  on('carousel', [CX, CY, POST + 2], -16, phone ? 'SKILLS' : `${SKILLS.length} SKILLS`, false);
  on('model', [MODEL[0], MODEL[1], BH + 36], -14, phone ? 'BOT' : 'ASSISTANT', !!s.ticket, 6);
  on('ticket', [(TRAY.x0 + TRAY.x1) / 2, TRAY.y1, TOP + 3], 22, 'TICKETS', false, -10);
  const named = s.mode === 'skills' ? s.open : s.lit;
  if (named && !moving) {
    const [x0, , , x1, y1] = [...partBox('binder', s)[0], ...partBox('binder', s)[7]];
    on('binder', [(x0 + x1) / 2, y1 - 2, TOP + 6], -26, SKILLS[idx(named)].name.toUpperCase(), true);
  }
  if (s.ticket && s.words !== undefined && !moving)
    on(
      'desk',
      [DESK.x1 - 6, DESK.y1, TOP],
      20,
      phone ? 'DESK' : `${s.words.toLocaleString('en-US')} WORDS`,
      s.mode === 'prompt',
      12,
    );
  return out.filter(Boolean).join('');
}

interface Drawn {
  rot: number;
  poses: (Pose & { lit?: boolean })[];
  ticket: number[] | null;
}
/** The whole picture for these moving parts' places. tray: whether the top ticket sits on the tray. */
function art(s: Carousel, v: SceneView, d: Drawn, opts: { tray: boolean; moving: boolean }) {
  return (ctx: SceneCtx) => {
    const set = setting(s, ctx.top);
    // desk load, in order: the ticket, then binders bottom to top
    let load = tray(opts.tray);
    if (d.ticket) load += ticketArt(d.ticket[0], d.ticket[1], TOP + 0.3);
    d.poses
      .map((p, i) => ({ p, i }))
      .filter((e): e is { p: Exclude<Pose, { slot: true }> & { lit?: boolean }; i: number } => !('slot' in e.p))
      .sort((a, b) => a.p.z - b.p.z)
      .forEach(({ p, i }) => (load += flat(p.x, p.y, p.z, p.yaw, p.o, SKILLS[i].id, !!p.lit)));
    const items = [
      ...set.items,
      {
        box: [
          [DESK.x0 - 1, DESK.y0 - 1, BH],
          [DESK.x1 + 1, DESK.y1 + 1, TOP + 2],
        ],
        svg: deskArt(load),
      },
      {
        box: [
          [CX - R - 9, CY - R - 9, BH],
          [CX + R + 9, CY + R + 9, POST + 2],
        ],
        svg: carouselArt(
          d.rot,
          d.poses.map(p => 'slot' in p),
        ),
      },
    ];
    return set.shadow + byDepth(items) + (opts.moving ? '' : pills(s, v));
  };
}

const rest = (s: Carousel): Drawn => ({
  rot: rotFor(s.facing),
  poses: posesOf(s).map((p, i) => ('slot' in p ? p : { ...p, lit: s.lit === SKILLS[i].id })),
  ticket: s.ticket ? ticketPos(s) : null,
});

/** The picture at rest: what the stage shows for state s with no motion (the share image too). */
export const carouselStill = (s: Carousel, v: SceneView = { zoomT: 0 }, tray = true) =>
  art(s, v, rest(s), { tray, moving: false });

/** Where a binder in flight is: from its slot (at turn rot) to the desk (or back), lying shut, then opening. */
function flight(i: number, from: Pose, to: Pose, rotFrom: number, rotTo: number, u: number, o: number) {
  const place = (p: Pose, rot: number) => {
    if ('slot' in p) {
      const [x, y, z, a] = slotAt(i, rot);
      return { x, y, z: z + BHT / 2, yaw: (a * 180) / Math.PI };
    }
    return p;
  };
  const a = place(from, rotFrom),
    b = place(to, rotTo);
  const [x, y, z] = lerpPt([a.x, a.y, a.z], [b.x, b.y, b.z], u);
  return { x, y, z: z + 14 * Math.sin(Math.PI * u), yaw: lerp(a.yaw, b.yaw, u), o };
}

/** Whether going from prev to s moves anything (a change to pills or the lit binder alone doesn't). */
export const carouselMoves = (prev: Carousel, s: Carousel) =>
  prev.mode !== s.mode || prev.ticket !== s.ticket || prev.open !== s.open || prev.facing !== s.facing;

/** Skills' living scene: the ticket slides in, the carousel turns, a binder swings out and opens (or every binder flies
 * out in turn, in the long prompt). Mid-motion the carousel, the desk's load and the binders in flight are the moving
 * layer; the setting, the shadows and the pills stay in the still. */
export const carouselScene: Scene<Carousel> = (prev, s, t, v) => {
  // a change only to pills or the lit binder (nothing moves): straight to the end state
  if (t >= 1 || !carouselMoves(prev, s)) return { still: carouselStill(s, v), moving: '' };
  const A = posesOf(prev),
    B = posesOf(s);
  const r0 = rotFor(prev.facing),
    r1 = rotFor(s.facing);
  const newTicket = s.ticket !== prev.ticket && s.ticket;
  const ph = (a: number, b: number) => clamp01((t - a) / (b - a));
  let rot = r0;
  const flying: { i: number; p: ReturnType<typeof flight> }[] = [];
  const poses: Pose[] = A.map(() => ({ slot: true }));
  const slotFree = SKILLS.map(() => true);
  if (s.mode === 'prompt') {
    // the ticket first, then each binder in turn
    rot = r1;
    SKILLS.forEach((_, i) => {
      if ('slot' in A[i] && !('slot' in B[i])) {
        const u = ph(0.25 + i * 0.1, 0.5 + i * 0.1);
        if (u <= 0) return;
        slotFree[i] = false;
        if (u >= 1) poses[i] = B[i];
        else flying.push({ i, p: flight(i, A[i], B[i], rot, rot, u, u > 0.7 ? (u - 0.7) / 0.3 : 0) });
      } else poses[i] = 'slot' in B[i] ? { slot: true } : B[i];
    });
  } else {
    rot = turn(r0, r1, ph(0.3, 0.55));
    SKILLS.forEach((_, i) => {
      const was = !('slot' in A[i]),
        is = !('slot' in B[i]);
      if (was && !is) {
        const u = ph(0.08, 0.3);
        if (u >= 1) return;
        slotFree[i] = false;
        flying.push({ i, p: flight(i, B[i], A[i], rot, rot, 1 - u, 1 - ph(0, 0.08)) });
      } else if (!was && is) {
        const u = ph(0.55, 0.85);
        if (u <= 0) return;
        slotFree[i] = false;
        if (u >= 1) poses[i] = { ...(B[i] as object), o: ph(0.85, 1) } as Pose;
        else flying.push({ i, p: flight(i, A[i], B[i], rot, rot, u, 0) });
      } else if (is) poses[i] = B[i];
    });
  }
  const ticket = newTicket
    ? lerpPt([(TRAY.x0 + TRAY.x1) / 2, (TRAY.y0 + TRAY.y1) / 2], ticketPos(s), ph(0, 0.25))
    : s.ticket
      ? ticketPos(s)
      : null;
  const d: Drawn = {
    rot,
    poses: poses.map((p, i) => (slotFree[i] || !('slot' in p) ? p : { x: -999, y: -999, z: 0, yaw: 0, o: 0 })),
    ticket,
  };
  // binders in flight are drawn over everything, in the moving layer, with the carousel and the desk's load
  const fixed = (ctx: SceneCtx) => {
    const set = setting(s, ctx.top);
    return set.shadow + byDepth(set.items) + pills(s, v, true);
  };
  const moving = () => {
    let load = tray(true);
    if (d.ticket) load += ticketArt(d.ticket[0], d.ticket[1], TOP + 0.3);
    d.poses.forEach((p, i) => {
      if (!('slot' in p) && p.x > -999) load += flat(p.x, p.y, p.z, p.yaw, p.o, SKILLS[i].id);
    });
    const carousel = carouselArt(
      d.rot,
      d.poses.map((p, i) => 'slot' in p && slotFree[i]),
    );
    return (
      byDepth([
        {
          box: [
            [DESK.x0 - 1, DESK.y0 - 1, BH],
            [DESK.x1 + 1, DESK.y1 + 1, TOP + 2],
          ],
          svg: deskArt(load),
        },
        {
          box: [
            [CX - R - 9, CY - R - 9, BH],
            [CX + R + 9, CY + R + 9, POST + 2],
          ],
          svg: carousel,
        },
      ]) + flying.map(f => flat(f.p.x, f.p.y, f.p.z, f.p.yaw, f.p.o, SKILLS[f.i].id)).join('')
    );
  };
  return { still: fixed, moving };
};

/** The picture in words, for its aria-label. */
export function carouselLabel(s: Carousel): string {
  const named = (id: string) => SKILLS[idx(id)].name;
  const where =
    s.mode === 'prompt'
      ? s.ticket
        ? `All ${SKILLS.length} binders lie open on the desk, piled over the ticket${s.lit ? `; the ${named(s.lit)} binder is lit` : ''}.`
        : `${SKILLS.length} binders stand on the carousel; no ticket asked yet.`
      : s.ticket
        ? s.open
          ? `The carousel has turned to ${named(s.open)}, and that binder lies open on the desk; the rest stay on the carousel.`
          : 'A ticket lies on the desk, but no binder came out: no label matched.'
        : `${SKILLS.length} binders stand on the carousel, spines out; no ticket asked yet.`;
  return `Larkspur's returns desk beside a revolving carousel of ${SKILLS.length} skill binders. ${where}`;
}
