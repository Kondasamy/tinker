// Module 11's picture: the scratchpad desk (KTD16). The model is RAG's LLM block (composed, not forked) at the back; beside
// it a pad of thinking papers whose height follows the thinking tokens; in front an effort dial (four notches, the pointer
// on the chosen effort) and a clock whose pill shows the wait. With no thinking, no pad is drawn and the clock shows the
// answer-only wait. Words only in pills; the thinking text itself goes in a panel under the stage, never on the picture.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { ACC, BH, boxCorners, esc, renderers, sayAt, calloutsLast } from '../../lib/iso/blocks';
import { modelIn } from '../../lib/iso/figures';
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

type Part = { at: number[]; svg: string };
const MODEL = [44, 40],
  PAD = [104, 36],
  DIAL = [104, 92],
  CLOCK = [40, 96];

/** The pad: a stack of paper sheets, each a little offset, on a dark board. */
function pad(sheets: number): Part {
  const [x, y] = PAD;
  let s = box(x - 14, y - 11, BH, x + 14, y + 11, BH + 1.5, DARK, toneI, 1);
  for (let i = 0; i < sheets; i++) {
    const z = BH + 1.5 + i * SHEET,
      d = (i % 3) - 1;
    s += box(x - 12 + d, y - 9 - d, z, x + 12 + d, y + 9 - d, z + SHEET, CERAMIC, toneI, 0.6);
  }
  const top = BH + 1.5 + sheets * SHEET;
  for (let i = 0; i < 3; i++)
    s += line(
      [
        [x - 8, y - 5 + i * 4, top + 0.05],
        [x + (i === 2 ? 2 : 8), y - 5 + i * 4, top + 0.05],
      ],
      0.6,
    );
  s += hullInk(boxCorners(x - 14, y - 11, BH, x + 14, y + 11, top), 1.6);
  return { at: [x, y, 0], svg: `<g class="pad" data-sheets="${sheets}">${s}</g>` };
}

/** The effort dial: a squat drum with four notches round its top and a pointer on the chosen one (none to high, left to right). */
function dial(notch: number): Part {
  const [x, y] = DIAL,
    z = BH + 6,
    r = 11;
  let s = cyl(x, y, BH, z, r, PALS.cobalt, toneI, 1.4);
  // notches from the back-left (none) round to the front-right (high)
  const ang = (i: number) => ((200 + i * 50) * Math.PI) / 180;
  EFFORTS.forEach((_, i) => {
    const a = ang(i),
      p = [x + Math.cos(a) * (r - 1.5), y + Math.sin(a) * (r - 1.5), z + 0.1];
    s += `<path d="${pd(on(PZ(z + 0.1), ellUV(p[0], p[1], 1.4, 1.4, 10)))}" fill="${i <= notch ? ACC : CERAMIC.m}" stroke="${INK}" stroke-width=".7"/>`;
  });
  const a = ang(notch);
  s +=
    rod([x, y, z + 1], [x + Math.cos(a) * (r - 3), y + Math.sin(a) * (r - 3), z + 1], 1.1, METAL) +
    cyl(x, y, z, z + 2.5, 2.6, DARK, toneI, 0.9);
  return { at: [x, y, 0], svg: `<g class="dial" data-effort="${EFFORTS[notch]}">${s}</g>` };
}

/** The clock: a short drum with a face on top and one hand; the hand turns with the wait (a full turn per 10 s). */
function clock(wait: number): Part {
  const [x, y] = CLOCK,
    z = BH + 9,
    r = 9;
  let s = cyl(x, y, BH, z, r, PALS.mustard, toneI, 1.4);
  s += `<path d="${pd(on(PZ(z + 0.1), ellUV(x, y, r - 2, r - 2, 24)))}" fill="${CERAMIC.l}" stroke="${INK}" stroke-width=".8"/>`;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    s += line(
      [
        [x + Math.cos(a) * (r - 3.5), y + Math.sin(a) * (r - 3.5), z + 0.2],
        [x + Math.cos(a) * (r - 2.4), y + Math.sin(a) * (r - 2.4), z + 0.2],
      ],
      0.8,
    );
  }
  const a = -Math.PI / 2 + ((wait % 10) / 10) * 2 * Math.PI;
  s += line(
    [
      [x, y, z + 0.3],
      [x + Math.cos(a) * (r - 3.5), y + Math.sin(a) * (r - 3.5), z + 0.3],
    ],
    1.6,
  );
  return { at: [x, y, 0], svg: `<g class="clock">${s}</g>` };
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
  let s =
    sh(mx - 17, my - 17, mx + 17, my + 17, 32) +
    sh(DIAL[0] - 10, DIAL[1] - 10, DIAL[0] + 10, DIAL[1] + 10, 6) +
    sh(CLOCK[0] - 8, CLOCK[1] - 8, CLOCK[0] + 8, CLOCK[1] + 8, 9);
  if (st.pad) s += sh(PAD[0] - 14, PAD[1] - 11, PAD[0] + 14, PAD[1] + 11, 1.5 + st.sheets * SHEET);
  const state = st.right === undefined ? undefined : st.right ? 'ok' : 'bad';
  const parts: Part[] = [
    { at: [mx, my, 0], svg: renderers.llm({ x: mx, y: my, state }) },
    dial(st.notch),
    clock(o.wait),
  ];
  if (st.pad) parts.push(pad(st.sheets));
  s += byDepth(parts);
  const padAt = [PAD[0], PAD[1], BH + 2 + st.sheets * SHEET];
  const pills = [
    sayAt(o.say, 'dial', [DIAL[0], DIAL[1], BH + 9], -14, scale),
    sayAt(o.say, 'clock', [CLOCK[0], CLOCK[1], BH + 10], -14, scale),
    sayAt(o.say, 'pad', padAt, -14, scale),
    pill(
      [DIAL[0], DIAL[1], BH + 9],
      0,
      -14,
      narrow ? EFFORT_NAME[st.effort] : `EFFORT · ${EFFORT_NAME[st.effort]}`,
      true,
      scale,
    ),
    pill([CLOCK[0], CLOCK[1], BH + 10], 0, -14, st.clock, false, scale),
  ];
  if (st.pad)
    pills.push(pill(padAt, 0, -14, narrow ? `${st.thinking} TOK` : `${st.thinking} THINKING TOKENS`, false, scale));
  else if (!narrow) pills.push(pill([PAD[0], PAD[1], BH], 0, -14, 'NO THINKING', false, scale));
  return s + calloutsLast(pills);
};

/** The home hero's plot (heroScene): a small scratchpad desk at (x, y). A squat model block, a pad of papers beside it, and a
 * small dial in front. Squat, so the pill rows stay clear. */
export function deskPadPlot(x: number, y: number, top: SceneCtx['top']): string {
  const m = [x - 16, y - 14, BH, x + 2, y + 4, BH + 16];
  const model = modelIn(m).items[0].svg;
  let paper = '';
  for (let i = 0; i < 5; i++)
    paper += box(x + 6, y - 12, BH + i * SHEET, x + 18, y - 2, BH + (i + 1) * SHEET, CERAMIC, toneI, 0.6);
  paper += hullInk(boxCorners(x + 6, y - 12, BH, x + 18, y - 2, BH + 5 * SHEET), 1.4);
  const knob = cyl(x + 12, y + 10, BH, BH + 4, 5, PALS.cobalt, toneI, 1.2);
  return (
    castShadow(boxCorners(m[0], m[1], m[2], m[3], m[4], m[5]), BH, top) +
    castShadow(boxCorners(x + 6, y - 12, BH, x + 18, y - 2, BH + 8), BH, top) +
    byDepth([
      { at: [x - 7, y - 5, 0], svg: model },
      { at: [x + 12, y - 7, 0], svg: paper },
      { at: [x + 12, y + 10, 0], svg: knob },
    ])
  );
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
