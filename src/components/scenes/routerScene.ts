// Module 12's picture: the apprentice's bench (KTD16). The big model machine stands at the back; its student, the same
// machine squat and a third its size, stands in front of it, joined by a curved slide chute; the apprentice watches the
// student work. At the right a rail-switch lever, the router, sends each question down one of two belts, to the student
// or to the big model.
// Two readings of the same bench: in `distill` mode the models are Larkspur mini and its student and the chute carries
// lessons (soft targets) from teacher to student; in `route` mode they are the large and small tiers of Larkspur's
// assistant, and the chute is the fallback that sends an unsure answer up. Words only in pills; on phones (scale > 1.5)
// the router's and the chute's pills show only while lit.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { ACC, BH, boxCorners, esc, renderers, sayAt, calloutsLast } from '../../lib/iso/blocks';
import { SKIN, modelIn, person, type Look } from '../../lib/iso/figures';
import type { Say } from '../story/steps';
import {
  INK,
  PALS,
  DARK,
  METAL,
  WOOD,
  norm,
  shape,
  vis,
  box,
  rod,
  cyl,
  on,
  pd,
  PZ,
  rrUV,
  castShadow,
  hullInk,
  toneI,
  tag,
  byDepth,
} from '../../lib/iso/core.js';

export const ROUTER_BOARD: Board = [0, 0, 160, 124];

export type Mode = 'distill' | 'route';
/** Where the router sends the question: the small belt, the large belt, or the small belt then up the chute. */
export type Route = 'small' | 'large' | 'up';
export interface RouterOpts {
  mode?: Mode;
  /** route mode: the path the current question takes (none: the bench at rest) */
  route?: Route | null;
  /** distill mode: lessons flow down the chute from teacher to student */
  lessons?: boolean;
  /** which models are answering (their screens lit) */
  lit?: 'big' | 'small' | 'both' | null;
  /** route mode: the router's threshold, shown in its pill */
  threshold?: number | null;
  /** pill size; phones pass more */
  scale?: number;
  /** the step's callout: a lit pill over one of ROUTER_PARTS */
  say?: Say;
}

/** The parts a step's callout may point at: the ones with a name pill. */
export const ROUTER_PARTS = ['big', 'small', 'router', 'chute'] as const;

const NAMES: Record<Mode, { big: string; small: string }> = {
  distill: { big: 'LARKSPUR MINI', small: 'STUDENT' },
  route: { big: 'LARGE', small: 'SMALL' },
};

/** What the bench shows. Pure, so the tests can check it without drawing. */
export function routerState({
  mode = 'distill',
  route = null,
  lessons = false,
  lit = null,
  threshold = null,
}: RouterOpts) {
  const r = mode === 'route' ? route : null;
  return {
    mode,
    big: { name: NAMES[mode].big, on: lit === 'big' || lit === 'both' || r === 'large' || r === 'up' },
    small: { name: NAMES[mode].small, on: lit === 'small' || lit === 'both' || r === 'small' || r === 'up' },
    belts: { large: r === 'large', small: r === 'small' || r === 'up' },
    chute: { on: mode === 'route' ? r === 'up' : lessons, name: mode === 'route' ? 'FALLBACK' : 'LESSONS' },
    router: {
      on: !!r,
      name: mode === 'route' && threshold !== null ? `BELOW ${threshold}` : 'ROUTER',
      lean: r === 'large' ? -1 : r ? 1 : 0,
    },
  };
}

type Part = { at?: number[]; box?: number[][]; svg: string };
const BIG = [44, 40],
  SMALL = [92, 102],
  SW = [124, 48],
  SH = 10,
  SZ = BH + 12; // small model half-width; the lever's old plate top (its pill height)
const CHUTE_X = 52; // the chute leaves the big model's side (clear of its screen) and curves down to the student's back
// the apprentice stands beside the student, inside the bend of the small belt, watching it work
const APPRENTICE: Look = {
  skin: SKIN[0],
  top: '#7fa7c9',
  legs: '#5a6f93',
  hair: '#6a4426',
  cut: 'curly',
  prop: 'clipboard',
};
const APP_AT = [110, 86];

/** A floor path of ink with a coloured stripe (a belt): lit paths glow. */
function path(points: number[][], lit: boolean, attrs: string) {
  const d = pd(
    points.map(([x, y]) => [x, y, BH + 0.3]),
    false,
  );
  return (
    `<g ${attrs} data-on="${lit ? 1 : 0}"><path d="${d}" fill="none" stroke="${INK}" stroke-width="${lit ? 5.4 : 3.6}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${lit ? ACC : DARK.l}" stroke-width="${lit ? 3 : 1.8}" stroke-linecap="round" stroke-linejoin="round"/></g>`
  );
}

/** The chute (one of the hero pieces): a curved slide. Real-object notes: a steel U-channel (a bed between two low side
 * walls) leaving the big model's side high up and curving down to the student's back, on two posts; its bed glows
 * while lessons or a fallback run down it. One item, so it sorts as a whole against both machines. */
function chute(lit: boolean, by: number, sx: number, sy: number): Part {
  const N = 5,
    W = 3,
    H = 2.4,
    A = [CHUTE_X, by + 18, BH + 20],
    C = [CHUTE_X, sy],
    B = [sx - SH - 1, sy, BH + 8];
  const at = (t: number) => [
    (1 - t) ** 2 * A[0] + 2 * t * (1 - t) * C[0] + t * t * B[0],
    (1 - t) ** 2 * A[1] + 2 * t * (1 - t) * C[1] + t * t * B[1],
    A[2] + (B[2] - A[2]) * t,
  ];
  const c = Array.from({ length: N + 1 }, (_, i) => at(i / N));
  // a horizontal side vector per point, perpendicular to the run
  const side = c.map((_, i) => {
    const q = c[Math.min(N, i + 1)],
      r = c[Math.max(0, i - 1)],
      d = norm([q[0] - r[0], q[1] - r[1], 0]);
    return [-d[1], d[0], 0];
  });
  const off = (i: number, k: number, z: number) => [c[i][0] + side[i][0] * k, c[i][1] + side[i][1] * k, c[i][2] + z];
  let posts = '',
    far = '',
    near = '';
  for (const t of [0.25, 0.75]) {
    const p = at(t);
    posts += rod([p[0], p[1], BH], [p[0], p[1], p[2]], 0.9, DARK, toneI, 0.8, 0.9, 8);
  }
  // the bed in one piece; each wall segment near or far by whether its outer side faces the viewer (the curve turns, so
  // a wall can be far at the top and near at the bottom); far ones unlined, to keep the SVG small
  const bed = shape(
    [...c.map((_, i) => off(i, -W, 0)), ...c.map((_, i) => off(N - i, W, 0))],
    lit ? ACC : METAL.l,
    0.6,
  );
  for (let i = 0; i < N; i++)
    for (const k of [-W, W]) {
      const q = [off(i, k, -0.8), off(i + 1, k, -0.8), off(i + 1, k, H), off(i, k, H)],
        n = [side[i][0] * Math.sign(k), side[i][1] * Math.sign(k), 0];
      if (vis(n)) near += shape(q, toneI(n, METAL), 0.8);
      else far += shape(q, METAL.d, 0);
    }
  const pts = c.flatMap((_, i) => [off(i, -W, -0.8), off(i, W, H)]);
  return {
    box: [
      [Math.min(...pts.map(p => p[0])) - 1, Math.min(...pts.map(p => p[1])) - 1, BH],
      [Math.max(...pts.map(p => p[0])) + 1, Math.max(...pts.map(p => p[1])) + 1, A[2] + H],
    ],
    svg: `<g class="chute" data-on="${lit ? 1 : 0}">${posts}${far}${bed}${near}</g>`,
  };
}

/** The student: a squat model machine a third the teacher's height; its screen reads OK while it answers. */
function student(on_: boolean): Part {
  const [x, y] = SMALL,
    s = modelIn([x - SH, y - SH, BH, x + SH, y + SH, BH + 14], on_ ? 'ok' : undefined).items[0].svg;
  return {
    box: [
      [x - SH, y - SH, BH],
      [x + SH, y + SH, BH + 15],
    ],
    svg: `<g class="student" data-on="${on_ ? 1 : 0}">${s}</g>`,
  };
}

/** The router: a rail-switch lever frame. Real-object notes: a wooden sleeper frame on the floor, an iron housing on
 * it with the pivot, a long lever with a sprung catch rod along it and a painted grip, leaning toward the belt it sends
 * to (upright at rest). */
function router(lean: number, on_: boolean): Part {
  const [x, y] = SW,
    B = 9,
    zf = BH + 3,
    zp = zf + 4,
    L = 17;
  let s = on_
    ? `<path d="${pd(on(PZ(BH + 0.3), rrUV(x - B - 3, y - B - 3, x + B + 3, y + B + 3, 4)))}" fill="none" stroke="${ACC}" stroke-width="2.4"/>`
    : '';
  s +=
    box(x - B, y - 4, BH, x + B, y + 4, zf, WOOD, toneI, 0.9) + box(x - 3, y - 3, zf, x + 3, y + 3, zp, DARK, toneI, 1);
  // toward the large belt (-x) or the small one (+y)
  const d = lean < 0 ? [-0.55, 0, 0.83] : lean > 0 ? [0, 0.55, 0.83] : [0, 0, 1],
    tip = [x + d[0] * L, y + d[1] * L, zp + d[2] * L],
    mid = [x + d[0] * L * 0.55, y + d[1] * L * 0.55, zp + d[2] * L * 0.55];
  s +=
    cyl(x, y, zp, zp + 1.2, 2, METAL, toneI, 0.8, 8) +
    rod([x, y, zp + 0.6], tip, 1, METAL, toneI, 1, 1, 8) +
    rod(
      [mid[0] + 1.4, mid[1] + 1.4, mid[2]],
      [tip[0] + 1.2, tip[1] + 1.2, tip[2] - 3],
      0.45,
      METAL,
      toneI,
      0.6,
      0.45,
      6,
    ) +
    rod(tip, [tip[0], tip[1], tip[2] + 3.5], 1.8, on_ ? PALS.mustard : PALS.tomato, toneI, 1, 1.8, 10);
  return {
    box: [
      [x - B, y - B, BH],
      [x + B, y + B, zp + L + 4],
    ],
    svg: `<g class="router" data-lean="${lean}">${s}</g>`,
  };
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;

/** The bench: shadows, the belts and the chute (floor), the parts back to front, then every pill on top. */
export const routerScene = (o: RouterOpts) => (ctx: SceneCtx) => {
  const st = routerState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5,
    [bx, by] = BIG,
    [sx, sy] = SMALL,
    [wx, wy] = SW;
  const app = person({ x: APP_AT[0], y: APP_AT[1], facing: 140, look: APPRENTICE });
  let s =
    castShadow(boxCorners(bx - 17, by - 17, BH, bx + 17, by + 17, BH + 32), BH, ctx.top) +
    castShadow(boxCorners(sx - SH, sy - SH, BH, sx + SH, sy + SH, BH + 14), BH, ctx.top) +
    castShadow(boxCorners(wx - 9, wy - 9, BH, wx + 9, wy + 9, BH + 7), BH, ctx.top) +
    app.shadow;
  // the two belts from the switch (floor paths)
  s += path(
    [
      [wx - 9, wy - 3],
      [bx + 17, wy - 3],
    ],
    st.belts.large,
    'class="belt" data-belt="large"',
  );
  s += path(
    [
      [wx, wy + 9],
      [wx, sy],
      [sx + SH, sy],
    ],
    st.belts.small,
    'class="belt" data-belt="small"',
  );
  const parts: Part[] = [
    {
      box: [
        [bx - 17, by - 17, BH],
        [bx + 17, by + 17, BH + 35],
      ],
      svg: `<g class="big" data-on="${st.big.on ? 1 : 0}">${renderers.llm({ x: bx, y: by, state: st.big.on ? 'ok' : undefined })}</g>`,
    },
    chute(st.chute.on, by, sx, sy),
    student(st.small.on),
    router(st.router.lean, st.router.on),
    ...app.items,
  ];
  s += byDepth(parts);
  const pills = [
    sayAt(o.say, 'big', [bx, by, BH + 32], -16, scale),
    sayAt(o.say, 'small', [sx, sy, BH + 14], -14, scale),
    sayAt(o.say, 'router', [wx, wy, SZ + 18], -12, scale),
    sayAt(o.say, 'chute', [CHUTE_X, sy - 16, BH + 1], 4, scale),
    pill([bx, by, BH + 32], 0, -16, st.big.name, st.big.on, scale),
    pill([sx, sy, BH + 14], 0, -14, st.small.name, st.small.on, scale),
  ];
  if (!narrow || st.router.on) pills.push(pill([wx, wy, SZ + 18], 0, -12, st.router.name, st.router.on, scale));
  if (!narrow || st.chute.on) pills.push(pill([CHUTE_X, sy - 16, BH + 1], -44, 4, st.chute.name, st.chute.on, scale));
  return s + calloutsLast(pills);
};

/** The picture in words, for its aria-label. */
export function routerLabel(o: RouterOpts): string {
  const st = routerState(o),
    big = st.big.name.toLowerCase(),
    small = st.small.name.toLowerCase();
  const bench =
    st.mode === 'distill'
      ? `An apprentice's bench: the big model (${big}) at the back and its student, a third its size, in front, joined by a chute. ` +
        (st.chute.on ? 'Lessons run down the chute from the teacher to the student. ' : '')
      : `A routing bench: the ${big} model at the back, the ${small} model in front, and a router switch${o.threshold != null ? ` set to send answers up below ${o.threshold}` : ''} with a belt to each. ` +
        (st.belts.large
          ? `This question goes straight to the ${big} model.`
          : st.chute.on
            ? `This question goes to the ${small} model, which is unsure, so the answer goes up the fallback chute to the ${big} model.`
            : st.belts.small
              ? `This question goes to the ${small} model, which answers it.`
              : 'No question is on the belts.');
  const lit =
    st.mode === 'distill' && (st.big.on || st.small.on)
      ? ` ${st.big.on && st.small.on ? 'The teacher and the student' : st.big.on ? 'The teacher' : 'The student'} ${st.big.on && st.small.on ? 'are' : 'is'} answering.`
      : '';
  return bench.trim() + lit;
}

/** The home hero's plot (heroScene, at go-live): a small apprentice's bench at (x, y). A model block, a squat student in
 * front of it, and the router's plate with its lever leaning toward the student. Squat, so the pill rows stay clear. */
export function apprenticePlot(x: number, y: number, top: SceneCtx['top']): string {
  const m = [x - 16, y - 14, BH, x - 2, y, BH + 16],
    st = [x - 14, y + 4, BH, x - 6, y + 12, BH + 7];
  const px = x + 12,
    py = y + 4,
    tip = [px, py + 6, BH + 16];
  const big = modelIn(m).items[0].svg,
    small = modelIn(st).items[0].svg;
  const plate =
    box(px - 6, py - 6, BH, px + 6, py + 6, BH + 8, DARK, toneI, 1) +
    hullInk(boxCorners(px - 6, py - 6, BH, px + 6, py + 6, BH + 8), 1.6) +
    rod([px, py, BH + 9], tip, 1, METAL) +
    rod(tip, [tip[0], tip[1], tip[2] + 3], 2, PALS.mustard);
  return (
    castShadow(boxCorners(m[0], m[1], m[2], m[3], m[4] + 3, m[5]), BH, top) +
    castShadow(boxCorners(px - 6, py - 6, BH, px + 6, py + 6, BH + 14), BH, top) +
    byDepth([
      { at: [x - 9, y - 7, 0], svg: big },
      { at: [x - 10, y + 8, 0], svg: small },
      { at: [px, py, 0], svg: plate },
    ])
  );
}
