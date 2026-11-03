// Approvals' picture: Larkspur's refund office (docs/modules/action-approvals.md). Mail waits in a crate at the back;
// delivered letters land in the in-tray; the assistant (the kit's model machine) reads them at its desk and writes
// refund slips, which roll down a lane to a toll booth with a boom barrier. Rosa keeps the booth: a slip that needs a
// yes waits at the barrier beside an hourglass; flipping it is her yes, and the flipped hourglass stays on the counter as
// a pass, its sand running out. A glass tube of coins is the day's running total, with a tomato ring at the budget.
// Paid slips land in the bin past the barrier, stopped ones in the tray in front. The device is dye: text read from
// outside is violet, the dye flows down the pipe from the in-tray to the assistant, and every slip written after
// carries it. In chapter 6 a second machine with no tools, behind glass, reads the mail instead.
// A living scene (KTD2): scene(prev, state, t, view) → { still, moving }; at t = 1 everything is in the still.
// Words only in pills; every string reaching SVG goes through esc().
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, calloutsLast, esc, sayAt } from '../../lib/iso/blocks';
import { modelMachine, person, type Item, type ModelState } from '../../lib/iso/figures';
import {
  CERAMIC,
  CLEAR,
  DARK,
  INK,
  METAL,
  PALS,
  WOOD,
  box,
  byDepth,
  castShadow,
  cyl,
  matOf,
  pd,
  rod,
  shape,
  tag,
  toneI,
} from '../../lib/iso/core.js';
import { calloutOf, lerp, lerpPt, pillScale, type Scene, type SceneView } from '../../lib/iso/motion';
import type { Say } from '../story/steps';

export const TOLL_BOARD: Board = [6, 18, 180, 104];
/** The parts a step's callout or close-up may name. */
export const TOLL_PARTS = [
  'mail',
  'tray',
  'model',
  'reader',
  'desk',
  'gate',
  'hourglass',
  'coins',
  'paid',
  'stopped',
  'rosa',
] as const;
export type TollPart = (typeof TOLL_PARTS)[number];

export type Zone = 'desk' | 'gate' | 'paid' | 'stopped';
export interface TollSlip {
  id: string;
  dyed: boolean;
  at: Zone;
  /** refund: a slip with a coin; note: a flat page; email: an envelope going outside; summary: words for Rosa */
  kind?: 'refund' | 'note' | 'email' | 'summary';
  /** revealed as harm: a tomato band */
  bad?: boolean;
}
export interface TollPass {
  /** the order it covers, for its pill */
  order: number;
  /** sand left in the top bulb, 1 fresh to 0 run out */
  sand: number;
}
/** What the picture shows. */
export interface Toll {
  /** the dye is on: outside text and what follows it show violet */
  dye: boolean;
  /** letters waiting in the crate */
  mail: number;
  /** the in-tray's letters, oldest first: dyed or not */
  tray: boolean[];
  slips: TollSlip[];
  passes: TollPass[];
  /** paid out today (£) and the day's budget, or none */
  spent: number;
  budget: number | null;
  /** chapter 6: a reader with no tools reads the mail behind glass */
  two?: boolean;
  /** a slip id, or 'pass' (the newest hourglass), ringed in the accent colour */
  lit?: string | null;
  say?: Say;
}

const DYE = matOf('#a77ae0');
const COIN = PALS.mustard;
const BAD = PALS.tomato;
// the furniture
const CRATE = { x0: 10, x1: 24, y0: 48, y1: 62, z1: BH + 8 };
const TABLE = { x0: 28, x1: 44, y0: 64, y1: 82, z1: BH + 14 };
const TRAY = { x0: 30, x1: 42, y0: 66, y1: 80 };
const DESK = { x0: 52, x1: 84, y0: 64, y1: 86, z1: BH + 14 };
const MODEL = [68, 46],
  READER = [26, 32];
const LANE = { x0: 92, x1: 178, y0: 64, y1: 86 };
const GATE = [110, 75];
const BOOTH = { x0: 118, x1: 134, y0: 42, y1: 58, z1: BH + 26 };
const PIVOT = [126, 62];
const ARM = 26;
const COUNTER = { x0: 135, x1: 160, y0: 40, y1: 57, z1: BH + 12 };
const ROSA = [146, 28];
const TUBE = [172, 44],
  TUBE_R = 4,
  TUBE_H = 36,
  PER = 10; // £ per unit of height
const BIN = { x0: 150, x1: 174, y0: 66, y1: 86, z1: BH + 6 };
const STOP = { x0: 98, x1: 120, y0: 88, y1: 102, z1: BH + 3 };
const WAIT_GLASS = [COUNTER.x0 + 5, COUNTER.y1 - 4]; // the hourglass waiting to be flipped, front left
const ON = DESK.z1;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ring = (x: number, y: number, z: number, r: number, n = 20) =>
  Array.from({ length: n }, (_, i) => [
    x + r * Math.cos((i / n) * 2 * Math.PI),
    y + r * Math.sin((i / n) * 2 * Math.PI),
    z,
  ]);
/** an accent ring on the floor round a lit piece: a mark no other piece has */
const glow = (x: number, y: number, z: number, r: number) =>
  `<path d="${pd(ring(x, y, z, r))}" fill="none" stroke="var(--accent,#f4b829)" stroke-width="3.2"/><path d="${pd(ring(x, y, z, r))}" fill="none" stroke="${INK}" stroke-width=".7"/>`;

/** A letter lying flat: cream, or violet with outside text; a stamp in its corner. */
function letterArt(x: number, y: number, z: number, dyed: boolean) {
  const m = dyed ? DYE : CERAMIC;
  return `<g data-letter="${dyed ? 'dyed' : 'clean'}">${box(x - 4.5, y - 3, z, x + 4.5, y + 3, z + 0.8, m, toneI, 0.7)}${shape(
    [
      [x + 2, y - 2.4, z + 0.85],
      [x + 3.8, y - 2.4, z + 0.85],
      [x + 3.8, y - 0.8, z + 0.85],
      [x + 2, y - 0.8, z + 0.85],
    ],
    PALS.tomato.l,
    0.4,
  )}</g>`;
}

/** A slip the assistant wrote. */
function slipArt(sl: TollSlip, x: number, y: number, z0: number, lit: boolean) {
  const z = lit ? z0 + 3 : z0; // a lit slip sits on top of its pile
  const m = sl.dyed ? DYE : CERAMIC,
    k = sl.kind ?? 'refund';
  let s = lit ? glow(x, y, z, 7) : '';
  const h = k === 'refund' ? 3.5 : 1;
  s += box(x - 4, y - 3, z, x + 4, y + 3, z + h, m, toneI, lit ? 1.6 : 0.8);
  if (k === 'refund') s += cyl(x, y, z + h, z + h + 0.8, 1.8, COIN, toneI, 0.6, 12);
  if (k === 'email')
    s += `<path d="${pd(
      [
        [x - 4, y - 3, z + h + 0.05],
        [x, y, z + h + 0.05],
        [x + 4, y - 3, z + h + 0.05],
      ],
      false,
    )}" fill="none" stroke="${INK}" stroke-width=".6"/>`;
  if (k === 'note' || k === 'summary')
    for (const dy of [-1.2, 0.8])
      s += `<path d="${pd(
        [
          [x - 2.8, y + dy, z + h + 0.05],
          [x + 2.8, y + dy, z + h + 0.05],
        ],
        false,
      )}" fill="none" stroke="${INK}" stroke-width=".5"/>`;
  if (sl.bad)
    s += shape(
      [
        [x - 4.05, y - 0.9, z + h + 0.1],
        [x + 4.05, y - 0.9, z + h + 0.1],
        [x + 4.05, y + 0.9, z + h + 0.1],
        [x - 4.05, y + 0.9, z + h + 0.1],
      ],
      BAD.l,
      0.5,
    );
  return `<g data-slip="${esc(sl.id)}" data-at="${sl.at}" data-dyed="${sl.dyed ? 1 : 0}"${sl.bad ? ' data-bad="1"' : ''}${lit ? ' data-lit="1"' : ''}>${s}</g>`;
}

/** An hourglass: wooden ends, two glass bulbs, sand in the top (`sand`) and the rest in the bottom. squash: 1 standing,
 * towards 0 mid-flip (its height shrinks as it turns over). */
function hourglass(x: number, y: number, z: number, sand: number, lit: boolean, squash = 1) {
  const H = 16 * Math.max(0.15, squash),
    half = H / 2,
    r = 3.4;
  let s = lit ? glow(x, y, z, 6) : '';
  // a pass whose sand has run out gets tomato ends: spent
  const end = sand <= 0.01 && !lit ? BAD : WOOD;
  s += cyl(x, y, z, z + 1.2, 3.4, end, toneI, 0.8, 14);
  const lo = z + 1.2,
    mid = lo + half - 1.2,
    hi = z + H - 1.2;
  const bottom = (1 - sand) * (half - 1.6),
    top = sand * (half - 1.6);
  s += cyl(x, y, lo, mid, r, CLEAR, toneI, 0.7, 14);
  if (bottom > 0.2) s += cyl(x, y, lo, lo + bottom, r - 0.5, COIN, toneI, 0.4, 12);
  s += rod([x, y, mid], [x, y, mid + 1.2], 0.6, CLEAR, toneI, 0.5);
  s += cyl(x, y, mid + 1.2, hi, r, CLEAR, toneI, 0.7, 14);
  if (top > 0.2) s += cyl(x, y, hi - top, hi, r - 0.5, COIN, toneI, 0.4, 12);
  s += cyl(x, y, hi, hi + 1.2, 3.4, end, toneI, 0.8, 14);
  return `<g data-glass="${sand <= 0.01 ? 'out' : 'live'}">${s}</g>`;
}

/** The boom barrier: a post at the booth and a striped arm across the lane, `up` 0 (down) to 1 (raised). */
function barrier(up: number) {
  const [px, py] = PIVOT,
    z = BH + 10,
    a = (up * Math.PI) / 2.2;
  const end = [px, py + ARM * Math.cos(a), z + ARM * Math.sin(a)];
  let s = box(px - 2, py - 2, BH, px + 2, py + 2, z + 2, DARK, toneI, 1);
  const seg = 4;
  for (let i = 0; i < seg; i++) {
    const a0 = lerpPt([px, py, z], end, i / seg),
      a1 = lerpPt([px, py, z], end, (i + 1) / seg);
    s += rod(a0, a1, 1.2, i % 2 ? BAD : CERAMIC, toneI, 0.8);
  }
  return `<g data-part="gate" data-up="${up >= 0.5 ? 1 : 0}">${s}</g>`;
}

/** Where slip i of n in a zone sits, at rest. */
function slipAt(zone: Zone, i: number): number[] {
  switch (zone) {
    case 'desk':
      return [57 + (i % 4) * 7.5, 79 - Math.floor(i / 4) * 7, ON + 0.2];
    case 'gate':
      return [GATE[0], GATE[1], BH + 1];
    case 'paid':
      return [155 + (i % 3) * 8, 71 + (Math.floor(i / 3) % 2) * 8, BH + 1 + Math.floor(i / 6) * 4];
    case 'stopped':
      return [103 + (i % 3) * 8, 92 + (Math.floor(i / 3) % 2) * 7, BH + 3.2 + Math.floor(i / 6) * 4];
  }
}
const SPAWN = [MODEL[0] + 14, MODEL[1] + 14, BH + 18];
const passAt = (i: number) => [COUNTER.x0 + 11 + i * 6.5, COUNTER.y0 + 4.5, COUNTER.z1];

interface Drawn {
  mail: number;
  /** letters in the tray, with any letter in flight */
  tray: { dyed: boolean; p: number[] }[];
  slips: { sl: TollSlip; p: number[] }[];
  passes: { p: number[]; sand: number; squash: number; order: number }[];
  /** the hourglass waiting at the counter's front for a yes, and how far through its flip */
  waiting: number | null;
  up: number;
  /** dye along each pipe, 0..1 */
  pipe1: number;
  pipe2: number;
  coins: number;
}

const trayP = (i: number) => [
  (TRAY.x0 + TRAY.x1) / 2 + (i % 2) * 1.2,
  (TRAY.y0 + TRAY.y1) / 2,
  TABLE.z1 + 1.2 + i * 0.9,
];
const mailP = (i: number) => [(CRATE.x0 + CRATE.x1) / 2, (CRATE.y0 + CRATE.y1) / 2, CRATE.z1 + i * 0.9];
/** the dye reaches the assistant once a dyed letter was read, and the lane once a dyed slip left the desk */
const pipesOf = (s: Toll) => ({
  pipe1: s.dye && s.tray.some(Boolean) ? 1 : 0,
  pipe2: s.dye && !s.two && s.slips.some(x => x.dyed && x.at !== 'desk') ? 1 : 0,
});

function zoneIndex(s: Toll) {
  const n: Record<Zone, number> = { desk: 0, gate: 0, paid: 0, stopped: 0 };
  return s.slips.map(sl => slipAt(sl.at, n[sl.at]++));
}

const rest = (s: Toll): Drawn => {
  const at = zoneIndex(s);
  return {
    mail: s.mail,
    tray: s.tray.map((dyed, i) => ({ dyed, p: trayP(i) })),
    slips: s.slips.map((sl, i) => ({ sl, p: at[i] })),
    passes: s.passes.map((p, i) => ({ p: passAt(i), sand: p.sand, squash: 1, order: p.order })),
    waiting: s.slips.some(x => x.at === 'gate') ? 1 : null,
    up: 0,
    ...pipesOf(s),
    coins: s.spent,
  };
};

/** The pipes: from the in-tray to whoever reads (the assistant, or the reader in chapter 6), and from the assistant down
 * to the lane; dye fills each from its start. */
function pipes(d: Drawn, two: boolean) {
  const z = BH + 12;
  const p1 = two
    ? [
        [36, 64, z],
        [36, 44, z],
        [READER[0] + 10, 44, z],
      ]
    : [
        [36, 64, z],
        [36, 46, z],
        [MODEL[0] - 14, 46, z],
      ];
  const p2 = [
    [MODEL[0] + 14, 40, z],
    [96, 40, z],
    [96, 66, z],
    [96, 72, BH + 2],
  ];
  const run = (pts: number[][], fill: number) => {
    let s = '';
    const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1], p[2] - pts[i][2]));
    const total = lens.reduce((a, b) => a + b, 0);
    let walked = 0;
    pts.slice(1).forEach((b, i) => {
      const a = pts[i],
        L = lens[i],
        u = clamp01((fill * total - walked) / L);
      if (u > 0) s += rod(a, lerpPt(a, b, u), 1.5, DYE, toneI, 0.8);
      if (u < 1) s += rod(lerpPt(a, b, u), b, 1.5, METAL, toneI, 0.8);
      walked += L;
    });
    return s;
  };
  return {
    one: `<g data-pipe="in" data-dyed="${d.pipe1 >= 1 ? 1 : 0}">${run(p1, d.pipe1)}</g>`,
    two: two ? '' : `<g data-pipe="out" data-dyed="${d.pipe2 >= 1 ? 1 : 0}">${run(p2, d.pipe2)}</g>`,
  };
}

/** The coin tube: coins up to the day's total, a tomato ring at the budget, the glass drawn round them. */
function tube(coins: number, budget: number | null) {
  const [x, y] = TUBE,
    z0 = BH + 2;
  let s = cyl(x, y, BH, z0, TUBE_R + 2, DARK, toneI, 1, 18);
  const h = Math.min(TUBE_H, coins / PER);
  if (h > 0.2) s += cyl(x, y, z0, z0 + h, TUBE_R - 0.6, COIN, toneI, 0.9, 16);
  if (budget !== null) {
    const zb = z0 + budget / PER;
    s += `<path d="${pd(ring(x, y, zb, TUBE_R + 1.6))}" fill="none" stroke="${BAD.m}" stroke-width="2.6"/>`;
  }
  const A = ring(x, y, z0, TUBE_R),
    B = ring(x, y, z0 + TUBE_H, TUBE_R);
  s += `<path d="${pd(B)}" fill="${CLEAR.l}" fill-opacity=".35" stroke="${INK}" stroke-width=".8"/>`;
  s += `<path d="${pd([A[5], B[5]], false)}${pd([A[15], B[15]], false)}" fill="none" stroke="${INK}" stroke-width="1"/>`;
  return `<g data-part="coins" data-spent="${Math.round(coins)}">${s}</g>`;
}

/** The setting: the furniture, the booth, the people and the machines (never moves). */
function setting(s: Toll, top: SceneCtx['top']) {
  const waits = s.slips.some(x => x.at === 'gate');
  const state: ModelState | undefined = s.dye && s.tray.some(Boolean) && !s.two ? 'warn' : undefined;
  const m = modelMachine(MODEL[0], MODEL[1], 0.8, state),
    rosa = person({ x: ROSA[0], y: ROSA[1], facing: 90, pose: waits ? 'reach' : 'stand', look: 'rosa' });
  const items: Item[] = [
    ...m.items.map(i => ({ ...i, svg: `<g data-part="model">${i.svg}</g>` })),
    ...rosa.items.map(i => ({ ...i, svg: `<g data-part="rosa">${i.svg}</g>` })),
  ];
  let shadow = m.shadow + rosa.shadow;
  if (s.two) {
    const r = modelMachine(READER[0], READER[1], 0.6, s.tray.some(Boolean) ? 'warn' : undefined, undefined, {
      pal: matOf('#cfc8b8'),
    });
    items.push(...r.items.map(i => ({ ...i, svg: `<g data-part="reader">${i.svg}</g>` })));
    shadow += r.shadow;
    // the glass wall between the reader and the planner's desk
    items.push({
      box: [
        [45, 22, BH],
        [47, 60, BH + 30],
      ],
      svg: `<g data-glass-wall="1">${shape(
        [
          [46, 22, BH],
          [46, 60, BH],
          [46, 60, BH + 30],
          [46, 22, BH + 30],
        ],
        CLEAR.l,
        1.2,
      ).replace('<path d', '<path fill-opacity=".55" d')}</g>`,
    });
  }
  // booth: a hut with a window and a flat roof
  const { x0, x1, y0, y1, z1 } = BOOTH;
  let booth = box(x0, y0, BH, x1, y1, z1, PALS.cobalt, toneI, 1.3);
  booth += shape(
    [
      [x0 + 3, y1 + 0.05, BH + 12],
      [x1 - 3, y1 + 0.05, BH + 12],
      [x1 - 3, y1 + 0.05, z1 - 4],
      [x0 + 3, y1 + 0.05, z1 - 4],
    ],
    CLEAR.l,
    0.8,
  );
  booth += box(x0 - 2, y0 - 2, z1, x1 + 2, y1 + 2, z1 + 2.5, CERAMIC, toneI, 1.2);
  items.push({
    box: [
      [x0 - 2, y0 - 2, BH],
      [x1 + 2, y1 + 2, z1 + 3],
    ],
    svg: `<g data-booth="1">${booth}</g>`,
  });
  shadow +=
    castShadow(boxCorners(BOOTH.x0, BOOTH.y0, BH, BOOTH.x1, BOOTH.y1, BOOTH.z1), BH, top) +
    castShadow(boxCorners(DESK.x0, DESK.y0, BH, DESK.x1, DESK.y1, DESK.z1), BH, top) +
    castShadow(boxCorners(TABLE.x0, TABLE.y0, BH, TABLE.x1, TABLE.y1, TABLE.z1), BH, top) +
    castShadow(boxCorners(COUNTER.x0, COUNTER.y0, BH, COUNTER.x1, COUNTER.y1, COUNTER.z1), BH, top) +
    castShadow(boxCorners(TUBE[0] - 5, TUBE[1] - 5, BH, TUBE[0] + 5, TUBE[1] + 5, BH + TUBE_H), BH, top);
  return { shadow, items };
}

/** The lane: a dark strip the slips roll along, with a stop line at the barrier. */
const lane = () =>
  shape(
    [
      [LANE.x0, LANE.y0, BH + 0.1],
      [LANE.x1, LANE.y0, BH + 0.1],
      [LANE.x1, LANE.y1, BH + 0.1],
      [LANE.x0, LANE.y1, BH + 0.1],
    ],
    DARK.l,
    1,
  ) +
  shape(
    [
      [PIVOT[0] - 3, LANE.y0 + 1, BH + 0.15],
      [PIVOT[0] - 1.5, LANE.y0 + 1, BH + 0.15],
      [PIVOT[0] - 1.5, LANE.y1 - 1, BH + 0.15],
      [PIVOT[0] - 3, LANE.y1 - 1, BH + 0.15],
    ],
    CERAMIC.l,
    0.4,
  );

/** Points of a part's footprint, for close-ups and in-picture targets. */
export function partBox(part: TollPart, _s?: Toll): number[][] {
  switch (part) {
    case 'mail':
      return boxCorners(CRATE.x0, CRATE.y0, BH, CRATE.x1, CRATE.y1, CRATE.z1 + 6);
    case 'tray':
      return boxCorners(TABLE.x0, TABLE.y0, BH, TABLE.x1, TABLE.y1, TABLE.z1 + 6);
    case 'model':
      return boxCorners(MODEL[0] - 14, MODEL[1] - 14, BH, MODEL[0] + 14, MODEL[1] + 14, BH + 30);
    case 'reader':
      return boxCorners(READER[0] - 10, READER[1] - 10, BH, READER[0] + 10, READER[1] + 10, BH + 22);
    case 'desk':
      return boxCorners(DESK.x0, DESK.y0, BH, DESK.x1, DESK.y1, ON + 6);
    case 'gate':
      return boxCorners(GATE[0] - 6, LANE.y0, BH, PIVOT[0] + 3, LANE.y1, BH + 14);
    case 'hourglass':
      return boxCorners(COUNTER.x0, COUNTER.y0, COUNTER.z1, COUNTER.x1, COUNTER.y1, COUNTER.z1 + 17);
    case 'coins':
      return boxCorners(TUBE[0] - 6, TUBE[1] - 6, BH, TUBE[0] + 6, TUBE[1] + 6, BH + TUBE_H + 2);
    case 'paid':
      return boxCorners(BIN.x0, BIN.y0, BH, BIN.x1, BIN.y1, BIN.z1 + 6);
    case 'stopped':
      return boxCorners(STOP.x0, STOP.y0, BH, STOP.x1, STOP.y1, STOP.z1 + 6);
    case 'rosa':
      return boxCorners(ROSA[0] - 6, ROSA[1] - 6, BH, ROSA[0] + 6, ROSA[1] + 6, BH + 30);
  }
}

const pill = (p: number[], dx: number, dy: number, text: string, on: boolean, k: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), on, k)}</g>`;
const money = (n: number) => `£${Math.round(n)}`;

/** The label pills, drawn outside the ink filter (PillLayer). Mid-motion only the setting's names show; counts wait
 * for the end, where their numbers belong. */
export function tollPills(s: Toll, v: SceneView, moving = false) {
  const phone = !!v.phone,
    out: string[] = [];
  const on = (p: TollPart, at: number[], dx: number, dy: number, text: string, lit = false) => {
    const sc = pillScale(p, v);
    if (sc) out.push(pill(at, dx, dy, text, lit, sc));
    out.push(sayAt(calloutOf(s.say, v), p, at, dy - 10, sc || 1, phone));
  };
  on('mail', [17, 55, CRATE.z1 + 4], -8, -18, phone ? 'MAIL' : `MAIL ${s.mail}`);
  on('tray', [36, 80, TABLE.z1 + 2], -6, 26, 'IN-TRAY');
  on('model', [MODEL[0], MODEL[1], BH + 30], 0, -14, s.two ? 'PLANNER' : phone ? 'BOT' : 'ASSISTANT');
  if (s.two) on('reader', [READER[0], READER[1], BH + 22], -6, -14, 'READER');
  on('rosa', [ROSA[0], ROSA[1], BH + 30], -4, -14, 'ROSA');
  if (moving) return calloutsLast(out.filter(Boolean));
  const waits = s.slips.some(x => x.at === 'gate');
  on('gate', [PIVOT[0], LANE.y1, BH + 10], 6, 22, waits ? 'WAITING' : 'BARRIER', waits);
  const last = s.passes.at(-1);
  if (last || waits)
    on(
      'hourglass',
      waits
        ? [WAIT_GLASS[0], WAIT_GLASS[1], COUNTER.z1 + 12]
        : [passAt(s.passes.length - 1)[0], COUNTER.y0 + 5, COUNTER.z1 + 12],
      -22,
      -8,
      waits
        ? phone
          ? 'FLIP'
          : 'FLIP TO APPROVE'
        : last!.sand <= 0.01
          ? 'EXPIRED'
          : phone
            ? `#${last!.order}`
            : `ORDER ${last!.order}`,
      waits,
    );
  on(
    'coins',
    [TUBE[0], TUBE[1], BH + TUBE_H + 2],
    18,
    -12,
    s.budget !== null && !phone ? `${money(s.spent)} OF ${money(s.budget)}` : money(s.spent),
  );
  const count = (z: Zone) => s.slips.filter(x => x.at === z && (x.kind ?? 'refund') === 'refund').length;
  on('paid', [BIN.x1 - 4, BIN.y1, BIN.z1], 6, 18, `PAID ${count('paid')}`);
  if (count('stopped')) on('stopped', [STOP.x0 + 4, STOP.y1, STOP.z1], -8, 18, `STOPPED ${count('stopped')}`);
  if (s.slips.some(x => x.at === 'desk') && !phone) on('desk', [DESK.x0 + 6, DESK.y1, ON], -14, 18, 'WRITTEN');
  return calloutsLast(out.filter(Boolean));
}

/** The pieces that move in a motion, as depth-sorted items. */
function dynamic(s: Toll, d: Drawn): Item[] {
  const items: Item[] = [];
  const at = (x: number, y: number, z: number, r: number, h: number) => [
    [x - r, y - r, z],
    [x + r, y + r, z + h],
  ];
  // the crate and its waiting letters
  let crate = box(CRATE.x0, CRATE.y0, BH, CRATE.x1, CRATE.y1, CRATE.z1, WOOD, toneI, 1.2);
  for (let i = 0; i < Math.min(d.mail, 8); i++) crate += letterArt(mailP(i)[0], mailP(i)[1], mailP(i)[2], s.dye);
  items.push({
    box: [
      [CRATE.x0, CRATE.y0, BH],
      [CRATE.x1, CRATE.y1, CRATE.z1 + 8],
    ],
    svg: `<g data-part="mail">${crate}</g>`,
  });
  // the in-tray on its table, with its letters (a letter in flight is drawn on its own)
  let tray = box(TRAY.x0, TRAY.y0, TABLE.z1, TRAY.x1, TRAY.y1, TABLE.z1 + 1, METAL, toneI, 0.9);
  const flying: { dyed: boolean; p: number[] }[] = [];
  d.tray.forEach(l => {
    if (l.p[2] > TABLE.z1 + 9 || l.p[0] < TRAY.x0) flying.push(l);
    else tray += letterArt(l.p[0], l.p[1], l.p[2], l.dyed);
  });
  tray += box(TRAY.x0, TRAY.y1 - 1, TABLE.z1, TRAY.x1, TRAY.y1, TABLE.z1 + 3, METAL, toneI, 0.9);
  items.push({
    box: [
      [TABLE.x0, TABLE.y0, BH],
      [TABLE.x1, TABLE.y1, TABLE.z1 + 4],
    ],
    svg: `<g data-part="tray" data-letters="${s.tray.length}">${setLegs(TABLE)}${tray}</g>`,
  });
  for (const l of flying)
    items.push({ box: at(l.p[0], l.p[1], l.p[2], 4, 1), svg: letterArt(l.p[0], l.p[1], l.p[2], l.dyed) });
  // the desk with the slips lying on it, as one item
  let desk = setLegs(DESK);
  const loose: { sl: TollSlip; p: number[] }[] = [];
  for (const e of d.slips) {
    const onDesk =
      e.p[0] >= DESK.x0 &&
      e.p[0] <= DESK.x1 &&
      e.p[1] >= DESK.y0 &&
      e.p[1] <= DESK.y1 &&
      Math.abs(e.p[2] - ON - 0.2) < 0.01;
    if (onDesk) desk += slipArt(e.sl, e.p[0], e.p[1], e.p[2], s.lit === e.sl.id);
    else loose.push(e);
  }
  items.push({
    box: [
      [DESK.x0, DESK.y0, BH],
      [DESK.x1, DESK.y1, ON + 3],
    ],
    svg: `<g data-part="desk">${desk}</g>`,
  });
  // the counter, the passes on it, and the hourglass waiting at its front
  let counter = setLegs(COUNTER);
  d.passes.forEach(
    (p, i) =>
      void (counter += hourglass(
        p.p[0],
        p.p[1],
        p.p[2],
        p.sand,
        s.lit === 'pass' && i === d.passes.length - 1,
        p.squash,
      )),
  );
  if (d.waiting !== null)
    counter += `<g data-waiting="1">${hourglass(WAIT_GLASS[0], WAIT_GLASS[1], COUNTER.z1, 0, true, d.waiting)}</g>`;
  items.push({
    box: [
      [COUNTER.x0, COUNTER.y0, BH],
      [COUNTER.x1, COUNTER.y1, COUNTER.z1 + 13],
    ],
    svg: `<g data-part="hourglass" data-passes="${s.passes.length}">${counter}</g>`,
  });
  // the bins
  let bin = box(BIN.x0, BIN.y0, BH, BIN.x1, BIN.y1, BH + 1, PALS.mint, toneI, 1);
  bin += box(BIN.x0, BIN.y0, BH + 1, BIN.x0 + 1.2, BIN.y1, BIN.z1, PALS.mint, toneI, 0.9);
  bin += box(BIN.x0, BIN.y0, BH + 1, BIN.x1, BIN.y0 + 1.2, BIN.z1, PALS.mint, toneI, 0.9);
  let stop = box(STOP.x0, STOP.y0, BH, STOP.x1, STOP.y1, STOP.z1, BAD, toneI, 1);
  const inBin = (p: number[], b: typeof BIN) => p[0] >= b.x0 && p[0] <= b.x1 && p[1] >= b.y0 && p[1] <= b.y1;
  const rest2: typeof loose = [];
  for (const e of loose) {
    if (inBin(e.p, BIN) && e.p[2] < BH + 12) bin += slipArt(e.sl, e.p[0], e.p[1], e.p[2], s.lit === e.sl.id);
    else if (inBin(e.p, STOP) && e.p[2] < BH + 12) stop += slipArt(e.sl, e.p[0], e.p[1], e.p[2], s.lit === e.sl.id);
    else rest2.push(e);
  }
  bin += box(BIN.x0, BIN.y1 - 1.2, BH + 1, BIN.x1, BIN.y1, BIN.z1, PALS.mint, toneI, 0.9);
  bin += box(BIN.x1 - 1.2, BIN.y0, BH + 1, BIN.x1, BIN.y1, BIN.z1, PALS.mint, toneI, 0.9);
  items.push({
    box: [
      [BIN.x0, BIN.y0, BH],
      [BIN.x1, BIN.y1, BIN.z1 + 4],
    ],
    svg: `<g data-part="paid">${bin}</g>`,
  });
  items.push({
    box: [
      [STOP.x0, STOP.y0, BH],
      [STOP.x1, STOP.y1, STOP.z1 + 4],
    ],
    svg: `<g data-part="stopped">${stop}</g>`,
  });
  for (const e of rest2)
    items.push({
      box: at(e.p[0], e.p[1], e.p[2], 4, 4),
      svg: slipArt(e.sl, e.p[0], e.p[1], e.p[2], s.lit === e.sl.id),
    });
  // the barrier and the coin tube
  items.push({
    box: [
      [PIVOT[0] - 2, PIVOT[1] - 2, BH],
      [PIVOT[0] + 2, LANE.y1, BH + 12],
    ],
    svg: barrier(d.up),
  });
  items.push({
    box: [
      [TUBE[0] - 5, TUBE[1] - 5, BH],
      [TUBE[0] + 5, TUBE[1] + 5, BH + TUBE_H + 2],
    ],
    svg: tube(d.coins, s.budget),
  });
  return items;
}
function setLegs(t: { x0: number; x1: number; y0: number; y1: number; z1: number }) {
  let l = '';
  for (const [lx, ly] of [
    [t.x0 + 1, t.y0 + 1],
    [t.x1 - 4, t.y0 + 1],
    [t.x0 + 1, t.y1 - 4],
    [t.x1 - 4, t.y1 - 4],
  ])
    l += box(lx, ly, BH, lx + 3, ly + 3, t.z1 - 2.5, WOOD, toneI, 0.8);
  return l + box(t.x0, t.y0, t.z1 - 2.5, t.x1, t.y1, t.z1, WOOD, toneI, 1.2);
}

/** The whole picture for these moving parts' places. */
function art(s: Toll, d: Drawn) {
  return (ctx: SceneCtx) => {
    const set = setting(s, ctx.top);
    const p = pipes(d, !!s.two);
    return set.shadow + lane() + p.one + p.two + byDepth([...set.items, ...dynamic(s, d)]);
  };
}

/** The picture at rest: what the stage shows for state s with no motion (the share image too). */
export const tollStill = (s: Toll) => art(s, rest(s));

/** The picture with the top letter lifted off the crate (the hit layer draws it under the pointer). */
export const tollLifted = (s: Toll) => art(s, { ...rest(s), mail: Math.max(0, s.mail - 1) });
/** The letter being dragged, as drawn on top of the crate. */
export const topLetter = (s: Toll) => {
  const p = mailP(Math.max(0, Math.min(s.mail, 8) - 1));
  return letterArt(p[0], p[1], p[2], s.dye);
};

/** Whether going from prev to s moves anything (a change of callout or lit piece alone doesn't). */
export const tollMoves = (prev: Toll, s: Toll) =>
  JSON.stringify([
    prev.mail,
    prev.tray,
    prev.slips.map(x => [x.id, x.at]),
    prev.passes,
    prev.spent,
    prev.dye,
    prev.two,
  ]) !== JSON.stringify([s.mail, s.tray, s.slips.map(x => [x.id, x.at]), s.passes, s.spent, s.dye, s.two]);

/** Approvals' living scene. In order: a letter flies from the crate to the in-tray (0–0.3); the dye runs down the pipe
 * to the assistant (0.2–0.45); a flipped hourglass turns over (0–0.35); slips roll from the assistant, or from where
 * they were, to their place, the barrier rising while any slip passes it (0.35–0.85); the dye runs on to the lane
 * (0.4–0.65); the coins rise (0.6–1); an hourglass's sand runs down across the whole change. */
export const tollScene: Scene<Toll> = (prev, s, t) => {
  if (t >= 1 || !tollMoves(prev, s)) return { still: tollStill(s), moving: '' };
  const A = rest(prev),
    B = rest(s);
  const ph = (a: number, b: number) => clamp01((t - a) / (b - a));
  const u1 = ph(0, 0.3);
  const tray = B.tray.map((l, i) =>
    i < A.tray.length
      ? l
      : {
          ...l,
          p: lerpPt(mailP(Math.max(0, prev.mail - 1)), l.p, u1).map((c, k) =>
            k === 2 ? c + 16 * Math.sin(Math.PI * u1) : c,
          ),
        },
  );
  const u2 = ph(0.35, 0.85);
  const was = new Map(prev.slips.map((x, i) => [x.id, A.slips[i].p]));
  const passing = s.slips.some(x => x.at === 'paid' && prev.slips.find(y => y.id === x.id)?.at !== 'paid');
  const slips = B.slips.map(e => {
    const from = was.get(e.sl.id) ?? SPAWN;
    if (from === e.p) return e;
    const p = lerpPt(from, e.p, u2);
    return { ...e, p: [p[0], p[1], p[2] + 8 * Math.sin(Math.PI * u2)] };
  });
  const flip = ph(0, 0.35);
  const passes = B.passes.map((p, i) => {
    const old = A.passes[i];
    if (!old) return { ...p, squash: Math.abs(Math.cos(Math.PI * flip)), sand: flip < 0.5 ? 0 : p.sand };
    return { ...p, sand: lerp(old.sand, p.sand, t) };
  });
  const d: Drawn = {
    mail: Math.min(prev.mail, s.mail) + (u1 < 1 ? 0 : 0),
    tray,
    slips,
    passes,
    waiting:
      B.waiting !== null && A.waiting === null
        ? u2 > 0
          ? 1
          : null
        : A.waiting !== null && B.waiting === null
          ? flip < 1
            ? Math.abs(Math.cos(Math.PI * flip))
            : null
          : B.waiting,
    up: passing ? Math.sin(Math.PI * ph(0.4, 0.9)) : 0,
    pipe1: lerp(A.pipe1, B.pipe1, ph(0.2, 0.45)),
    pipe2: lerp(A.pipe2, B.pipe2, ph(0.4, 0.65)),
    coins: lerp(A.coins, B.coins, ph(0.6, 1)),
  };
  const fixed = (ctx: SceneCtx) => {
    const set = setting(s, ctx.top);
    return set.shadow + lane() + byDepth(set.items);
  };
  const moving = (ctx: SceneCtx) => {
    void ctx;
    const p = pipes(d, !!s.two);
    return p.one + p.two + byDepth(dynamic(s, d));
  };
  return { still: fixed, moving };
};

/** The picture in words, for its aria-label. */
export function tollLabel(s: Toll): string {
  const n = (z: Zone) => s.slips.filter(x => x.at === z).length;
  const dyed = s.slips.filter(x => x.dyed).length;
  const parts = [
    `Larkspur's refund office: ${s.mail} letters waiting, ${s.tray.length} in the in-tray`,
    s.two
      ? 'a reader with no tools reads the mail behind glass, and the planner never sees it'
      : 'the assistant at its desk',
    `${n('paid')} slips paid past the barrier, ${n('stopped')} stopped`,
    n('gate') ? 'one slip waits at the barrier for a yes' : 'nothing waits at the barrier',
    s.dye ? `${dyed} slips carry the violet dye of outside text` : '',
    s.passes.length
      ? `${s.passes.length} hourglass passes on the counter, ${s.passes.filter(p => p.sand <= 0.01).length} run out`
      : '',
    `${money(s.spent)} paid today${s.budget !== null ? ` of a ${money(s.budget)} budget` : ''}`,
  ];
  return `${parts.filter(Boolean).join('; ')}.`;
}
