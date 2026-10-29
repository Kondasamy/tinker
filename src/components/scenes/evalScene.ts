// Module 4's picture: a test bench (KTD11). RAG's mini pipeline (composed, not forked) stands at the back; a stack of
// test cards waits in a card box at the front left and the current card rides a roller belt into the pipeline. The hero
// is the grader's desk with its big rubber stamp and inked pad; the grader stands behind it and a scoreboard on a stand
// at its end shows the passed and failed shares as bars. The model's answers go down a
// wire to a grader's desk at the front right, where graded cards pile up in a PASS pile and a FAIL pile, each stamped.
// A scoreboard pill reads passed / total. Words only in pills; on phones (scale > 1.5) the caption carries the piles.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { ACC, BH, boxCorners, calloutTag, esc, sayAt, sayFits } from '../../lib/iso/blocks';
import {
  INK,
  PALS,
  CERAMIC,
  DARK,
  WOOD,
  METAL,
  box,
  cyl,
  rod,
  shape,
  pd,
  on,
  PX,
  PZ,
  rectUV,
  vis,
  castShadow,
  hullInk,
  toneI,
  tag,
  byDepth,
} from '../../lib/iso/core.js';
import { person } from '../../lib/iso/figures';
import { miniPipelineParts, ROW, Y } from './miniPipeline';
import { beltAt } from './officeScene';
import type { Say } from '../story/steps';

export const EVAL_BOARD: Board = [0, 0, 240, 150];

export interface EvalOpts {
  /** pass (true) or fail per test case, in suite order */
  results: boolean[];
  /** cases graded so far (default all) */
  graded?: number;
  /** the next ungraded case rides the belt into the pipeline */
  riding?: boolean;
  /** the version under test, named on the scoreboard */
  version?: string;
  /** the scoreboard's words, in place of "version · PASSED n/total" (a chapter scoring something else) */
  board?: string;
  /** the step's callout, over one of EVAL_PARTS */
  say?: Say;
  /** pill size; phones pass more */
  scale?: number;
}

/** The parts a step's callout may name: the pipeline's blocks, the test stack, the scoreboard and the two piles. */
export const EVAL_PARTS = ['docs', 'retriever', 'llm', 'tests', 'board', 'pass', 'fail'] as const;

/** What the bench shows. Pure, so the tests can check it without drawing; no division, so an empty suite is all zeros. */
export function evalState({ results, graded = results.length, riding = false }: EvalOpts) {
  const total = results.length,
    done = Math.max(0, Math.min(graded, total)),
    ride = riding && done < total;
  const passed = results.slice(0, done).filter(Boolean).length;
  return { total, graded: done, passed, failed: done - passed, stack: total - done - (ride ? 1 : 0), riding: ride };
}

type Part = { at: number[]; svg: string };
const STACK = [30, 124],
  BELT = { x: 30, y0: 104, y1: 56 },
  DESK = [208, 114],
  PILE = { pass: [200, 104], fail: [200, 124] };
const CARD = { dx: 10, dy: 7, h: 1.3 };
const DESK_TOP = BH + 12; // the grader's desk top, where the piles start
const STRIPE = PALS.cobalt.l,
  PASS = PALS.mint,
  FAIL = PALS.tomato;

/** One test card lying flat: white, a coloured stripe along its top edge, and (graded) a stamp mark in the corner. */
function card(x: number, y: number, z: number, mark?: typeof PASS): string {
  const { dx, dy, h } = CARD,
    top = z + h + 0.05;
  let s =
    box(x - dx, y - dy, z, x + dx, y + dy, z + h, CERAMIC, toneI, 0.6) +
    shape(
      [
        [x - dx + 1.5, y - dy + 1.5, top],
        [x - dx + 4, y - dy + 1.5, top],
        [x - dx + 4, y + dy - 1.5, top],
        [x - dx + 1.5, y + dy - 1.5, top],
      ],
      STRIPE,
      0.4,
    );
  if (mark)
    s += shape(
      [
        [x + 2, y - 4.5, top],
        [x + 8, y - 4.5, top],
        [x + 8, y + 1.5, top],
        [x + 2, y + 1.5, top],
      ],
      mark.m,
      0.6,
    );
  return s;
}
const pile = (x: number, y: number, z0: number, n: number, mark?: typeof PASS) => {
  let s = '';
  for (let i = 0; i < n; i++) s += card(x + (((i * 3) % 5) - 2) * 0.3, y, z0 + i * CARD.h, mark); // a loose, hand-stacked pile
  return s;
};

/** The grader's desk: a wooden desk on legs with a drawer pedestal, the two piles on top, and the hero, a big rubber
 * stamp beside its inked pad. */
function desk(passed: number, failed: number): Part {
  const [x, y] = DESK,
    z1 = DESK_TOP,
    zt = z1 - 2;
  let s = '';
  // legs at the far corners first, then the pedestal of drawers on the near right, the near leg, the top
  for (const [lx, ly] of [
    [x - 18, y - 18],
    [x - 18, y + 18],
    [x + 18, y - 18],
  ])
    s += box(lx - 1.3, ly - 1.3, BH, lx + 1.3, ly + 1.3, zt, WOOD, toneI, 0.8);
  s += box(x + 6, y - 19, BH, x + 19.5, y + 19, zt, WOOD, toneI, 1);
  if (vis([1, 0, 0]))
    for (const k of [0, 1])
      s +=
        shape(on(PX(x + 19.55), rectUV(y - 16, BH + 1.5 + k * 4.5, y + 16, BH + 5 + k * 4.5)), WOOD.l, 0.6) +
        rod([x + 19.6, y - 3, BH + 3.3 + k * 4.5], [x + 20.6, y + 3, BH + 3.3 + k * 4.5], 0.5, METAL);
  s +=
    box(x - 20, y - 20, zt, x + 20, y + 20, z1, WOOD, toneI, 1) +
    hullInk(boxCorners(x - 20, y - 20, BH, x + 20, y + 20, z1), 2.2);
  s += `<g class="pile" data-pile="pass" data-n="${passed}">${pile(PILE.pass[0], PILE.pass[1], z1, passed, PASS)}</g>`;
  s += `<g class="pile" data-pile="fail" data-n="${failed}">${pile(PILE.fail[0], PILE.fail[1], z1, failed, FAIL)}</g>`;
  s += bigStamp(x + 13, y - 8, z1) + inkPad(x + 13, y + 9, z1);
  return { at: [x, y, 0], svg: s };
}

/** The grader's big rubber stamp, standing at (x, y) on height z. Real-object notes: a steel mount over a red rubber
 * die, a turned wooden neck and a large round knob with a red cap. Bigger than any other stamp in Tinker. */
const bigStamp = (x: number, y: number, z: number) =>
  `<g data-prop="stamp">${
    box(x - 5, y - 6, z, x + 5, y + 6, z + 1.4, PALS.tomato, toneI, 0.8) +
    box(x - 4.5, y - 5.5, z + 1.4, x + 4.5, y + 5.5, z + 4.2, METAL, toneI, 0.9) +
    rod([x, y, z + 4.2], [x, y, z + 11.5], 1.8, WOOD, toneI, 0.9, 1.3) +
    cyl(x, y, z + 11, z + 16, 4.4, WOOD, toneI, 1, 16) +
    cyl(x, y, z + 16, z + 18, 3.2, PALS.tomato, toneI, 0.9, 14)
  }</g>`;
/** The inked pad beside it: a shallow tin, its lid open behind, the pad soaked red. */
const inkPad = (x: number, y: number, z: number) =>
  `<g data-prop="ink-pad">${
    box(x - 5, y - 6, z, x + 5, y + 6, z + 1.8, DARK, toneI, 0.8) +
    shape(on(PZ(z + 1.85), rectUV(x - 4, y - 5, x + 4, y + 5)), PALS.tomato.m, 0.5)
  }</g>`;

/** The scoreboard on a stand at the desk's left end, facing the viewer's right: a dark board on two posts with a mint
 * bar for the cases passed and a tomato bar for those failed, each as long as its share of the suite. No numerals. */
function scoreboard(passed: number, failed: number, total: number): Part {
  const x = 181,
    y0 = 98,
    y1 = 130,
    z0 = BH + 16,
    z1 = BH + 34,
    sx = vis([1, 0, 0]) ? 1 : -1,
    F = x + sx * 1.05;
  let s =
    rod([x, y0 + 2, BH], [x, y0 + 2, z0], 0.9, DARK) +
    rod([x, y1 - 2, BH], [x, y1 - 2, z0], 0.9, DARK) +
    box(x - 1, y0, z0, x + 1, y1, z1, WOOD, toneI, 1) +
    shape(on(PX(F), rectUV(y0 + 1.5, z0 + 1.5, y1 - 1.5, z1 - 1.5)), PALS.mint.d, 0.7);
  const len = y1 - y0 - 7,
    bar = (k: number, zz: number, m: string) =>
      k > 0 ? shape(on(PX(F + sx * 0.05), rectUV(y0 + 3.5, zz, y0 + 3.5 + len * k, zz + 4)), m, 0.6) : '';
  if (total) s += bar(passed / total, z1 - 8, PASS.l) + bar(failed / total, z1 - 14.5, FAIL.l);
  return { at: [x, (y0 + y1) / 2, 0], svg: `<g data-prop="scoreboard">${s}</g>` };
}

/** The grader: behind the desk, facing the viewer across it. */
const GRADER = { x: 198, y: 80, facing: 90 };
const GRADER_LOOK = {
  skin: '#e2ab82',
  top: '#5a6f93',
  legs: '#3b4566',
  hair: '#bdb7ab',
  cut: 'bun' as const,
};

/** The card box the tests wait in: a low wooden box with walls round the stack, the near walls over it. */
function cardBox(n: number): string {
  const [x, y] = STACK,
    hx = CARD.dx + 2,
    hy = CARD.dy + 2,
    zw = BH + 7;
  const nx = vis([1, 0, 0]) ? x + hx : x - hx,
    ny = vis([0, 1, 0]) ? y + hy : y - hy;
  const wallX = (X: number) => box(X - 0.8, y - hy, BH + 1, X + 0.8, y + hy, zw, WOOD, toneI, 0.7),
    wallY = (Y: number) => box(x - hx, Y - 0.8, BH + 1, x + hx, Y + 0.8, zw, WOOD, toneI, 0.7);
  return (
    box(x - hx, y - hy, BH, x + hx, y + hy, BH + 1, WOOD, toneI, 1) +
    wallX(2 * x - nx) +
    wallY(2 * y - ny) +
    (n ? `<g class="stack" data-n="${n}">${pile(x, y, BH + 1, n)}</g>` : '') +
    wallX(nx) +
    wallY(ny)
  );
}

/** A rubber stamp on its ink pad, centred at (x, y), standing on height z. */
export const rubberStamp = (x: number, y: number, z: number) =>
  box(x - 4, y - 5, z, x + 4, y + 5, z + 1.5, DARK, toneI, 0.7) +
  box(x - 3, y - 4, z + 1.5, x + 3, y + 4, z + 4, METAL, toneI, 0.8) +
  rod([x, y, z + 4], [x, y, z + 10], 1.2, WOOD) +
  rod([x, y, z + 10], [x, y, z + 12], 2.6, PALS.tomato);

/** The home hero's evals plot: a small stack of graded test cards, a PASS mark on each, with the rubber stamp beside it. */
export const testStack = (x: number, y: number, n = 4) =>
  byDepth([
    { at: [x, y, 0], svg: pile(x, y, BH, n, PASS) },
    { at: [x + 2, y + 15, 0], svg: rubberStamp(x + 2, y + 15, BH) },
  ]);

const pill = (p: number[], dx: number, dy: number, text: string, on: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), on, scale)}</g>`;

/** The bench. Shadows, then the pipeline, then the bench's parts back to front, then every pill on top. */
export const evalScene = (o: EvalOpts) => (ctx: SceneCtx) => {
  const st = evalState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5;
  const sh = (x0: number, y0: number, x1: number, y1: number, h: number) =>
    castShadow(boxCorners(x0, y0, BH, x1, y1, BH + h), BH, ctx.top);
  const grader = person({ ...GRADER, look: GRADER_LOOK, holding: null });
  // every shadow first (the floor layer), then the pipeline, the belt and the wire, then the bench's parts back to front
  let s =
    sh(DESK[0] - 20, DESK[1] - 20, DESK[0] + 20, DESK[1] + 20, 12 + Math.max(st.passed, st.failed) * CARD.h) +
    sh(STACK[0] - CARD.dx - 2, STACK[1] - CARD.dy - 2, STACK[0] + CARD.dx + 2, STACK[1] + CARD.dy + 2, 7) +
    sh(180, 98, 182, 130, 34) +
    grader.shadow;
  // the pipeline's own pills go on last with ours, so no part hides one
  const { art: pipeArt, pills: pipePills } = miniPipelineParts(ctx, scale);
  s += pipeArt;
  // the roller belt from the card box into the docs, and the lit wire from the model down to the grader
  const z = BH + 0.25,
    { x, y0, y1 } = BELT;
  s += beltAt([x, y0], [x, y1], [1, 0], false);
  const wire = pd(
    [
      [210, 51, BH + 0.3],
      [210, DESK[1] - 20, BH + 0.3],
    ],
    false,
  );
  s += `<path d="${wire}" fill="none" stroke="${INK}" stroke-width="4.2" stroke-linecap="round"/><path d="${wire}" fill="none" stroke="${ACC}" stroke-width="2.2" stroke-linecap="round"/>`;
  const parts: { at?: number[]; box?: number[][]; svg: string }[] = [
    desk(st.passed, st.failed),
    scoreboard(st.passed, st.failed, st.total),
    { at: [STACK[0], STACK[1], 0], svg: cardBox(st.stack) },
    ...grader.items,
  ];
  if (st.riding) parts.push({ at: [x, 80, 0], svg: `<g class="riding">${card(x, 80, z + 1)}</g>` });
  s += byDepth(parts);
  // phones: the big pill goes on the empty board in front of the stack, clear of the retriever
  const boardAt = narrow ? [DESK[0] - 20, DESK[1] + 20, BH + 6] : [DESK[0] - 20, DESK[1], BH + 26],
    stackAt = [STACK[0] + CARD.dx, STACK[1], BH + st.stack * CARD.h],
    failAt = [PILE.fail[0] + CARD.dx, PILE.fail[1], DESK_TOP + st.failed * CARD.h],
    passAt = [PILE.pass[0] + CARD.dx, PILE.pass[1] - CARD.dy, DESK_TOP + st.passed * CARD.h];
  const pills = [
    pill(
      boardAt,
      narrow ? -46 : 0,
      narrow ? 26 : -30,
      o.board ?? `${o.version ? `${o.version} · ` : ''}PASSED ${st.passed}/${st.total}`,
      false,
      scale,
    ),
  ];
  if (!narrow) {
    pills.push(pill(stackAt, 4, 26, `TESTS ${st.stack}`, false, scale));
    pills.push(pill(failAt, 8, 22, `FAIL ${st.failed}`, false, scale));
    pills.push(pill(passAt, 34, 2, `PASS ${st.passed}`, false, scale));
  }
  // the callout stands over its part (a pill's dx is left out; on phones the three small pills aren't drawn)
  const callouts =
    sayAt(o.say, 'board', boardAt, narrow ? 26 : -30, scale) +
    sayAt(o.say, 'tests', stackAt, 26, scale) +
    sayAt(o.say, 'fail', failAt, 22, scale) +
    sayAt(o.say, 'pass', passAt, 2, scale) +
    ROW.map(([t, x]) => (o.say && sayFits(o.say, t, scale > 1) ? calloutTag(t, x, Y, o.say.text, scale) : '')).join('');
  return s + pipePills + pills.join('') + callouts;
};

/** The picture in words, for its aria-label. */
export function evalLabel(o: EvalOpts): string {
  const st = evalState(o);
  if (!st.total)
    return 'A test bench beside a RAG pipeline (documents, retriever, model): no test cards yet, and nothing graded.';
  return (
    `A test bench beside a RAG pipeline (documents, retriever, model). ${st.stack} test card${st.stack === 1 ? '' : 's'} wait in a stack${st.riding ? '; one rides the belt into the pipeline' : ''}. ` +
    `At the grader's desk, ${st.passed} passed and ${st.failed} failed. ${o.board ? `Scoreboard: ${o.board}.` : `Scoreboard${o.version ? ` for ${o.version}` : ''}: ${st.passed} of ${st.total} passed.`}`
  );
}
