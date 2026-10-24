// Module 19's picture: the exam hall (KTD15). The model (RAG's LLM block, composed) sits at the back; in front of it a
// row of answer cards, one stack per written answer, each as tall as the toy policy's probability for it, with a stamp
// mark on top once graded (mint: earned reward, tomato: none). At the front right the grader's desk, with a rubber stamp
// and the latest group of drafts lying on it; at the back right a curve board whose pill reads the round or the strength.
// The rubber stamp is evalScene's; the desk is drawn here, smaller, with the group's drafts on it. Words only
// in pills; on phones (scale > 1.5) the cards' pills keep just their letters and the caption carries the numbers.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, renderers, sayAt, calloutsLast } from '../../lib/iso/blocks';
import {
  PALS,
  CERAMIC,
  DARK,
  METAL,
  WOOD,
  box,
  rod,
  shape,
  castShadow,
  hullInk,
  toneI,
  tag,
  byDepth,
} from '../../lib/iso/core.js';
import type { Say } from '../story/steps';
import { rubberStamp } from './evalScene';

export const EXAM_BOARD: Board = [0, 0, 176, 136];

export interface ExamCard {
  /** the answer's letter */
  id: string;
  /** the toy policy's probability for it */
  p: number;
  /** its reward under the grader, once graded */
  reward?: number;
  gaming?: boolean;
}
export interface ExamOpts {
  cards: ExamCard[];
  /** the grader's name, on the desk's pill (none: the desk waits, NO GRADER) */
  grader?: string;
  /** the latest group of drafts on the desk: earned a reward (true) or not, one per draft */
  group?: boolean[];
  /** the curve board's words (a round, a strength) */
  board?: string;
  /** the answer to light (its stack's pill) */
  lit?: number;
  /** pill size; phones pass more */
  scale?: number;
  /** the step's callout, over one of EXAM_PARTS */
  say?: Say;
}

/** The parts a step's callout may name. `cards` points at the most likely stack, `gaming` at the gaming answer's. */
export const EXAM_PARTS = ['model', 'cards', 'grader', 'board', 'gaming'] as const;

/** The tallest a stack stands, at probability 1. */
export const STACK_H = 44;
const MODEL = [32, 30],
  DESK = [150, 108],
  BOARD = [84, 8],
  ROW = { x: 40, y: 116, step: 18 };
// the board's pill floats above the highest a stack's pill can reach (a stack at probability 1 at the back right)
const BOARD_DY = -30;
const pct = (p: number) => `${Math.round(p * 100)}%`;

/** What the hall shows. Pure, so the tests can check it without drawing. Heights sum to STACK_H × the policy's total. */
export function examState({ cards, group = [] }: ExamOpts) {
  const off = (6 - cards.length) / 2;
  const stacks = cards.map((c, i) => ({
    ...c,
    at: [ROW.x + (i + off) * ROW.step, ROW.y - (i + off) * ROW.step],
    h: c.p * STACK_H,
    mark: c.reward === undefined ? null : c.reward > 0 ? ('pass' as const) : ('fail' as const),
  }));
  const top = stacks.reduce((b, s, i) => (s.p > stacks[b].p ? i : b), 0);
  return {
    stacks,
    top,
    gaming: stacks.findIndex(s => s.gaming),
    passed: group.filter(Boolean).length,
    drafts: group.length,
  };
}

const CARD = { dx: 7, dy: 5 },
  STRIPES = [PALS.cobalt, PALS.mustard, PALS.blush, PALS.mint, PALS.tomato, PALS.cobalt];
type Part = { at: number[]; svg: string };

/** One answer's stack: a pile of cards as tall as its probability, a coloured stripe down its front, a mark on top. */
function stack(x: number, y: number, h: number, i: number, mark: 'pass' | 'fail' | null, gaming: boolean): Part {
  const { dx, dy } = CARD,
    z1 = BH + Math.max(0.6, h);
  let s =
    box(x - dx, y - dy, BH, x + dx, y + dy, z1, CERAMIC, toneI, 0.8) +
    shape(
      [
        [x - dx + 1.5, y - dy + 1, z1 + 0.05],
        [x - dx + 4, y - dy + 1, z1 + 0.05],
        [x - dx + 4, y + dy - 1, z1 + 0.05],
        [x - dx + 1.5, y + dy - 1, z1 + 0.05],
      ],
      STRIPES[i % STRIPES.length].m,
      0.4,
    );
  if (mark)
    s += shape(
      [
        [x + 0.5, y - 3.5, z1 + 0.06],
        [x + 5.5, y - 3.5, z1 + 0.06],
        [x + 5.5, y + 1.5, z1 + 0.06],
        [x + 0.5, y + 1.5, z1 + 0.06],
      ],
      mark === 'pass' ? PALS.mint.m : PALS.tomato.m,
      0.6,
    );
  s += hullInk(boxCorners(x - dx, y - dy, BH, x + dx, y + dy, z1), 1.6);
  return {
    at: [x, y, 0],
    svg: `<g class="stack" data-card="${i}"${mark ? ` data-mark="${mark}"` : ''}${gaming ? ' data-gaming="1"' : ''}>${s}</g>`,
  };
}

const DESK_TOP = BH + 12;
/** The grader's desk: a wooden desk, the stamp at its front corner, the group's drafts in a row on top. */
function desk(group: boolean[]): Part {
  const [x, y] = DESK;
  let s =
    box(x - 18, y - 18, BH, x + 18, y + 18, DESK_TOP, WOOD, toneI, 1) +
    hullInk(boxCorners(x - 18, y - 18, BH, x + 18, y + 18, DESK_TOP), 2.2);
  group.forEach((ok, i) => {
    const cx = x - 10 + (i % 3) * 8,
      cy = y - 9 + Math.floor(i / 3) * 10,
      z = DESK_TOP;
    s +=
      box(cx - 3.2, cy - 4, z, cx + 3.2, cy + 4, z + 0.8, CERAMIC, toneI, 0.5) +
      shape(
        [
          [cx - 1.5, cy - 2, z + 0.85],
          [cx + 1.5, cy - 2, z + 0.85],
          [cx + 1.5, cy + 1, z + 0.85],
          [cx - 1.5, cy + 1, z + 0.85],
        ],
        ok ? PALS.mint.m : PALS.tomato.m,
        0.4,
      );
  });
  s += rubberStamp(x + 12, y + 8, DESK_TOP);
  return { at: [x, y, 0], svg: `<g class="desk" data-drafts="${group.length}">${s}</g>` };
}

/** The curve board: a panel on two legs, standing at the back. */
function curveBoard(): Part {
  const [x, y] = BOARD;
  const s =
    rod([x - 14, y, BH], [x - 14, y, BH + 10], 1.2, METAL) +
    rod([x + 14, y, BH], [x + 14, y, BH + 10], 1.2, METAL) +
    box(x - 18, y - 1.5, BH + 10, x + 18, y + 1.5, BH + 30, DARK, toneI, 1.2);
  return { at: [x, y, 0], svg: `<g class="curve-board">${s}</g>` };
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;

/** The hall. Shadows, then the parts back to front, then every pill on top. */
export const examScene = (o: ExamOpts) => (ctx: SceneCtx) => {
  const st = examState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5,
    [mx, my] = MODEL;
  const sh = (x0: number, y0: number, x1: number, y1: number, h: number) =>
    castShadow(boxCorners(x0, y0, BH, x1, y1, BH + h), BH, ctx.top);
  let s = sh(mx - 17, my - 17, mx + 17, my + 17, 32) + sh(DESK[0] - 18, DESK[1] - 18, DESK[0] + 18, DESK[1] + 18, 12);
  for (const k of st.stacks) s += sh(k.at[0] - CARD.dx, k.at[1] - CARD.dy, k.at[0] + CARD.dx, k.at[1] + CARD.dy, k.h);
  const parts: Part[] = [
    { at: [mx, my, 0], svg: `<g class="model">${renderers.llm({ x: mx, y: my })}</g>` },
    curveBoard(),
    desk(o.group ?? []),
    ...st.stacks.map((k, i) => stack(k.at[0], k.at[1], k.h, i, k.mark, !!k.gaming)),
  ];
  s += byDepth(parts);
  const at = (i: number) => [st.stacks[i].at[0], st.stacks[i].at[1], BH + Math.max(0.6, st.stacks[i].h)];
  // pills alternate two heights, so neighbours' pills never touch
  const dyOf = (i: number) => (i % 2 ? -14 : -30);
  const pills = st.stacks.map((k, i) =>
    pill(at(i), 0, dyOf(i), narrow ? k.id : `${k.id} · ${pct(k.p)}`, o.lit === i, scale),
  );
  const deskAt = [DESK[0], DESK[1] + 18, DESK_TOP],
    boardAt = [BOARD[0], BOARD[1], BH + 30];
  pills.push(
    pill(deskAt, 0, 18, o.grader ? (narrow ? 'GRADER' : `GRADER · ${o.grader}`) : 'NO GRADER', !!o.grader, scale),
  );
  if (o.board) pills.push(pill(boardAt, 0, BOARD_DY, o.board, false, scale));
  pills.push(pill([MODEL[0], MODEL[1], BH + 34], 0, -14, 'MODEL', false, scale));
  if (st.stacks.length) {
    pills.push(sayAt(o.say, 'cards', at(st.top), dyOf(st.top), scale));
    if (st.gaming >= 0) pills.push(sayAt(o.say, 'gaming', at(st.gaming), dyOf(st.gaming), scale));
  }
  pills.push(
    sayAt(o.say, 'grader', [DESK[0], DESK[1], DESK_TOP + 12], -14, scale),
    sayAt(o.say, 'board', boardAt, BOARD_DY, scale),
    sayAt(o.say, 'model', [MODEL[0], MODEL[1], BH + 34], -14, scale),
  );
  return s + calloutsLast(pills);
};

/** The picture in words, for its aria-label. */
export function examLabel(o: ExamOpts): string {
  const st = examState(o);
  return (
    `An exam hall: the model at the back and a stack of cards per answer, as tall as its probability: ` +
    st.stacks
      .map(k => `${k.id} ${pct(k.p)}${k.mark ? (k.mark === 'pass' ? ', rewarded' : ', no reward') : ''}`)
      .join('; ') +
    `. ${o.grader ? `The grader’s desk grades by ${o.grader.toLowerCase()}` : 'The grader’s desk is empty'}` +
    (st.drafts ? `; the latest group of ${st.drafts} drafts has ${st.passed} rewarded.` : '.') +
    (o.board ? ` The board reads ${o.board}.` : '')
  );
}

/** The home hero's plot (heroScene): a squat model, three stacks of answer cards of different heights (the tallest
 * stamped mint) and a rubber stamp beside them. Squat, so the pill rows stay clear. */
export function examPlot(x: number, y: number, top: SceneCtx['top']): string {
  const m = [x - 18, y - 16, BH, x - 2, y, BH + 14];
  const model =
    box(m[0], m[1], m[2], m[3], m[4], m[5], PALS.blush, toneI, 1) +
    hullInk(boxCorners(m[0], m[1], m[2], m[3], m[4], m[5]), 1.8);
  const stacks = [6, 14, 4].map((h, i) => stack(x + 2 + i * 7, y + 8 - i * 7, h, i, i === 1 ? 'pass' : null, false));
  return (
    castShadow(boxCorners(m[0], m[1], m[2], m[3], m[4], m[5]), BH, top) +
    byDepth([
      { at: [x - 10, y - 8, 0], svg: model },
      ...stacks,
      { at: [x + 14, y + 12, 0], svg: rubberStamp(x + 14, y + 12, BH) },
    ])
  );
}
