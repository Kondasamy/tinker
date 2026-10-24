// Module 18's picture: the foundry (KTD15). Crates of corpus documents at the back feed a furnace (the training run)
// along a belt; the model stands beside it and grows as training goes on; along the front a shelf holds a slot per
// checkpoint, the saved ones filled and the current one lit. The crates show the data mix: all the documents, half of
// them, one document copied ten times (a tomato crate), or the test questions mixed in (a blush crate). Words only in
// pills; on phones (scale > 1.5) only the lit checkpoint keeps its pill.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { ACC, BH, boxCorners, esc, sayAt, calloutsLast } from '../../lib/iso/blocks';
import {
  INK,
  PALS,
  CERAMIC,
  DARK,
  METAL,
  WOOD,
  box,
  cyl,
  pd,
  on,
  PX,
  PZ,
  rrUV,
  castShadow,
  hullInk,
  toneI,
  tag,
  byDepth,
} from '../../lib/iso/core.js';
import type { RunId } from '../../lib/pre-training/engine';
import type { Say } from '../story/steps';

export const FORGE_BOARD: Board = [0, 0, 150, 124];

export interface ForgeOpts {
  /** the checkpoint steps on the shelf, in order */
  steps: number[];
  /** the checkpoint shown (lit on the shelf); null: none saved yet */
  step: number | null;
  /** the data mix in the crates (default all the documents) */
  mix?: RunId;
  /** the furnace is lit: training is running (default: once a step past 0 is shown) */
  burning?: boolean;
  /** pill size; phones pass more */
  scale?: number;
  /** the step's callout: a lit pill over one of FORGE_PARTS */
  say?: Say;
}

/** The parts a step's callout may point at: the ones with a name pill. */
export const FORGE_PARTS = ['crates', 'furnace', 'model', 'shelf'] as const;

const MIX_NAME: Record<RunId, string> = {
  clean: 'ALL DOCUMENTS',
  duplicated: 'ONE DOC ×10',
  leaked: 'TEST QS MIXED IN',
  half: 'HALF THE DOCS',
};
const MIX_WORDS: Record<RunId, string> = {
  clean: 'all of Larkspur’s documents',
  duplicated: 'the documents, one of them copied ten times',
  leaked: 'the documents with the test questions mixed in',
  half: 'half of Larkspur’s documents',
};

/** What the foundry shows. Pure, so the tests can check it without drawing. */
export function forgeState({ steps, step, mix = 'clean', burning }: ForgeOpts) {
  const at = step === null ? -1 : steps.indexOf(step);
  return {
    mix,
    crates: mix === 'half' ? 2 : 4,
    odd: mix === 'duplicated' ? ('copies' as const) : mix === 'leaked' ? ('tests' as const) : null,
    burning: burning ?? (step !== null && step > 0),
    /** 0 before training, 1 at the last checkpoint: the model's growth */
    grown: at < 0 ? 0 : at / Math.max(1, steps.length - 1),
    slots: steps.map((s, i) => ({ step: s, saved: i <= at, lit: i === at })),
    lit: at < 0 ? null : steps[at],
  };
}

type Part = { at: number[]; svg: string };
const CRATES_X = 26,
  CRATE_Y = [16, 42, 68, 94],
  FURNACE = [74, 50],
  MODEL = [120, 40],
  SHELF_Y = 112,
  SHELF_X0 = 44,
  SHELF_X1 = 146;
const F = 18, // furnace half-width and height
  FH = 38,
  M = 17, // model half-width, and its height before and after training
  MH0 = 12,
  MH = 28;

/** One crate of documents: a wooden box with paper sheets standing up out of it, or a coloured crate for the odd one. */
function crate(y: number, odd: 'copies' | 'tests' | null): string {
  const x = CRATES_X,
    m = odd === 'copies' ? PALS.tomato : odd === 'tests' ? PALS.blush : WOOD;
  let s = box(x - 12, y - 11, BH, x + 12, y + 11, BH + 12, m, toneI, 1);
  for (let i = 0; i < 3; i++)
    s += box(x - 8 + i * 6, y - 8, BH + 10, x - 5.5 + i * 6, y + 8, BH + 17 - (i % 2) * 2, CERAMIC, toneI, 0.6);
  return s + hullInk(boxCorners(x - 12, y - 11, BH, x + 12, y + 11, BH + 17), 1.6);
}

/** The furnace: a dark block with a mouth facing the shelf, glowing while training runs, and a chimney. */
function furnace(burning: boolean): Part {
  const [x, y] = FURNACE,
    z1 = BH + FH;
  let s = box(x - F, y - F, BH, x + F, y + F, z1, DARK, toneI, 1);
  const mouth = on(PX(x + F + 0.15), rrUV(y - 9, BH + 6, y + 9, BH + 21, 3));
  s += `<path d="${pd(mouth)}" fill="${burning ? PALS.mustard.l : DARK.d}" stroke="${INK}" stroke-width="1.2"/>`;
  if (burning)
    s += `<path d="${pd(on(PX(x + F + 0.2), rrUV(y - 5, BH + 7, y + 5, BH + 13, 2)))}" fill="${PALS.tomato.m}"/>`;
  s += cyl(x - 6, y - 6, z1, z1 + 12, 5, METAL, toneI, 1);
  s += hullInk(boxCorners(x - F, y - F, BH, x + F, y + F, z1), 1.8);
  return { at: [x, y, 0], svg: `<g class="furnace" data-burning="${burning ? 1 : 0}">${s}</g>` };
}

/** The model: a blush block that grows taller as training goes on. */
function model(grown: number): Part {
  const [x, y] = MODEL,
    z1 = BH + MH0 + MH * grown;
  const s =
    box(x - M, y - M, BH, x + M, y + M, z1, PALS.blush, toneI, 1) +
    `<path d="${pd(on(PX(x + M + 0.15), rrUV(y - 10, z1 - 10, y + 10, z1 - 3, 1.5)))}" fill="${grown >= 1 ? PALS.mint.l : CERAMIC.l}" stroke="${INK}" stroke-width=".8"/>` +
    hullInk(boxCorners(x - M, y - M, BH, x + M, y + M, z1), 1.8);
  return { at: [x, y, 0], svg: `<g class="model" data-grown="${grown.toFixed(2)}">${s}</g>` };
}

/** The checkpoint shelf: a long plank with a slot per checkpoint; saved ones hold a small block, the current one lit. */
function shelf(slots: ReturnType<typeof forgeState>['slots']): Part {
  const y = SHELF_Y,
    w = (SHELF_X1 - SHELF_X0) / slots.length;
  let s =
    box(SHELF_X0, y - 7, BH, SHELF_X1, y + 7, BH + 4, WOOD, toneI, 1) +
    hullInk(boxCorners(SHELF_X0, y - 7, BH, SHELF_X1, y + 7, BH + 4), 1.6);
  slots.forEach((sl, i) => {
    const cx = SHELF_X0 + w * (i + 0.5),
      z = BH + 4;
    if (sl.lit)
      s += `<path d="${pd(on(PZ(z + 0.2), rrUV(cx - w / 2 + 1, y - 6.5, cx + w / 2 - 1, y + 6.5, 2)))}" fill="none" stroke="${ACC}" stroke-width="2.4"/>`;
    s += sl.saved
      ? `<g class="slot" data-step="${sl.step}" data-lit="${sl.lit ? 1 : 0}">${box(cx - 4.5, y - 5, z, cx + 4.5, y + 5, z + 9, sl.lit ? PALS.mustard : PALS.cobalt, toneI, 0.9)}</g>`
      : `<g class="slot" data-step="${sl.step}" data-lit="0"><path d="${pd(on(PZ(z + 0.1), rrUV(cx - 4, y - 4, cx + 4, y + 4, 1)))}" fill="${WOOD.d}"/></g>`;
  });
  return { at: [(SHELF_X0 + SHELF_X1) / 2, y, 0], svg: `<g class="shelf">${s}</g>` };
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;

/** The foundry. Shadows, the belt and the wire (floor), then the parts back to front, then every pill on top. */
export const forgeScene = (o: ForgeOpts) => (ctx: SceneCtx) => {
  const st = forgeState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5;
  const sh = (x0: number, y0: number, x1: number, y1: number, h: number) =>
    castShadow(boxCorners(x0, y0, BH, x1, y1, BH + h), BH, ctx.top);
  const ys = CRATE_Y.slice(0, st.crates);
  let s = ys.map(y => sh(CRATES_X - 12, y - 11, CRATES_X + 12, y + 11, 17)).join('');
  s += sh(FURNACE[0] - F, FURNACE[1] - F, FURNACE[0] + F, FURNACE[1] + F, FH);
  s += sh(MODEL[0] - M, MODEL[1] - M, MODEL[0] + M, MODEL[1] + M, MH0 + MH * st.grown);
  // the belt from the crates into the furnace, the wire from the furnace to the model: lit while training runs
  for (const [a, b] of [
    [
      [CRATES_X + 12, FURNACE[1], BH + 0.3],
      [FURNACE[0] - F, FURNACE[1], BH + 0.3],
    ],
    [
      [FURNACE[0] + F, MODEL[1], BH + 0.3],
      [MODEL[0] - M, MODEL[1], BH + 0.3],
    ],
  ]) {
    const d = pd([a, b], false);
    s +=
      `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${st.burning ? 5 : 3.6}" stroke-linecap="round"/>` +
      `<path d="${d}" fill="none" stroke="${st.burning ? ACC : DARK.l}" stroke-width="${st.burning ? 2.8 : 1.6}" stroke-linecap="round"/>`;
  }
  const parts: Part[] = ys.map((y, i) => ({
    at: [CRATES_X, y, 0],
    svg: `<g class="crate">${crate(y, i === 1 ? st.odd : null)}</g>`,
  }));
  parts.push(furnace(st.burning), model(st.grown), shelf(st.slots));
  s += byDepth(parts);
  const crateAt = [CRATES_X, ys[0], BH + 17],
    furnaceAt = [FURNACE[0], FURNACE[1], BH + FH + 12],
    modelAt = [MODEL[0], MODEL[1], BH + MH0 + MH * st.grown],
    w = (SHELF_X1 - SHELF_X0) / st.slots.length,
    litI = st.slots.findIndex(x => x.lit),
    slotAt = [SHELF_X0 + w * ((litI < 0 ? st.slots.length - 1 : litI) + 0.5), SHELF_Y, BH + 13];
  const pills = [
    sayAt(o.say, 'crates', crateAt, -14, scale),
    sayAt(o.say, 'furnace', furnaceAt, -14, scale),
    sayAt(o.say, 'model', modelAt, -14, scale),
    sayAt(o.say, 'shelf', slotAt, -12, scale),
  ];
  if (!narrow)
    pills.push(
      pill(crateAt, 0, -14, MIX_NAME[st.mix], st.odd !== null, scale),
      pill(furnaceAt, 0, -14, st.burning ? 'TRAINING' : 'COLD', st.burning, scale),
      pill(modelAt, 0, -14, 'LARKSPUR MINI', false, scale),
    );
  if (st.lit !== null) pills.push(pill(slotAt, 0, -12, `STEP ${st.lit}`, true, scale));
  else if (!narrow) pills.push(pill(slotAt, 0, -12, 'NO CHECKPOINT', false, scale));
  return s + calloutsLast(pills);
};

/** The home hero's plot (heroScene): a small foundry at (x, y). A crate of papers, a squat furnace with its mouth
 * glowing, and a short shelf of three checkpoint blocks in front, the last one lit. Squat, so the pill rows stay clear. */
export function forgePlot(x: number, y: number, top: SceneCtx['top']): string {
  const c = [x - 18, y - 14, x - 6, y - 2],
    f = [x - 2, y - 12, x + 14, y + 4];
  const cr =
    box(c[0], c[1], BH, c[2], c[3], BH + 7, WOOD, toneI, 1) +
    box(c[0] + 3, c[1] + 3, BH + 6, c[0] + 5, c[3] - 3, BH + 10, CERAMIC, toneI, 0.6) +
    box(c[0] + 7, c[1] + 3, BH + 6, c[0] + 9, c[3] - 3, BH + 9, CERAMIC, toneI, 0.6) +
    hullInk(boxCorners(c[0], c[1], BH, c[2], c[3], BH + 10), 1.4);
  const fu =
    box(f[0], f[1], BH, f[2], f[3], BH + 14, DARK, toneI, 1) +
    `<path d="${pd(on(PX(f[2] + 0.15), rrUV(f[1] + 4, BH + 3, f[3] - 4, BH + 9, 2)))}" fill="${PALS.mustard.l}" stroke="${INK}" stroke-width="1"/>` +
    hullInk(boxCorners(f[0], f[1], BH, f[2], f[3], BH + 14), 1.6);
  let sh = box(x - 10, y + 10, BH, x + 20, y + 16, BH + 2, WOOD, toneI, 0.9);
  for (let i = 0; i < 3; i++)
    sh += box(
      x - 7 + i * 10,
      y + 11,
      BH + 2,
      x - 3 + i * 10,
      y + 15,
      BH + 6,
      i === 2 ? PALS.mustard : PALS.cobalt,
      toneI,
      0.8,
    );
  sh += hullInk(boxCorners(x - 10, y + 10, BH, x + 20, y + 16, BH + 6), 1.4);
  return (
    castShadow(boxCorners(c[0], c[1], BH, c[2], c[3], BH + 10), BH, top) +
    castShadow(boxCorners(f[0], f[1], BH, f[2], f[3], BH + 14), BH, top) +
    byDepth([
      { at: [x - 12, y - 8, 0], svg: cr },
      { at: [x + 6, y - 4, 0], svg: fu },
      { at: [x + 5, y + 13, 0], svg: sh },
    ])
  );
}

/** The picture in words, for its aria-label. */
export function forgeLabel(o: ForgeOpts): string {
  const st = forgeState(o);
  return (
    `A foundry: crates holding ${MIX_WORDS[st.mix]} feed a furnace, ${st.burning ? 'lit: training is running' : 'cold: training has not started'}. ` +
    `Beside it stands the model, and in front a shelf of ${st.slots.length} checkpoint slots, ` +
    (st.lit === null ? 'none saved yet.' : `the checkpoint at step ${st.lit} lit.`)
  );
}
