// Module 12's picture: the apprentice's bench (KTD16). The big model (RAG's LLM block, as the training bench composes
// it) stands at the back; its student, a squat model a third its size, stands in front of it, joined by a chute. At the
// front right a router switch sends each question down one of two belts, to the student or to the big model.
// Two readings of the same bench: in `distill` mode the models are Larkspur mini and its student and the chute carries
// lessons (soft targets) from teacher to student; in `route` mode they are the large and small tiers of Larkspur's
// assistant, and the chute is the fallback that sends an unsure answer up. Words only in pills; on phones (scale > 1.5)
// the router's and the chute's pills show only while lit.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { ACC, BH, boxCorners, esc, renderers } from '../../lib/iso/blocks';
import {
  INK,
  PALS,
  DARK,
  METAL,
  box,
  rod,
  cyl,
  shape,
  on,
  pd,
  PX,
  PZ,
  rectUV,
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
}

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

type Part = { at: number[]; svg: string };
const BIG = [44, 40],
  SMALL = [92, 102],
  SW = [124, 48],
  SH = 10,
  SZ = BH + 12; // small model half-width; switch plate top
const CHUTE_X = 52; // the chute runs from the big model's side (clear of its screen) to the student's back

/** A floor path of ink with a coloured stripe: lit paths glow. */
function path(points: number[][], lit: boolean, attrs: string, dashed = false) {
  const d = pd(
      points.map(([x, y]) => [x, y, BH + 0.3]),
      false,
    ),
    dash = dashed && !lit ? ' stroke-dasharray="5 4"' : '';
  return (
    `<g ${attrs} data-on="${lit ? 1 : 0}"><path d="${d}" fill="none" stroke="${INK}" stroke-width="${lit ? 5.4 : 3.6}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${lit ? ACC : DARK.l}" stroke-width="${lit ? 3 : 1.8}" stroke-linecap="round" stroke-linejoin="round"${dash}/></g>`
  );
}

/** The student: a squat model block a third the teacher's height, with a small screen on its front face. */
function student(on_: boolean): Part {
  const [x, y] = SMALL,
    z1 = BH + 14;
  let s = box(x - SH, y - SH, BH, x + SH, y + SH, z1, PALS.blush, toneI, 1);
  s += shape(on(PX(x + SH + 0.1), rectUV(y - SH + 3, BH + 4, y + SH - 3, z1 - 3)), on_ ? '#8af0ae' : '#1d2a26', 0.9);
  s += hullInk(boxCorners(x - SH, y - SH, BH, x + SH, y + SH, z1), 2);
  return { at: [x, y, 0], svg: `<g class="student" data-on="${on_ ? 1 : 0}">${s}</g>` };
}

/** The router switch: a dark plate with a lever that leans toward the belt it sends to (upright at rest). */
function router(lean: number, on_: boolean): Part {
  const [x, y] = SW,
    B = 9;
  let s = on_
    ? `<path d="${pd(on(PZ(BH + 0.3), rrUV(x - B - 3, y - B - 3, x + B + 3, y + B + 3, 4)))}" fill="none" stroke="${ACC}" stroke-width="2.4"/>`
    : '';
  s +=
    box(x - B, y - B, BH, x + B, y + B, SZ, DARK, toneI, 1) +
    hullInk(boxCorners(x - B, y - B, BH, x + B, y + B, SZ), 1.8);
  const tip = [x - (lean < 0 ? 9 : 0), y + (lean > 0 ? 9 : 0), SZ + (lean ? 12 : 16)]; // toward the large belt (-x) or the small one (+y)
  s +=
    cyl(x, y, SZ, SZ + 1.5, 2.4, METAL, toneI, 0.8) +
    rod([x, y, SZ + 1], tip, 1.1, METAL) +
    rod(tip, [tip[0], tip[1], tip[2] + 3.5], 2.4, on_ ? PALS.mustard : PALS.tomato);
  return { at: [x, y, 0], svg: `<g class="router" data-lean="${lean}">${s}</g>` };
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
  let s =
    castShadow(boxCorners(bx - 17, by - 17, BH, bx + 17, by + 17, BH + 32), BH, ctx.top) +
    castShadow(boxCorners(sx - SH, sy - SH, BH, sx + SH, sy + SH, BH + 14), BH, ctx.top) +
    castShadow(boxCorners(wx - 9, wy - 9, BH, wx + 9, wy + 9, SZ + 8), BH, ctx.top);
  // the two belts from the switch, and the chute between the models (dashed while idle)
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
  s += path(
    [
      [CHUTE_X, by + 17],
      [CHUTE_X, sy],
      [sx - SH, sy],
    ],
    st.chute.on,
    'class="chute"',
    true,
  );
  const parts: Part[] = [
    {
      at: [bx, by, 0],
      svg: `<g class="big" data-on="${st.big.on ? 1 : 0}">${renderers.llm({ x: bx, y: by, state: st.big.on ? 'ok' : undefined })}</g>`,
    },
    student(st.small.on),
    router(st.router.lean, st.router.on),
  ];
  s += byDepth(parts);
  const pills = [
    pill([bx, by, BH + 32], 0, -16, st.big.name, st.big.on, scale),
    pill([sx, sy, BH + 14], 0, -14, st.small.name, st.small.on, scale),
  ];
  if (!narrow || st.router.on) pills.push(pill([wx, wy, SZ + 18], 0, -12, st.router.name, st.router.on, scale));
  if (!narrow || st.chute.on) pills.push(pill([CHUTE_X, sy - 16, BH + 1], -44, 4, st.chute.name, st.chute.on, scale));
  return s + pills.join('');
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
  const big =
    box(m[0], m[1], m[2], m[3], m[4], m[5], PALS.blush, toneI, 1) +
    hullInk(boxCorners(m[0], m[1], m[2], m[3], m[4], m[5]), 1.8);
  const small =
    box(st[0], st[1], st[2], st[3], st[4], st[5], PALS.blush, toneI, 1) +
    hullInk(boxCorners(st[0], st[1], st[2], st[3], st[4], st[5]), 1.6);
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
