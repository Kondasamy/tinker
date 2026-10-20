// Module 4's picture: a test bench (KTD11). RAG's mini pipeline (composed, not forked) stands at the back; a stack of
// test cards waits at the front left and the current card rides a belt into the pipeline; the model's answers go down a
// wire to a grader's desk at the front right, where graded cards pile up in a PASS pile and a FAIL pile, each stamped.
// A scoreboard pill reads passed / total. Words only in pills; on phones (scale > 1.5) the caption carries the piles.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { ACC, BH, boxCorners, esc } from '../../lib/iso/blocks';
import { INK, PALS, CERAMIC, DARK, WOOD, METAL, box, rod, shape, line, pd, castShadow, hullInk, toneI, tag, byDepth } from '../../lib/iso/core.js';
import { miniPipeline } from './miniPipeline';

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
  /** pill size; phones pass more */
  scale?: number;
}

/** What the bench shows. Pure, so the tests can check it without drawing; no division, so an empty suite is all zeros. */
export function evalState({ results, graded = results.length, riding = false }: EvalOpts) {
  const total = results.length, done = Math.max(0, Math.min(graded, total)), ride = riding && done < total;
  const passed = results.slice(0, done).filter(Boolean).length;
  return { total, graded: done, passed, failed: done - passed, stack: total - done - (ride ? 1 : 0), riding: ride };
}

type Part = { at: number[]; svg: string };
const STACK = [30, 124], BELT = { x: 30, y0: 104, y1: 56 }, DESK = [208, 114], PILE = { pass: [200, 104], fail: [200, 124] };
const CARD = { dx: 10, dy: 7, h: 1.3 };
const STRIPE = PALS.cobalt.l, PASS = PALS.mint, FAIL = PALS.tomato;

/** One test card lying flat: white, a coloured stripe along its top edge, and (graded) a stamp mark in the corner. */
function card(x: number, y: number, z: number, mark?: typeof PASS): string {
  const { dx, dy, h } = CARD, top = z + h + .05;
  let s = box(x - dx, y - dy, z, x + dx, y + dy, z + h, CERAMIC, toneI, .6)
    + shape([[x - dx + 1.5, y - dy + 1.5, top], [x - dx + 4, y - dy + 1.5, top], [x - dx + 4, y + dy - 1.5, top], [x - dx + 1.5, y + dy - 1.5, top]], STRIPE, .4);
  if (mark) s += shape([[x + 2, y - 4.5, top], [x + 8, y - 4.5, top], [x + 8, y + 1.5, top], [x + 2, y + 1.5, top]], mark.m, .6);
  return s;
}
const pile = (x: number, y: number, z0: number, n: number, mark?: typeof PASS) => {
  let s = '';
  for (let i = 0; i < n; i++) s += card(x + ((i * 3) % 5 - 2) * .3, y, z0 + i * CARD.h, mark);   // a loose, hand-stacked pile
  return s;
};

/** The grader's desk: a wooden desk with a rubber stamp standing on it, the two piles on top. */
function desk(passed: number, failed: number): Part {
  const [x, y] = DESK, z1 = BH + 12;
  let s = box(x - 20, y - 20, BH, x + 20, y + 20, z1, WOOD, toneI, 1) + hullInk(boxCorners(x - 20, y - 20, BH, x + 20, y + 20, z1), 2.2);
  s += `<g class="pile" data-pile="pass" data-n="${passed}">${pile(PILE.pass[0], PILE.pass[1], z1, passed, PASS)}</g>`;
  s += `<g class="pile" data-pile="fail" data-n="${failed}">${pile(PILE.fail[0], PILE.fail[1], z1, failed, FAIL)}</g>`;
  // the rubber stamp: an ink pad and a stamp on a knob handle, at the desk's front corner
  s += box(x + 10, y - 6, z1, x + 18, y + 4, z1 + 1.5, DARK, toneI, .7)
    + box(x + 11, y - 5, z1 + 1.5, x + 17, y + 3, z1 + 4, METAL, toneI, .8) + rod([x + 14, y - 1, z1 + 4], [x + 14, y - 1, z1 + 10], 1.2, WOOD) + rod([x + 14, y - 1, z1 + 10], [x + 14, y - 1, z1 + 12], 2.6, PALS.tomato);
  return { at: [x, y, 0], svg: s };
}

const pill = (p: number[], dx: number, dy: number, text: string, on: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), on, scale)}</g>`;

/** The bench. Shadows, then the pipeline, then the bench's parts back to front, then every pill on top. */
export const evalScene = (o: EvalOpts) => (ctx: SceneCtx) => {
  const st = evalState(o), scale = o.scale ?? 1, narrow = scale > 1.5;
  const sh = (x0: number, y0: number, x1: number, y1: number, h: number) => castShadow(boxCorners(x0, y0, BH, x1, y1, BH + h), BH, ctx.top);
  let s = sh(DESK[0] - 20, DESK[1] - 20, DESK[0] + 20, DESK[1] + 20, 12 + Math.max(st.passed, st.failed) * CARD.h);
  if (st.stack) s += sh(STACK[0] - CARD.dx, STACK[1] - CARD.dy, STACK[0] + CARD.dx, STACK[1] + CARD.dy, st.stack * CARD.h);
  // the pipeline's own pills go on last with ours, so no part hides one
  const pipe = miniPipeline(ctx, scale), cut = pipe.indexOf('<g class="block-tag"'), pipeArt = cut < 0 ? pipe : pipe.slice(0, cut), pipePills = cut < 0 ? '' : pipe.slice(cut);
  s += pipeArt;
  // the belt from the stack into the docs, and the lit wire from the model down to the grader
  const z = BH + .25, { x, y0, y1 } = BELT, w = 7;
  s += shape([[x - w, y0, z], [x + w, y0, z], [x + w, y1, z], [x - w, y1, z]], DARK.m, 1.2);
  for (let k = y1 + 5; k < y0 - 2; k += 7) s += line([[x - w + 1.5, k, z + .05], [x + w - 1.5, k, z + .05]], .6).replace(INK, DARK.l);
  const wire = pd([[210, 51, BH + .3], [210, DESK[1] - 20, BH + .3]], false);
  s += `<path d="${wire}" fill="none" stroke="${INK}" stroke-width="4.2" stroke-linecap="round"/><path d="${wire}" fill="none" stroke="${ACC}" stroke-width="2.2" stroke-linecap="round"/>`;
  const parts: Part[] = [desk(st.passed, st.failed)];
  if (st.stack) parts.push({ at: [STACK[0], STACK[1], 0], svg: `<g class="stack" data-n="${st.stack}">${pile(STACK[0], STACK[1], BH, st.stack)}</g>` });
  if (st.riding) parts.push({ at: [x, 80, 0], svg: `<g class="riding">${card(x, 80, z + .1)}</g>` });
  s += byDepth(parts);
  // phones: the big pill goes on the empty board in front of the stack, clear of the retriever
  const pills = [pill(narrow ? [DESK[0] - 20, DESK[1] + 20, BH + 6] : [DESK[0] - 20, DESK[1], BH + 26], narrow ? -46 : 0, narrow ? 26 : -30, `${o.version ? `${o.version} · ` : ''}PASSED ${st.passed}/${st.total}`, false, scale)];
  if (!narrow) {
    pills.push(pill([STACK[0] + CARD.dx, STACK[1], BH + st.stack * CARD.h], 4, 26, `TESTS ${st.stack}`, false, scale));
    pills.push(pill([PILE.fail[0] + CARD.dx, PILE.fail[1], BH + 12 + st.failed * CARD.h], 8, 22, `FAIL ${st.failed}`, false, scale));
    pills.push(pill([PILE.pass[0] + CARD.dx, PILE.pass[1] - CARD.dy, BH + 12 + st.passed * CARD.h], 34, 2, `PASS ${st.passed}`, false, scale));
  }
  return s + pipePills + pills.join('');
};

/** The picture in words, for its aria-label. */
export function evalLabel(o: EvalOpts): string {
  const st = evalState(o);
  if (!st.total) return 'A test bench beside a RAG pipeline (documents, retriever, model): no test cards yet, and nothing graded.';
  return `A test bench beside a RAG pipeline (documents, retriever, model). ${st.stack} test card${st.stack === 1 ? '' : 's'} wait in a stack${st.riding ? '; one rides the belt into the pipeline' : ''}. `
    + `At the grader's desk, ${st.passed} passed and ${st.failed} failed. Scoreboard${o.version ? ` for ${o.version}` : ''}: ${st.passed} of ${st.total} passed.`;
}
