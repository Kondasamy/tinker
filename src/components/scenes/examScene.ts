// Module 19's picture: the exam hall (KTD15). The model machine sits at the back; in front of it a row of answer cards,
// one stack per written answer standing in a wooden card holder, each as tall as the toy policy's probability for it,
// with a stamp mark on top once graded (mint: earned reward, tomato: none); the gaming answer's cards carry a tomato
// tab. At the front right the teacher grades at a desk, with a rubber stamp and the latest group of drafts on it; at the
// back a chalkboard on an easel (the hero) with a rising curve chalked on it, its pill reading the round or the
// strength. The rubber stamp is evalScene's. Words only in pills; on phones (scale > 1.5) the cards' pills keep just
// their letters and the caption carries the numbers.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, renderers, sayAt, calloutsLast } from '../../lib/iso/blocks';
import { SKIN, modelIn, person, type Look } from '../../lib/iso/figures';
import {
  PALS,
  CERAMIC,
  METAL,
  WOOD,
  box,
  rod,
  shape,
  matOf,
  pd,
  vis,
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
  LIP = 1.4,
  // tomato is kept for the gaming answer's tab
  STRIPES = [PALS.cobalt, PALS.mustard, PALS.blush, PALS.mint];
type Part = { at?: number[]; box?: number[][]; svg: string };
const span = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => [
  [x0, y0, z0],
  [x1, y1, z1],
];
const flat = (z: number, x0: number, y0: number, x1: number, y1: number) => [
  [x0, y0, z],
  [x1, y0, z],
  [x1, y1, z],
  [x0, y1, z],
];
const chalk = (pts: number[][], w: number) =>
  `<path d="${pd(pts, false)}" stroke="#f4f1e8" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

/** One answer's stack in its card holder. Real-object notes: a wooden holder (a base with a low lip on every side) round
 * a pile of cards as tall as the answer's probability, card edges ruled across the faces toward the viewer, a coloured
 * tab on top (tomato on the gaming answer), a mark on top once graded. Holder and pile are one item, so the pile never
 * sorts behind its own holder. */
function stack(x: number, y: number, h: number, i: number, mark: 'pass' | 'fail' | null, gaming: boolean): Part {
  const { dx, dy } = CARD,
    z1 = BH + 0.8 + Math.max(0.6, h),
    X0 = x - dx - LIP,
    X1 = x + dx + LIP,
    Y0 = y - dy - LIP,
    Y1 = y + dy + LIP,
    lip = BH + 2.6;
  const wall = (x0: number, y0: number, x1: number, y1: number) => box(x0, y0, BH, x1, y1, lip, WOOD, toneI, 0.7);
  // the holder's base and far walls, the pile, then the near walls
  let s =
    box(X0, Y0, BH, X1, Y1, BH + 0.8, WOOD, toneI, 0.8) +
    wall(X0, Y0, X1, y - dy) +
    wall(X0, y - dy, x - dx, Y1) +
    box(x - dx, y - dy, BH + 0.8, x + dx, y + dy, z1, CERAMIC, toneI, 0.8) +
    shape(
      flat(z1 + 0.05, x - dx + 1.5, y - dy + 1, x - dx + 4, y + dy - 1),
      (gaming ? PALS.tomato : STRIPES[i % 4]).m,
      0.4,
    );
  // card edges: a fine rule every few units up the faces toward the viewer
  for (let z = BH + 4.5; z < z1 - 1; z += 4) {
    if (vis([1, 0, 0]))
      s += `<path d="${pd(
        [
          [x + dx + 0.05, y - dy, z],
          [x + dx + 0.05, y + dy, z],
        ],
        false,
      )}" stroke="${CERAMIC.d}" stroke-width=".5" fill="none"/>`;
    if (vis([0, 1, 0]))
      s += `<path d="${pd(
        [
          [x - dx, y + dy + 0.05, z],
          [x + dx, y + dy + 0.05, z],
        ],
        false,
      )}" stroke="${CERAMIC.d}" stroke-width=".5" fill="none"/>`;
  }
  if (mark)
    s += shape(flat(z1 + 0.06, x + 0.5, y - 3.5, x + 5.5, y + 1.5), mark === 'pass' ? PALS.mint.m : PALS.tomato.m, 0.6);
  s += wall(x + dx, y - dy, X1, Y1) + wall(X0, y + dy, x + dx, Y1);
  s += hullInk(boxCorners(X0, Y0, BH, X1, Y1, z1), 1.6);
  return {
    box: span(X0, Y0, BH, X1, Y1, z1),
    svg: `<g class="stack" data-card="${i}"${mark ? ` data-mark="${mark}"` : ''}${gaming ? ' data-gaming="1"' : ''}>${s}</g>`,
  };
}

const DESK_TOP = BH + 12;
/** The teacher's desk. Real-object notes: a wooden top on a drawer pedestal (two drawer fronts with pulls) at its near
 * end and two square legs at the far end; the stamp at its front corner, the group's drafts in a row on top. */
function desk(group: boolean[]): Part {
  const [x, y] = DESK,
    zt = DESK_TOP - 2;
  let s =
    box(x - 17, y - 17, BH, x - 14, y - 14, zt, WOOD, toneI, 0.9) +
    box(x - 17, y + 14, BH, x - 14, y + 17, zt, WOOD, toneI, 0.9) +
    box(x + 2, y - 17, BH, x + 17, y + 17, zt, WOOD, toneI, 1);
  if (vis([0, 1, 0]))
    for (const [z0, z1] of [
      [BH + 1, BH + 4.5],
      [BH + 5, BH + 9],
    ])
      s +=
        shape(
          [
            [x + 3.5, y + 17.05, z0],
            [x + 15.5, y + 17.05, z0],
            [x + 15.5, y + 17.05, z1],
            [x + 3.5, y + 17.05, z1],
          ],
          WOOD.l,
          0.6,
        ) + rod([x + 7, y + 17.6, (z0 + z1) / 2], [x + 12, y + 17.6, (z0 + z1) / 2], 0.5, METAL, toneI, 0.6);
  s += box(x - 18, y - 18, zt, x + 18, y + 18, DESK_TOP, WOOD, toneI, 1.2);
  group.forEach((ok, i) => {
    const cx = x - 10 + (i % 3) * 8,
      cy = y - 9 + Math.floor(i / 3) * 10,
      z = DESK_TOP;
    s +=
      box(cx - 3.2, cy - 4, z, cx + 3.2, cy + 4, z + 0.8, CERAMIC, toneI, 0.5) +
      shape(flat(z + 0.85, cx - 1.5, cy - 2, cx + 1.5, cy + 1), ok ? PALS.mint.m : PALS.tomato.m, 0.4);
  });
  s += rubberStamp(x + 12, y + 8, DESK_TOP);
  s += hullInk(boxCorners(x - 18, y - 18, BH, x + 18, y + 18, DESK_TOP), 2.2);
  return {
    box: span(x - 18, y - 18, BH, x + 18, y + 18.6, DESK_TOP + 8),
    svg: `<g class="desk" data-drafts="${group.length}">${s}</g>`,
  };
}

const SLATE = matOf('#3f5e4c');
/** The hero: a chalkboard on an easel. Real-object notes: an A-frame easel, two front legs splayed and a back leg
 * propping it; a dark green board in a wooden frame resting on a chalk ledge, a stick of chalk on the ledge; a rising
 * curve and its axes chalked on the face (no words: the round or strength is in the pill). The old board's footprint
 * and top. */
function curveBoard(): Part {
  const [x, y] = BOARD,
    zl = BH + 9,
    zt = BH + 30,
    fy = y + 1.6;
  let s = rod([x, y - 1, zt - 2], [x, y - 8, BH], 0.9, WOOD, toneI, 0.8);
  for (const sx of [-1, 1]) s += rod([x + sx * 12, y, zt + 1], [x + sx * 16, y + 3, BH], 1, WOOD, toneI, 0.9);
  s += box(x - 19, y - 1.5, zl - 0.2, x + 19, y + 1.5, zt, WOOD, toneI, 1.1);
  s += box(x - 17, y - 1.2, zl + 1.8, x + 17, y + 1.55, zt - 2, SLATE, toneI, 0.6);
  if (vis([0, 1, 0]))
    // the chalked curve: reward rising round by round, then levelling off
    s +=
      chalk(
        Array.from({ length: 9 }, (_, i) => [x - 13 + 27 * (i / 8), fy, zl + 5 + 13 * (1 - Math.exp((-3 * i) / 8))]),
        1.3,
      ) +
      chalk(
        [
          [x - 15, fy, zt - 4],
          [x - 15, fy, zl + 3.6],
          [x + 15, fy, zl + 3.6],
        ],
        0.7,
      );
  s +=
    box(x - 18, y + 1.5, zl - 1.5, x + 18, y + 4, zl, WOOD, toneI, 0.9) +
    rod([x + 8, y + 2.8, zl + 0.5], [x + 12, y + 2.8, zl + 0.5], 0.5, CERAMIC, toneI, 0.4);
  return { box: span(x - 19, y - 8, BH, x + 19, y + 4, zt + 1), svg: `<g class="curve-board">${s}</g>` };
}

// the teacher: grey hair in a bun, a long cardigan, standing behind the desk, reaching for the stamp
const TEACHER: Look = { skin: SKIN[3], top: '#8f7bb5', legs: '#4a4642', hair: '#bdb7ab', cut: 'bun', coat: true };
const TEACHER_AT = [DESK[0] - 2, DESK[1] - 27];

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;

/** The hall. Shadows, then one sort over every part, then every pill on top. */
export const examScene = (o: ExamOpts) => (ctx: SceneCtx) => {
  const st = examState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5,
    [mx, my] = MODEL;
  const sh = (x0: number, y0: number, x1: number, y1: number, h: number) =>
    castShadow(boxCorners(x0, y0, BH, x1, y1, BH + h), BH, ctx.top);
  const teacher = person({ x: TEACHER_AT[0], y: TEACHER_AT[1], facing: 90, pose: 'reach', look: TEACHER });
  let s =
    sh(mx - 17, my - 17, mx + 17, my + 17, 32) +
    sh(DESK[0] - 18, DESK[1] - 18, DESK[0] + 18, DESK[1] + 18, 12) +
    sh(BOARD[0] - 17, BOARD[1] - 2, BOARD[0] + 17, BOARD[1] + 2, 28) +
    teacher.shadow;
  for (const k of st.stacks)
    s += sh(k.at[0] - CARD.dx - LIP, k.at[1] - CARD.dy - LIP, k.at[0] + CARD.dx + LIP, k.at[1] + CARD.dy + LIP, k.h);
  const parts: Part[] = [
    { box: span(mx - 17, my - 17, BH, mx + 17, my + 17, BH + 35), svg: renderers.llm({ x: mx, y: my }) },
    curveBoard(),
    desk(o.group ?? []),
    ...teacher.items,
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
  const model = modelIn(m).items[0].svg;
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
