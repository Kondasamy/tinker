// Where the effort goes: Larkspur's mill yard (docs/modules/adaptive-compute.md). A water tower at the back holds the
// day's effort budget; its water runs through a sorter into a valve manifold, one valve wheel per kind of question. Each
// valve's hose runs to the mill it is turned to: the thinking wheel, the library wheel, the checking sieve or the big
// model machine (or to none: the question goes straight to the assistant). Water reaches only the mills a valve feeds,
// their wheels turn, and the tower's level drops with the bill. A valve wheel's rim shows how its kind did: mint when
// every answer came out right, tomato when wrong, grey when the water ran out first.
// A living scene (KTD2): scene(prev, state, t, view) → { still, moving }; at t = 1 everything is in the still. Words
// only in pills; every string reaching SVG goes through esc().
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt, sayFits } from '../../lib/iso/blocks';
import { modelMachine, person } from '../../lib/iso/figures';
import {
  CERAMIC,
  CLEAR,
  DARK,
  METAL,
  PALS,
  PX,
  PZ,
  WOOD,
  box,
  byDepth,
  castShadow,
  cyl,
  ellUV,
  on,
  pd,
  rod,
  shape,
  tag,
  toneI,
} from '../../lib/iso/core.js';
import { calloutOf, lerp, pillScale, type Scene, type SceneView } from '../../lib/iso/motion';
import type { MillId, Opt } from '../../lib/adaptive-compute/effort';
import type { Say } from '../story/steps';

export const MILL_BOARD: Board = [0, -8, 162, 142];
/** The parts a step's callout or close-up may name. `valve` is the lit valve (else the manifold). */
export const MILL_PARTS = ['tower', 'manifold', 'valve', 'sorter', 'model', 'think', 'lookup', 'check', 'big'] as const;
export type MillPart = (typeof MILL_PARTS)[number];

export type Mark = 'right' | 'wrong' | 'none';
export interface Valve {
  id: string;
  /** its pill: the kind's short name and score */
  short: string;
  count: string;
  to: Opt;
  mark: Mark;
}
export interface MillYard {
  valves: Valve[];
  spent: number;
  budget: number;
  dry: boolean;
  right: number;
  total: number;
  lit?: { valve?: string; mill?: MillId; tower?: boolean; sorter?: boolean; model?: boolean };
  say?: Say;
}

const ORDER: Opt[] = ['straight', 'think', 'lookup', 'check', 'big', 'all'];
const MILL_IDS: MillId[] = ['think', 'lookup', 'check', 'big'];
const feeds = (o: Opt): MillId[] => (o === 'all' ? MILL_IDS : o === 'straight' ? [] : [o]);
const GLOW = 'var(--accent,#f4b829)';
const WATER = { l: '#8fc1f0', m: '#5f97d6', d: '#24467a' };
const MARK: Record<Mark, string> = { right: PALS.mint.l, wrong: PALS.tomato.l, none: CERAMIC.d };

// the tower: a tank on four legs at the back corner
const T = { x: 24, y: 24, r: 12, z0: BH + 30, z1: BH + 58 };
// the sorter where the tower's pipe enters the manifold
const SO = { x0: 45, x1: 59, y0: 12, y1: 27, z: BH + 12 };
// the manifold: a pipe along y with a valve wheel per kind
const MX = 52,
  PIPE_Z = BH + 5,
  VY = [40, 64, 88, 112, 136],
  WR = 5.6, // a valve wheel's radius
  WZ = BH + 15; // its centre's height
const WX = MX + 4.5; // the wheel's plane, facing the mills
// the mills, in a row along y on the far side of the hoses
const MILL_X0 = 106,
  MILL_X1 = 128,
  MY: Record<MillId, number> = { think: 28, lookup: 60, check: 92, big: 124 },
  HALF_Y = 11;
const TROUGH_X = 96; // where hoses end, at each mill's trough
const PAL: Record<MillId, { l: string; m: string; d: string }> = {
  think: PALS.mustard,
  lookup: PALS.cobalt,
  check: PALS.mint,
  big: PALS.blush,
};
const WHEEL: Record<MillId, { x: number; z: number; r: number; dy: number }> = {
  think: { x: MILL_X1 + 1.5, z: BH + 12, r: 10.5, dy: 0 },
  lookup: { x: MILL_X1 + 1.5, z: BH + 8.5, r: 7, dy: -4 },
  check: { x: MILL_X1 + 1.5, z: BH + 7.5, r: 6.5, dy: 4 },
  big: { x: MILL_X1 + 3, z: BH + 9, r: 8, dy: 0 },
};
const MODEL = [148, 14],
  OPERATOR = [40, 0];
/** each mill's roof height, where its name pill hangs */
const TOP: Record<MillId, number> = { think: BH + 28, lookup: BH + 26, check: BH + 19, big: BH + 34 };

type V = number[];

/** How full the tower is, 0–1. */
export const levelOf = (s: MillYard) => Math.max(0, Math.min(1, 1 - s.spent / Math.max(1, s.budget)));
const wet = (s: MillYard) => new Set(s.valves.flatMap(v => feeds(v.to)));

/* ---------------- pieces ---------------- */

/** A wheel standing in the plane x = cx (facing the viewer's right), centre (cy, cz): rim, spokes at `turn` degrees. */
function wheel(cx: number, cy: number, cz: number, r: number, turn: number, m: { l: string; m: string; d: string }) {
  const rim = (rr: number, x: number) => on(PX(x), ellUV(cy, cz, rr, rr, 22));
  let s = shape(rim(r, cx - 1.4), m.d, 0.8) + shape(rim(r, cx), m.l, 1.2) + shape(rim(r * 0.72, cx + 0.05), m.m, 0.6);
  const spokes = 8;
  for (let i = 0; i < spokes; i++) {
    const a = ((turn + (i * 360) / spokes) * Math.PI) / 180,
      c = Math.cos(a),
      sn = Math.sin(a);
    s += `<path d="${pd(
      [
        [cx + 0.1, cy, cz],
        [cx + 0.1, cy + r * c, cz + r * sn],
      ],
      false,
    )}" stroke="#231e16" stroke-width=".8" fill="none"/>`;
    // a paddle on the rim
    const p0 = [cx + 0.2, cy + r * c, cz + r * sn],
      p1 = [cx + 0.2, cy + (r + 1.8) * c, cz + (r + 1.8) * sn];
    s += `<path d="${pd([p0, p1], false)}" stroke="#231e16" stroke-width="2.2" stroke-linecap="round" fill="none"/>`;
  }
  s += shape(on(PX(cx + 0.2), ellUV(cy, cz, 1.4, 1.4, 10)), DARK.m, 0.6);
  return s;
}

/** A valve's hand wheel: three spokes, a knob at its setting's angle, the rim in its kind's outcome colour. */
function valveArt(v: Valve, y: number, turn: number, lit: boolean) {
  const rim = (rr: number, x: number) => on(PX(x), ellUV(y, WZ, rr, rr, 20));
  let s = box(MX - 3, y - 3, PIPE_Z - 3, MX + 3, y + 3, PIPE_Z + 3, METAL, toneI, 1);
  s += rod([MX, y, PIPE_Z + 3], [WX - 1, y, WZ], 0.8, METAL, toneI, 0.8);
  // the spout toward the hoses
  s += rod([MX + 3, y, PIPE_Z], [MX + 7, y, BH + 1.5], 1.3, METAL, toneI, 0.9);
  if (lit)
    s += `<path d="${pd(rim(WR + 1.2, WX))}" fill="none" stroke="${GLOW}" stroke-width="5" stroke-linejoin="round"/>`;
  s += shape(rim(WR, WX), MARK[v.mark], lit ? 2 : 1.2) + shape(rim(WR * 0.62, WX + 0.05), CERAMIC.l, 0.6);
  for (let i = 0; i < 3; i++) {
    const a = ((turn + i * 120) * Math.PI) / 180;
    s += `<path d="${pd(
      [
        [WX + 0.1, y, WZ],
        [WX + 0.1, y + WR * Math.cos(a), WZ + WR * Math.sin(a)],
      ],
      false,
    )}" stroke="#231e16" stroke-width="1" fill="none"/>`;
  }
  // the knob: where the wheel points
  const a = (turn * Math.PI) / 180;
  s += shape(on(PX(WX + 0.4), ellUV(y + WR * Math.cos(a), WZ + WR * Math.sin(a), 1.7, 1.7, 10)), DARK.l, 0.8);
  return `<g data-valve="${esc(v.id)}" data-to="${v.to}" data-mark="${v.mark}"${lit ? ' data-lit="1"' : ''}>${s}</g>`;
}
const turnOf = (o: Opt) => 90 - ORDER.indexOf(o) * 60;

function manifoldArt(s: MillYard, turns: Map<string, number>) {
  let out = rod([MX, VY[0] - 14, PIPE_Z], [MX, VY[VY.length - 1] + 4, PIPE_Z], 2.2, METAL, toneI, 1.2);
  s.valves.forEach((v, i) => {
    out += valveArt(v, VY[i], turns.get(v.id) ?? turnOf(v.to), s.lit?.valve === v.id);
  });
  return `<g data-part="manifold">${out}</g>`;
}

/** One hose on the ground from a valve's spout to a mill's trough; `k` of its length drawn (it grows when turned). */
function hoseArt(i: number, m: MillId, j: number, k = 1, end = TROUGH_X + 6, flow?: number) {
  const a = [MX + 7, VY[i] + (j - 1.5) * 1.4, BH + 0.5],
    b0 = [end, MY[m] + (i - 2) * 1.6, BH + 0.5];
  const b = a.map((x, n) => lerp(x, b0[n], k));
  const d = [b[0] - a[0], b[1] - a[1]],
    l = Math.hypot(d[0], d[1]) || 1,
    nx = (-d[1] / l) * 1.9,
    ny = (d[0] / l) * 1.9;
  const q = [
    [a[0] + nx, a[1] + ny, a[2]],
    [b[0] + nx, b[1] + ny, b[2]],
    [b[0] - nx, b[1] - ny, b[2]],
    [a[0] - nx, a[1] - ny, a[2]],
  ];
  let s = shape(q, WATER.l, 0.7);
  if (flow !== undefined)
    s += `<path d="${pd([a, b], false)}" stroke="#fff" stroke-width="1.1" stroke-dasharray="3 6" stroke-dashoffset="${(-flow * 36).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
  return s;
}
function hosesArt(s: MillYard) {
  return s.valves
    .flatMap((v, i) =>
      feeds(v.to).map(m => `<g data-hose="${esc(v.id)}:${m}">${hoseArt(i, m, MILL_IDS.indexOf(m))}</g>`),
    )
    .join('');
}

function towerArt(level: number, dry: boolean, lit: boolean) {
  const { x, y, r, z0, z1 } = T;
  let s = '';
  for (const [dx, dy] of [
    [-8, -8],
    [8, -8],
    [-8, 8],
    [8, 8],
  ])
    s += rod([x + dx * 1.15, y + dy * 1.15, BH], [x + dx * 0.8, y + dy * 0.8, z0], 1.1, WOOD, toneI, 1);
  s += rod([x, y, z0], [x, y, PIPE_Z], 1.6, METAL, toneI, 1);
  s += box(x - 9, y - 9, z0 - 2.5, x + 9, y + 9, z0, WOOD, toneI, 1);
  const zw = z0 + level * (z1 - z0);
  if (lit)
    s += `<path d="${pd(on(PZ(z0), ellUV(x, y, r + 1.6, r + 1.6, 24)))}" fill="none" stroke="${GLOW}" stroke-width="5"/>`;
  if (level > 0.001) s += cyl(x, y, z0, zw, r, WATER, toneI, 1.6);
  if (zw < z1 - 0.001) s += cyl(x, y, zw, z1, r, CLEAR, toneI, 1.6);
  // a ring of hoops round the tank
  for (const z of [z0 + 9, z0 + 19])
    s += `<path d="${pd(
      on(PZ(z), ellUV(x, y, r + 0.2, r + 0.2, 24)).filter((_: number[], i: number) => i <= 12 || i >= 22),
      false,
    )}" stroke="${DARK.m}" stroke-width=".9" fill="none"/>`;
  s += rod([x, y, z1], [x, y, z1 + 7], r + 1.2, PALS.tomato, toneI, 1.4, 0.6);
  return `<g data-part="tower" data-level="${level.toFixed(2)}" data-dry="${dry ? 1 : 0}">${s}</g>`;
}

function sorterArt(lit: boolean) {
  const { x0, x1, y0, y1, z } = SO;
  let s = '';
  if (lit)
    s += `<path d="${pd(
      on(PZ(BH + 0.3), [
        [x0 - 2, y0 - 2],
        [x1 + 2, y0 - 2],
        [x1 + 2, y1 + 2],
        [x0 - 2, y1 + 2],
      ]),
    )}" fill="none" stroke="${GLOW}" stroke-width="5"/>`;
  s += box(x0, y0, BH, x1, y1, z, DARK, toneI, lit ? 2 : 1.4);
  // a hopper on top where questions drop in, and a row of five coloured chutes on its front
  s += rod([(x0 + x1) / 2, (y0 + y1) / 2, z], [(x0 + x1) / 2, (y0 + y1) / 2, z + 6], 2.5, METAL, toneI, 1, 6);
  const cols = [CERAMIC.l, PALS.mustard.l, PALS.cobalt.l, PALS.mint.l, PALS.blush.l];
  cols.forEach((c, i) => {
    const xx = x0 + 2 + i * 2.2;
    s += shape(
      [
        [xx, y1 + 0.05, BH + 3],
        [xx + 1.6, y1 + 0.05, BH + 3],
        [xx + 1.6, y1 + 0.05, z - 3],
        [xx, y1 + 0.05, z - 3],
      ],
      c,
      0.5,
    );
  });
  return `<g data-part="sorter"${lit ? ' data-lit="1"' : ''}>${s}</g>`;
}

/** A mill's building, without its wheel (the wheel turns, so it is drawn apart). */
function millBody(m: MillId, isWet: boolean, lit: boolean) {
  const y = MY[m],
    p = PAL[m],
    y0 = y - HALF_Y,
    y1 = y + HALF_Y;
  let s = '';
  if (lit)
    s += `<path d="${pd(
      on(PZ(BH + 0.3), [
        [TROUGH_X - 2, y0 - 3],
        [MILL_X1 + 6, y0 - 3],
        [MILL_X1 + 6, y1 + 3],
        [TROUGH_X - 2, y1 + 3],
      ]),
    )}" fill="none" stroke="${GLOW}" stroke-width="5.5" stroke-linejoin="round"/>`;
  // the trough the hoses run into
  s += box(TROUGH_X, y - 5, BH, MILL_X0 + 1, y + 5, BH + 3, WOOD, toneI, 0.9);
  if (isWet)
    s += shape(
      on(PZ(BH + 3.05), [
        [TROUGH_X + 1, y - 4],
        [MILL_X0, y - 4],
        [MILL_X0, y + 4],
        [TROUGH_X + 1, y + 4],
      ]),
      WATER.l,
      0.5,
    );
  if (m === 'think') {
    s += box(MILL_X0, y0, BH, MILL_X1, y1, BH + 20, p, toneI, lit ? 2.2 : 1.4);
    // a pitched roof
    s += shape(
      [
        [MILL_X0, y0, BH + 20],
        [MILL_X1, y0, BH + 20],
        [MILL_X1, y, BH + 28],
        [MILL_X0, y, BH + 28],
      ],
      p.m,
      1.1,
    );
    s += shape(
      [
        [MILL_X0, y, BH + 28],
        [MILL_X1, y, BH + 28],
        [MILL_X1, y1, BH + 20],
        [MILL_X0, y1, BH + 20],
      ],
      WOOD.l,
      1.1,
    );
    s += shape(
      [
        [MILL_X1, y0, BH + 20],
        [MILL_X1, y1, BH + 20],
        [MILL_X1, y, BH + 28],
      ],
      p.l,
      1.1,
    );
  } else if (m === 'lookup') {
    s += box(MILL_X0, y0, BH, MILL_X1, y1, BH + 24, p, toneI, lit ? 2.2 : 1.4);
    // book spines on the front, top half
    const spines = [PALS.tomato.l, PALS.mustard.l, CERAMIC.l, PALS.mint.l, PALS.blush.l, PALS.mustard.m];
    spines.forEach((c, i) => {
      const yy = y0 + 2 + i * 3.1;
      s += shape(
        [
          [MILL_X1 + 0.05, yy, BH + 15],
          [MILL_X1 + 0.05, yy + 2.6, BH + 15],
          [MILL_X1 + 0.05, yy + 2.6, BH + 22 - (i % 3)],
          [MILL_X1 + 0.05, yy, BH + 22 - (i % 3)],
        ],
        c,
        0.6,
      );
    });
    s += box(MILL_X0 - 1, y0 - 1, BH + 24, MILL_X1 + 1, y1 + 1, BH + 26, p, toneI, 1.1);
  } else if (m === 'check') {
    // four posts and a tilted mesh tray: the sieve answers fall through
    for (const [px, py] of [
      [MILL_X0 + 1, y0 + 1],
      [MILL_X1 - 1, y0 + 1],
      [MILL_X0 + 1, y1 - 1],
      [MILL_X1 - 1, y1 - 1],
    ])
      s += box(px - 1, py - 1, BH, px + 1, py + 1, BH + 16 + (px > MILL_X0 + 2 ? -3 : 3), WOOD, toneI, 0.8);
    s += box(MILL_X0 + 2, y0 + 2, BH, MILL_X1 - 2, y1 - 2, BH + 4, p, toneI, 1.2);
    const tray = (a: number, b: number) => [MILL_X0 + a * (MILL_X1 - MILL_X0), y0 + b * (y1 - y0), BH + 19 - a * 6];
    s += shape([tray(0, 0), tray(1, 0), tray(1, 1), tray(0, 1)], p.l, lit ? 2 : 1.3);
    let mesh = '';
    for (let i = 1; i < 6; i++)
      mesh += `${pd([tray(i / 6, 0.05), tray(i / 6, 0.95)], false)} ${pd([tray(0.05, i / 6), tray(0.95, i / 6)], false)} `;
    s += `<path d="${mesh}" stroke="${p.d}" stroke-width=".55" fill="none"/>`;
    if (isWet)
      for (let i = 0; i < 4; i++) {
        const t0 = tray(0.25 + i * 0.17, 0.3 + (i % 2) * 0.35);
        s += `<path d="${pd([t0, [t0[0], t0[1], BH + 6]], false)}" stroke="${WATER.m}" stroke-width="1.1" stroke-dasharray="2 2" fill="none"/>`;
      }
  } else {
    const mm = modelMachine((MILL_X0 + MILL_X1) / 2, y, 0.8, isWet ? 'ok' : undefined, 30, { pal: PALS.tomato });
    s += mm.items.map(i => i.svg).join('');
  }
  return s;
}
function millWheel(m: MillId, turn: number) {
  const w = WHEEL[m];
  return wheel(w.x, MY[m] + w.dy, w.z, w.r, turn, m === 'think' ? WOOD : PAL[m]);
}
function poolArt(m: MillId) {
  const w = WHEEL[m];
  return shape(on(PZ(BH + 0.4), ellUV(w.x + 2, MY[m] + w.dy, 4.5, w.r * 0.8, 16)), WATER.l, 0.7);
}
function millArt(m: MillId, s: MillYard, turn: number | null) {
  const isWet = wet(s).has(m),
    lit = s.lit?.mill === m;
  return `<g data-mill="${m}" data-wet="${isWet ? 1 : 0}"${lit ? ' data-lit="1"' : ''}>${millBody(m, isWet, lit)}${isWet ? poolArt(m) : ''}${turn === null ? '' : millWheel(m, turn)}</g>`;
}

/* ---------------- boxes, parts, pills ---------------- */

const millBox = (m: MillId) => [
  [TROUGH_X, MY[m] - HALF_Y - 2, BH],
  [MILL_X1 + 6, MY[m] + HALF_Y + 2, BH + 30],
];
const valveBox = (i: number) => boxCorners(MX - 3, VY[i] - WR - 1, BH, WX + 1, VY[i] + WR + 1, WZ + WR + 1);
/** a valve with room on its left for its pill (close-ups frame both) */
const valveFrame = (i: number) => boxCorners(MX - 3, VY[i] - WR - 1, BH, WX + 1, VY[i] + WR + 30, WZ + WR + 4);

/** Points of a part's footprint, for close-ups and in-picture targets. */
export function partBox(part: MillPart | string, s?: MillYard): number[][] {
  if (part.startsWith('valve:')) {
    const i = s ? s.valves.findIndex(v => v.id === part.slice(6)) : 0;
    return valveBox(Math.max(0, i));
  }
  if (part.startsWith('mill:')) part = part.slice(5);
  const b = (bx: number[][]) => boxCorners(bx[0][0], bx[0][1], bx[0][2], bx[1][0], bx[1][1], bx[1][2]);
  switch (part) {
    case 'tower':
      return boxCorners(T.x - T.r - 2, T.y - T.r - 2, BH, T.x + T.r + 2, T.y + T.r + 2, T.z1 + 8);
    case 'manifold':
      return boxCorners(MX - 4, VY[0] - 8, BH, WX + 2, VY[VY.length - 1] + 8, WZ + WR + 2);
    case 'valve': {
      const i = s?.valves.findIndex(v => v.id === s.lit?.valve) ?? -1;
      return i >= 0 ? valveFrame(i) : partBox('manifold');
    }
    case 'sorter':
      return boxCorners(SO.x0 - 2, SO.y0 - 2, BH, SO.x1 + 2, SO.y1 + 2, SO.z + 7);
    case 'model':
      return boxCorners(MODEL[0] - 12, MODEL[1] - 12, BH, MODEL[0] + 12, MODEL[1] + 12, BH + 23);
    case 'think':
    case 'lookup':
    case 'check':
    case 'big':
      return b(millBox(part));
  }
  return partBox('manifold');
}

const pill = (p: V, dx: number, dy: number, text: string, lit: boolean, k: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, k)}</g>`;
/** A callout off to the right of its point (over the open ground), for the manifold's crowded left side. */
const sideCallout = (
  say: Say | undefined,
  v: SceneView,
  part: string,
  p3: V,
  sc: number,
  phone: boolean,
  dx = 44,
  dy = 16,
) => {
  const sy = calloutOf(say, v);
  return sy && sayFits(sy, part, phone)
    ? `<g class="callout" aria-hidden="true" pointer-events="none">${tag(p3, dx, dy, esc(sy.text), true, sc)}</g>`
    : '';
};
const MILL_NAME: Record<MillId, string> = { think: 'THINK', lookup: 'LOOK UP', check: 'CHECK', big: 'BIG MODEL' };

/** The pills alone (valve scores, mill names, the tower's bill, the assistant's score, the callout), drawn outside the
 * ink filter as a PillLayer on the live stage; mid-motion the numbers that are changing wait. */
export function millPills(s: MillYard, v: SceneView, moving = false) {
  const k = (p: string) => pillScale(p, v),
    phone = !!v.phone,
    out: string[] = [];
  const put = (part: string, at: V, dx: number, dy: number, text: string, lit: boolean, show = true) => {
    const sc = k(part);
    if (sc && show) out.push(pill(at, dx, dy, text, lit, sc));
    out.push(sayAt(calloutOf(s.say, v), part, at, dy - 10, sc || 1, phone));
  };
  // valves: each pill to the wheel's left (neighbours sit a pill's height apart); on phones only the lit one
  s.valves.forEach((val, i) => {
    const lit = s.lit?.valve === val.id,
      part = lit ? 'valve' : 'manifold';
    if (phone && !lit) return;
    if (v.zoomT > 0 && !lit && !v.closeUp?.includes('manifold')) return;
    const sc = k(part);
    if (sc && !moving) out.push(pill([WX, VY[i] - WR, WZ], -38, -2, `${val.short} ${val.count}`, lit, sc));
  });
  const litI = s.valves.findIndex(x => x.id === s.lit?.valve);
  // the valve and manifold callouts sit out over the hoses, clear of the valves' own pills
  out.push(sideCallout(s.say, v, 'valve', [WX, VY[Math.max(0, litI)], WZ], k('valve') || 1, phone));
  out.push(sideCallout(s.say, v, 'manifold', [MX, VY[4] + 2, PIPE_Z], k('manifold') || 1, phone, -6, 36));
  for (const m of MILL_IDS) {
    const lit = s.lit?.mill === m,
      sc = k(m),
      at = [(MILL_X0 + MILL_X1) / 2, MY[m], TOP[m]];
    if (sc && (!phone || lit)) out.push(pill(at, 0, -16, MILL_NAME[m], lit, sc));
    // the mill's callout hangs off its front, over the open ground, clear of the next mill's name
    out.push(sideCallout(s.say, v, m, [MILL_X1, MY[m], BH + 12], sc || 1, phone, 40, 30));
  }
  const bill = `${s.spent}/${s.budget}`;
  put(
    'tower',
    [T.x, T.y, T.z1 + 7],
    0,
    -12,
    phone ? bill : s.dry ? `DRY: ${s.spent} OF ${s.budget}` : `SPENT ${s.spent} OF ${s.budget}`,
    !!s.lit?.tower,
    !moving,
  );
  put(
    'model',
    [MODEL[0], MODEL[1], BH + 24],
    -6,
    -14,
    phone ? `${s.right}/${s.total}` : `RIGHT ${s.right} OF ${s.total}`,
    !!s.lit?.model,
    !moving,
  );
  // the sorter's callout goes left, above its name, clear of the operator behind it
  const soAt = [SO.x0, (SO.y0 + SO.y1) / 2, SO.z + 6];
  if (k('sorter') && (!phone || s.lit?.sorter)) out.push(pill(soAt, -30, -8, 'SORTER', !!s.lit?.sorter, k('sorter')));
  out.push(sideCallout(s.say, v, 'sorter', soAt, k('sorter') || 1, phone, -40, -26));
  return [
    ...out.filter(p => p && !p.startsWith('<g class="callout"')),
    ...out.filter(p => p.startsWith('<g class="callout"')),
  ].join('');
}

/* ---------------- the picture ---------------- */

interface Skip {
  tower?: boolean;
  manifold?: boolean;
  hoses?: boolean;
  wheels?: Set<MillId>;
}

function setting(top: SceneCtx['top']) {
  const mm = modelMachine(MODEL[0], MODEL[1], 0.7),
    op = person({ x: OPERATOR[0], y: OPERATOR[1], facing: 110, look: 'operator' });
  const sh =
    castShadow(boxCorners(T.x - T.r, T.y - T.r, T.z0, T.x + T.r, T.y + T.r, T.z1), BH, top) +
    castShadow(boxCorners(SO.x0, SO.y0, BH, SO.x1, SO.y1, SO.z), BH, top) +
    MILL_IDS.map(m =>
      castShadow(boxCorners(MILL_X0, MY[m] - HALF_Y, BH, MILL_X1, MY[m] + HALF_Y, BH + 22), BH, top),
    ).join('');
  return {
    shadow: sh + mm.shadow + op.shadow,
    items: [...mm.items.map(i => ({ ...i, svg: `<g data-part="model">${i.svg}</g>` })), ...op.items],
  };
}

function art(s: MillYard, skip: Skip, withPills: boolean, v: SceneView) {
  return (ctx: SceneCtx) => {
    const set = setting(ctx.top);
    const items = [
      ...set.items,
      {
        box: [
          [T.x - T.r, T.y - T.r, BH],
          [T.x + T.r, T.y + T.r, T.z1 + 7],
        ],
        svg: skip.tower ? '' : towerArt(levelOf(s), s.dry, !!s.lit?.tower),
      },
      {
        box: [
          [SO.x0, SO.y0, BH],
          [SO.x1, SO.y1, SO.z + 6],
        ],
        svg: sorterArt(!!s.lit?.sorter),
      },
      {
        box: [
          [MX - 3, VY[0] - 14, BH],
          [WX + 1, VY[VY.length - 1] + 6, WZ + WR],
        ],
        svg: skip.manifold ? '' : manifoldArt(s, new Map()),
      },
      ...MILL_IDS.map(m => ({ box: millBox(m), svg: millArt(m, s, skip.wheels?.has(m) ? null : 0) })),
    ];
    // the pipe from the tower to the sorter lies under everything
    const pipe = rod([T.x, T.y, PIPE_Z], [SO.x0, T.y, PIPE_Z], 1.6, METAL, toneI, 1);
    return set.shadow + (skip.hoses ? '' : hosesArt(s)) + pipe + byDepth(items) + (withPills ? millPills(s, v) : '');
  };
}

/** The picture at rest; the share image keeps its pills inline, the live stage draws them apart (millPills). */
export const millStill = (s: MillYard, v: SceneView = { zoomT: 0 }, withPills = true) => art(s, {}, withPills, v);

/** While a valve's hose is dragged: the yard as it is, and the hose's nozzle at that valve's spout. */
export function millLift(s: MillYard, v: SceneView, id: string) {
  const i = Math.max(
    0,
    s.valves.findIndex(x => x.id === id),
  );
  return {
    still: art(s, {}, false, v),
    // drawn in the stage's frame by the hook
    piece: () => rod([MX + 6, VY[i], BH + 2], [MX + 13, VY[i], BH + 2], 2.4, WATER, toneI, 1.4, 1.2),
  };
}

const valveKey = (s: MillYard) => s.valves.map(v => `${v.id}:${v.to}`).join();
/** Whether going from prev to s moves anything: a valve turned or the bill changed (a lit part alone lands at once). */
export const millMoves = (prev: MillYard, s: MillYard) =>
  valveKey(prev) !== valveKey(s) || prev.spent !== s.spent || prev.budget !== s.budget;

/** The mill yard's living scene: turned valve wheels spin to their new setting, hoses swing to their new mill, water
 * pulses along every wet hose, wet wheels turn and the tower's level slides to the new bill. */
export const millScene: Scene<MillYard> = (prev, s, t, v) => {
  if (t >= 1 || !millMoves(prev, s)) return { still: millStill(s, v, false), moving: '' };
  const wetNow = wet(s),
    wetWas = wet(prev);
  const wheels = new Set(MILL_IDS.filter(m => wetNow.has(m) || wetWas.has(m)));
  const towerMoves = levelOf(prev) !== levelOf(s) || prev.dry !== s.dry;
  const valvesMove = valveKey(prev) !== valveKey(s);
  const skip: Skip = { tower: towerMoves, manifold: valvesMove, hoses: true, wheels };
  const moving = () => {
    let out = '';
    // hoses: kept ones pulse; new ones grow out of their spout; gone ones shrink back into it
    s.valves.forEach((val, i) => {
      const was = prev.valves[i] ? feeds(prev.valves[i].to) : [];
      for (const m of feeds(val.to))
        out += hoseArt(i, m, MILL_IDS.indexOf(m), was.includes(m) ? 1 : t, TROUGH_X + 6, t);
      for (const m of was)
        if (!feeds(val.to).includes(m)) out += hoseArt(i, m, MILL_IDS.indexOf(m), 1 - t, TROUGH_X + 6);
    });
    if (valvesMove) {
      const turns = new Map(
        s.valves.map((val, i) => [val.id, lerp(turnOf(prev.valves[i]?.to ?? val.to), turnOf(val.to), t)] as const),
      );
      out += manifoldArt(s, turns);
    }
    if (towerMoves) out += towerArt(lerp(levelOf(prev), levelOf(s), t), s.dry && t > 0.9, !!s.lit?.tower);
    // wet wheels turn one and a half times (ending where the still draws them); a wheel losing its water slows to a stop
    for (const m of wheels) out += millWheel(m, (wetNow.has(m) ? t : Math.sin((t * Math.PI) / 2)) * 540);
    return out;
  };
  return { still: art(s, skip, false, v), moving };
};

/** The picture in words, for its aria-label. */
export function millLabel(s: MillYard): string {
  const route = s.valves
    .map(
      v =>
        `${v.short.toLowerCase()} to ${v.to === 'straight' ? 'the assistant directly' : v.to === 'all' ? 'every mill' : MILL_NAME[v.to as MillId].toLowerCase()}`,
    )
    .join(', ');
  const working = [...wet(s)].map(m => MILL_NAME[m].toLowerCase());
  return (
    `Larkspur's mill yard: a water tower ${s.dry ? 'run dry' : `${Math.round(levelOf(s) * 100)}% full`} after spending ${s.spent} of ${s.budget}; ` +
    `valves send ${route}; ${working.length ? `turning: ${working.join(', ')}` : 'no mill turning'}; ${s.right} of ${s.total} answers right.`
  );
}
