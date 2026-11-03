// Skills' picture: Larkspur's returns desk beside a revolving binder carousel (docs/modules/skills.md). The carousel is a
// lazy-susan stand of six ring binders, spines out, one per skill; the assistant (the kit's model machine) and Rosa stand
// behind the desk, and a tray of tickets waits at its end. Asking a ticket turns the carousel to the picked binder,
// which swings out and opens on the desk; in the long prompt every binder comes out at once and buries the desk.
// A living scene (KTD2): scene(prev, state, t, view) → { still, moving }; at t = 1 everything is in the still.
// Words only in pills; every string reaching SVG goes through esc().
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayFits } from '../../lib/iso/blocks';
import { bin, hexa, modelMachine, person, type ModelState } from '../../lib/iso/figures';
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
  pd,
  rod,
  shape,
  tag,
  toneI,
  vis,
} from '../../lib/iso/core.js';
import { calloutOf, lerp, lerpPt, pillScale, type Scene, type SceneView } from '../../lib/iso/motion';
import { OUTSIDER, requestOf, SKILLS } from '../../lib/skills/skills';
import type { Say } from '../story/steps';

export const CAROUSEL_BOARD: Board = [12, 16, 176, 94];
/** The parts a step's callout or close-up may name. */
export const CAROUSEL_PARTS = ['carousel', 'desk', 'binder', 'ticket', 'model', 'script', 'outsider', 'bin'] as const;
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
  /** prompt: the binder that answers the ticket, lifted and ringed in the pile while the stage is closed in on it */
  lit?: string | null;
  /** how many tickets have been asked: under the pile (prompt), or fanned beside the open binder (skills, up to 3) */
  tickets?: number;
  /** skills: what the open binder's script did: its code read into the prompt, or run, sending only a slip out */
  script?: 'read' | 'run';
  /** a downloaded binder on the desk: still shut, opened (its hidden page lit), or thrown in the bin */
  outsider?: 'boxed' | 'open' | 'binned';
  /** the workbench: each binder's mark after a run (true: all its tickets picked it), and the run's tally */
  marks?: Record<string, boolean>;
  tally?: { right: number; of: number; words: number };
  /** the workbench: whole turns the carousel has made (one per run) */
  spin?: number;
  /** pills are drawn apart, outside the hand-drawn filter (the stage's overlay: carouselPills); the share image keeps them in */
  bare?: boolean;
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
// prompt mode: each ticket asked lies under the pile, a later one further toward the front so its edge shows
const PILE_TICKETS = [
  [136, 72],
  [110, 84],
  [150, 87],
];
// skills mode: the tickets asked, fanned beside the open binder, oldest at the back
const FAN = [
  [148, 60],
  [156, 66.5],
  [164, 73],
];
const SCRIPT_AT = [154, 82]; // the script's pages, or its stamp, beside the open binder
const SLIP_AT = [164, 59.5]; // the slip a run script sends to the assistant
const OUT_AT = [110, 83]; // a downloaded binder, at the near end of the desk
const BIN_AT = [80, 88];
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
function upright(x: number, y: number, z: number, a: number, id: string, mark?: boolean) {
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
    // the label plate; after a workbench run, the whole plate is the binder's mark (mint: right, tomato: missed)
    const plate = mark === undefined ? CERAMIC.l : mark ? PALS.mint.l : PALS.tomato.l,
      z0 = mark === undefined ? BHT - 8 : 6;
    s += shape(
      [at(f, -1.6, z0), at(f, 1.6, z0), at(f, 1.6, BHT - 2.5), at(f, -1.6, BHT - 2.5)],
      plate,
      mark === undefined ? 0.6 : 1.1,
    );
    s += shape([at(f, -0.8, 3), at(f, 0.8, 3), at(f, 0.8, 4.6), at(f, -0.8, 4.6)], DARK.d, 0.4);
  }
  // and a flat label tab standing up from the spine's top edge, seen from any side: a paper backing under a coloured
  // card with a heavy outline, so a red tab still reads on a red binder
  if (mark !== undefined) {
    const f = BD / 2 - 0.4;
    s += shape(
      [at(f, -2.6, BHT - 1), at(f, 2.6, BHT - 1), at(f, 2.6, BHT + 6.4), at(f, -2.6, BHT + 6.4)],
      CERAMIC.l,
      1.6,
    );
    s += shape(
      [at(f + 0.05, -1.8, BHT), at(f + 0.05, 1.8, BHT), at(f + 0.05, 1.8, BHT + 5.4), at(f + 0.05, -1.8, BHT + 5.4)],
      mark ? PALS.mint.l : PALS.tomato.l,
      1.2,
    );
  }
  return `<g data-binder="${esc(id)}" data-at="slot"${mark === undefined ? '' : ` data-mark="${mark ? 'ok' : 'bad'}"`}>${s}</g>`;
}

const W = 11, // a cover's width
  L = 16; // the spine's length
/** A binder lying on the desk, its hinge along the local side axis, open by o (0 shut, 1 flat open). */
function flat(
  x: number,
  y: number,
  z: number,
  yaw: number,
  o: number,
  id: string,
  /** true: ringed in light (the answer); 'wrong': ringed in red (opened for a ticket it doesn't answer) */
  lit: boolean | 'wrong' = false,
  pal?: typeof PALS.mint,
) {
  const a = rad(yaw),
    F = [Math.cos(a), Math.sin(a), 0],
    S = [-Math.sin(a), Math.cos(a), 0];
  const at = (f: number, s: number, h: number) => [x + F[0] * f + S[0] * s, y + F[1] * f + S[1] * s, z + h];
  const m = pal ?? palOf(id),
    th = Math.PI * o,
    hz = 2.6;
  let s = shape([at(-W, -L / 2, 0.2), at(0, -L / 2, 0.2), at(0, L / 2, 0.2), at(-W, L / 2, 0.2)], m.m, lit ? 2.4 : 1);
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
  if (lit) {
    // a ring round the whole open binder, under its covers' ink: light for the answer, red for a wrong pick
    const ring = [
      at(-W - 1.6, -L / 2 - 1.6, 0.1),
      at(W + 1.6, -L / 2 - 1.6, 0.1),
      at(W + 1.6, L / 2 + 1.6, 0.1),
      at(-W - 1.6, L / 2 + 1.6, 0.1),
    ];
    const [fillC, ink] = lit === 'wrong' ? ['#fbd9cf', '#c2412b'] : ['#fff1b8', '#f4b829'];
    s = `<path data-glow="1" d="${pd(ring)}" fill="${fillC}" stroke="${ink}" stroke-width="3.4" stroke-linejoin="round"/>${s}`;
  }
  s += shape(cover, m.l, lit ? 2.4 : 1.1);
  const tag = lit === 'wrong' ? ' data-wrong="1"' : lit ? ' data-lit="1"' : '';
  return `<g data-binder="${esc(id)}" data-at="desk" data-open="${o >= 1 ? 1 : 0}"${tag}>${s}</g>`;
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
const ticketArt = (x: number, y: number, z: number, fresh = false) =>
  `<g data-ticket="1"${fresh ? ' data-fresh="1"' : ''}>${
    fresh
      ? `<path d="${pd([
          [x - 6.4, y - 4.9, z],
          [x + 6.4, y - 4.9, z],
          [x + 6.4, y + 4.9, z],
          [x - 6.4, y + 4.9, z],
        ])}" fill="#fff1b8" stroke="#f4b829" stroke-width="2.2" stroke-linejoin="round"/>`
      : ''
  }${shape(
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

/** The script clipped in the open binder: its code's pages spread on the desk (read), or a stamp that ran it (run). */
function scriptArt(use: 'read' | 'run', press = 0) {
  const [x, y] = SCRIPT_AT;
  if (use === 'read') {
    let s = '';
    for (const [k, [dx, dy]] of [
      [0, [-2, 1]],
      [1, [0, -1]],
      [2, [2, 0.5]],
    ] as [number, number[]][]) {
      const z = TOP + 0.3 + k * 0.5,
        cx = x + dx,
        cy = y + dy;
      s += shape(
        [
          [cx - 5, cy - 3.6, z],
          [cx + 5, cy - 3.6, z],
          [cx + 5, cy + 3.6, z],
          [cx - 5, cy + 3.6, z],
        ],
        CERAMIC.l,
        0.7,
      );
      for (const l of [-2, -0.5, 1, 2.5])
        s += shape(
          [
            [cx - 3.8, cy + l - 0.25, z + 0.05],
            [cx + (l > 1 ? 1 : 3.4), cy + l - 0.25, z + 0.05],
            [cx + (l > 1 ? 1 : 3.4), cy + l + 0.25, z + 0.05],
            [cx - 3.8, cy + l + 0.25, z + 0.05],
          ],
          DARK.l,
          0,
        );
    }
    return `<g data-part="script" data-use="read">${s}</g>`;
  }
  // a hand stamp on its pad: a dark block, a handle that presses down while it runs
  const h = 4 - 2.4 * Math.sin(Math.PI * press);
  const s =
    box(x - 4, y - 3, TOP, x + 4, y + 3, TOP + 1, PALS.tomato, toneI, 0.8) +
    box(x - 3, y - 2.2, TOP + 1 + (4 - h) * 0.2, x + 3, y + 2.2, TOP + 1 + h, DARK, toneI, 0.9) +
    rod([x, y, TOP + 1 + h], [x, y, TOP + 5 + h], 0.7, METAL) +
    cyl(x, y, TOP + 5 + h, TOP + 7 + h, 1.6, PALS.tomato, toneI, 0.8, 12);
  return `<g data-part="script" data-use="run">${s}</g>`;
}
/** The slip a run script sends: its output, the only part the assistant reads; mint, so no ticket is mistaken for it. */
const slipArt = (x: number, y: number, z: number) =>
  `<g data-slip="1">${shape(
    [
      [x - 5, y - 3.2, z],
      [x + 5, y - 3.2, z],
      [x + 5, y + 3.2, z],
      [x - 5, y + 3.2, z],
    ],
    PALS.mint.l,
    1.4,
  )}${shape(
    [
      [x - 3.4, y - 0.6, z + 0.05],
      [x + 2.4, y - 0.6, z + 0.05],
      [x + 2.4, y + 0.6, z + 0.05],
      [x - 3.4, y + 0.6, z + 0.05],
    ],
    DARK.m,
    0,
  )}</g>`;

const OUT_PAL = { l: '#a7adb4', m: '#868c93', d: '#3c4046' };
/** The downloaded binder, shut or open (o); open, its hidden page lies lit on the right, under the cover. */
function outsiderArt(x: number, y: number, z: number, o: number) {
  let s = flat(x, y, z, 0, o, 'outsider', false, OUT_PAL);
  if (o > 0.85)
    s += shape(
      [
        [x + 1.2, y - 6.5, z + 0.7],
        [x + 9.6, y - 6.5, z + 0.7],
        [x + 9.6, y + 6.5, z + 0.7],
        [x + 1.2, y + 6.5, z + 0.7],
      ],
      PALS.tomato.l,
      1.6,
    );
  return `<g data-part="outsider" data-open="${o >= 1 ? 1 : 0}">${s}</g>`;
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
    if (s.mode === 'prompt' && s.ticket) return pileAt(i, false);
    if (s.mode === 'skills' && s.open === k.id) return { x: SPOT[0], y: SPOT[1], z: TOP + 0.4, yaw: 0, o: 1 };
    return { slot: true };
  });
}
/** Where the tickets on the desk lie: under the pile, one per ask (prompt), or the last one beside the open binder. */
const ticketsOf = (s: Carousel): number[][] =>
  !s.ticket
    ? []
    : s.mode === 'prompt'
      ? PILE_TICKETS.slice(0, Math.max(1, Math.min(PILE_TICKETS.length, s.tickets ?? 1)))
      : FAN.slice(FAN.length - Math.max(1, Math.min(FAN.length, s.tickets ?? 1)));
const TRAY_AT = [(TRAY.x0 + TRAY.x1) / 2, (TRAY.y0 + TRAY.y1) / 2];
/** The lit binder's place while the stage is closed in on it: lifted clear of the pile. */
const LIFT = TOP + 0.4 + SKILLS.length * 1.6 + 2;
const pileAt = (i: number, lifted: boolean) => ({
  x: PILE[i][0],
  y: PILE[i][1],
  z: lifted ? LIFT : TOP + 0.4 + i * 1.6,
  yaw: PILE[i][2],
  o: 1,
});

/** The carousel as one item: base, shelf, then the post and the binders in its slots, far ones first. */
function carouselArt(rot: number, inSlot: boolean[], picked = false, marks?: Carousel['marks']) {
  let s = cyl(CX, CY, BH, BH + 2, R + 6, DARK, toneI, 1.2, 28) + rod([CX, CY, BH + 2], [CX, CY, SHELF - 2], 2, METAL);
  s += cyl(CX, CY, SHELF - 2, SHELF, R + 9, WOOD, toneI, 1.4, 32);
  // the fixed brass pointer on the base, at the slot that faces the desk; the slot it points at lights when a binder
  // has been taken from it
  const f = rad(FRONT),
    ux = Math.cos(f),
    uy = Math.sin(f),
    px = -uy,
    py = ux;
  const P3 = (r: number, w: number, z: number) => [CX + ux * r + px * w, CY + uy * r + py * w, z];
  s += shape([P3(R + 7, -2.6, BH + 2.05), P3(R + 13, 0, BH + 2.05), P3(R + 7, 2.6, BH + 2.05)], PALS.mustard.l, 1);
  s += box(
    CX + ux * (R + 4) - 1,
    CY + uy * (R + 4) - 1,
    BH,
    CX + ux * (R + 4) + 1,
    CY + uy * (R + 4) + 1,
    BH + 2.1,
    PALS.mustard,
    toneI,
    0.6,
  );
  // the empty slot a binder was taken from: a pale tint no binder has, inside a hollow ring of light
  if (picked) {
    const ring = [
      P3(R - BD / 2 - 0.5, -BW + 0.5, SHELF + 0.05),
      P3(R + BD / 2 + 0.5, -BW + 0.5, SHELF + 0.05),
      P3(R + BD / 2 + 0.5, BW - 0.5, SHELF + 0.05),
      P3(R - BD / 2 - 0.5, BW - 0.5, SHELF + 0.05),
    ];
    s += `<g data-slot="lit"><path d="${pd(ring)}" fill="#fbf6e6" stroke="#f4b829" stroke-width="2" stroke-dasharray="3 2" stroke-linejoin="round"/></g>`;
  }
  const parts = SKILLS.map((k, i) => {
    if (!inSlot[i]) return null;
    const [x, y, z, a] = slotAt(i, rot);
    return { d: depthOf([x, y, z]), svg: upright(x, y, z, a, k.id, marks?.[k.id]) };
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
      return boxCorners(x - W - 2, y - L / 2 - 2, TOP, x + W + 2, y + L / 2 + 2, TOP + 14);
    }
    case 'script':
      return boxCorners(SCRIPT_AT[0] - 7, SCRIPT_AT[1] - 5, TOP, SLIP_AT[0] + 4, SCRIPT_AT[1] + 5, TOP + 12);
    case 'outsider':
      return boxCorners(
        OUT_AT[0] - W - 1,
        OUT_AT[1] - L / 2 - 1,
        TOP,
        OUT_AT[0] + W + 1,
        OUT_AT[1] + L / 2 + 1,
        TOP + 10,
      );
    case 'bin':
      return boxCorners(BIN_AT[0] - 6, BIN_AT[1] - 6, BH, BIN_AT[0] + 6, BIN_AT[1] + 6, BH + 16);
  }
}

const pill = (p: number[], dx: number, dy: number, text: string, on: boolean, k: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), on, k)}</g>`;
/** A step's callout: a lit pill a row above its part's name pill, offset the same way. */
const callout = (p: number[], dx: number, dy: number, text: string, k: number) =>
  `<g class="callout" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), true, k)}</g>`;

/** Shadows and the pieces that never move in a motion: the people, the machine and the desk's frame. */
function setting(s: Carousel, top: SceneCtx['top']) {
  const state: ModelState | undefined = s.tally
    ? s.tally.right === s.tally.of
      ? 'ok'
      : 'warn'
    : !s.ticket
      ? undefined
      : s.mode === 'prompt' || !s.open || misfit(s)
        ? 'warn'
        : 'ok';
  const m = modelMachine(MODEL[0], MODEL[1], 1, state),
    rosa = person({ x: ROSA[0], y: ROSA[1], facing: 60, look: 'rosa' });
  // chapter 6's waste bin, by the near end of the desk
  const b = s.outsider ? bin({ x: BIN_AT[0], y: BIN_AT[1], r: 5.5, h: 12, pal: DARK }) : null;
  return {
    shadow:
      castShadow(boxCorners(CX - R - 9, CY - R - 9, BH, CX + R + 9, CY + R + 9, POST), BH, top) +
      castShadow(boxCorners(DESK.x0, DESK.y0, BH, DESK.x1, DESK.y1, DESK.z1), BH, top) +
      m.shadow +
      rosa.shadow +
      (b?.shadow ?? ''),
    items: [
      ...m.items.map(i => ({ ...i, svg: `<g data-part="model">${i.svg}</g>` })),
      ...rosa.items,
      ...(b ? b.items.map(i => ({ ...i, svg: `<g data-part="bin">${i.svg}</g>` })) : []),
    ],
  };
}

/** Where a part's name pill sits: its anchor and offset, clear of Rosa and of each other. */
function pillPlace(
  part: CarouselPart,
  s: Carousel,
  v: SceneView,
): { at: number[]; dx: number; dy: number; cdx?: number; cdy?: number } {
  switch (part) {
    case 'carousel':
      return { at: [CX, CY, POST + 2], dx: -10, dy: -16, cdx: 72, cdy: -40 };
    case 'model':
      return { at: [MODEL[0], MODEL[1], BH + 36], dx: 6, dy: -14 };
    case 'ticket':
      return { at: [TRAY.x0 + 2, TRAY.y1, TOP + 3], dx: -24, dy: 22 };
    case 'desk':
      return { at: [DESK.x1 - 6, DESK.y1, TOP], dx: 24, dy: 18 };
    case 'binder': {
      // on the cover of the open binder: the one on the desk, or the lit one lifted from the pile
      const i = s.mode === 'prompt' && s.lit ? idx(s.lit) : -1;
      const b = i >= 0 ? pileAt(i, v.zoomT > 0) : { x: SPOT[0], y: SPOT[1], z: TOP + 0.4, yaw: 0 };
      const a = rad(b.yaw);
      const at = [b.x + (Math.cos(a) * W) / 2, b.y + (Math.sin(a) * W) / 2, b.z + 0.4];
      // the lit binder (zoomed) names itself to the right; the open one below-left, on the floor in front of the desk,
      // its callout below-right, a row lower, so neither its leader nor its pill meets the name pill
      return i >= 0 ? { at, dx: 30, dy: -18 } : { at, dx: -60, dy: 20, cdx: -40, cdy: 62 };
    }
    case 'script':
      return { at: [SCRIPT_AT[0], SCRIPT_AT[1], TOP + 4], dx: 54, dy: 8, cdx: 54, cdy: -24 };
    case 'outsider':
      return { at: [OUT_AT[0], OUT_AT[1], TOP + 1], dx: 22, dy: 36, cdx: 22, cdy: 64 };
    case 'bin':
      return { at: [BIN_AT[0], BIN_AT[1], BH + 12], dx: -20, dy: 26 };
  }
}

/**
 * The pills and the step's callout, for state s. Mid-motion (moving) the binder's and the desk's wait for the end,
 * where their numbers belong; `pulse` (0..1) swells the desk's pill, when a ticket loads the same words again.
 * Drawn by the stage outside the hand-drawn filter, which smears small text; inside it only for the share image.
 */
export function carouselPills(s: Carousel, v: SceneView, opts: { moving?: boolean; pulse?: number } = {}) {
  const phone = !!v.phone,
    say = calloutOf(s.say, v),
    out: string[] = [];
  const on = (part: CarouselPart, text: string, lit: boolean, grow = 1, shift = 0) => {
    const k = pillScale(part, v),
      { at, dx, dy, cdx, cdy } = pillPlace(part, s, v);
    if (k) out.push(pill(at, dx + shift, dy, text, lit, k * grow));
    // the callout a full row beyond the name pill: above a pill that sits above its part, below one that sits below
    if (say && sayFits(say, part, phone))
      out.push(callout(at, (cdx ?? dx) + shift, cdy ?? dy + (dy > 0 ? 38 : -38), say.text, k || 1));
  };
  // a long desk pill slides right, clear of the desk's legs
  const onDesk = (text: string, lit: boolean, grow: number) =>
    on('desk', text, lit, grow, Math.max(0, text.length - 12) * 2.8);
  const tl = s.tally;
  on(
    'carousel',
    tl ? `${tl.right} OF ${tl.of} RIGHT` : phone ? 'SKILLS' : `${SKILLS.length} SKILLS`,
    !!tl && tl.right === tl.of,
  );
  on('model', phone ? 'BOT' : 'ASSISTANT', !!s.ticket);
  on('ticket', 'TICKETS', false);
  // the lit binder is named only while the stage is closed in on it (the reveal), never before
  const named = s.mode === 'skills' ? s.open : v.zoomT > 0 ? s.lit : null;
  if (named && !opts.moving) on('binder', SKILLS[idx(named)].name.toUpperCase(), true);
  if (s.script && s.open && !opts.moving)
    on('script', phone ? 'SCRIPT' : s.script === 'read' ? 'SCRIPT CODE READ' : 'SCRIPT RAN', s.script === 'run');
  if (s.outsider && s.outsider !== 'binned' && !opts.moving)
    on('outsider', s.outsider === 'open' ? 'HIDDEN ORDER' : phone ? 'NEW' : 'DOWNLOADED', s.outsider === 'open');
  if (s.outsider === 'binned' && !opts.moving) on('bin', 'REFUSED', true);
  const again = s.mode === 'prompt' && (s.tickets ?? 1) > 1;
  if (s.ticket && s.words !== undefined && (!opts.moving || opts.pulse !== undefined))
    onDesk(
      phone
        ? 'DESK'
        : tl
          ? `${tl.words.toLocaleString('en-US')} WORDS IN ALL`
          : `${again ? `${s.tickets} TICKETS · ` : ''}${s.words.toLocaleString('en-US')} WORDS${again ? ' EACH' : ''}`,
      s.mode === 'prompt',
      1 + 0.35 * Math.sin(Math.PI * (opts.pulse ?? 0)),
    );
  // callouts last, so no name pill covers one
  return [
    ...out.filter(x => !x.startsWith('<g class="callout"')),
    ...out.filter(x => x.startsWith('<g class="callout"')),
  ].join('');
}

interface Drawn {
  rot: number;
  poses: (Pose & { lit?: boolean; wrong?: boolean })[];
  tickets: number[][];
  /** the slot facing the desk is empty because its binder was picked */
  picked: boolean;
  /** the open binder's script (how far its stamp is pressed) and the slip it sent, if any */
  script?: { use: 'read' | 'run'; press: number } | null;
  slip?: number[] | null;
  /** the downloaded binder's place and openness, on the desk or on its way to the bin */
  out?: { x: number; y: number; z: number; o: number } | null;
  marks?: Carousel['marks'];
}
const deskItem = (load: string) => ({
  box: [
    [DESK.x0 - 1, DESK.y0 - 1, BH],
    [DESK.x1 + 1, DESK.y1 + 1, TOP + 2],
  ],
  svg: deskArt(load),
});
const carouselItem = (d: Drawn, free: boolean[]) => ({
  box: [
    [CX - R - 9, CY - R - 9, BH],
    [CX + R + 9, CY + R + 9, POST + 2],
  ],
  svg: carouselArt(d.rot, free, d.picked, d.marks),
});
/** The desk's load, in order: the tray, the tickets, then the binders bottom to top. */
function loadOf(d: Drawn, withTray: boolean) {
  let load = tray(withTray);
  d.tickets.forEach(([x, y], i) => {
    load += ticketArt(x, y, TOP + 0.3, d.tickets.length > 1 && i === d.tickets.length - 1);
  });
  d.poses
    .map((p, i) => ({ p, i }))
    .filter(
      (e): e is { p: Exclude<Pose, { slot: true }> & { lit?: boolean; wrong?: boolean }; i: number } =>
        !('slot' in e.p),
    )
    .sort((a, b) => a.p.z - b.p.z)
    .forEach(
      ({ p, i }) => (load += flat(p.x, p.y, p.z, p.yaw, p.o, SKILLS[i].id, p.lit ? true : p.wrong ? 'wrong' : false)),
    );
  if (d.script) load += scriptArt(d.script.use, d.script.press);
  if (d.slip) load += slipArt(d.slip[0], d.slip[1], d.slip[2] ?? TOP + 0.3);
  if (d.out && d.out.z < TOP + 20) load += outsiderArt(d.out.x, d.out.y, d.out.z, d.out.o);
  return load;
}
/** The whole picture for these moving parts' places. tray: whether the top ticket sits on the tray. */
function art(s: Carousel, v: SceneView, d: Drawn, opts: { tray: boolean }) {
  return (ctx: SceneCtx) => {
    const set = setting(s, ctx.top);
    const items = [
      ...set.items,
      deskItem(loadOf(d, opts.tray)),
      carouselItem(
        d,
        d.poses.map(p => 'slot' in p),
      ),
    ];
    return set.shadow + byDepth(items) + binned(s) + (s.bare ? '' : carouselPills(s, v));
  };
}
/** The refused binder, dropped across the bin's mouth. */
const binned = (s: Carousel) =>
  s.outsider === 'binned' ? flat(BIN_AT[0] + 2, BIN_AT[1], BH + 12.5, 35, 0, 'outsider', false, OUT_PAL) : '';
/** Where the downloaded binder is drawn at rest (on the desk), or none (not here, or binned). */
const outAt = (s: Carousel) =>
  s.outsider && s.outsider !== 'binned'
    ? { x: OUT_AT[0], y: OUT_AT[1], z: TOP + 0.4, o: s.outsider === 'open' ? 1 : 0 }
    : null;

/** The open binder isn't the one the ticket on the desk needs (a wrong pick). */
const misfit = (s: Carousel) => s.mode === 'skills' && !!s.open && !!s.ticket && requestOf(s.ticket).skill !== s.open;
const rest = (s: Carousel, v: SceneView): Drawn => ({
  rot: rotFor(s.facing) + 360 * (s.spin ?? 0),
  // the answer's binder lifts from the pile and rings only while the stage is closed in on it
  poses: posesOf(s).map((p, i) =>
    'slot' in p
      ? p
      : s.lit === SKILLS[i].id && v.zoomT > 0
        ? { ...pileAt(i, true), lit: true }
        : misfit(s) && s.open === SKILLS[i].id
          ? { ...p, wrong: true }
          : p,
  ),
  tickets: ticketsOf(s),
  picked: s.mode === 'skills' && !!s.open,
  script: s.open && s.script ? { use: s.script, press: 0 } : null,
  slip: s.open && s.script === 'run' ? [...SLIP_AT, TOP + 0.3] : null,
  out: outAt(s),
  marks: s.marks,
});

/** The picture at rest: what the stage shows for state s with no motion (the share image too). */
export const carouselStill = (s: Carousel, v: SceneView = { zoomT: 0 }, tray = true) => art(s, v, rest(s, v), { tray });

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
  prev.mode !== s.mode ||
  prev.ticket !== s.ticket ||
  prev.open !== s.open ||
  prev.facing !== s.facing ||
  (prev.tickets ?? 1) !== (s.tickets ?? 1) ||
  prev.script !== s.script ||
  prev.outsider !== s.outsider ||
  (prev.spin ?? 0) !== (s.spin ?? 0);

/** The same words loaded again: a second ticket under the long prompt's pile. */
export const sameWordsAgain = (prev: Carousel, s: Carousel) =>
  s.mode === 'prompt' && !!prev.ticket && (s.tickets ?? 1) > (prev.tickets ?? 1);

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
    // a workbench run turns the carousel a whole way round as it works through the tickets
    rot = turn(r0, r1, ph(0.3, 0.55)) + 360 * lerp(prev.spin ?? 0, s.spin ?? 0, t);
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
  // the new ticket slides from the tray to its place, under any binders already on the desk
  const to = ticketsOf(s),
    had = ticketsOf(prev).length,
    fresh = s.ticket !== prev.ticket || to.length > had;
  const tickets = fresh && to.length ? [...to.slice(0, -1), lerpPt(TRAY_AT, to[to.length - 1], ph(0, 0.25))] : to;
  // the script: its pages land with the binder; a run presses the stamp, and the slip flies to the assistant's end
  const landed = prev.open === s.open || t > 0.85;
  const ran = s.script === 'run' && prev.script !== 'run';
  const slipU = ran ? ph(0.35, 1) : 1;
  const slip =
    s.open && s.script === 'run' && landed
      ? (() => {
          const [x, y, z] = lerpPt([SCRIPT_AT[0], SCRIPT_AT[1], TOP + 6], [...SLIP_AT, TOP + 0.3], slipU);
          return [x, y, z + 10 * Math.sin(Math.PI * slipU)];
        })()
      : null;
  // the downloaded binder: its cover opens, or it flies over to the bin
  const out0 = outAt(prev),
    out1 = outAt(s);
  let out = out1;
  if (out0 && out1 && out0.o !== out1.o) out = { ...out1, o: lerp(out0.o, out1.o, t) };
  else if (out0 && !out1 && s.outsider === 'binned') {
    const [x, y, z] = lerpPt([out0.x, out0.y, out0.z], [BIN_AT[0] + 2, BIN_AT[1], BH + 12.5], t);
    out = { x, y, z: z + 16 * Math.sin(Math.PI * t), o: out0.o * (1 - ph(0, 0.3)) };
  }
  const d: Drawn = {
    rot,
    poses: poses.map((p, i) => (slotFree[i] || !('slot' in p) ? p : { x: -999, y: -999, z: 0, yaw: 0, o: 0 })),
    tickets,
    picked: false,
    script: s.open && s.script && landed ? { use: s.script, press: ran ? ph(0, 0.4) : 0 } : null,
    slip,
    out: out && out.z < TOP + 0.5 ? out : null,
    marks: s.marks,
  };
  const flyingOut =
    out && out.z >= TOP + 0.5 ? flat(out.x, out.y, out.z, 35 * t, out.o, 'outsider', false, OUT_PAL) : '';
  // binders in flight are drawn over everything, in the moving layer, with the carousel and the desk's load
  const fixed = (ctx: SceneCtx) => {
    const set = setting(s, ctx.top);
    return set.shadow + byDepth(set.items) + (s.bare ? '' : carouselPills(s, v, { moving: true }));
  };
  const moving = () => {
    const load = loadOf(
      { ...d, poses: d.poses.map(p => ('slot' in p || p.x > -999 ? p : { slot: true as const })) },
      true,
    );
    return (
      byDepth([
        deskItem(load),
        carouselItem(
          d,
          d.poses.map((p, i) => 'slot' in p && slotFree[i]),
        ),
      ]) +
      flying.map(f => flat(f.p.x, f.p.y, f.p.z, f.p.yaw, f.p.o, SKILLS[f.i].id)).join('') +
      flyingOut
    );
  };
  return { still: fixed, moving };
};

/** The picture in words, for its aria-label. */
export function carouselLabel(s: Carousel): string {
  const named = (id: string) => SKILLS[idx(id)].name;
  const where = s.tally
    ? ''
    : s.mode === 'prompt'
      ? s.ticket
        ? `All ${SKILLS.length} binders lie open on the desk, piled over the ticket${s.lit ? `; the ${named(s.lit)} binder is lit` : ''}.`
        : `${SKILLS.length} binders stand on the carousel; no ticket asked yet.`
      : s.ticket
        ? s.open
          ? `The carousel has turned to ${named(s.open)}, and that binder lies open on the desk; the rest stay on the carousel.`
          : 'A ticket lies on the desk, but no binder came out: no label matched.'
        : `${SKILLS.length} binders stand on the carousel, spines out; no ticket asked yet.`;
  const extra = [
    s.open && s.script === 'read'
      ? 'The binder’s calculator script lies beside it as pages of code, read into the prompt.'
      : '',
    s.open && s.script === 'run'
      ? 'The binder’s calculator script has run on its stamp, and only a small slip went to the assistant.'
      : '',
    s.outsider === 'boxed' ? `A downloaded binder, ${OUTSIDER.name}, lies shut at the end of the desk.` : '',
    s.outsider === 'open' ? `The downloaded binder lies open, a hidden page of orders lit inside it.` : '',
    s.outsider === 'binned' ? 'The downloaded binder lies in the bin, refused.' : '',
    s.tally
      ? `After a run of ${s.tally.of} tickets, ${s.tally.right} picked the right binder; each binder's spine shows green if its tickets found it, red if not.`
      : '',
  ].filter(Boolean);
  return `Larkspur's returns desk beside a revolving carousel of ${SKILLS.length} skill binders. ${where}${extra.length ? ` ${extra.join(' ')}` : ''}`;
}
