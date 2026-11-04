// Why did it fail?'s picture: an inspector's bench with a wooden marble run (docs/modules/causal-evals.md). Eight
// sloped wooden chute pieces, one per step of the agent's run, stand on trestles in a falling line from the start cup
// (back left) to a sorting flap (front right) that drops the marble into one of two trays: the right thing sent
// (mint) or the wrong thing (tomato). A grey gutter runs under the whole line and catches a marble that falls out:
// nothing sent. A swapped piece is painted blush, a piece taken out leaves a dashed gap over its bare trestle and lies
// on the floor, a timed-out piece has a red gate at its end (a mint retry wheel beside it when the run retries), and
// pieces whose output changed carry a blue stripe. Inés (CAST `ines`) inspects; the assistant whose run it is (the
// kit's model machine) stands behind the trays.
// A living scene (KTD2): scene(prev, state, t, view) → { still, moving }; at t = 1 everything is in the still.
// Words only in pills; every string reaching SVG goes through esc().
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayFits } from '../../lib/iso/blocks';
import { drawPieces, mini, modelMachine, person, type Item, type ModelState } from '../../lib/iso/figures';
import { INK, METAL, PALS, WOOD, P, box, byDepth, castShadow, f, pd, shape, tag, toneI } from '../../lib/iso/core.js';
import { calloutOf, lerp, lerpPt, pillScale, type Scene, type SceneView } from '../../lib/iso/motion';
import type { Outcome } from '../../lib/causal-evals/runs';
import type { Say } from '../story/steps';

export const MARBLE_BOARD: Board = [10, 6, 184, 72];
export const PIECES = 8;
/** The parts a step's callout or close-up may name: the eight pieces (p1–p8), the two trays and the gutter (`none`),
 * the run as a whole, the start cup, the inspector and the assistant. */
export const MARBLE_PARTS = [
  'p1',
  'p2',
  'p3',
  'p4',
  'p5',
  'p6',
  'p7',
  'p8',
  'right',
  'wrong',
  'none',
  'frame',
  'start',
  'ines',
  'model',
] as const;
export type MarblePart = (typeof MARBLE_PARTS)[number];
export type PieceMode = 'as' | 'swap' | 'gone' | 'fault' | 'retry';
export type Tray = 'right' | 'wrong' | 'none';
export const TRAYS: Tray[] = ['right', 'wrong', 'none'];

/** What the picture shows. */
export interface Marble {
  /** each piece's state: as run, swapped for its alternative, taken out, timed out, or timed out with a retry */
  modes: PieceMode[];
  /** each piece's short name, for its pill */
  names: string[];
  /** how many replays have rolled (a new number rolls the marbles again) */
  roll: number;
  /** the marbles of the last roll, in order: where each landed (stuck: held at `halt`) */
  rolled: Outcome[];
  /** the piece a stuck marble waits at */
  halt?: number | null;
  /** where a marble that sends nothing falls out: the first piece whose output went missing */
  drop?: number | null;
  /** pieces whose output differs from the hand-written run's (a blue stripe) */
  touched?: number[];
  /** marbles resting in each tray (the gutter is `none`), the last roll's included */
  trays: Record<Tray, number>;
  /** the piece the step is about: a heavy mustard ring */
  lit?: number | null;
  /** show the trays' counts (the many-runs chapter) */
  counts?: boolean;
  /** the piece named as the run's cause (the workbench): its pill reads CAUSE */
  named?: number | null;
  /** the run's name, on a pill by the start cup (the workbench, where runs switch) */
  title?: string;
  say?: Say;
  /** pills are drawn apart, outside the hand-drawn filter (the live stage's PillLayer: marblePills); the share image
   * keeps them in */
  bare?: boolean;
}

// the run: pieces along x on trestles, falling at slope SL from the start cup; a trough is Y0 (back) to Y1 (front)
const XA = 26,
  PITCH = 14,
  L = 12.5,
  ZT = BH + 58,
  SL = 0.4,
  Y0 = 24,
  Y1 = 33,
  YM = (Y0 + Y1) / 2,
  R = 2.2;
// the gutter in front of the trestles, the trays past the last piece, the floor pile, the people
const GUT = { x0: XA - 4, x1: XA + PITCH * 7 + L + 2, y0: Y1 + 1, y1: Y1 + 7, h: 3 },
  TRAY_X = 152,
  TRAY_Y: Record<'right' | 'wrong', number> = { right: 34, wrong: 50 },
  TRAY_W = 7,
  TRAY_D = 6,
  TRAY_H = 4;
const PILE = [92, 58],
  INES = [30, 66],
  MODEL = [166, 16];

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ph = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const zAt = (x: number) => ZT - (x - XA) * SL;

/** A piece's two ends at the trough's middle, high end first. */
export function ends(i: number) {
  const x0 = XA + PITCH * i,
    x1 = x0 + L;
  return { a: [x0, YM, zAt(x0)], b: [x1, YM, zAt(x1)] };
}

/** a piece's outline, back lip to front face: the ring and the gap's dashes follow it */
const hullOf = (i: number, dz = 0) => {
  const { a, b } = ends(i);
  return [
    [a[0], Y0, a[2] + dz + 3.4],
    [b[0], Y0, b[2] + dz + 3.4],
    [b[0], Y1, b[2] + dz - 2.6],
    [a[0], Y1, a[2] + dz - 2.6],
  ];
};

/** A chute piece at its slot (dz lifts it, for a swap dropping in), in its colours; ring: the lit mustard ring. */
function chute(
  i: number,
  mode: PieceMode,
  opts: { dz?: number; touched?: boolean; ring?: boolean; dim?: boolean } = {},
) {
  const dz = opts.dz ?? 0,
    { a, b } = ends(i),
    x0 = a[0],
    x1 = b[0];
  const z = (x: number) => zAt(x) + dz;
  if (mode === 'gone')
    return `<path d="${pd(hullOf(i))}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-dasharray="3.5 2.5" data-piece="${i}" data-mode="gone"/>`;
  const pal = mode === 'swap' ? PALS.blush : WOOD;
  let s = '';
  if (opts.ring)
    s += `<path d="${pd(hullOf(i, dz))}" fill="none" stroke="${PALS.mustard.l}" stroke-width="5" stroke-linejoin="round"/>`;
  s += shape(
    [
      [x0, Y0, z(x0)],
      [x1, Y0, z(x1)],
      [x1, Y0, z(x1) + 3.4],
      [x0, Y0, z(x0) + 3.4],
    ],
    pal.d,
    0.8,
  );
  s += shape(
    [
      [x0, Y0, z(x0)],
      [x1, Y0, z(x1)],
      [x1, Y1, z(x1)],
      [x0, Y1, z(x0)],
    ],
    pal.m,
    0.8,
  );
  if (opts.touched)
    s += shape(
      [
        [x0 + 1, YM - 2.2, z(x0 + 1) + 0.05],
        [x1 - 1, YM - 2.2, z(x1 - 1) + 0.05],
        [x1 - 1, YM + 2.2, z(x1 - 1) + 0.05],
        [x0 + 1, YM + 2.2, z(x0 + 1) + 0.05],
      ],
      PALS.cobalt.m,
      1,
    );
  s += shape(
    [
      [x0, Y1, z(x0) + 1.6],
      [x1, Y1, z(x1) + 1.6],
      [x1, Y1, z(x1) - 2.6],
      [x0, Y1, z(x0) - 2.6],
    ],
    pal.l,
    mode === 'swap' ? 1.6 : 1,
  );
  // the end the marble leaves by: a timed-out piece's red gate, or (retried) the gate gone and a mint circular arrow
  if (mode === 'fault' || mode === 'retry') {
    const open = mode === 'retry';
    if (!open) s += box(x1 - 1, Y0, z(x1), x1, Y1 + 0.4, z(x1) + 6, PALS.tomato, toneI, 1.1);
    if (open) {
      // a circular arrow: go round and ask again
      const c = P(x1 - 3, Y1 + 0.8, z(x1) + 10),
        r = 6,
        pt = (deg: number) => [c[0] + r * Math.cos((deg * Math.PI) / 180), c[1] + r * Math.sin((deg * Math.PI) / 180)];
      const [a0, a1] = [pt(-60), pt(210)];
      const arc = `M${f(a0[0])} ${f(a0[1])}A${r} ${r} 0 1 1 ${f(a1[0])} ${f(a1[1])}`;
      s += `<path d="${arc}" fill="none" stroke="${INK}" stroke-width="4.6" stroke-linecap="round"/>`;
      s += `<path d="${arc}" fill="none" stroke="${PALS.mint.l}" stroke-width="2.8" stroke-linecap="round"/>`;
      const h = [a0[0] + 4.4, a0[1] - 0.8];
      s += `<path d="M${f(a0[0] - 2.2)} ${f(a0[1] - 3.4)}L${f(h[0])} ${f(h[1])}L${f(a0[0] - 0.8)} ${f(a0[1] + 3.4)}Z" fill="${PALS.mint.l}" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`;
    }
  }
  return `<g data-piece="${i}" data-mode="${mode}"${opts.touched ? ' data-touched="1"' : ''}${opts.dim ? ' data-dim="1" opacity=".5"' : ''}>${s}</g>`;
}

/** a trestle under piece i: a post from the floor to the trough */
function trestle(i: number) {
  const { a, b } = ends(i),
    x = (a[0] + b[0]) / 2;
  return box(x - 0.8, YM - 0.8, BH, x + 0.8, YM + 0.8, zAt(x) - 2.6, WOOD, toneI, 0.8);
}

/** A piece lying flat on the floor pile (taken out), the k-th from the bottom. */
function lying(k: number, pal = WOOD) {
  const [x, y] = PILE,
    z = BH + 2 * k;
  return box(x - L / 2, y - 3, z, x + L / 2, y + 3, z + 2, pal, toneI, 1);
}

/** a glass marble at p */
function marbleAt(p: number[], r = R) {
  const c = P(p[0], p[1], p[2] + r * 0.9);
  const k = r * 1.6;
  return (
    `<g class="marble"><circle cx="${f(c[0])}" cy="${f(c[1])}" r="${f(k)}" fill="${PALS.cobalt.l}" stroke="${INK}" stroke-width="1.1"/>` +
    `<circle cx="${f(c[0] + k * 0.25)}" cy="${f(c[1] + k * 0.3)}" r="${f(k * 0.55)}" fill="${PALS.cobalt.m}"/>` +
    `<circle cx="${f(c[0] - k * 0.35)}" cy="${f(c[1] - k * 0.35)}" r="${f(k * 0.28)}" fill="#ffffff"/></g>`
  );
}
/** where the n-th marble rests: a little heap in a tray, or along the gutter */
function inTray(tr: Tray, n: number) {
  if (tr === 'none') return [(GUT.x0 + GUT.x1) / 2 - 24 + (n % 12) * 4.4, (GUT.y0 + GUT.y1) / 2, BH + 0.8];
  const col = n % 3,
    row = Math.floor(n / 3) % 3,
    layer = Math.floor(n / 9);
  return [TRAY_X - 3.5 + col * 3.5 + layer * 1.2, TRAY_Y[tr] - 3 + row * 3, BH + 1 + layer * 2];
}

/** a marble's size in a tray: one or a few read large, a heap smaller */
const trayR = (n: number) => (n <= 3 ? 2.2 : 1.5);
/** a tray: an open box in its outcome's colour, the marbles resting in it */
function trayArt(tr: 'right' | 'wrong', n: number): Item {
  const pal = tr === 'right' ? PALS.mint : PALS.tomato;
  const x0 = TRAY_X - TRAY_W,
    x1 = TRAY_X + TRAY_W,
    y0 = TRAY_Y[tr] - TRAY_D,
    y1 = TRAY_Y[tr] + TRAY_D;
  let s = box(x0, y0, BH, x1, y1, BH + 0.8, pal, toneI, 1);
  s += box(x0, y0, BH, x1, y0 + 0.8, BH + TRAY_H, pal, toneI, 0.9);
  s += box(x0, y0, BH, x0 + 0.8, y1, BH + TRAY_H, pal, toneI, 0.9);
  for (let k = 0; k < Math.min(n, 27); k++) s += marbleAt(inTray(tr, k), trayR(n));
  s += box(x1 - 0.8, y0, BH, x1, y1, BH + TRAY_H, pal, toneI, 0.9);
  s += box(x0, y1 - 0.8, BH, x1, y1, BH + TRAY_H, pal, toneI, 1.1);
  return { box: boxCorners(x0, y0, BH, x1, y1, BH + TRAY_H), svg: `<g data-tray="${tr}" data-n="${n}">${s}</g>` };
}
/** the gutter under the run: grey, where a marble that falls out comes to rest (nothing sent) */
function gutterArt(n: number): Item {
  const g = GUT;
  let s = box(g.x0, g.y0, BH, g.x1, g.y1, BH + 0.6, METAL, toneI, 1);
  s += box(g.x0, g.y0, BH, g.x1, g.y0 + 0.6, BH + g.h, METAL, toneI, 0.8);
  for (let k = 0; k < Math.min(n, 12); k++) s += marbleAt(inTray('none', k), 2);
  s += box(g.x0, g.y0, BH, g.x0 + 0.6, g.y1, BH + g.h, METAL, toneI, 0.8);
  s += box(g.x1 - 0.6, g.y0, BH, g.x1, g.y1, BH + g.h, METAL, toneI, 0.8);
  s += box(g.x0, g.y1 - 0.6, BH, g.x1, g.y1, BH + g.h, METAL, toneI, 1.1);
  return { box: boxCorners(g.x0, g.y0, BH, g.x1, g.y1, BH + g.h), svg: `<g data-tray="none" data-n="${n}">${s}</g>` };
}

type Way = { p: number[]; wait?: number }[];
const START = [XA - 3, YM, ZT + 4.5];
const FLAP = () => {
  const e = ends(PIECES - 1).b;
  return [e[0] + 4, YM, e[2] - 1.6];
};
/** The marble's way down for one outcome: waypoints, each with how long the marble dwells there (a retry's pause). */
export function path(s: Pick<Marble, 'modes' | 'halt' | 'drop'>, out: Outcome): Way {
  const pts: Way = [{ p: START }];
  const fallAt = out === 'none' ? (s.drop ?? s.modes.indexOf('gone')) : -1;
  for (let i = 0; i < PIECES; i++) {
    const { a, b } = ends(i);
    if (out === 'stuck' && i === s.halt) {
      pts.push({ p: a }, { p: [b[0] - 2, YM, zAt(b[0] - 2)] });
      return pts;
    }
    if (i === fallAt) {
      // out of the run here: through the gap, down into the gutter
      const x = a[0] + 2;
      // the gutter dips in the middle, where the marble comes to rest
      pts.push({ p: [x, YM, a[2] + 1] }, { p: [x + 2, (GUT.y0 + GUT.y1) / 2, BH + 0.8] }, { p: inTray('none', 0) });
      return pts;
    }
    if (s.modes[i] === 'gone') {
      // a piece the run didn't need: the marble hops its gap
      pts.push({ p: [(a[0] + b[0]) / 2, YM, a[2] + 3] });
      continue;
    }
    pts.push({ p: a }, { p: b, wait: s.modes[i] === 'retry' ? 0.6 : 0 });
  }
  pts.push({ p: FLAP() });
  if (out === 'right' || out === 'wrong') pts.push({ p: [TRAY_X, TRAY_Y[out], BH + 1] });
  return pts;
}
/** A point along a path, u from 0 to 1 by length (dwell counts as length). */
function along(pts: Way, u: number) {
  const segs = pts.slice(1).map((q, i) => Math.hypot(...q.p.map((v, k) => v - pts[i].p[k])) + (pts[i].wait ?? 0) * 60);
  const total = segs.reduce((x, y) => x + y, 0) || 1;
  let d = u * total;
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i]) {
      const dwell = (pts[i].wait ?? 0) * 60;
      if (d < dwell) return pts[i].p;
      return lerpPt(pts[i].p, pts[i + 1].p, (d - dwell) / (segs[i] - dwell || 1));
    }
    d -= segs[i];
  }
  return pts.at(-1)!.p;
}

/** the run: a floor rail, the trestles, the start cup, the pieces and the sorting flap (one item: one plane of depth) */
function runArt(s: Marble, skip: number | null, marble: number[] | null): Item {
  let b = box(XA - 6, YM - 2, BH, GUT.x1, YM + 2, BH + 1.2, WOOD, toneI, 1);
  // the start cup on its post, top left
  b += box(START[0] - 1, YM - 1, BH, START[0] + 1, YM + 1, START[2] - 3, WOOD, toneI, 0.9);
  b += box(START[0] - 3.5, Y0, START[2] - 3, START[0] + 3.5, Y1, START[2] - 1, PALS.mustard, toneI, 1.1);
  // a swap's ripple: past the first changed piece, the pieces whose output stayed the same fade back
  const first = s.touched?.length ? Math.min(...s.touched) : PIECES;
  for (let i = 0; i < PIECES; i++) {
    b += trestle(i);
    if (i !== skip)
      b += chute(i, s.modes[i], {
        touched: s.touched?.includes(i),
        ring: (s.lit === i || s.named === i) && s.modes[i] !== 'gone',
        dim: i > first && s.modes[i] === 'as' && !s.touched?.includes(i),
      });
  }
  // the sorting flap past the last piece, turned toward the tray the last marble went to
  const e = ends(PIECES - 1).b,
    to = s.rolled.at(-1),
    ty = to === 'right' ? TRAY_Y.right : TRAY_Y.wrong,
    tip = [e[0] + 6, lerp(YM, ty, 0.35), e[2] - 3];
  b += box(e[0] + 1, YM - 1, BH, e[0] + 3, YM + 1, e[2] - 2.5, WOOD, toneI, 0.9);
  b += shape(
    [
      [e[0], Y0, e[2] - 1.5],
      [e[0], Y1, e[2] - 1.5],
      [tip[0], tip[1] + 3, tip[2]],
      [tip[0], tip[1] - 3, tip[2]],
    ],
    PALS.mustard.l,
    1.1,
  );
  if (marble) b += marbleAt(marble);
  return { box: boxCorners(XA - 6, Y0, BH, e[0] + 6, Y1, ZT + 6), svg: `<g data-part="frame">${b}</g>` };
}

/** The setting: the people, the assistant, shadows. */
function setting(s: Marble, top: SceneCtx['top']) {
  const last = s.rolled.at(-1);
  const right = s.rolled.filter(o => o === 'right').length;
  const st: ModelState | undefined = !s.rolled.length
    ? undefined
    : s.rolled.length > 1
      ? right === s.rolled.length
        ? 'ok'
        : right
          ? 'warn'
          : 'bad'
      : last === 'right'
        ? 'ok'
        : last === 'wrong'
          ? 'bad'
          : 'warn';
  const m = modelMachine(MODEL[0], MODEL[1], 0.8, st),
    ines = person({ x: INES[0], y: INES[1], facing: '-y', look: 'ines', holding: 'clipboard' });
  const e = ends(PIECES - 1).b;
  const shadow =
    castShadow(
      [
        [XA - 6, Y0, BH],
        [XA - 6, Y1, BH],
        [e[0], Y0, BH],
        [e[0], Y1, BH],
        [XA - 3, Y0, ZT + 3],
        [XA - 3, Y1, ZT + 3],
        [e[0], Y0, e[2]],
        [e[0], Y1, e[2]],
      ],
      BH,
      top,
    ) +
    m.shadow +
    ines.shadow;
  return {
    shadow,
    items: [
      ...m.items.map(i => ({ ...i, svg: `<g data-part="model">${i.svg}</g>` })),
      ...ines.items.map(i => ({ ...i, svg: `<g data-part="ines">${i.svg}</g>` })),
    ],
  };
}

/** marbles in each tray before the last roll landed */
const settled = (s: Marble): Record<Tray, number> => {
  const t = { ...s.trays };
  for (const o of s.rolled) if (o !== 'stuck') t[o] = Math.max(0, t[o] - 1);
  return t;
};
/** where a marble rests in the picture at rest: waiting in the cup (nothing rolled yet) or stuck at a gate */
const restingMarble = (s: Marble) =>
  !s.rolled.length ? START : s.rolled.includes('stuck') ? path(s, 'stuck').at(-1)!.p : null;

function art(
  s: Marble,
  v: SceneView,
  trays: Record<Tray, number>,
  skip: number | null,
  marble: number[] | null,
  moving = false,
  hush = moving,
) {
  return (ctx: SceneCtx) => {
    // while marbles roll, the assistant's light waits for them to land
    const set = setting(hush ? { ...s, rolled: [] } : s, ctx.top);
    const gone = s.modes.filter(m => m === 'gone').length - (skip !== null && s.modes[skip] === 'gone' ? 1 : 0);
    const items: Item[] = [
      ...set.items,
      runArt(s, skip, marble),
      gutterArt(trays.none),
      trayArt('right', trays.right),
      trayArt('wrong', trays.wrong),
    ];
    for (let k = 0; k < gone; k++)
      items.push({
        box: boxCorners(PILE[0] - L / 2, PILE[1] - 3, BH, PILE[0] + L / 2, PILE[1] + 3, BH + 2 * k + 2),
        svg: lying(k),
      });
    return set.shadow + byDepth(items) + (s.bare ? '' : marblePills(s, v, moving));
  };
}

/** The picture at rest: what the stage shows for state s with no motion (the share image too). */
export const marbleStill = (s: Marble, v: SceneView = { zoomT: 0 }) => art(s, v, s.trays, null, restingMarble(s));

/** Whether going from prev to s moves anything: a new roll, a piece changing, or a ring lighting (nothing flies, but a
 * close-up waits for it like a motion, so the newly lit piece shows in the whole picture first). A callout alone doesn't. */
export const marbleMoves = (a: Marble, b: Marble) =>
  a.roll !== b.roll || a.modes.join() !== b.modes.join() || a.lit !== b.lit || a.named !== b.named;

/** Why did it fail?'s living scene: a changed piece lifts out (or drops in), then the marbles roll the run one after
 * another into their trays, into the gutter, or up to a red gate. */
export const marbleScene: Scene<Marble> = (prev, s, t, v) => {
  if (t >= 1 || !marbleMoves(prev, s)) return { still: marbleStill(s, v), moving: '' };
  // the piece that moves: one newly changed (swapped in, taken out); a piece put back just reappears
  const diff = s.modes.flatMap((m, i) => (m !== prev.modes[i] ? [i] : []));
  const changed = diff.find(i => s.modes[i] !== 'as') ?? diff[0] ?? -1;
  const rolls = prev.roll !== s.roll && s.rolled.length > 0;
  const t0 = changed >= 0 && rolls ? 0.3 : 0;
  const trays = rolls ? settled(s) : s.trays;
  return {
    still: art(s, v, trays, changed >= 0 ? changed : null, rolls ? null : restingMarble(s), true, rolls),
    moving: () => {
      let mv = '';
      if (changed >= 0) {
        const u = ph(t, 0, t0 || 0.8),
          m = s.modes[changed];
        if (m === 'gone') {
          // the old piece lifts out and drops onto the floor pile
          const was = prev.modes[changed] === 'swap' ? PALS.blush : WOOD;
          const { a, b } = ends(changed),
            k = s.modes.filter(x => x === 'gone').length - 1;
          const at = lerpPt([(a[0] + b[0]) / 2, YM, (a[2] + b[2]) / 2 - 1], [PILE[0], PILE[1], BH + 2 * k], u),
            up = 10 * Math.sin(Math.PI * u);
          mv += box(at[0] - L / 2, at[1] - 3, at[2] + up, at[0] + L / 2, at[1] + 3, at[2] + up + 2, was, toneI, 1);
        } else
          mv += chute(changed, m, { dz: 14 * (1 - u), touched: s.touched?.includes(changed), ring: s.lit === changed });
      }
      if (rolls) {
        const n = s.rolled.length,
          span = n > 1 ? 0.45 : 1 - t0,
          gap = n > 1 ? (1 - t0 - span) / (n - 1) : 0;
        const count = settled(s);
        s.rolled.forEach((o, i) => {
          const u = ph(t, t0 + i * gap, t0 + i * gap + span);
          if (u >= 1 && o !== 'stuck') mv += marbleAt(inTray(o, count[o]++), trayR(s.trays[o]));
          else if (u > 0 || i === 0) mv += marbleAt(along(path(s, o), u));
        });
      } else if (changed >= 0) {
        const m = restingMarble(s);
        if (m) mv += marbleAt(m);
      }
      return mv;
    },
  };
};

const pill = (p: number[], dx: number, dy: number, text: string, on: boolean, k: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), on, k)}</g>`;

/** The pills; mid-motion (moving) only the fixed names, so a count never shows before its marbles land. */
export function marblePills(s: Marble, v: SceneView, moving = false) {
  const k = (p: string) => pillScale(p, v),
    phone = !!v.phone,
    out: string[] = [],
    said = new Set<string>();
  const say = calloutOf(s.say, v);
  // a callout sits clear of its part's name pill: below and left of a piece, beyond a tray's pill
  const on = (
    p: string,
    at: number[],
    dx: number,
    dy: number,
    text: string,
    lit: boolean,
    quiet = false,
    c = [dx, dy * 2.6],
    cAt = at,
  ) => {
    const sc = k(p);
    if (sc && !quiet) out.push(pill(at, dx, dy, text, lit, sc));
    if (!said.has(p) && say && sayFits(say, p, phone))
      out.push(
        `<g class="callout" aria-hidden="true" pointer-events="none">${tag(cAt, c[0], c[1], esc(say.text), true, sc || 1)}</g>`,
      );
    said.add(p);
  };
  // the pieces: a numbered name above and right of each, over open air, all on one slant so neighbours never overlap
  for (let i = 0; i < PIECES; i++) {
    const { a, b } = ends(i),
      lit = s.lit === i,
      odd = s.modes[i] !== 'as',
      mid = [(a[0] + b[0]) / 2, Y0, (a[2] + b[2]) / 2 + 2.4],
      front = [(a[0] + b[0]) / 2, Y1, (a[2] + b[2]) / 2 - 2.6];
    const tag2 =
      s.named === i ? 'CAUSE' : s.modes[i] === 'retry' ? 'RETRY' : s.modes[i] === 'fault' ? 'TIMED OUT' : null;
    on(
      `p${i + 1}`,
      mid,
      16,
      -18,
      phone ? `${i + 1}${tag2 ? ` ${tag2}` : ''}` : `${i + 1} ${tag2 ?? s.names[i].toUpperCase()}`,
      lit || !!tag2,
      phone && !lit && !odd && !tag2 && s.say?.block !== `p${i + 1}`,
      [-34, 26],
      front,
    );
  }
  const n = (tr: Tray) => (s.counts && !moving ? ` ${s.trays[tr]}` : '');
  const last = moving || s.counts ? null : s.rolled.at(-1);
  on(
    'right',
    [TRAY_X + TRAY_W, TRAY_Y.right + TRAY_D, BH],
    18,
    16,
    `RIGHT${n('right')}`,
    last === 'right',
    false,
    [26, 38],
  );
  on(
    'wrong',
    [TRAY_X - TRAY_W, TRAY_Y.wrong + TRAY_D, BH],
    -16,
    22,
    `WRONG${n('wrong')}`,
    last === 'wrong',
    false,
    [-54, 2],
  );
  if (s.title && k('frame')) out.push(pill(START, -34, -30, s.title.toUpperCase(), true, k('frame')));
  // the start cup has no name pill, only a step's callout
  if (say && sayFits(say, 'start', phone) && k('start'))
    out.push(
      `<g class="callout" aria-hidden="true" pointer-events="none">${tag(START, -30, -22, esc(say.text), true, k('start'))}</g>`,
    );
  on(
    'none',
    [GUT.x0 + 30, GUT.y1, BH + GUT.h],
    -6,
    16,
    phone ? `NONE${n('none')}` : `NOTHING${n('none')}`,
    last === 'none',
  );
  return out.filter(Boolean).join('');
}

/** Points of a part's footprint, for close-ups and in-picture targets. */
export function partBox(part: MarblePart): number[][] {
  if (/^p[1-8]$/.test(part)) {
    const { a, b } = ends(Number(part.slice(1)) - 1);
    return boxCorners(a[0], Y0, b[2] - 2, b[0], Y1, a[2] + 3);
  }
  switch (part) {
    case 'right':
    case 'wrong':
      return boxCorners(TRAY_X - TRAY_W, TRAY_Y[part] - TRAY_D, BH, TRAY_X + TRAY_W, TRAY_Y[part] + TRAY_D, BH + 8);
    case 'none':
      return boxCorners(GUT.x0, GUT.y0, BH, GUT.x1, GUT.y1, BH + GUT.h);
    case 'start':
      return boxCorners(START[0] - 5, Y0, START[2] - 4, START[0] + 5, Y1, START[2] + 3);
    case 'ines':
      return boxCorners(INES[0] - 6, INES[1] - 6, BH, INES[0] + 6, INES[1] + 6, BH + 30);
    case 'model':
      return boxCorners(MODEL[0] - 14, MODEL[1] - 14, BH, MODEL[0] + 14, MODEL[1] + 14, BH + 28);
    default:
      return boxCorners(XA - 6, Y0, BH, TRAY_X + TRAY_W, TRAY_Y.wrong + TRAY_D, ZT + 6);
  }
}

/** The in-picture target of piece i (tap to pick it, drag it out to take it out). */
export const pieceBox = (i: number) => partBox(`p${i + 1}` as MarblePart);
/** The floor pile: drop a piece here to take it out of the run. */
export const pileBox = () => boxCorners(PILE[0] - 10, PILE[1] - 6, BH, PILE[0] + 10, PILE[1] + 6, BH + 8);

/** A piece as drawn at rest, for the hook to move with the pointer while it is dragged. */
export const piecePiece = (s: Marble, i: number) => chute(i, s.modes[i] === 'gone' ? 'as' : s.modes[i]);
/** The picture while a piece is lifted by the pointer: the still without that piece. */
export const marbleLifted = (s: Marble, i: number, v: SceneView = { zoomT: 0 }) =>
  art(s, v, s.trays, i, restingMarble(s));

/** The picture in words, for its aria-label. */
export function marbleLabel(s: Marble): string {
  const list = (m: PieceMode) => s.modes.flatMap((x, i) => (x === m ? [`${i + 1} ${s.names[i]}`] : [])).join(', ');
  const parts = [
    `An inspector's bench with a wooden marble run: ${PIECES} chute pieces, one per step of the run, falling to a right tray and a wrong tray, with a gutter underneath for nothing sent.`,
    list('swap') ? `Swapped: ${list('swap')}.` : '',
    list('gone') ? `Taken out: ${list('gone')}.` : '',
    list('fault') ? `Timed out, no retry: ${list('fault')}.` : '',
    list('retry') ? `Timed out, with a retry: ${list('retry')}.` : '',
    s.rolled.includes('stuck') && s.halt != null ? `The marble is stuck at piece ${s.halt + 1}.` : '',
    s.rolled.length
      ? `Right tray ${s.trays.right}, wrong tray ${s.trays.wrong}, gutter ${s.trays.none}.`
      : 'The marble waits in the start cup.',
  ];
  return parts.filter(Boolean).join(' ');
}

/** The home hero's stand plot: the run's last four chutes stepping down past the flap into its two trays, a marble
 * rolling down them and one in the right tray, set down small. */
export function marblePlot(x: number, y: number, top: SceneCtx['top']): string {
  const first = PIECES - 4,
    e = ends(PIECES - 1).b,
    x0 = ends(first).a[0];
  let b = '';
  for (let i = first; i < PIECES; i++) b += trestle(i) + chute(i, 'as');
  // the flap, turned toward the right tray
  b += box(e[0] + 1, YM - 1, BH, e[0] + 3, YM + 1, e[2] - 2.5, WOOD, toneI, 0.9);
  b += shape(
    [
      [e[0], Y0, e[2] - 1.5],
      [e[0], Y1, e[2] - 1.5],
      [e[0] + 6, lerp(YM, TRAY_Y.right, 0.35) + 3, e[2] - 3],
      [e[0] + 6, lerp(YM, TRAY_Y.right, 0.35) - 3, e[2] - 3],
    ],
    PALS.mustard.l,
    1.1,
  );
  const { a: ma, b: mb } = ends(first + 1);
  b += marbleAt(lerpPt(ma, mb, 0.5));
  const run: Item = { box: boxCorners(x0, Y0, BH, e[0] + 6, Y1, zAt(x0) + 4), svg: `<g data-part="frame">${b}</g>` };
  const items = [run, trayArt('right', 1), trayArt('wrong', 0)];
  const shadow = castShadow(boxCorners(x0, Y0, BH, e[0], Y1, BH + 12), BH, top);
  return drawPieces([mini({ shadow, items }, [(x0 + TRAY_X) / 2 + 22, 44, BH], [x, y, BH], 0.5)]);
}
