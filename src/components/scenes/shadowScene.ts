// Tools in production's picture: Larkspur's workshop shadow board (docs/modules/tools-in-production.md). A pegboard
// on the back wall with twelve tool outlines painted on it, a column per MCP server, fed by four supplier vans that
// back up to the dock with wax-sealed crates. A tool the model may use hangs on its outline; a tool that changed since
// it was approved no longer fits its outline and hangs askew; a pinned column (the kit's padlock) holds a changed tool
// back in its crate. The assistant (the kit's model machine) and Tomás work at the bench in front.
// A living scene (KTD2): scene(prev, state, t, view) → { still, moving }; at t = 1 everything is in the still.
// Words only in pills; every string reaching SVG goes through esc().
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import { modelMachine, padlock, person, van, type Item, type ModelState } from '../../lib/iso/figures';
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
  line,
  shape,
  tag,
  toneI,
} from '../../lib/iso/core.js';
import { calloutOf, lerp, lerpPt, pillScale, type Scene, type SceneView } from '../../lib/iso/motion';
import { BOARD as TOOLS_ON_BOARD, SERVERS, serverOf, toolOf } from '../../lib/tools-in-production/tools';
import type { Say } from '../story/steps';

export const SHADOW_BOARD: Board = [8, 8, 200, 132];
/** The parts a step's callout or close-up may name: the four vans by server id, and `lit` (the lit outline) and
 * `crate` (the crate the step is about) read off the state. */
export const SHADOW_PARTS = [
  'board',
  'bench',
  'model',
  'lit',
  'crate',
  'key',
  'stockroom',
  'orderdesk',
  'quickpost',
  'docshelf',
] as const;
export type ShadowPart = (typeof SHADOW_PARTS)[number];

/** What the picture shows. */
export interface Shadow {
  /** servers whose van stands at the dock with its crate down (the rest wait out in the yard) */
  vans: string[];
  /** tools hanging on the board (board tool ids), and whether each still fits its painted outline */
  hung: { id: string; fit: boolean }[];
  /** tools with no outline of their own, lying on the bench (chapter 1: the forty-eight past the board) */
  heap: number;
  /** servers whose column carries a padlock: their approved fingerprints are kept */
  pinned: string[];
  /** tools a pin refused: back in their crate, the crate stamped */
  held: string[];
  /** tools changed since they were approved: their server's seal is broken */
  changed: string[];
  /** servers not trusted: a barrier across their bay, the van kept in the yard */
  blocked?: string[];
  /** the server whose crate carries a hidden slip */
  note?: string | null;
  /** the server a file was sent to (the hidden orders obeyed) */
  sent?: string | null;
  /** chapter 6: how the assistant signs in */
  key?: 'shared' | 'own' | null;
  /** chapter 6: a pass carried from one server to another, let in or refused */
  pass?: { from: string; to: string; ok: boolean } | null;
  /** the lit outline (a board tool id) and the crate the step is about (a server id) */
  lit?: string | null;
  crate?: string | null;
  /** the model's pick, ringed on the board */
  pick?: string | null;
  /** tokens loaded for the last request, on the bench's pill */
  tokens?: number;
  say?: Say;
  /** pills are drawn apart, outside the hand-drawn filter (the live stage's PillLayer: shadowPills); the share image
   * keeps them in */
  bare?: boolean;
}

const PAL: Record<string, { l: string; m: string; d: string }> = {
  stockroom: PALS.mint,
  orderdesk: PALS.cobalt,
  quickpost: PALS.mustard,
  docshelf: { l: '#b39ddb', m: '#9580c0', d: '#3a2f52' },
};
const IDS = SERVERS.map(s => s.id);
const sIdx = (id: string) => IDS.indexOf(id);

// the pegboard: on the back wall (plane y = PY, facing the viewer), a key strip then four columns of three outlines
const PY = 12,
  PX0 = 30,
  KEY_X1 = 42,
  PX1 = 142,
  PZ0 = BH + 18,
  PZ1 = BH + 60,
  COL = (PX1 - KEY_X1) / 4,
  ROW = (PZ1 - PZ0) / 3;
// the bench in front of it, and what stands about
const BENCH = { x0: 46, x1: 132, y0: 24, y1: 36 },
  TOP = BH + 15;
const MODEL = [24, 60],
  TOMAS = [150, 32];
// the dock: a bay per server, front right; a docked van backs to x = DOCK, an idle one waits out in the yard
const BAY_Y = (i: number) => 56 + 22 * i,
  DOCK = 142,
  YARD = 180,
  CRATE = { x0: 98, x1: 109, h: 9 };

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ph = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

type UV = number[];
interface Poly {
  pts: UV[];
  metal?: boolean;
}
const R = (u0: number, v0: number, u1: number, v1: number): UV[] => [
  [u0, v0],
  [u1, v0],
  [u1, v1],
  [u0, v1],
];
/** Each tool's silhouette in its own plane (u along the board, v up), centred, about 20 × 9: grip and metal parts. */
const SHAPES: Record<string, Poly[]> = {
  hammer: [{ pts: R(-9, -1, 4, 1) }, { pts: R(3, -4, 7.5, 4), metal: true }],
  level: [{ pts: R(-10, -2, 10, 2) }, { pts: R(-1.6, -1.1, 1.6, 1.1), metal: true }],
  clamp: [
    {
      pts: [
        [-6, -4.5],
        [6, -4.5],
        [6, -2.8],
        [-4.2, -2.8],
        [-4.2, 2.8],
        [6, 2.8],
        [6, 4.5],
        [-6, 4.5],
      ],
      metal: true,
    },
    { pts: R(1.8, -2.8, 3, 1.5) },
  ],
  mallet: [{ pts: R(-9, -0.9, 3, 0.9) }, { pts: R(3, -3.6, 9, 3.6) }],
  screwdriver: [{ pts: R(-9, -1.7, -2, 1.7) }, { pts: R(-2, -0.5, 9, 0.5), metal: true }],
  pliers: [
    {
      pts: [
        [-9, -3],
        [0, -0.7],
        [9, -0.4],
        [9, 0.4],
        [0, 0.7],
        [-9, 3],
        [-9, 1.5],
        [-1.5, 0],
        [-9, -1.5],
      ],
      metal: true,
    },
    { pts: R(-9, -3, -4, -1.6) },
    { pts: R(-9, 1.6, -4, 3) },
  ],
  wrench: [
    { pts: R(-7, -1, 6, 1), metal: true },
    {
      pts: [
        [5, -3.6],
        [10, -3.6],
        [10, -1.3],
        [7.4, -1.3],
        [7.4, 1.3],
        [10, 1.3],
        [10, 3.6],
        [5, 3.6],
      ],
      metal: true,
    },
    { pts: R(-10, -2.4, -6.5, 2.4), metal: true },
  ],
  tape: [{ pts: ellUV(-1, 0, 4.6, 4.6, 14) }, { pts: R(3, -4.6, 9, -3.4), metal: true }],
  scissors: [
    {
      pts: [
        [-1, -0.9],
        [10, -0.2],
        [-1, 0.9],
      ],
      metal: true,
    },
    { pts: ellUV(-5, -2.4, 2.8, 2, 10) },
    { pts: ellUV(-5, 2.4, 2.8, 2, 10) },
  ],
  saw: [
    {
      pts: [
        [-4, -3.8],
        [10, -1.4],
        [10, 1.4],
        [-4, 3.8],
      ],
      metal: true,
    },
    { pts: R(-10, -3.4, -4, 3.4) },
  ],
  brush: [{ pts: R(-10, -0.9, 1, 0.9) }, { pts: R(1, -2, 4, 2), metal: true }, { pts: R(4, -2.4, 9, 2.4) }],
  chisel: [
    { pts: R(-10, -1.6, -1, 1.6) },
    {
      pts: [
        [-1, -1],
        [8, -1],
        [10, 0],
        [8, 1],
        [-1, 1],
      ],
      metal: true,
    },
  ],
};
/** turn and grow a silhouette: a changed tool is bigger and hangs at a slant, so it no longer covers its outline */
const warp = (pts: UV[], k: number, deg: number, du = 0, dv = 0): UV[] => {
  const a = (deg * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  return pts.map(([u, v]) => [du + k * (u * c - v * s), dv + k * (u * s + v * c)]);
};
const ASKEW = { k: 1.22, deg: 16, du: 1.5, dv: -1.2 };

const slot = (id: string) => TOOLS_ON_BOARD.findIndex(t => t.id === id);
/** the centre of a board tool's outline: its server's column, its row */
function cell(id: string) {
  const t = toolOf(id),
    col = sIdx(t.server),
    row = TOOLS_ON_BOARD.filter(x => x.server === t.server).findIndex(x => x.id === id);
  return [KEY_X1 + COL * (col + 0.5), PY, PZ1 - ROW * (row + 0.5)];
}
const shapeOf = (id: string) => SHAPES[toolOf(id).shape ?? 'hammer'];

/** a tool drawn upright in a plane parallel to the board at p (x, y, z), with a dark edge behind for thickness */
function upright(id: string, p: number[], k = 1, deg = 0, du = 0, dv = 0) {
  const pal = PAL[toolOf(id).server];
  let s = '';
  for (const [dy, tone] of [
    [-0.7, 'd'],
    [0, 'l'],
  ] as const)
    for (const poly of shapeOf(id))
      s += shape(
        warp(poly.pts, k, deg, du, dv).map(([u, v]) => [p[0] + u, p[1] + dy, p[2] + v]),
        poly.metal ? METAL[tone] : pal[tone === 'l' ? 'm' : 'd'],
        tone === 'l' ? 0.8 : 0,
      );
  return s;
}
/** a tool lying flat at p, turned yaw degrees */
function lying(id: string, p: number[], yaw: number) {
  const pal = PAL[toolOf(id).server];
  return shapeOf(id)
    .map(poly =>
      shape(
        warp(poly.pts, 0.75, yaw).map(([u, v]) => [p[0] + u, p[1] + v, p[2]]),
        poly.metal ? METAL.l : pal.m,
        0.7,
      ),
    )
    .join('');
}

/** where a server's crate stands (its van at the dock), and the top of it */
const crateAt = (srv: string) => {
  const y = BAY_Y(sIdx(srv));
  return { x0: CRATE.x0, x1: CRATE.x1, y0: y - 5, y1: y + 5 };
};
const crateTop = (srv: string) => {
  const c = crateAt(srv);
  return [(c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2, BH + CRATE.h + 1];
};

/** the pegboard as one item, with its painted outlines, the key strip and everything hung on it */
function boardArt(s: Shadow, hung: { id: string; fit: boolean; at?: number[] }[]) {
  let b = '';
  // two feet and the panel
  for (const x of [PX0 + 2, PX1 - 4]) b += box(x, PY - 3, BH, x + 2, PY + 2, PZ0, WOOD, toneI, 0.9);
  b += box(PX0, PY - 2, PZ0 - 2, PX1, PY, PZ1 + 2, { l: '#e9d7b4', m: '#d6c09a', d: '#a88e66' }, toneI, 1.4);
  // pegboard holes, a sparse grid
  for (let x = PX0 + 4; x < PX1 - 1; x += 6)
    for (let z = PZ0 + 1; z < PZ1 + 1; z += 6)
      b += shape(
        ellUV(x, z, 0.45, 0.45, 6).map(([u, v]) => [u, PY + 0.02, v]),
        '#a88e66',
        0,
      );
  // a band of each server's colour over its column, so a column reads as its van's
  IDS.forEach((id, i) => {
    const x0 = KEY_X1 + COL * i + 1,
      x1 = x0 + COL - 2;
    b += shape(
      [
        [x0, PY + 0.05, PZ1 - 1.5],
        [x1, PY + 0.05, PZ1 - 1.5],
        [x1, PY + 0.05, PZ1 + 1.5],
        [x0, PY + 0.05, PZ1 + 1.5],
      ],
      PAL[id].m,
      0.6,
    );
  });
  // the painted outlines: each silhouette a little larger than its tool, in dark paint; the lit one ringed
  for (const t of TOOLS_ON_BOARD) {
    const c = cell(t.id),
      lit = s.lit === t.id || s.pick === t.id;
    if (lit)
      b += shape(
        R(c[0] - COL / 2 + 1.2, c[2] - ROW / 2 + 1, c[0] + COL / 2 - 1.2, c[2] + ROW / 2 - 1).map(([u, v]) => [
          u,
          PY + 0.06,
          v,
        ]),
        '#fffaf0',
        2.8,
      );
    const bad = hung.some(h => h.id === t.id && !h.fit);
    for (const poly of shapeOf(t.id))
      b += shape(
        warp(poly.pts, 1.1, 0).map(([u, v]) => [c[0] + u, PY + 0.1, c[2] + v]),
        bad ? PALS.tomato.m : DARK.l,
        bad ? 1.4 : 0,
      );
  }
  // the key strip: one big shared key, or each server's own tag
  if (s.key === 'shared') {
    const kx = (PX0 + KEY_X1) / 2,
      kz = PZ1 - 12;
    b += shape(
      ellUV(kx, kz + 4, 3.4, 3.4, 12).map(([u, v]) => [u, PY + 0.4, v]),
      PALS.mustard.l,
      1.1,
    );
    b += shape(
      R(kx - 0.9, kz - 14, kx + 0.9, kz + 1).map(([u, v]) => [u, PY + 0.4, v]),
      PALS.mustard.l,
      1,
    );
    b += shape(
      R(kx + 0.9, kz - 13, kx + 3.2, kz - 10).map(([u, v]) => [u, PY + 0.4, v]),
      PALS.mustard.l,
      0.8,
    );
  } else if (s.key === 'own')
    IDS.forEach((id, i) => {
      const kx = (PX0 + KEY_X1) / 2,
        kz = PZ1 - 6 - i * 9;
      b += shape(
        R(kx - 3.4, kz - 3, kx + 3.4, kz + 3).map(([u, v]) => [u, PY + 0.4, v]),
        PAL[id].l,
        1,
      );
    });
  // pins: the kit padlock on top of a pinned column
  const locks = s.pinned.map(id => {
    const x = KEY_X1 + COL * (sIdx(id) + 0.5);
    return padlock({ x, y: PY - 1, z: PZ1 + 2, size: 0.8, facing: '+y' });
  });
  // what hangs, in front of the board
  for (const h of hung) {
    const c = h.at ?? cell(h.id);
    b += `<g data-hung="${esc(h.id)}" data-fit="${h.fit ? 1 : 0}">${
      h.fit
        ? upright(h.id, [c[0], PY + 1.6, c[2]])
        : upright(h.id, [c[0], PY + 1.6, c[2]], ASKEW.k, ASKEW.deg, ASKEW.du, ASKEW.dv)
    }</g>`;
  }
  return {
    item: {
      box: [
        [PX0, PY - 3, BH],
        [PX1, PY + 2, PZ1 + 2],
      ],
      svg: `<g data-part="board">${b}</g>`,
    } as Item,
    locks,
  };
}

const HEAP = [
  ['stockroom.move_stock', 64, 30, 20],
  ['orderdesk.find_order', 78, 32, -30],
  ['quickpost.print_label', 92, 29, 50],
  ['docshelf.list_parts', 106, 31, -10],
  ['stockroom.reserve_item', 70, 27, 80],
  ['orderdesk.refund_order', 99, 33, 15],
  ['quickpost.track_parcel', 116, 29, -60],
  ['docshelf.read_page', 84, 29, 35],
] as const;

/** the bench as one item, with what lies on it */
function benchArt(heap: number) {
  const { x0, x1, y0, y1 } = BENCH,
    zt = TOP - 2.5;
  let s = '';
  for (const [lx, ly] of [
    [x0 + 1, y0 + 1],
    [x1 - 4, y0 + 1],
    [x0 + 1, y1 - 4],
    [x1 - 4, y1 - 4],
  ])
    s += box(lx, ly, BH, lx + 3, ly + 3, zt, WOOD, toneI, 0.9);
  s += box(x0, y0, zt, x1, y1, TOP, WOOD, toneI, 1.4);
  HEAP.slice(0, Math.min(heap, HEAP.length)).forEach(([id, x, y, yaw], i) => {
    s += lying(id, [x, y, TOP + 0.3 + (i % 3) * 0.6], yaw);
  });
  return {
    box: [
      [x0, y0, BH],
      [x1, y1, TOP + 2],
    ],
    svg: `<g data-part="bench">${s}</g>`,
  } as Item;
}

/** a sealed file envelope lying flat at p */
const envelopeArt = (p: number[]) =>
  `<g data-envelope="1">${shape(
    R(p[0] - 7, p[1] - 5, p[0] + 7, p[1] + 5).map(([u, v]) => [u, v, p[2]]),
    CERAMIC.l,
    1.3,
  )}${shape(
    [
      [p[0] - 7, p[1] - 5, p[2] + 0.05],
      [p[0], p[1] + 1, p[2] + 0.05],
      [p[0] + 7, p[1] - 5, p[2] + 0.05],
    ],
    PALS.tomato.m,
    1,
  )}</g>`;
/** a sign-in pass: a small card, the shared key's gold or its server's colour */
const passArt = (p: number[], col: string) =>
  `<g data-pass="1">${shape(
    R(p[0] - 6, p[1] - 4, p[0] + 6, p[1] + 4).map(([u, v]) => [u, v, p[2]]),
    col,
    1.3,
  )}${shape(
    R(p[0] - 4, p[1] - 2, p[0] + 1, p[1] + 2).map(([u, v]) => [u, v, p[2] + 0.05]),
    DARK.l,
    0,
  )}</g>`;

type SealState = 'sealed' | 'broken' | 'held';
/** a crate at its bay, its wax seal on the front face, a slip poking out when it hides orders */
function crateArt(
  srv: string,
  seal: SealState,
  opts: { note?: boolean; tick?: boolean; cross?: boolean; lit?: boolean; gap?: number },
) {
  const c = crateAt(srv),
    z1 = BH + CRATE.h;
  let s = box(c.x0, c.y0, BH, c.x1, c.y1, z1, WOOD, toneI, opts.lit ? 2.2 : 1.2);
  // slats
  for (const z of [BH + 3, BH + 6])
    s += line(
      [
        [c.x1 + 0.05, c.y0 + 0.5, z],
        [c.x1 + 0.05, c.y1 - 0.5, z],
      ],
      0.6,
    );
  const sx = (c.x0 + c.x1) / 2,
    sz = BH + CRATE.h / 2,
    on = (pts: UV[]) => pts.map(([u, v]) => [u, c.y1 + 0.06, v]);
  if (seal === 'sealed') s += shape(on(ellUV(sx, sz, 2.4, 2.4, 14)), PALS.tomato.m, 1);
  else {
    // two halves, pulled apart (gap 0 → 1 as it cracks)
    const g = 1.3 * (opts.gap ?? 1);
    const half = (sg: number) =>
      on(
        ellUV(0, 0, 2.4, 2.4, 14)
          .filter(([u]) => sg * u >= -0.01)
          .map(([u, v]) => [sx + u + sg * g, sz + v]),
      );
    s += shape(half(-1), PALS.tomato.m, 1) + shape(half(1), PALS.tomato.m, 1);
    if (seal === 'held')
      s +=
        line(
          on([
            [sx - 4.5, BH + 1],
            [sx + 4.5, BH + CRATE.h - 1],
          ]),
          2.2,
        ) +
        line(
          on([
            [sx - 4.5, BH + CRATE.h - 1],
            [sx + 4.5, BH + 1],
          ]),
          2.2,
        );
  }
  if (opts.note)
    s +=
      shape(
        [
          [sx - 2, c.y0 + 3, z1],
          [sx + 2.5, c.y0 + 3, z1],
          [sx + 2.5, c.y0 + 3, z1 + 6],
          [sx - 2, c.y0 + 3, z1 + 5],
        ],
        CERAMIC.l,
        0.9,
      ) +
      line(
        [
          [sx - 1, c.y0 + 3.05, z1 + 3.5],
          [sx + 1.6, c.y0 + 3.05, z1 + 3.8],
        ],
        0.5,
      );
  if (opts.tick)
    s += line(
      [
        [sx - 3, c.y0 + 2, z1 + 0.2],
        [sx - 0.5, c.y0 + 5, z1 + 0.2],
        [sx + 3.5, c.y0 + 0.5, z1 + 0.2],
      ],
      2,
    );
  if (opts.cross)
    s +=
      line(
        [
          [sx - 3, c.y0 + 1, z1 + 0.2],
          [sx + 3, c.y1 - 1, z1 + 0.2],
        ],
        2.2,
      ) +
      line(
        [
          [sx + 3, c.y0 + 1, z1 + 0.2],
          [sx - 3, c.y1 - 1, z1 + 0.2],
        ],
        2.2,
      );
  return {
    box: [
      [c.x0, c.y0, BH],
      [c.x1, c.y1, z1],
    ],
    svg: `<g data-seal="${esc(srv)}" data-state="${seal}">${s}</g>`,
  } as Item;
}

/** a striped barrier across an untrusted server's bay */
function barrierArt(srv: string): Item {
  const y = BAY_Y(sIdx(srv)),
    x = 114;
  let s = '';
  for (const yy of [y - 7, y + 6]) s += box(x, yy, BH, x + 1.4, yy + 1.4, BH + 8, DARK, toneI, 0.8);
  s += box(x - 0.3, y - 7.5, BH + 6, x + 1.7, y + 7.5, BH + 8.5, CERAMIC, toneI, 1);
  for (let k = 0; k < 4; k++)
    s += shape(
      [
        [x + 1.75, y - 6 + k * 3.5, BH + 6],
        [x + 1.75, y - 4.4 + k * 3.5, BH + 6],
        [x + 1.75, y - 5.6 + k * 3.5, BH + 8.5],
        [x + 1.75, y - 7.2 + k * 3.5, BH + 8.5],
      ],
      PALS.tomato.m,
      0,
    );
  return {
    box: [
      [x - 0.3, y - 7.5, BH],
      [x + 1.7, y + 7.5, BH + 8.5],
    ],
    svg: `<g data-barrier="${esc(srv)}">${s}</g>`,
  };
}

/** a van at x (its middle), its bay's y; its items tagged with the server */
function vanArt(srv: string, x: number, at: 'dock' | 'yard' | 'road') {
  const v = van({ x, y: BAY_Y(sIdx(srv)), facing: '+x', pal: PAL[srv], driver: at !== 'yard' });
  return {
    shadow: v.shadow,
    items: v.items.map((it, i) => ({
      ...it,
      svg: i ? it.svg : `<g data-van="${esc(srv)}" data-at="${at}">${it.svg}</g>`,
    })),
  };
}

/** Points of a part's footprint, for close-ups and in-picture targets. */
export function partBox(part: ShadowPart, s?: Shadow): number[][] {
  switch (part) {
    case 'board':
      return boxCorners(PX0, PY - 2, PZ0 - 2, PX1, PY + 2, PZ1 + 4);
    case 'bench':
      return boxCorners(BENCH.x0, BENCH.y0, BH, BENCH.x1, BENCH.y1, TOP + 4);
    case 'model':
      return boxCorners(MODEL[0] - 17, MODEL[1] - 17, BH, MODEL[0] + 17, MODEL[1] + 17, BH + 36);
    case 'key':
      return boxCorners(PX0, PY - 1, PZ0, KEY_X1, PY + 1, PZ1);
    case 'lit': {
      const c = cell(s?.lit ?? s?.pick ?? TOOLS_ON_BOARD[0].id);
      return boxCorners(c[0] - COL / 2, PY - 1, c[2] - ROW / 2 - 2, c[0] + COL / 2, PY + 3, c[2] + ROW / 2 + 2);
    }
    case 'crate':
      return crateBox(s?.crate ?? IDS[0]);
    default: {
      const y = BAY_Y(sIdx(part)),
        x = s && !s.vans.includes(part) ? YARD : DOCK;
      return boxCorners(x - 18, y - 8, BH, x + 18, y + 8, BH + 21);
    }
  }
}
/** a crate's footprint (also the in-picture drag target), padded up toward its pill */
export const crateBox = (srv: string) => {
  const c = crateAt(srv);
  return boxCorners(c.x0 - 2, c.y0, BH, c.x1 + 2, c.y1, BH + CRATE.h + 6);
};

const pill = (p: number[], dy: number, text: string, on: boolean, k: number, dx = 0) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), on, k)}</g>`;
const NAME: Record<string, [string, string]> = {
  stockroom: ['STOCKROOM', 'STOCK'],
  orderdesk: ['ORDER DESK', 'ORDERS'],
  quickpost: ['QUICKPOST', 'POST'],
  docshelf: ['DOCSHELF', 'DOCS'],
};

/** The pills; mid-motion (moving) only the fixed names, so a number never shows before its motion lands. */
export function shadowPills(s: Shadow, v: SceneView, moving = false) {
  const k = (p: string) => pillScale(p, v),
    phone = !!v.phone,
    out: string[] = [],
    said = new Set<string>();
  // quiet: no name pill (phones keep only the pills a step is about), but its callout still shows
  const on = (p: string, at: number[], dy: number, text: string, lit: boolean, dx = 0, quiet = false) => {
    const sc = k(p);
    if (sc && !quiet) out.push(pill(at, dy, text, lit, sc, dx));
    // one callout per part, over its first pill
    if (!said.has(p)) out.push(sayAt(calloutOf(s.say, v), p, at, dy - 10, sc || 1, phone));
    said.add(p);
  };
  // the vans: name pills at the cab end, out of the dock's way
  for (const id of IDS) {
    const x = s.vans.includes(id) ? DOCK : YARD,
      lit = s.sent === id || s.pass?.to === id;
    on(id, [x + 14, BAY_Y(sIdx(id)), BH + 17], 18, NAME[id][phone ? 1 : 0], lit, 18, phone && !lit && s.crate !== id);
  }
  on('board', [PX1 - 6, PY, PZ1 + 2], -12, phone ? 'BOARD' : `${TOOLS_ON_BOARD.length} OUTLINES`, false, 10);
  if (moving) return out.filter(Boolean).join('');
  const lit = s.lit ?? s.pick;
  if (lit) {
    const c = cell(lit),
      bad = s.hung.some(h => h.id === lit && !h.fit);
    on(
      'lit',
      [c[0], PY + 2, c[2] + ROW / 2],
      -12,
      s.pick === lit ? 'PICKED' : bad ? 'NO FIT' : toolOf(lit).name.toUpperCase(),
      true,
    );
  }
  if (s.crate && s.vans.includes(s.crate)) {
    const held = s.held.some(h => toolOf(h).server === s.crate),
      broken = s.changed.some(h => toolOf(h).server === s.crate);
    on(
      'crate',
      crateTop(s.crate),
      -16,
      held ? 'HELD' : broken ? 'SEAL BROKEN' : s.note === s.crate ? 'SLIP' : 'SEALED',
      held || broken,
      -16,
    );
  }
  if (s.key)
    on('key', [(PX0 + KEY_X1) / 2, PY, PZ0], 18, s.key === 'shared' ? 'ONE KEY' : 'OWN PASSES', s.key === 'own', -6);
  if (s.tokens !== undefined)
    on(
      'bench',
      [(BENCH.x0 + BENCH.x1) / 2 - 8, BENCH.y1, TOP],
      24,
      phone ? 'TOKENS' : `${s.tokens.toLocaleString('en-US')} TOKENS`,
      s.heap > 0,
      -8,
    );
  if (s.heap > HEAP.length && !phone) on('bench', [BENCH.x1 - 10, BENCH.y1, TOP], 20, `+${s.heap} TOOLS`, true, 10);
  return out.filter(Boolean).join('');
}

/** where the moving parts are: vans' x, tools in flight, the envelope, the pass */
interface Drawn {
  vanX: Record<string, number>;
  vanAt: Record<string, 'dock' | 'yard' | 'road'>;
  crates: string[];
  hung: { id: string; fit: boolean; at?: number[] }[];
  heap: number;
  envelope: number[] | null;
  /** tools in flight; skew 1 lands askew (a changed tool) */
  flying: { id: string; at: number[]; skew?: number }[];
  /** how far each server's seal has cracked, 0 to 1 */
  gap: Record<string, number>;
  pass: { at: number[]; col: string } | null;
}

const passCol = (s: Shadow) => (s.key === 'shared' ? PALS.mustard.l : s.pass ? PAL[s.pass.from].l : PALS.mustard.l);
const envelopeEnd = (srv: string) => {
  const p = crateTop(srv);
  return [p[0], p[1], p[2] - 0.6];
};
const BENCH_ENV = [58, 31, TOP + 0.3];

const rest = (s: Shadow): Drawn => ({
  vanX: Object.fromEntries(IDS.map(id => [id, s.vans.includes(id) ? DOCK : YARD])),
  vanAt: Object.fromEntries(IDS.map(id => [id, s.vans.includes(id) ? 'dock' : 'yard'])),
  crates: s.vans,
  hung: s.hung,
  heap: s.heap,
  envelope: s.sent ? envelopeEnd(s.sent) : null,
  flying: [],
  gap: {},
  pass: s.pass ? { at: s.pass.ok ? crateTop(s.pass.to) : crateTop(s.pass.from), col: passCol(s) } : null,
});

/** The setting: shadows and the pieces that never move: the people and the machine. */
function setting(s: Shadow, top: SceneCtx['top']) {
  const state: ModelState | undefined = s.sent ? 'bad' : s.hung.some(h => !h.fit) || s.pick ? 'warn' : undefined;
  const m = modelMachine(MODEL[0], MODEL[1], 1, state),
    tomas = person({ x: TOMAS[0], y: TOMAS[1], facing: '-x', look: 'tomas' });
  return {
    shadow:
      castShadow(boxCorners(BENCH.x0, BENCH.y0, BH, BENCH.x1, BENCH.y1, TOP), BH, top) +
      castShadow(boxCorners(PX0, PY - 2, BH, PX1, PY, PZ1), BH, top) +
      m.shadow +
      tomas.shadow,
    items: [...m.items.map(i => ({ ...i, svg: `<g data-part="model">${i.svg}</g>` })), ...tomas.items],
  };
}

/** Everything for these places of the moving parts. moving: draw the moving parts only (and nothing else). */
function art(s: Shadow, v: SceneView, d: Drawn, layer: 'all' | 'still' | 'moving', movers: Set<string>) {
  return (ctx: SceneCtx) => {
    const items: Item[] = [];
    let shadow = '';
    const want = (what: string) => layer === 'all' || (layer === 'moving') === movers.has(what);
    if (want('setting')) {
      const set = setting(s, ctx.top);
      shadow += set.shadow;
      items.push(...set.items);
    }
    if (want('board')) {
      const b = boardArt(s, d.hung);
      items.push(b.item);
      for (const l of b.locks) {
        shadow += l.shadow;
        items.push(...l.items);
      }
    }
    if (want('bench')) items.push(benchArt(d.heap));
    if (want('vans')) {
      for (const id of IDS) {
        const va = vanArt(id, d.vanX[id], d.vanAt[id]);
        shadow += va.shadow;
        items.push(...va.items);
        if (d.crates.includes(id)) {
          const heldHere = s.held.some(h => toolOf(h).server === id),
            broken = s.changed.some(h => toolOf(h).server === id);
          items.push(
            crateArt(id, heldHere ? 'held' : broken ? 'broken' : 'sealed', {
              note: s.note === id,
              tick: !!s.pass?.ok && s.pass.to === id,
              cross: !!s.pass && !s.pass.ok && s.pass.to === id,
              lit: s.crate === id,
              gap: d.gap[id],
            }),
          );
        }
        if (s.blocked?.includes(id)) items.push(barrierArt(id));
      }
    }
    let over = '';
    if (want('flight')) {
      over += d.flying
        .map(f => {
          const k = f.skew ?? 0;
          return upright(f.id, f.at, lerp(1, ASKEW.k, k), ASKEW.deg * k, ASKEW.du * k, ASKEW.dv * k);
        })
        .join('');
      if (d.envelope) over += `<g data-sent="${esc(s.sent ?? '')}">${envelopeArt(d.envelope)}</g>`;
      if (d.pass) over += passArt(d.pass.at, d.pass.col);
    }
    return shadow + byDepth(items) + over + (layer === 'moving' || s.bare ? '' : shadowPills(s, v, layer === 'still'));
  };
}

/** The picture at rest: what the stage shows for state s with no motion (the share image too). */
export const shadowStill = (s: Shadow, v: SceneView = { zoomT: 0 }) => art(s, v, rest(s), 'all', new Set());

/** The picture while a crate is lifted by the pointer: unchanged (the crate stays; a tool rides with the pointer). */
export const toolPiece = (id: string, srv: string) => {
  const p = crateTop(srv);
  return upright(id, [p[0], p[1], p[2] + 6]);
};

/** Whether going from prev to s moves anything (a change of pills, lit outline or callout alone doesn't). */
export const shadowMoves = (a: Shadow, b: Shadow) => {
  const key = (s: Shadow) =>
    JSON.stringify([s.vans, s.hung, s.heap, s.pinned, s.held, s.changed, s.blocked, s.note, s.sent, s.key, s.pass]);
  return key(a) !== key(b);
};

const arc = (a: number[], b: number[], u: number, h = 16) => {
  const p = lerpPt(a, b, u);
  return [p[0], p[1], p[2] + h * Math.sin(Math.PI * u)];
};

/** Tools in production's living scene: vans back up to the dock or pull away, tools fly from crates to their outlines
 * (or back, or halfway and back when a pin holds them), a file flies off to a van, a pass travels between vans. */
export const shadowScene: Scene<Shadow> = (prev, s, t, v) => {
  if (t >= 1 || !shadowMoves(prev, s)) return { still: shadowStill(s, v), moving: '' };
  const A = rest(prev),
    B = rest(s);
  const d: Drawn = { ...B, flying: [], hung: [], gap: {} };
  const movers = new Set<string>();
  // vans: in during the first 40%, out during the first 35%
  const vanMove = IDS.some(id => A.vanX[id] !== B.vanX[id]);
  if (vanMove) {
    movers.add('vans');
    for (const id of IDS) {
      const u = A.vanX[id] < B.vanX[id] ? ph(t, 0, 0.35) : ph(t, 0, 0.4);
      d.vanX[id] = lerp(A.vanX[id], B.vanX[id], u);
      d.vanAt[id] = A.vanX[id] === B.vanX[id] ? B.vanAt[id] : 'road';
    }
    // a crate is down only once its van has docked, and goes up before it leaves
    d.crates = IDS.filter(
      id =>
        (B.crates.includes(id) && (A.crates.includes(id) || t > 0.4)) ||
        (A.crates.includes(id) && B.crates.includes(id)),
    );
  }
  // a seal cracking: its crate moves with the motion
  for (const id of IDS) {
    const broke = (x: Shadow) => x.changed.some(c => toolOf(c).server === id);
    if (broke(s) && !broke(prev)) {
      movers.add('vans');
      d.gap[id] = ph(t, 0.2, 0.8);
    }
  }
  // tools: hang, come down, or are held halfway
  const was = new Map(prev.hung.map(h => [h.id, h.fit])),
    is = new Map(s.hung.map(h => [h.id, h.fit]));
  const fromCrate = (id: string) => {
    const p = crateTop(toolOf(id).server);
    return [p[0], p[1], p[2] + 6];
  };
  const onBoard = (id: string) => {
    const c = cell(id);
    return [c[0], PY + 1.6, c[2]];
  };
  for (const h of s.hung) {
    if (was.get(h.id) === h.fit) d.hung.push(h);
    else {
      movers.add('flight');
      // in flight until the motion ends (the still was drawn at its start), turning askew as it lands if it changed
      const u = ph(t, vanMove ? 0.4 : 0.05, vanMove ? 0.9 : 0.75);
      d.flying.push({
        id: h.id,
        at: arc(was.has(h.id) ? onBoard(h.id) : fromCrate(h.id), onBoard(h.id), u),
        skew: h.fit ? 0 : ph(u, 0.7, 1),
      });
    }
  }
  for (const h of prev.hung)
    if (!is.has(h.id)) {
      movers.add('flight');
      const u = ph(t, 0, 0.35);
      if (u < 1) d.flying.push({ id: h.id, at: arc(onBoard(h.id), fromCrate(h.id), u) });
    }
  for (const id of s.held)
    if (!prev.held.includes(id)) {
      movers.add('flight');
      const u = ph(t, 0.05, 0.9),
        // up toward the board, stopped at the pin, and back into the crate
        mid = lerpPt(fromCrate(id), onBoard(id), 0.55);
      d.flying.push({ id, at: u < 0.5 ? arc(fromCrate(id), mid, u * 2, 10) : arc(mid, fromCrate(id), u * 2 - 1, 6) });
    }
  if (prev.heap !== s.heap) {
    movers.add('bench');
    d.heap = Math.round(lerp(prev.heap, s.heap, ph(t, 0.4, 0.95)));
  }
  if (prev.sent !== s.sent && s.sent) {
    movers.add('flight');
    d.envelope = arc(BENCH_ENV, envelopeEnd(s.sent), ph(t, 0.3, 0.9), 22);
  }
  if (JSON.stringify(prev.pass) !== JSON.stringify(s.pass) && s.pass) {
    movers.add('flight');
    const a = crateTop(s.pass.from),
      b = crateTop(s.pass.to);
    const u = ph(t, 0, s.pass.ok ? 0.8 : 0.55);
    d.pass = {
      col: passCol(s),
      at: s.pass.ok || u < 1 ? arc(a, b, u, 14) : arc(b, a, ph(t, 0.55, 1), 8),
    };
  }
  if (movers.has('vans')) movers.add('flight');
  // flying tools and passes sit over the vans' crates: draw the vans and crates moving together with them
  if (movers.has('flight') && (s.pass || prev.pass)) movers.add('vans');
  return { still: art(s, v, d, 'still', movers), moving: art(s, v, d, 'moving', movers) };
};

/** The picture in words, for its aria-label. */
export function shadowLabel(s: Shadow): string {
  const names = (ids: string[]) => ids.map(id => serverOf(id).name).join(', ');
  const parts = [
    `Larkspur's workshop shadow board: ${TOOLS_ON_BOARD.length} painted tool outlines in four columns, one per supplier van.`,
    s.vans.length ? `At the dock: ${names(s.vans)}.` : 'Every van waits in the yard.',
    s.hung.length
      ? `${s.hung.length} tools hang${
          s.hung.some(h => !h.fit)
            ? `, ${s.hung
                .filter(h => !h.fit)
                .map(h => toolOf(h.id).name)
                .join(', ')} askew, no longer fitting its outline`
            : ', each in its outline'
        }.`
      : 'No tools hang.',
    s.heap ? `${s.heap} more tools lie on the bench.` : '',
    s.pinned.length ? `Padlocked columns: ${names(s.pinned)}.` : '',
    s.held.length ? `Held back in the crate: ${s.held.map(h => toolOf(h).name).join(', ')}.` : '',
    s.blocked?.length ? `Barred: ${names(s.blocked)}.` : '',
    s.sent ? `A file has been sent to ${serverOf(s.sent).name}.` : '',
    s.pass
      ? `A pass from ${serverOf(s.pass.from).name} was ${s.pass.ok ? 'let in' : 'refused'} at ${serverOf(s.pass.to).name}.`
      : '',
  ];
  return parts.filter(Boolean).join(' ');
}

/** the slot index of a board tool (for the twin's order) */
export const boardSlot = slot;
