// The Caching module's picture: the depot map (KTD15). Larkspur's central depot (the origin) stands at the back, joined by
// roads to three regional warehouses (the edge caches), the west one farthest. Each warehouse has a shelf in front with a
// cubby per kind of content (price mustard, photo cobalt, stock mint), a box in it while a copy is kept. A truck rides a
// road for every trip to the depot this quarter hour (three at most); a tomato tag flies over a warehouse that served a
// stale copy this quarter hour; an overloaded depot has trucks queued round it. Words only in pills; on phones
// (scale > 1.5) pills keep just the names and the caption carries the numbers.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  PALS,
  METAL,
  CERAMIC,
  DARK,
  WOOD,
  pd,
  box,
  castShadow,
  clipTo,
  fill,
  hullInk,
  line,
  rod,
  shape,
  toneI,
  tag,
  byDepth,
  vis,
} from '../../lib/iso/core.js';
import { building, hexa, type Piece } from '../../lib/iso/figures';
import { EDGES, KINDS, type Edge, type Kind, type Result } from '../../lib/caching/sim';
import type { Say } from '../story/steps';

export const DEPOT_BOARD: Board = [30, 4, 196, 198];

export interface EdgeView {
  hits: number;
  misses: number;
  stale: number;
  trips: number;
  shelf: Kind[];
}
export interface DepotOpts {
  edges: Record<Edge, EdgeView>;
  /** trips to the depot this quarter hour, from every warehouse */
  trips: number;
  overloaded: boolean;
  /** the step's callout, over one of DEPOT_PARTS */
  say?: Say;
  /** pill size; phones pass more */
  scale?: number;
}

/** The parts a step's callout may name: the depot and each warehouse. */
export const DEPOT_PARTS = ['depot', ...EDGES] as const;

const DEPOT = { x: 60, y: 30, half: 20, top: BH + 34 };
const SITE: Record<Edge, [number, number]> = { north: [110, 105], east: [170, 45], west: [45, 180] };
const WH = { half: 12, top: BH + 16 };
export const KIND_PAL: Record<Kind, { l: string; m: string; d: string }> = {
  price: PALS.mustard,
  photo: PALS.cobalt,
  stock: PALS.mint,
};
export const EDGE_NAME: Record<Edge, string> = { north: 'North', east: 'East', west: 'West' };

const empty = (): EdgeView => ({ hits: 0, misses: 0, stale: 0, trips: 0, shelf: [] });
/** The map as of tick t of a run. */
export function depotAt(r: Result, t: number): Omit<DepotOpts, 'say' | 'scale'> {
  const k = r.ticks[Math.max(0, Math.min(t, r.ticks.length - 1))];
  return {
    edges: Object.fromEntries(EDGES.map(e => [e, k ? { ...k.edges[e] } : empty()])) as Record<Edge, EdgeView>,
    trips: k?.trips ?? 0,
    overloaded: k?.overloaded ?? false,
  };
}
/** An idle map: nothing asked, empty shelves. */
export const IDLE: Omit<DepotOpts, 'say' | 'scale'> = {
  edges: { north: empty(), east: empty(), west: empty() },
  trips: 0,
  overloaded: false,
};

/** What the map shows. Pure, so the tests can check it without drawing. */
export function depotState(o: DepotOpts) {
  return {
    trucks: Object.fromEntries(EDGES.map(e => [e, Math.min(3, o.edges[e].trips)])) as Record<Edge, number>,
    tagged: EDGES.filter(e => o.edges[e].stale > 0),
    queued: o.overloaded ? Math.min(4, Math.ceil((o.trips - 20) / 10) + 1) : 0,
  };
}

const plural = (n: number, w: string) => {
  const end = /s$/i.test(w) ? 'es' : 's';
  return `${n} ${w}${n === 1 ? '' : w === w.toUpperCase() ? end.toUpperCase() : end}`;
};
const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;

/** A road from a warehouse to the depot, and its unit direction and sideways normal. */
function road(e: Edge) {
  const [x, y] = SITE[e],
    dx = DEPOT.x - x,
    dy = DEPOT.y - y,
    L = Math.hypot(dx, dy),
    u = [dx / L, dy / L],
    n = [-u[1], u[0]];
  const a = [x + u[0] * (WH.half + 2), y + u[1] * (WH.half + 2)],
    b = [DEPOT.x - u[0] * (DEPOT.half + 2), DEPOT.y - u[1] * (DEPOT.half + 2)];
  return { a, b, u, n };
}

const ROAD_W = 6; // half the road's width
/** A road on the board from a to b (n: its sideways direction). Real-object notes: dark asphalt between pale kerbs;
 * a dashed white line down the middle. Flat on the board, so it is floor, drawn before the shadows. */
function roadAt(a: number[], b: number[], n: number[], w = ROAD_W) {
  const z = BH + 0.15,
    L = Math.hypot(b[0] - a[0], b[1] - a[1]),
    at = (t: number, k: number) => [
      a[0] + ((b[0] - a[0]) * t) / L + n[0] * k,
      a[1] + ((b[1] - a[1]) * t) / L + n[1] * k,
      z,
    ];
  let s = shape([at(0, w + 1), at(L, w + 1), at(L, -w - 1), at(0, -w - 1)], CERAMIC.m, 0.9);
  s += shape([at(0, w), at(L, w), at(L, -w), at(0, -w)], '#5d5953', 0);
  for (let t = 2; t + 3 < L; t += 6)
    s += fill(pd([at(t, -0.45), at(t + 3, -0.45), at(t + 3, 0.45), at(t, 0.45)]), '#f4f1e8');
  return s;
}

/** A small delivery van with its driver in the cab, facing `facing` degrees; `cls` marks it for the tests. The kit's
 * van is too big and too heavy for nine on a road at once, so this one is lean: a box van with a cab and bonnet,
 * wheels with a tyre's thickness and a hub, a windscreen, and the driver's head in the side window. Real-object
 * notes as the kit's van: cargo box behind, cab ahead with a sloped screen, a bonnet with lamps, four wheels. */
function truck(x: number, y: number, facing: number, cls = 'truck'): Piece {
  const t = (facing * Math.PI) / 180,
    F = [Math.cos(t), Math.sin(t), 0],
    S = [-Math.sin(t), Math.cos(t), 0],
    z = BH,
    at = (a: number, b: number, c: number) => [x + F[0] * a + S[0] * b, y + F[1] * a + S[1] * b, z + c],
    cuboid = (a0: number, a1: number, b0: number, b1: number, c0: number, c1: number, c1f = c1, a1t = a1) => [
      at(a0, b0, c0),
      at(a1, b0, c0),
      at(a1, b1, c0),
      at(a0, b1, c0),
      at(a0, b0, c1),
      at(a1t, b0, c1f),
      at(a1t, b1, c1f),
      at(a0, b1, c1),
    ],
    W = 3.2,
    near = vis(S) ? 1 : -1,
    ahead = vis(F);
  const wheel = (a: number, k: number) => {
    const ring = (o: number, r: number) =>
      Array.from({ length: 8 }, (_, i) => {
        const q = (i / 8) * 2 * Math.PI;
        return at(a + r * Math.cos(q), k * (W + o), 1.5 + r * Math.sin(q));
      });
    return k === near
      ? shape(ring(-0.8, 1.5), DARK.d, 0.6) + shape(ring(0.1, 1.5), DARK.m, 0.8) + fill(pd(ring(0.15, 0.6)), METAL.m)
      : fill(pd(ring(-0.1, 1.5)), DARK.d);
  };
  const cargo = cuboid(-7, 2, -W, W, 1.5, 8),
    cab = cuboid(2, 5.6, -W, W, 1.5, 6.4, 6.4, 4.2),
    bonnet = cuboid(5.6, 7.2, -W + 0.2, W - 0.2, 1.5, 3.8);
  let body = '';
  let front = hexa(cab, PALS.mustard, 0.8) + hexa(bonnet, PALS.mustard, 0.7);
  // the windscreen on the sloped face, when the van comes toward the viewer
  if (ahead)
    front += shape(
      [at(5.65, -W + 0.6, 3.9), at(5.65, W - 0.6, 3.9), at(4.3, W - 0.6, 6.2), at(4.3, -W + 0.6, 6.2)],
      '#cfe9f0',
      0.6,
    );
  // the side window and the driver's head in it, on the side toward the viewer
  const B = near * (W + 0.05);
  front += shape([at(2.5, B, 3.6), at(4.6, B, 3.6), at(3.8, B, 5.9), at(2.5, B, 5.9)], '#cfe9f0', 0.6);
  front += fill(pd([at(2.9, B, 3.6), at(3.9, B, 3.6), at(3.9, B, 5.2), at(3.4, B, 5.6), at(2.9, B, 5.2)]), '#6a4a36');
  let back = hexa(cargo, CERAMIC, 0.8);
  back += shape([at(-6.5, B, 4), at(1.5, B, 4), at(1.5, B, 5.3), at(-6.5, B, 5.3)], PALS.tomato.l, 0.5);
  body += ahead ? back + front : front + back;
  const svg =
    wheel(-4.5, -near) +
    wheel(4.5, -near) +
    body +
    wheel(-4.5, near) +
    wheel(4.5, near) +
    hullInk([...cargo, ...cab, ...bonnet], 1.6);
  const pts = [...cargo, ...bonnet, at(-7, -W - 1, 0), at(7.2, W + 1, 0)],
    bx = [0, 1].map(e => [0, 1, 2].map(k => (e ? Math.max : Math.min)(...pts.map(p => p[k]))));
  return { shadow: castShadow(pts, BH), items: [{ box: bx, svg: `<g class="${cls}">${svg}</g>` }], box: bx };
}
const deg = (u: number[]) => (Math.atan2(u[1], u[0]) * 180) / Math.PI;

const BAY = { y0: 12, y1: 26, x1: DEPOT.x + DEPOT.half + 4.5 };
/** The depot: a sawtooth-roofed shed (north lights along its roof) with a loading bay on its right-hand side: a roller
 * shutter under a canopy, a dock to back a van up to. */
function depot(): Piece {
  const { x, y, half: h, top } = DEPOT,
    zt = top - 7; // the roof's teeth reach the old roof line, under the pill
  const b = building({
    x,
    y,
    d: 2 * h,
    w: 2 * h,
    h: zt - BH,
    roof: 'sawtooth',
    front: '+y',
    pal: METAL,
    roofPal: PALS.cobalt,
  });
  // the roller shutter, on the bay wall when it faces the viewer: slats across a cobalt door in a frame
  let sh = '';
  if (vis([1, 0, 0])) {
    const X = x + h + 0.15,
      q = (a: number, c: number, d: number, e: number, o = 0) => [
        [X + o, a, c],
        [X + o, d, c],
        [X + o, d, e],
        [X + o, a, e],
      ];
    sh += shape(q(BAY.y0, BH, BAY.y1, BH + 14), CERAMIC.m, 1);
    sh += shape(q(BAY.y0 + 1, BH, BAY.y1 - 1, BH + 13, 0.1), PALS.cobalt.m, 0.9);
    for (let z = BH + 2; z < BH + 13; z += 2)
      sh += line(
        [
          [X + 0.2, BAY.y0 + 1, z],
          [X + 0.2, BAY.y1 - 1, z],
        ],
        0.5,
      );
  }
  const [shell] = b.items;
  const dock = box(x + h, BAY.y0 - 1, BH, BAY.x1, BAY.y1 + 1, BH + 4, CERAMIC, toneI, 1),
    canopy = box(x + h, BAY.y0 - 2, BH + 15, BAY.x1 + 1, BAY.y1 + 2, BH + 16.2, PALS.cobalt, toneI, 1);
  return {
    shadow: b.shadow + castShadow(boxCorners(x + h, BAY.y0 - 2, BH, BAY.x1 + 1, BAY.y1 + 2, BH + 16.2), BH),
    items: [
      { box: shell.box, svg: `<g data-prop="depot">${shell.svg}${sh}</g>` },
      {
        box: [
          [x + h, BAY.y0 - 2, BH],
          [BAY.x1 + 1, BAY.y1 + 2, BH + 16.2],
        ],
        svg: `<g class="bay">${dock}${canopy}</g>`,
      },
    ],
    box: b.box,
  };
}

/** A regional warehouse: a gable-roofed store with a striped awning over its front windows, and in front the shelf,
 * an open wooden stand with a cubby per kind (a crate of the kind's colour while a copy is kept). */
function warehouse(e: Edge, v: EdgeView, tagged: boolean): Piece[] {
  const [x, y] = SITE[e],
    h = WH.half;
  const b = building({
    x,
    y,
    // a hair deeper than wide, so the ridge runs front to back and the awning hangs under a gable end, not an eave
    d: 2 * h + 0.2,
    w: 2 * h,
    h: 12,
    roof: 'gable',
    front: '+x',
    door: false,
    awning: true,
    roofPal: WOOD,
  });
  const [shell] = b.items,
    ridge = shell.box[1][2];
  const flag = tagged
    ? `<g class="stale-tag">${rod([x, y, ridge - 1], [x, y, ridge + 11], 0.5, DARK, toneI, 0.8)}${box(x, y - 0.3, ridge + 6, x + 7, y + 0.3, ridge + 11, PALS.tomato, toneI, 0.9)}</g>`
    : '';
  const wh: Piece = {
    shadow: b.shadow,
    items: [
      {
        box: tagged ? [shell.box[0], [shell.box[1][0] + 7, shell.box[1][1], ridge + 11]] : shell.box,
        svg: `<g data-prop="${e}" data-stale="${tagged ? 1 : 0}" data-trips="${v.trips}">${shell.svg}${flag}</g>`,
      },
    ],
    box: b.box,
  };
  // the shelf: a low wooden stand, plank dividers between the cubbies on it, a crate in each kept one
  const sx = x + h + 3,
    zz = BH + 4.2;
  const cubs = Array.from({ length: KINDS.length + 1 }, (_, i) => {
    const dy = y - h + i * 8;
    return {
      box: [
        [sx, dy - 0.4, zz],
        [sx + 6, dy + 0.4, zz + 6],
      ],
      svg: box(sx, dy - 0.4, zz, sx + 6, dy + 0.4, zz + 6, WOOD, toneI, 0.7),
    };
  });
  KINDS.forEach((k, i) => {
    const cy = y - h + 4 + i * 8,
      kept = v.shelf.includes(k);
    cubs.push({
      box: [
        [sx + 1, cy - 2.6, zz],
        [sx + 5, cy + 2.6, zz + 4.5],
      ],
      svg: `<g class="copy" data-kind="${k}" data-kept="${kept ? 1 : 0}">${box(sx + 1, cy - 2.6, zz, sx + 5, cy + 2.6, zz + (kept ? 4.5 : 0.3), kept ? KIND_PAL[k] : CERAMIC, toneI, 0.7)}</g>`,
    });
  });
  const shelfBox = [
    [sx, y - h, BH],
    [sx + 6, y + h, zz + 6],
  ];
  const shelf: Piece = {
    shadow: castShadow(boxCorners(sx, y - h, BH, sx + 6, y + h, zz + 6), BH),
    items: [
      {
        box: shelfBox,
        svg: `<g data-prop="shelf" data-edge="${e}">${box(sx, y - h, BH, sx + 6, y + h, zz, WOOD, toneI, 0.9)}${byDepth(cubs)}</g>`,
      },
    ],
    box: shelfBox,
  };
  return [wh, shelf];
}

/** A road sign by the junction: a post and a cobalt plate with a white arrow toward the depot (words go in pills). */
function sign(x: number, y: number): Piece {
  const zt = BH + 17;
  let s = rod([x, y, BH], [x, y, zt], 0.6, METAL, toneI, 0.9);
  s += box(x - 0.4, y - 5, zt - 6, x + 0.4, y + 5, zt + 1, PALS.cobalt, toneI, 1);
  const zc = zt - 2.5;
  for (const sx of [-1, 1])
    if (vis([sx, 0, 0])) {
      const X = x + sx * 0.45;
      // the arrow points toward -y (the depot's way) on both faces
      s += shape(
        [
          [X, y + 3.4, zc - 0.9],
          [X, y - 1, zc - 0.9],
          [X, y - 1, zc - 2.4],
          [X, y - 3.8, zc],
          [X, y - 1, zc + 2.4],
          [X, y - 1, zc + 0.9],
          [X, y + 3.4, zc + 0.9],
        ],
        '#f4f1e8',
        0.6,
      );
    }
  const bx = [
    [x - 1, y - 5, BH],
    [x + 1, y + 5, zt + 1],
  ];
  return {
    shadow: castShadow(boxCorners(x - 1, y - 5, BH, x + 1, y + 5, zt + 1), BH),
    items: [{ box: bx, svg: `<g class="sign">${s}</g>` }],
    box: bx,
  };
}

/** The map: roads (floor), every shadow, then the buildings, shelves and vans in one sort, then the pills. */
export const depotScene = (o: DepotOpts) => (ctx: SceneCtx) => {
  const st = depotState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5;
  let s = '';
  for (const e of EDGES) {
    const { a, b, n } = road(e);
    s += `<g data-prop="road" data-edge="${e}">${roadAt(a, b, n)}</g>`;
  }
  const pieces: Piece[] = [
    depot(),
    ...EDGES.flatMap(e => warehouse(e, o.edges[e], st.tagged.includes(e))),
    sign(132, 62),
  ];
  for (const e of EDGES) {
    const { a, b, u, n } = road(e),
      L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    // spread along the road (wider apart on the short north road), in the lane on the left on the way to the depot
    for (let i = 0; i < st.trucks[e]; i++) {
      const t = L < 70 ? 0.18 + i * 0.32 : 0.13 + i * 0.22;
      pieces.push(truck(a[0] + (b[0] - a[0]) * t + n[0] * 2.6, a[1] + (b[1] - a[1]) * t + n[1] * 2.6, deg(u)));
    }
  }
  // the queue waits in the yard by the loading bay, backed up toward the depot
  for (let i = 0; i < st.queued; i++)
    pieces.push(truck(BAY.x1 + 9 + (i >> 1) * 16, BAY.y0 + 1 + (i % 2) * 8.5, 0, 'truck queued'));
  s += clipTo(ctx.top, pieces.map(p => p.shadow).join(''));
  s += `<g data-prop="trips" data-trips="${o.trips}" data-overloaded="${o.overloaded ? 1 : 0}">${byDepth(pieces.flatMap(p => p.items))}</g>`;
  const OVER = '#f6c2b4';
  let pills = pill(
    [DEPOT.x, DEPOT.y, DEPOT.top + 3],
    -10,
    -20,
    narrow ? 'DEPOT' : `DEPOT · ${plural(o.trips, 'TRIP')}${o.overloaded ? ' · OVERLOADED' : ''}`,
    o.trips > 0 && !o.overloaded,
    scale,
    o.overloaded ? OVER : undefined,
  );
  for (const e of EDGES) {
    const [x, y] = SITE[e],
      v = o.edges[e],
      name = EDGE_NAME[e].toUpperCase();
    // north's pill floats over it; the front pair's sit in front, so the three never meet in one row
    const front = e !== 'north';
    pills += pill(
      front ? [x + WH.half, y + WH.half, BH] : [x, y, WH.top + 2.5],
      0,
      front ? 20 : -20,
      narrow || v.hits + v.misses === 0 ? name : `${name} · ${plural(v.hits, 'HIT')} · ${plural(v.misses, 'MISS')}`,
      v.hits > 0,
      scale,
    );
  }
  // the callout stands over its part, even where phones shorten the part's pill
  pills += sayAt(o.say, 'depot', [DEPOT.x, DEPOT.y, DEPOT.top + 3], -20, scale);
  for (const e of EDGES) pills += sayAt(o.say, e, [...SITE[e], WH.top + 2.5], -18, scale);
  return s + pills;
};

/** The map in words, for its aria-label. */
export function depotLabel(o: DepotOpts): string {
  const st = depotState(o);
  const edge = (e: Edge) => {
    const v = o.edges[e];
    return (
      `${EDGE_NAME[e]}: ${v.hits} served from the shelf, ${v.misses} sent to the depot` +
      `${v.stale ? `, ${v.stale} stale` : ''}; shelf holds ${v.shelf.length ? v.shelf.join(', ') : 'nothing'}`
    );
  };
  return (
    `The depot map: the central depot joined by roads to three regional warehouses. ` +
    `${plural(o.trips, 'trip')} to the depot this quarter hour${o.overloaded ? ', more than it can take' : ''}. ` +
    `${EDGES.map(edge).join('. ')}.` +
    (st.tagged.length ? ` Stale tag over ${st.tagged.map(e => EDGE_NAME[e]).join(', ')}.` : '')
  );
}

/** The counts the caption carries (phones show only the names in the pills). */
export function depotReadouts(o: DepotOpts): string[] {
  const n = (f: (v: EdgeView) => number) => EDGES.reduce((a, e) => a + f(o.edges[e]), 0);
  return [
    `${n(v => v.hits)} from shelves`,
    `${n(v => v.misses)} to the depot`,
    `${plural(o.trips, 'trip')}${o.overloaded ? ' (overloaded)' : ''}`,
    ...(n(v => v.stale) ? [`${n(v => v.stale)} stale`] : []),
  ];
}

/** The plot's truck: a small box truck at (x, y). */
function plotTruck(x: number, y: number) {
  const z = BH + 0.4;
  return {
    at: [x, y, 1],
    svg: `<g class="truck">${box(x - 4, y - 3, z, x + 4, y + 3, z + 5, PALS.mustard, toneI, 0.9)}${box(x + 4, y - 2.5, z, x + 6.5, y + 2.5, z + 3.5, METAL, toneI, 0.8)}</g>`,
  };
}

/** The home hero's plot: a small depot, one road to a small warehouse with its three copies on the shelf, and a truck
 * on the way. */
export function depotPlot(x: number, y: number, top: SceneCtx['top']): string {
  const dx = x - 14,
    dy = y - 10,
    h = 8,
    wx = x + 14,
    wy = y + 6,
    w = 6;
  let d = box(dx - h, dy - h, BH, dx + h, dy + h, BH + 14, METAL, toneI, 1);
  d += box(dx - h + 1, dy - h + 1, BH + 14, dx + h - 1, dy + h - 1, BH + 15.5, PALS.cobalt, toneI, 0.8);
  d += hullInk(boxCorners(dx - h, dy - h, BH, dx + h, dy + h, BH + 15.5), 1.8);
  let wh = box(wx - w, wy - w, BH, wx + w, wy + w, BH + 8, CERAMIC, toneI, 1);
  wh += box(wx - w, wy - w, BH + 8, wx + w, wy + w, BH + 9.5, WOOD, toneI, 0.8);
  wh += hullInk(boxCorners(wx - w, wy - w, BH, wx + w, wy + w, BH + 9.5), 1.6);
  KINDS.forEach((k, i) => {
    const cy = wy - w + 2 + i * 4;
    wh += box(wx + w + 1.5, cy - 1.4, BH, wx + w + 4.5, cy + 1.4, BH + 3, KIND_PAL[k], toneI, 0.6);
  });
  const L = Math.hypot(wx - dx, wy - dy),
    u = [(wx - dx) / L, (wy - dy) / L],
    n = [-u[1], u[0]];
  return (
    castShadow(boxCorners(dx - h, dy - h, BH, dx + h, dy + h, BH + 15), BH, top) +
    roadAt([dx + u[0] * (h + 1), dy + u[1] * (h + 1)], [wx - u[0] * (w + 1), wy - u[1] * (w + 1)], n, 3.5) +
    byDepth([{ at: [dx, dy, 0], svg: d }, { at: [wx, wy, 0], svg: wh }, plotTruck((dx + wx) / 2, (dy + wy) / 2)])
  );
}
