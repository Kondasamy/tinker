// Module 11's picture: the scratchpad desk (KTD16). The model is RAG's LLM block (composed, not forked) at the back; beside
// it the hero, a spiral notepad propped on a lap desk, its stack of thinking papers as thick as the thinking tokens; in
// front a stove-knob effort dial (four pips, the grip on the chosen effort) and a twin-bell alarm clock whose hand turns
// and whose pill shows the wait. With no thinking, the lap desk stands empty and the clock shows the answer-only wait.
// Words only in pills; the thinking text itself goes in a panel under the stage, never on the picture.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { ACC, BH, boxCorners, esc, renderers, sayAt, calloutsLast } from '../../lib/iso/blocks';
import { hexa, mini, modelIn, shaded, drawPieces } from '../../lib/iso/figures';
import {
  INK,
  PALS,
  CERAMIC,
  DARK,
  METAL,
  box,
  cyl,
  rod,
  line,
  pd,
  on,
  PZ,
  ellUV,
  castShadow,
  hullInk,
  toneI,
  tag,
  byDepth,
  WOOD,
  PX,
  rrUV,
  shape,
  fill,
  ink,
  loft,
  extrude,
  norm,
  vis,
} from '../../lib/iso/core.js';
import { EFFORTS, type Effort } from '../../lib/reasoning/engine';
import type { Say } from '../story/steps';

export const THINK_BOARD: Board = [0, 0, 150, 120];

export interface ThinkOpts {
  effort: Effort;
  /** thinking tokens (0: no pad) */
  thinking: number;
  /** the wait in seconds, thinking and answer */
  wait: number;
  /** the answer was graded right (the model's screen goes green) or wrong (red); unset before a run */
  right?: boolean;
  /** pill size; phones pass more */
  scale?: number;
  /** the step's callout: a lit pill over one of THINK_PARTS */
  say?: Say;
}

/** The parts a step's callout may point at: the ones with a name pill. */
export const THINK_PARTS = ['dial', 'clock', 'pad'] as const;

/** One sheet of the pad per this many thinking tokens; the pad stops growing at MAX_SHEETS (its pill still says the count). */
export const TOKENS_PER_SHEET = 20,
  MAX_SHEETS = 16;
const SHEET = 1.6;
export const EFFORT_NAME: Record<Effort, string> = { none: 'NONE', low: 'LOW', medium: 'MEDIUM', high: 'HIGH' };
export const seconds = (s: number) => `${s.toFixed(1)} s`;

/** What the desk shows. Pure, so the tests can check it without drawing. */
export function thinkState({ effort, thinking, wait, right }: ThinkOpts) {
  const sheets = thinking > 0 ? Math.min(MAX_SHEETS, Math.max(1, Math.ceil(thinking / TOKENS_PER_SHEET))) : 0;
  return { effort, notch: EFFORTS.indexOf(effort), sheets, pad: sheets > 0, thinking, clock: seconds(wait), right };
}

type Part = { box: number[][]; svg: string };
const MODEL = [44, 40],
  PAD = [104, 36],
  DIAL = [104, 92],
  CLOCK = [40, 96];
type V = number[];
const add = (...vs: V[]) => vs.reduce((s, v) => [s[0] + v[0], s[1] + v[1], s[2] + v[2]]);
const mul = (v: V, k: number) => v.map(c => c * k);
const span = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => [
  [x0, y0, z0],
  [x1, y1, z1],
];
/** a flat horizontal slab of any outline (u = x, v = y) from z0 to z1: sides, the top, one silhouette */
const slab = (prof: number[][], z0: number, z1: number, m: Mat, w = 1.2) => {
  const A = on(PZ(z0), prof),
    B = on(PZ(z1), prof);
  return loft(A, B, (n: V) => toneI(n, m)) + fill(pd(B), toneI([0, 0, 1], m)) + hullInk([...A, ...B], w);
};
type Mat = typeof DARK;

// the lap desk: a cushion with a wooden board on it, sloping down toward the viewer (+x) to a ledge
const LAP = { hx: 15, hy: 12, zc: BH + 4, lo: BH + 6.5, hi: BH + 12 },
  SLOPE = (LAP.hi - LAP.lo) / (2 * LAP.hx),
  ALONG = norm([1, 0, -SLOPE]),
  UP = norm([SLOPE, 0, 1]),
  /** a point on the pad's frame: u down the slope, v across, w off the board */
  onLap = (u: number, v: number, w: number) =>
    add([PAD[0], PAD[1], (LAP.lo + LAP.hi) / 2], mul(ALONG, u), [0, v, 0], mul(UP, w));
const sheetPts = (u0: number, u1: number, v0: number, v1: number, w0: number, w1: number) => [
  onLap(u0, v0, w0),
  onLap(u1, v0, w0),
  onLap(u1, v1, w0),
  onLap(u0, v1, w0),
  onLap(u0, v0, w1),
  onLap(u1, v0, w1),
  onLap(u1, v1, w1),
  onLap(u0, v1, w1),
];

/** The spiral notepad propped on a lap desk (the hero). Real-object notes: a plump cushion; on it a wooden board
 * sloping toward the reader with a ledge along its low edge; the notepad on the slope, a card back under its sheets
 * (one per TOKENS_PER_SHEET thinking tokens, each a little offset), wire coils through the top edge, a few ruled
 * lines on the top sheet. No thinking: the lap desk stands empty. */
function lapPad(sheets: number): Part {
  const [x, y] = PAD,
    { hx, hy, zc, lo, hi } = LAP;
  let s = slab(rrUV(x - hx, y - hy, x + hx, y + hy, 7, 5), BH, zc, PALS.tomato, 1.6);
  const board = [
    [x - hx + 1, y - hy + 1, zc],
    [x + hx - 1, y - hy + 1, zc],
    [x + hx - 1, y + hy - 1, zc],
    [x - hx + 1, y + hy - 1, zc],
    [x - hx + 1, y - hy + 1, hi],
    [x + hx - 1, y - hy + 1, lo],
    [x + hx - 1, y + hy - 1, lo],
    [x - hx + 1, y + hy - 1, hi],
  ];
  s += hexa(board, WOOD, 1) + hullInk(board, 1.6);
  // the ledge on the low edge
  s += box(x + hx - 3, y - hy + 1, lo - 0.6, x + hx - 1, y + hy - 1, lo + 1.6, WOOD, toneI, 0.8);
  if (!sheets) return { box: span(x - hx, y - hy, BH, x + hx, y + hy, hi + 0.5), svg: `<g class="lapdesk">${s}</g>` };
  let pad = hexa(sheetPts(-12, 10, -9.5, 9.5, 0.4, 1.2), DARK, 0.8);
  for (let i = 0; i < sheets; i++) {
    const d = ((i % 3) - 1) * 0.5,
      w = 1.2 + i * SHEET;
    pad += hexa(sheetPts(-11 + d, 9.5 + d, -9 - d, 9 - d, w, w + SHEET), CERAMIC, 0.6);
  }
  const top = 1.2 + sheets * SHEET + 0.05;
  for (let i = 0; i < 3; i++) pad += line([onLap(-6 + i * 4, -6, top), onLap(-6 + i * 4, i === 2 ? 1 : 6, top)], 0.5);
  // the coils: small wire rings through the top sheet's back edge, every 2.4 across
  for (let v = -7.2; v <= 7.3; v += 2.4) {
    const c = onLap(-10.6, v, top),
      ring = Array.from({ length: 10 }, (_, i) => (i / 10) * 2 * Math.PI).map(t =>
        add(c, mul(ALONG, 1.3 * Math.cos(t)), mul(UP, 1.3 * Math.sin(t))),
      );
    pad += ink(pd(ring), 1.1).replace(INK, METAL.d) + ink(pd(ring), 0.4);
  }
  const corners = sheetPts(-12.5, 10, -9.5, 9.5, 0.4, top);
  s += `<g class="pad" data-sheets="${sheets}">${pad}${hullInk(corners, 1.6)}</g>`;
  return { box: span(x - hx, y - hy, BH, x + hx, y + hy, Math.max(...corners.map(p => p[2]))), svg: s };
}
/** the top of the pad's stack, for its pill */
const padTop = (sheets: number) => onLap(0, 0, 1.2 + sheets * SHEET)[2];

/** The effort dial: a stove knob. Real-object notes: a cream enamel back plate with four pips round the knob (none to
 * high, back-left round to front-right), lit up to the chosen effort; a chrome skirt, a fluted cobalt knob, and a grip
 * ridge across its top that points at the chosen pip. */
function dial(notch: number): Part {
  const [x, y] = DIAL,
    z = BH + 2.5;
  let s = slab(rrUV(x - 12, y - 12, x + 12, y + 12, 4, 4), BH, z, CERAMIC, 1.4);
  const ang = (i: number) => ((200 + i * 50) * Math.PI) / 180;
  EFFORTS.forEach((_, i) => {
    const a = ang(i);
    s += shape(
      on(PZ(z + 0.05), ellUV(x + Math.cos(a) * 9.6, y + Math.sin(a) * 9.6, 1.3, 1.3, 10)),
      i <= notch ? ACC : CERAMIC.d,
      0.7,
    );
  });
  const zk = z + 6,
    r = 5;
  s += cyl(x, y, z, z + 1.2, 6.4, METAL, toneI, 1, 20) + cyl(x, y, z + 1.2, zk, r, PALS.cobalt, toneI, 1.4, 20);
  // flutes on the side toward the viewer
  for (let i = 0; i < 16; i++) {
    const t = (i / 16) * 2 * Math.PI,
      c = Math.cos(t),
      sn = Math.sin(t);
    if (vis([c, sn, 0]) && vis([c, sn, 0].map((v, k) => v - [1, 1, 0][k] * 0.35)))
      s += line(
        [
          [x + c * r, y + sn * r, z + 1.8],
          [x + c * r, y + sn * r, zk - 0.6],
        ],
        0.5,
      );
  }
  const a = ang(notch),
    d = [Math.cos(a), Math.sin(a), 0];
  s +=
    rod(add([x, y, zk + 0.9], mul(d, -3.6)), add([x, y, zk + 0.9], mul(d, 3.6)), 1.2, PALS.cobalt, toneI, 1, 1.2, 10) +
    shape(on(PZ(zk + 0.05), ellUV(x + d[0] * 3.2, y + d[1] * 3.2, 0.9, 0.9, 8)), ACC, 0.5);
  return {
    box: span(x - 12, y - 12, BH, x + 12, y + 12, zk + 2.2),
    svg: `<g class="dial" data-effort="${EFFORTS[notch]}">${s}</g>`,
  };
}

/** The clock: a twin-bell alarm clock. Real-object notes: a round mustard drum standing on two splayed feet, a chrome
 * bezel round a cream face with twelve ticks and one hand (a full turn per 10 s of wait), two chrome bells on stalks
 * over its top and the hammer between them. The face looks at the viewer's side. */
function clock(wait: number): Part {
  const [x, y] = CLOCK,
    R = 7,
    zc = BH + 3.5 + R,
    sx = vis([1, 0, 0]) ? 1 : -1,
    fx = x + sx * 2.5,
    D = 2.5;
  let s = '';
  for (const sy of [-1, 1])
    s +=
      rod([x, y + sy * 4, zc - R + 1.5], [x + sx * 0.5, y + sy * 6.2, BH + 0.6], 0.7, METAL, toneI, 0.8) +
      cyl(x + sx * 0.5, y + sy * 6.2, BH, BH + 1, 1.2, DARK, toneI, 0.7, 10);
  // the bells sit behind the drum's top: stalks, then the domes, then the hammer between them
  for (const sy of [-1, 1]) {
    const by = y + sy * 4.6,
      bz = zc + R - 0.8;
    s +=
      rod([x, y + sy * 2.4, zc + R - 2], [x, by, bz + 1], 0.45, METAL, toneI, 0.6) +
      rod([x, by, bz + 1], [x, by + sy * 0.6, bz + 4.4], 3.4, METAL, toneI, 1.1, 0.9, 18);
  }
  s +=
    rod([x, y, zc + R - 1], [x, y, zc + R + 3.6], 0.4, DARK, toneI, 0.6) +
    cyl(x, y, zc + R + 3.2, zc + R + 4.6, 1, DARK, toneI, 0.6, 10);
  const ring = ellUV(y, zc, R, R, 28);
  s +=
    extrude(ring, x - D, x + D, PALS.mustard, toneI) + hullInk([...on(PX(x - D), ring), ...on(PX(x + D), ring)], 1.6);
  s +=
    shape(on(PX(fx + sx * 0.05), ring), METAL.l, 1.2) +
    shape(on(PX(fx + sx * 0.1), ellUV(y, zc, R - 1.4, R - 1.4, 28)), CERAMIC.l, 0.8);
  // on the face (u = y, v = z), right on screen is -y when it faces +x
  const at = (t: number, rr: number) => [fx + sx * 0.15, y - sx * Math.sin(t) * rr, zc + Math.cos(t) * rr];
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) * 2 * Math.PI;
    s += line([at(t, R - 2.2), at(t, i % 3 ? R - 2.8 : R - 3.4)], i % 3 ? 0.5 : 0.9);
  }
  const t = ((wait % 10) / 10) * 2 * Math.PI;
  s += line([at(0, 0), at(t, R - 2.6)], 1.4) + shape(on(PX(fx + sx * 0.2), ellUV(y, zc, 0.8, 0.8, 8)), INK, 0);
  return { box: span(x - D - 1, y - 9, BH, x + D + 1, y + 9, zc + R + 4.6), svg: `<g class="clock">${s}</g>` };
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;

/** The desk. Shadows, then the parts back to front, then every pill on top. */
export const thinkScene = (o: ThinkOpts) => (ctx: SceneCtx) => {
  const st = thinkState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5,
    [mx, my] = MODEL;
  const sh = (x0: number, y0: number, x1: number, y1: number, h: number) =>
    castShadow(boxCorners(x0, y0, BH, x1, y1, BH + h), BH, ctx.top);
  const lapH = Math.max(LAP.hi + 0.5, st.pad ? padTop(st.sheets) + 1 : 0) - BH;
  let s =
    sh(mx - 17, my - 17, mx + 17, my + 17, 32) +
    sh(DIAL[0] - 11, DIAL[1] - 11, DIAL[0] + 11, DIAL[1] + 11, 8) +
    sh(CLOCK[0] - 3, CLOCK[1] - 7, CLOCK[0] + 3, CLOCK[1] + 7, 22) +
    sh(PAD[0] - LAP.hx + 2, PAD[1] - LAP.hy + 2, PAD[0] + LAP.hx - 2, PAD[1] + LAP.hy - 2, lapH);
  const state = st.right === undefined ? undefined : st.right ? 'ok' : 'bad';
  s += byDepth([
    { box: span(mx - 17, my - 17, BH, mx + 17, my + 17, BH + 35), svg: renderers.llm({ x: mx, y: my, state }) },
    dial(st.notch),
    clock(o.wait),
    lapPad(st.sheets),
  ]);
  const padAt = [PAD[0], PAD[1], (st.pad ? padTop(st.sheets) : LAP.hi) + 1],
    dialAt = [DIAL[0], DIAL[1], BH + 11],
    clockAt = [CLOCK[0], CLOCK[1], BH + 23];
  const pills = [
    sayAt(o.say, 'dial', dialAt, -14, scale),
    sayAt(o.say, 'clock', clockAt, -14, scale),
    sayAt(o.say, 'pad', padAt, -14, scale),
    pill(dialAt, 0, -14, narrow ? EFFORT_NAME[st.effort] : `EFFORT · ${EFFORT_NAME[st.effort]}`, true, scale),
    pill(clockAt, 0, -14, st.clock, false, scale),
  ];
  if (st.pad)
    pills.push(pill(padAt, 0, -14, narrow ? `${st.thinking} TOK` : `${st.thinking} THINKING TOKENS`, false, scale));
  else if (!narrow) pills.push(pill(padAt, 0, -14, 'NO THINKING', false, scale));
  return s + calloutsLast(pills);
};

/** The home hero's plot: the model machine, the lap desk with its spiral notepad, the stove-knob effort dial and the
 * twin-bell alarm clock, all in miniature. */
export function deskPadPlot(x: number, y: number, top: SceneCtx['top']): string {
  const m = [x - 16, y - 14, BH, x + 2, y + 4, BH + 16],
    k = 0.5,
    pieces = [
      modelIn(m),
      mini(shaded([lapPad(5)]), [...PAD, BH], [x + 12, y - 7, BH], k),
      mini(shaded([dial(2)]), [...DIAL, BH], [x + 12, y + 10, BH], k),
      mini(shaded([clock(3)]), [...CLOCK, BH], [x - 10, y + 12, BH], k),
    ];
  return drawPieces(pieces, top);
}

/** The picture in words, for its aria-label. */
export function thinkLabel(o: ThinkOpts): string {
  const st = thinkState(o);
  return (
    `A scratchpad desk: the model, ${st.pad ? `a pad of ${st.thinking} thinking tokens beside it` : 'no thinking pad (it answers at once)'}, ` +
    `an effort dial set to ${st.effort}, and a clock showing a wait of ${st.clock}.` +
    (st.right === undefined ? '' : st.right ? ' The answer was graded right.' : ' The answer was graded wrong.')
  );
}
