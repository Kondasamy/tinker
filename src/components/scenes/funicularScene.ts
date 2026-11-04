// Undo for agents' picture: a hillside funicular (docs/modules/agent-undo.md). A cable car climbs a track from the
// valley, where the assistant (the kit's model machine) and Tomás wait, to four stations on terraces cut into the
// hill, one per step of a return: stock (crates), refund (a till with coins), the post box (letters) and the courier
// (a hut with a parcel). Each station's flag says what happened there: done, undone, failed, done twice. When a step
// fails, the car runs back down, stopping at each station to undo it; at the post box a second letter goes in instead.
// A living scene (KTD2): scene(prev, state, t, view) → { still, moving }; at t = 1 everything is in the still.
// Words only in pills; every string reaching SVG goes through esc().
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayFits } from '../../lib/iso/blocks';
import { drawPieces, mini, modelMachine, person, type Item } from '../../lib/iso/figures';
type Mat = { l: string; m: string; d: string };
import {
  CERAMIC,
  CLEAR,
  DARK,
  METAL,
  PALS,
  WOOD,
  box,
  byDepth,
  castShadow,
  cyl,
  ellUV,
  line,
  pd,
  shape,
  tag,
  toneI,
} from '../../lib/iso/core.js';
import { calloutOf, lerp, pillScale, type Scene, type SceneView } from '../../lib/iso/motion';
import { stepOf, type Ev, type Mark, type StepId } from '../../lib/agent-undo/sim';
import type { Say } from '../story/steps';

export const FUNI_BOARD: Board = [0, 0, 180, 164];
/** The parts a step's callout or close-up may name: the four stations by step id (`email` is the post box), the car
 * and the valley station. */
export const FUNI_PARTS = ['stock', 'refund', 'email', 'courier', 'car', 'valley'] as const;
export type FuniPart = (typeof FUNI_PARTS)[number];
export type Where = StepId | 'valley';

/** What the picture shows. */
export interface Funi {
  /** the stations, bottom to top */
  order: StepId[];
  /** where the car stands */
  car: Where;
  /** each station's flag */
  marks: Partial<Record<StepId, Mark>>;
  /** letters in the post box */
  letters: number;
  /** the car's stops on its way here (the run's events), oldest first; without it, the car goes straight */
  route?: Ev[];
  /** the assistant stopped mid-run: the car's lamp is red */
  stopped?: boolean;
  /** stations carrying a save-point peg */
  saves?: StepId[];
  /** stations with an opposite set: a round return sign */
  opp?: StepId[];
  /** the car carries a key tag */
  key?: boolean;
  /** the station ringed */
  lit?: StepId | null;
  say?: Say;
  /** pills are drawn apart, outside the hand-drawn filter (the live stage's PillLayer); the share image keeps them */
  bare?: boolean;
}

// the hill: a wedge rising toward the back (−y); the track runs up it at x = TX, terraces to its left
const TX = 102,
  HX0 = 30,
  HX1 = 124,
  HY0 = 8,
  FOOT = 152,
  SLOPE = 0.42;
const zt = (y: number) => BH + Math.max(0, FOOT - y) * SLOPE;
const SLOT_Y = [124, 96, 68, 40],
  VALLEY_Y = 146,
  PX0 = 38,
  PX1 = 88,
  PH = 11; // a terrace's half depth
const zp = (y: number) => zt(y) + 2;
const MODEL = [152, 124],
  TOMAS = [128, 158];
const GLOW = '#f4b829';

const R = (u0: number, v0: number, u1: number, v1: number) => [
  [u0, v0],
  [u1, v0],
  [u1, v1],
  [u0, v1],
];
const slotOf = (s: Funi, id: StepId) => s.order.indexOf(id);
const yAt = (w: Where, order: StepId[]) => (w === 'valley' ? VALLEY_Y : SLOT_Y[order.indexOf(w)]);

/** the hill, the track and the engine house at the top, as fixed items */
function terrain(): Item[] {
  const top = zt(HY0);
  const grass = { l: '#b9d99a', m: '#9cc27c', d: '#5f7f45' },
    earth = { l: '#cfa77a', m: '#b58a5c', d: '#7a5a38' };
  let s = shape(
    [
      [HX0, FOOT, BH],
      [HX1, FOOT, BH],
      [HX1, HY0, top],
      [HX0, HY0, top],
    ],
    grass.l,
    1.4,
  );
  s += shape(
    [
      [HX1, FOOT, BH],
      [HX1, HY0, BH],
      [HX1, HY0, top],
    ],
    earth.m,
    1.4,
  );
  // the track: sleepers, two rails and the cable between them
  for (let y = FOOT - 4; y > HY0 + 10; y -= 7)
    s += line(
      [
        [TX - 7, y, zt(y) + 0.3],
        [TX + 7, y, zt(y) + 0.3],
      ],
      1.6,
    );
  for (const x of [TX - 5, TX + 5])
    s += line(
      [
        [x, FOOT, BH + 0.6],
        [x, HY0 + 10, zt(HY0 + 10) + 0.6],
      ],
      1.3,
    );
  const items: Item[] = [
    {
      box: [
        [HX0, HY0, BH],
        [HX1, FOOT, top],
      ],
      svg: `<g data-part="hill">${s}</g>`,
    },
  ];
  // the engine house over the top of the track, with its cable wheel
  const ey = HY0 + 2,
    ez = zt(ey + 10);
  let e = box(TX - 11, ey, ez - 3, TX + 11, ey + 10, ez + 12, DARK, toneI, 1.3);
  e += shape(
    ellUV(TX + 3, ez + 5, 5, 5, 16).map(([u, v]) => [u, ey + 10.05, v]),
    METAL.m,
    1.1,
  );
  e += shape(
    ellUV(TX + 3, ez + 5, 1.4, 1.4, 8).map(([u, v]) => [u, ey + 10.1, v]),
    DARK.d,
    0,
  );
  items.push({
    box: [
      [TX - 11, ey, ez - 3],
      [TX + 11, ey + 10, ez + 12],
    ],
    svg: e,
  });
  // the valley platform
  items.push({
    box: [
      [TX - 12, VALLEY_Y - 10, BH - 1],
      [TX + 12, VALLEY_Y + 12, BH + 1],
    ],
    svg: `<g data-part="valley">${box(TX - 12, VALLEY_Y - 10, BH - 1, TX + 12, VALLEY_Y + 12, BH + 1, CERAMIC, toneI, 1.1)}</g>`,
  });
  return items;
}

/** a terrace cut into the hill at slot i, ringed when lit */
function terrace(i: number, lit: boolean): Item {
  const y = SLOT_Y[i],
    z1 = zp(y),
    z0 = zt(y + PH) - 1.5;
  let s = box(PX0, y - PH, z0, PX1, y + PH, z1, { l: '#e7dcc5', m: '#cbbb9c', d: '#9b8a6a' }, toneI, lit ? 2.4 : 1.2);
  if (lit)
    s += `<path d="${pd(R(PX0 - 1.2, y - PH - 1.2, PX1 + 1.2, y + PH + 1.2).map(([u, v]) => [u, v, z1 + 0.1]))}" fill="none" stroke="${GLOW}" stroke-width="3.2" stroke-linejoin="round" data-lit="1"/>`;
  return {
    box: [
      [PX0, y - PH, z0],
      [PX1, y + PH, z1],
    ],
    svg: s,
  };
}

const CX = (PX0 + PX1) / 2 + 2;
/** a station's prop on a terrace at y: crates, a till, the post box, the courier's hut */
function prop(id: StepId, y: number, mark: Mark | undefined, letters: number): string {
  const z = zp(y),
    K = 1.45;
  // the prop's own units, scaled about the terrace's middle
  const p = (a: number, b: number, c: number) => [CX + a * K, y + b * K, z + c * K];
  const bx = (a0: number, b0: number, c0: number, a1: number, b1: number, c1: number, m: Mat, w = 1.1) => {
    const [x0, y0, z0] = p(a0, b0, c0),
      [x1, y1, z1] = p(a1, b1, c1);
    return box(x0, y0, z0, x1, y1, z1, m, toneI, w);
  };
  const flat = (pts: number[][], col: string, w = 1) =>
    shape(
      pts.map(q => p(q[0], q[1], q[2])),
      col,
      w,
    );
  switch (id) {
    case 'stock': {
      // crates on the shelf: 2 to start, a third with the drill back, two more on top restocked twice, 2 once taken off
      const n = mark === 'done' ? 3 : mark === 'twice' ? 5 : 2;
      const spots = [
        [-11, -6, 0],
        [-2, -6, 0],
        [7, -6, 0],
        [-7, -6, 7],
        [2, -6, 7],
      ];
      return spots
        .slice(0, n)
        .map(([a, b, c]) => bx(a, b, c, a + 8.5, b + 7, c + 7, WOOD, 1.3))
        .join('');
    }
    case 'refund': {
      // the till, and a coin on it per refund paid
      let s = bx(-8, -5, 0, 6, 4, 6, PALS.cobalt, 1.3) + bx(-6, -4, 6, 2, -1, 10, DARK);
      const coins = mark === 'done' || mark === 'waiting' ? 1 : mark === 'twice' ? 2 : 0;
      for (let k = 0; k < coins; k++) {
        const [cx, cy, cz] = p(3 - k * 5, 1, 6);
        s += `<g data-coin="${k}">${cyl(cx, cy, cz, cz + 2, 2.4 * K, PALS.mustard, toneI, 1)}</g>`;
      }
      return s;
    }
    case 'email': {
      // the pillar box, and the letters in front of it (the second, a follow-up, edged in mustard)
      const [bx0, by0] = p(-3, -2, 0);
      let s = cyl(bx0, by0, z, z + 12 * K, 3.8 * K, PALS.tomato, toneI, 1.3);
      s += cyl(bx0, by0, z + 12 * K, z + 13.6 * K, 4.4 * K, { l: '#a13a28', m: '#8a2f20', d: '#4a2219' }, toneI, 1.1);
      s += line([p(-5.2, 1.6, 9), p(-1.6, 2, 9)], 1.8);
      for (let k = 0; k < letters; k++) {
        const a = 2 + k * 1.6,
          b = 0.5 + k * 2.2,
          c = 0.3 + k * 0.4;
        s += `<g data-letter="${k}">${flat(
          [
            [a, b, c],
            [a + 8, b, c],
            [a + 8, b + 5.5, c],
            [a, b + 5.5, c],
          ],
          CERAMIC.l,
          1.1,
        )}${flat(
          [
            [a, b, c + 0.05],
            [a + 4, b + 3, c + 0.05],
            [a + 8, b, c + 0.05],
          ],
          k ? PALS.mustard.l : PALS.tomato.m,
          0.8,
        )}</g>`;
      }
      return s;
    }
    case 'courier': {
      // the courier's hut and the parcel waiting; a failed booking crosses the hut's front
      let s = bx(-9, -7, 0, 5, 1, 10, CERAMIC, 1.3);
      s += flat(
        [
          [-10, -8, 10],
          [6, -8, 10],
          [6, 2, 10],
          [-10, 2, 10],
        ],
        PALS.cobalt.m,
        1.2,
      );
      s += bx(-6, 2.5, 0, 0, 7, 4.5, WOOD);
      if (mark === 'failed') s += line([p(-7, 1.1, 1), p(3, 1.1, 9)], 2.6) + line([p(3, 1.1, 1), p(-7, 1.1, 9)], 2.6);
      return s;
    }
  }
}

/** a station's flag pole at the terrace's front-right corner, by the track: the flag's colour, shape and height say
 * its mark (done: green, high; undone: blue, lowered; failed: a red pennant; twice: two yellow flags) */
function flag(y: number, mark: Mark | undefined): string {
  const x = PX1 - 2,
    yy = y + PH - 2,
    z = zp(y),
    top = z + 24;
  let s = line(
    [
      [x, yy, z],
      [x, yy, top],
    ],
    1.6,
  );
  // a flag in the pole's plane facing the track, flying uphill (-y)
  const pen = (zTop: number, col: string, tri = false, w = 12) =>
    shape(
      tri
        ? [
            [x, yy, zTop],
            [x, yy - w, zTop - 3.5],
            [x, yy, zTop - 7],
          ]
        : [
            [x, yy, zTop],
            [x, yy - w, zTop],
            [x, yy - w, zTop - 7],
            [x, yy, zTop - 7],
          ],
      col,
      1.2,
    );
  if (mark === 'done') s += pen(top, PALS.mint.l);
  else if (mark === 'undone' || mark === 'letter') s += pen(z + 11, PALS.cobalt.l);
  else if (mark === 'failed') s += pen(top, PALS.tomato.l, true, 15);
  else if (mark === 'twice') s += pen(top, PALS.mustard.l) + pen(top - 9, PALS.mustard.l);
  else if (mark === 'waiting') s += pen(top, PALS.mustard.l, true, 9);
  return s;
}

/** a save-point peg (a short mustard pennant) at the terrace's back-left corner */
const peg = (y: number) => {
  const x = PX0 + 3,
    yy = y - PH + 2,
    z = zp(y);
  return `<g data-save="1">${line(
    [
      [x, yy, z],
      [x, yy, z + 15],
    ],
    1.6,
  )}${shape(
    [
      [x, yy, z + 15],
      [x + 10, yy, z + 12],
      [x, yy, z + 9],
    ],
    PALS.mustard.l,
    1.2,
  )}</g>`;
};
/** an opposite's round return sign at the terrace's back-right corner */
const sign = (y: number) => {
  const x = PX1 - 3,
    yy = y - PH + 3,
    z = zp(y);
  return `<g data-opp="1">${line(
    [
      [x, yy, z],
      [x, yy, z + 8],
    ],
    1.2,
  )}${shape(
    ellUV(x, z + 11, 3.4, 3.4, 14).map(([u, v]) => [u, yy, v]),
    PALS.cobalt.l,
    1.1,
  )}${line(
    [
      [x + 1.6, yy + 0.05, z + 12.4],
      [x - 1.2, yy + 0.05, z + 12.4],
      [x - 1.6, yy + 0.05, z + 10.4],
      [x + 1.2, yy + 0.05, z + 9.6],
    ],
    1,
  )}</g>`;
};

/** a whole station at y (its prop, flag, peg and sign) as one item */
function station(s: Funi, id: StepId, y: number, mark: Mark | undefined, letters: number): Item {
  const z = zp(y);
  const svg =
    prop(id, y, mark, letters) +
    flag(y, mark) +
    (s.saves?.includes(id) ? peg(y) : '') +
    (s.opp?.includes(id) ? sign(y) : '');
  return {
    box: [
      [PX0, y - PH, z],
      [PX1, y + PH, z + 14],
    ],
    svg: `<g data-station="${esc(id)}" data-mark="${esc(mark ?? 'none')}" data-slot="${slotOf(s, id)}">${svg}</g>`,
  };
}

/** the car at y: two stepped cabins on the slope, windows on its side, a lamp at the front, a key tag when keyed */
function car(y: number, s: Funi, at: string): Item {
  const lo = zt(y + 8) + 1.5,
    hi = zt(y) + 1.5;
  const body = { l: '#f6d77a', m: PALS.mustard.l, d: PALS.mustard.m };
  let c = box(TX - 8, y - 8, hi, TX + 8, y, hi + 11, body, toneI, 1.4);
  c += box(TX - 8, y, lo, TX + 8, y + 8, lo + 11, body, toneI, 1.4);
  for (const [y0, z0] of [
    [y - 7, hi],
    [y + 1, lo],
  ])
    c += shape(
      R(y0, z0 + 5, y0 + 6, z0 + 9).map(([u, v]) => [TX + 8.05, u, v]),
      CLEAR.m,
      0.8,
    );
  c += shape(
    ellUV(TX, lo + 5, s.stopped ? 3.4 : 2.2, s.stopped ? 3.4 : 2.2, 12).map(([u, v]) => [u, y + 8.05, v]),
    s.stopped ? PALS.tomato.l : CERAMIC.l,
    s.stopped ? 1.5 : 1,
  );
  if (s.key)
    c += `<g data-key="1">${shape(
      ellUV(y - 4, hi + 4, 3.2, 3.2, 12).map(([u, v]) => [TX + 8.3, u, v]),
      PALS.mustard.l,
      1.3,
    )}${shape(
      [
        [TX + 8.3, y - 1, hi + 3.2],
        [TX + 8.3, y + 6, hi + 3.2],
        [TX + 8.3, y + 6, hi + 0.8],
        [TX + 8.3, y + 4.6, hi + 0.8],
        [TX + 8.3, y + 4.6, hi + 2],
        [TX + 8.3, y - 1, hi + 2],
      ],
      PALS.mustard.l,
      1.1,
    )}</g>`;
  // the cable, up the track to the engine house
  const cable = line(
    [
      [TX, y - 8, hi + 0.8],
      [TX, HY0 + 12, zt(HY0 + 12) + 0.8],
    ],
    0.9,
  );
  return {
    box: [
      [TX - 8, y - 8, lo],
      [TX + 8, y + 8, hi + 11],
    ],
    svg: `${cable}<g data-car="${esc(at)}" data-stopped="${s.stopped ? 1 : 0}">${c}</g>`,
  };
}

/** The setting: the assistant at the valley and Tomás beside it. */
function people(top: SceneCtx['top']) {
  const m = modelMachine(MODEL[0], MODEL[1], 0.8),
    t = person({ x: TOMAS[0], y: TOMAS[1], facing: '-x', look: 'tomas' });
  return {
    shadow: castShadow(boxCorners(HX0, HY0, BH, HX1, FOOT, BH + 2), BH, top) + m.shadow + t.shadow,
    items: [...m.items.map(i => ({ ...i, svg: `<g data-part="model">${i.svg}</g>` })), ...t.items],
  };
}

/** Where every moving thing is drawn. */
interface Drawn {
  carY: number;
  carAt: string;
  marks: Partial<Record<StepId, Mark>>;
  letters: number;
  stopped: boolean;
  /** each station's y */
  ys: Record<StepId, number>;
}
const rest = (s: Funi): Drawn => ({
  carY: yAt(s.car, s.order),
  carAt: s.car,
  marks: s.marks,
  letters: s.letters,
  stopped: !!s.stopped,
  ys: Object.fromEntries(s.order.map((id, i) => [id, SLOT_Y[i]])) as Record<StepId, number>,
});

function art(s: Funi, v: SceneView, d: Drawn, layer: 'all' | 'still' | 'moving') {
  return (ctx: SceneCtx) => {
    const items: Item[] = [];
    let shadow = '',
      under = '';
    if (layer !== 'moving') {
      const p = people(ctx.top);
      shadow += p.shadow;
      const [hill, ...fixed] = terrain();
      under = hill.svg;
      items.push(...p.items, ...fixed, ...SLOT_Y.map((_, i) => terrace(i, s.lit === s.order[i] && layer === 'all')));
    }
    if (layer !== 'still') {
      for (const id of s.order) items.push(station(s, id, d.ys[id], d.marks[id], d.letters));
      items.push(car(d.carY, { ...s, stopped: d.stopped }, d.carAt));
    }
    // the hill is the ground everything stands on: drawn first, under every item
    return shadow + under + byDepth(items) + (layer === 'moving' || s.bare ? '' : funiPills(s, v, layer === 'still'));
  };
}

/** The picture at rest: what the stage shows for state s with no motion (the share image too). */
export const funiStill = (s: Funi, v: SceneView = { zoomT: 0 }) => art(s, v, rest(s), 'all');

/** The picture while a station is lifted by the pointer: without that station's prop (it rides with the pointer). */
export const funiLifted = (s: Funi, id: StepId, v: SceneView = { zoomT: 0 }) => {
  const d = rest(s);
  return (ctx: SceneCtx) => {
    const p = people(ctx.top);
    const [hill, ...fixed] = terrain();
    const items: Item[] = [
      ...p.items,
      ...fixed,
      ...SLOT_Y.map((_, i) => terrace(i, false)),
      ...s.order.filter(x => x !== id).map(x => station(s, x, d.ys[x], d.marks[x], d.letters)),
      car(d.carY, s, d.carAt),
    ];
    return p.shadow + hill.svg + byDepth(items) + (s.bare ? '' : funiPills(s, v));
  };
};
/** The lifted station's prop alone, where it stands. */
export const stationPiece = (s: Funi, id: StepId) =>
  prop(id, SLOT_Y[slotOf(s, id)], s.marks[id], s.letters) + flag(SLOT_Y[slotOf(s, id)], s.marks[id]);

/** Points of a part's footprint, for close-ups and in-picture targets. */
export function partBox(part: FuniPart, s: Funi): number[][] {
  if (part === 'valley') return boxCorners(TX - 14, VALLEY_Y - 12, BH, MODEL[0] + 10, MODEL[1] + 26, BH + 24);
  if (part === 'car') {
    const y = yAt(s.car, s.order);
    return boxCorners(TX - 9, y - 9, zt(y + 8), TX + 9, y + 9, zt(y) + 14);
  }
  return slotBox(slotOf(s, part));
}
/** a terrace's footprint with its prop (also the in-picture drag and drop targets) */
export const slotBox = (i: number) => {
  const y = SLOT_Y[i];
  return boxCorners(PX0, y - PH, zt(y + PH), PX1, y + PH, zp(y) + 16);
};

const pill = (p: number[], dx: number, dy: number, text: string, on: boolean, k: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), on, k)}</g>`;
const WORD: Record<Mark, [string, string]> = {
  done: ['DONE', '✓'],
  undone: ['UNDONE', '↺'],
  failed: ['FAILED', '✗'],
  twice: ['TWICE', '×2'],
  letter: ['LETTER', '✉'],
  waiting: ['NO ANSWER', '?'],
};
const NAME: Record<StepId, [string, string]> = {
  stock: ['STOCK', 'STOCK'],
  refund: ['REFUND', 'REFUND'],
  email: ['POST BOX', 'POST'],
  courier: ['COURIER', 'COURIER'],
};

/** The pills; mid-motion (moving) only the stations' names, so no state shows before its motion lands. */
export function funiPills(s: Funi, v: SceneView, moving = false) {
  const phone = !!v.phone,
    out: string[] = [],
    said = new Set<string>();
  const say = calloutOf(s.say, v);
  // a callout points at its part from the right (cue), over the open hill past the track: clear of the name pills on
  // the left, the station above, and the car
  const callout = (part: string, cue: number[]) => {
    if (said.has(part) || !say || !sayFits(say, part, phone)) return;
    said.add(part);
    out.push(
      `<g class="callout" aria-hidden="true" pointer-events="none">${tag(cue, phone ? 44 : 92, 6, esc(say.text), true, phone ? 2 : 1)}</g>`,
    );
  };
  // a wide close-up (three stations or more, the car among them) is a gentle push-in: every part in it keeps its
  // pill as at rest, and parts outside it hide; a tight one (two stations) shows their states alone, larger
  const slotOf_ = (p: string) =>
    p === 'car' || p === 'valley' ? (s.car === 'valley' ? -1 : s.order.indexOf(s.car)) : s.order.indexOf(p as StepId);
  const span = (v.closeUp ?? []).map(slotOf_);
  const lo = Math.min(...span),
    hi = Math.max(...span);
  const wide = v.zoomT > 0 && hi - lo >= 2;
  const inside = (p: string) =>
    p === 'car' ? lo <= slotOf_('car') && slotOf_('car') <= hi : lo <= slotOf_(p) && slotOf_(p) <= hi;
  const scaleOf = (p: string) => (wide ? (inside(p) ? (phone ? 2 : 1) : 0) : pillScale(p, v));
  const on = (part: string, at: number[], dx: number, dy: number, text: string, lit: boolean, cue?: number[]) => {
    const k = scaleOf(part);
    if (k) out.push(pill(at, dx, dy, text, lit, k));
    if (cue) callout(part, cue);
  };
  s.order.forEach((id, i) => {
    const y = SLOT_Y[i],
      m = moving ? undefined : s.marks[id],
      name = NAME[id][phone ? 1 : 0];
    // zoomed, the close-up's pill says the station's state alone (the close-up shows which station), floated above-left
    // of its prop: beside it, clear of its letters and flag on the right, and short enough to stay in the frame
    const zoomed = v.zoomT > 0 && !wide;
    const state =
      id === 'email' && !moving && s.letters > 1
        ? [`${s.letters} LETTERS`, `✉${s.letters}`]
        : id === 'email' && m === 'done'
          ? ['SENT', '✉']
          : m
            ? WORD[m]
            : null;
    const text = zoomed
      ? (state?.[0] ?? NAME[id][0])
      : state
        ? phone
          ? `${name} ${state[1]}`
          : `${name} · ${state[0]}`
        : name;
    on(
      id,
      zoomed ? [PX0 + 6, y, zp(y) + 12] : [PX0, y + PH, zp(y)],
      // a phone's wide close-up doubles the pill: it hangs nearer its station so it stays in the frame
      zoomed ? -10 : wide && phone ? -2 : -14,
      zoomed ? -10 : -6,
      text,
      s.lit === id || m === 'failed',
      [PX1, y + PH, zp(y) + 4],
    );
  });
  const cy = yAt(s.car, s.order),
    cueCar = [TX + 8, cy + 8, zt(cy + 8) + 6];
  // the car's pill hangs below-right of it, clear of the cabins and the engine house
  if (!moving && (s.stopped || s.key)) on('car', cueCar, 18, 14, s.stopped ? 'STOPPED' : 'KEY', !!s.stopped);
  callout('car', cueCar);
  return [
    ...out.filter(p => p && !p.startsWith('<g class="callout"')),
    ...out.filter(p => p.startsWith('<g class="callout"')),
  ].join('');
}

/** Whether going from a to b moves anything (a ring, a pill or a callout alone doesn't). */
export const funiMoves = (a: Funi, b: Funi) => {
  const key = (s: Funi) =>
    JSON.stringify([s.order, s.car, s.marks, s.letters, s.route, s.stopped, s.saves, s.opp, s.key]);
  return key(a) !== key(b);
};

/** The car's route for a run's events: every stop in order (a run ends where its last event is). */
export const routeOf = (events: Ev[]): Ev[] => events;
/** where a run's events leave the car */
export const endOf = (events: Ev[], from: Where = 'valley'): Where => events.at(-1)?.at ?? from;

const DWELL = 10; // a stop's pause, in track units

/** Undo for agents' living scene: the car climbs, stops at each station it acts on (the flag changes as it arrives),
 * runs back down undoing, or the stations slide into a new order along the hill. */
export const funiScene: Scene<Funi> = (prev, s, t, v) => {
  if (t >= 1 || !funiMoves(prev, s)) return { still: funiStill(s, v), moving: '' };
  const A = rest(prev),
    B = rest(s);
  const d: Drawn = { ...B, marks: { ...prev.marks }, letters: prev.letters, stopped: false };
  // stations slide from their old slot to the new one
  for (const id of s.order) d.ys[id] = lerp(A.ys[id] ?? B.ys[id], B.ys[id], t);
  // the car: along its route, stop by stop, each stop applying its mark as the car arrives
  // a route already travelled (kept on the state after its run) is not travelled again: the car goes straight
  const fresh = !!s.route?.length && JSON.stringify(s.route) !== JSON.stringify(prev.route);
  const stops = fresh ? s.route! : [{ at: s.car } as Ev];
  const ys = [A.carY, ...stops.map(e => yAt(e.at, s.order))];
  const legs = stops.map((_, i) => Math.abs(ys[i + 1] - ys[i]) + DWELL);
  const total = legs.reduce((a, b) => a + b, 0) || 1;
  let go = t * total;
  d.carY = A.carY;
  d.carAt = 'moving';
  for (const [i, e] of stops.entries()) {
    const travel = legs[i] - DWELL;
    if (go < travel) {
      d.carY = lerp(ys[i], ys[i + 1], travel ? go / travel : 1);
      break;
    }
    d.carY = ys[i + 1];
    if (e.mark && e.at !== 'valley') d.marks[e.at] = e.mark;
    if (e.letters !== undefined) d.letters = e.letters;
    d.stopped = !!e.stopped;
    go -= legs[i];
  }
  return { still: art(s, v, d, 'still'), moving: art(s, v, d, 'moving') };
};

/** The picture in words, for its aria-label. */
export function funiLabel(s: Funi): string {
  const stations = s.order
    .map((id, i) => {
      const m = s.marks[id];
      return `${i + 1}. ${stepOf(id).name}${m ? `: ${m === 'letter' ? 'a second letter sent' : m}` : ''}`;
    })
    .join('; ');
  const where = s.car === 'valley' ? 'in the valley' : `at the ${stepOf(s.car).name.toLowerCase()} station`;
  return [
    `A funicular climbing a hill past four stations, bottom to top: ${stations}.`,
    `The car is ${where}${s.stopped ? ', stopped' : ''}${s.key ? ', carrying a key' : ''}.`,
    s.letters ? `${s.letters} letter${s.letters > 1 ? 's' : ''} in the post box.` : '',
    s.saves?.length ? `Save points at ${s.saves.map(id => stepOf(id).name).join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** The home hero's stand plot: the hill's track with the car halfway up and two stations beside it, one done and one
 * waiting, set down small. */
export function funiPlot(x: number, y: number, top: SceneCtx['top']): string {
  const s: Funi = {
    order: ['stock', 'refund', 'email', 'courier'],
    car: 'refund',
    marks: { stock: 'done' },
    letters: 0,
  };
  const [hill, ...fixed] = terrain();
  const items = [
    ...fixed,
    terrace(0, false),
    terrace(1, false),
    station(s, 'stock', SLOT_Y[0], 'done', 0),
    station(s, 'refund', SLOT_Y[1], undefined, 0),
    car(SLOT_Y[1], s, 'refund'),
  ];
  const shadow = castShadow(boxCorners(HX0, HY0, BH, HX1, FOOT, BH + 2), BH, top) + hill.svg;
  return drawPieces([mini({ shadow, items }, [(HX0 + HX1) / 2, (HY0 + FOOT) / 2, BH], [x, y, BH], 0.22)]);
}
