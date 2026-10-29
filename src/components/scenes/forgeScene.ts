// Module 18's picture: the foundry (KTD15). Crates of corpus documents at the back feed a furnace (the training run)
// along a belt; the model stands beside it and grows as training goes on; along the front a shelf holds a slot per
// checkpoint, the saved ones filled and the current one lit. The crates show the data mix: all the documents, half of
// them, one document copied ten times (a tomato crate), or the test questions mixed in (a blush crate). Words only in
// pills; on phones (scale > 1.5) only the lit checkpoint keeps its pill.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { ACC, BH, HALF, boxCorners, esc, sayAt, calloutsLast } from '../../lib/iso/blocks';
import { SKIN, hexa, mini, modelMachine, person, shaded, tight, type Look, drawPieces } from '../../lib/iso/figures';
import { crate as slatted } from './crateScene';
import { beltAt } from './officeScene';
import {
  INK,
  PALS,
  CERAMIC,
  DARK,
  METAL,
  WOOD,
  box,
  pd,
  on,
  PX,
  PZ,
  rrUV,
  ellUV,
  castShadow,
  hullInk,
  toneI,
  tag,
  byDepth,
  loft,
  fill,
  line,
  shape,
  rod,
  vis,
  matOf,
  clipTo,
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

type Item = { box: number[][]; svg: string };
const span = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => [
  [x0, y0, z0],
  [x1, y1, z1],
];
const CRATES_X = 26,
  CRATE_Y = [16, 42, 68, 94],
  FURNACE = [74, 50],
  MODEL = [120, 40],
  SHELF_Y = 112,
  SHELF_X0 = 44,
  SHELF_X1 = 146,
  STOKER = [96, 82];
const F = 18, // furnace half-width; FH + 12: the chimney's top
  FH = 38,
  M = 17, // model half-width, and its height before and after training
  MH0 = 12,
  MH = 28;
const BRICK = matOf('#b8603f'),
  SOOT = matOf('#5b5650');

/** One crate of documents: a slatted crate with paper sheets standing up out of its lid; coloured for the odd one. */
function crate(y: number, odd: 'copies' | 'tests' | null): Item {
  const x = CRATES_X,
    pal = odd === 'copies' ? PALS.tomato : odd === 'tests' ? PALS.blush : undefined;
  let s = slatted(x, y, undefined, BH, 11, 12, pal);
  for (let i = 0; i < 3; i++)
    s += box(x - 7 + i * 5, y - 7, BH + 12, x - 5 + i * 5, y + 7, BH + 17 - (i % 2) * 2, CERAMIC, toneI, 0.6);
  return { box: span(x - 11.5, y - 11.5, BH, x + 11.5, y + 11.5, BH + 17), svg: `<g class="crate">${s}</g>` };
}

/** Points round a horizontal circle at height z, radius r, over the angles a0..a1 (degrees). */
const arc = (x: number, y: number, z: number, r: number, a0 = 0, a1 = 360, n = 18) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return [x + r * Math.cos(t), y + r * Math.sin(t), z];
  });

/** The furnace: a domed brick kiln. Real-object notes: a round brick drum with mortar courses; a dome of the same
 * brick on top; a square brick chimney rising from the back of the dome with a sooty cap; a brick porch on the front
 * (toward the shelf) with an arched fire mouth, glowing with embers while training runs, black and cold before. */
function furnace(burning: boolean): Item[] {
  const [x, y] = FURNACE,
    R = 15.5,
    zd = BH + 20,
    DH = 11;
  const cx = x - 8,
    cy = y - 8,
    zc = BH + FH + 12;
  const chim =
    box(cx - 3.5, cy - 3.5, zd, cx + 3.5, cy + 3.5, zc - 2, BRICK, toneI, 1) +
    box(cx - 4.5, cy - 4.5, zc - 2, cx + 4.5, cy + 4.5, zc, SOOT, toneI, 1) +
    hullInk(boxCorners(cx - 4.5, cy - 4.5, zd, cx + 4.5, cy + 4.5, zc), 1.8);
  // the drum and the dome as one solid of rings
  const rings = [arc(x, y, BH, R), arc(x, y, zd, R)];
  for (let i = 1; i <= 6; i++) {
    const L = (i / 6) * (Math.PI / 2) * 0.92;
    rings.push(arc(x, y, zd + DH * Math.sin(L), R * Math.cos(L)));
  }
  let k = '';
  for (let i = 0; i + 1 < rings.length; i++) k += loft(rings[i], rings[i + 1], (n: number[]) => toneI(n, BRICK));
  k += fill(pd(rings[rings.length - 1]), toneI([0, 0, 1], BRICK));
  // mortar courses on the drum and dome, only on the half that faces the viewer
  // one stroke over the arc of the ring that faces the viewer: the ring rotated so its first point is the leftmost seen
  const course = (pts: number[][]) => {
    const seen = pts.slice(0, -1).map(q => vis([q[0] - x, q[1] - y, 0])),
      i0 = seen.findIndex((v, i) => v && !seen[(i + seen.length - 1) % seen.length]),
      run: number[][] = [];
    for (let j = 0; j <= seen.length && i0 >= 0; j++) {
      const i = (i0 + j) % seen.length;
      run.push(pts[i]);
      if (!seen[i]) break;
    }
    return run.length > 1 ? line(run, 0.45) : '';
  };
  for (let zz = BH + 4; zz < zd; zz += 4) k += course(arc(x, y, zz, R + 0.05, 0, 360, 24));
  for (const i of [2, 4]) k += course(rings[i + 1]);
  k += hullInk(rings.flat(), 2.2);
  // the porch and its arched mouth on the front (+x) face
  const px0 = x + R - 4,
    px1 = x + F,
    pz = BH + 17;
  let porch =
    box(px0, y - 8, BH, px1, y + 8, pz, BRICK, toneI, 1) +
    box(px0 - 1, y - 9, pz, px1 + 0.6, y + 9, pz + 2, SOOT, toneI, 0.9);
  if (vis([1, 0, 0])) {
    porch += shape(
      on(PX(px1 + 0.15), rrUV(y - 5.5, BH + 1, y + 5.5, BH + 14, 5.4, 8)),
      burning ? PALS.mustard.l : DARK.d,
      1.2,
    );
    if (burning)
      porch +=
        fill(pd(on(PX(px1 + 0.2), rrUV(y - 4, BH + 1, y + 4, BH + 8, 3.6, 6))), PALS.tomato.m) +
        fill(pd(on(PX(px1 + 0.25), rrUV(y - 2, BH + 1, y + 2, BH + 4.5, 1.8, 4))), PALS.tomato.d);
  }
  porch += hullInk(boxCorners(px0 - 1, y - 9, BH, px1 + 0.6, y + 9, pz + 2), 1.6);
  const g = (svg: string) => `<g class="furnace" data-burning="${burning ? 1 : 0}">${tight(svg)}</g>`;
  return [
    // the chimney stands behind the dome: drawn first in the same item so the dome hides its foot
    { box: span(x - R, y - R, BH, x + R - 4, y + R, BH + FH + 12), svg: g(chim + k) },
    { box: span(px0 + 4, y - 9, BH, px1 + 0.6, y + 9, pz + 2), svg: g(porch) },
  ];
}

/** The stoker: a sooty worker in a cap, facing the kiln's mouth with a coal shovel held out in both hands. */
const STOKER_LOOK: Look = {
  skin: SKIN[3],
  top: '#7d8590',
  legs: '#4a4642',
  hair: '#2b231c',
  cut: 'short',
  hat: 'cap',
  hatCol: '#5b5650',
};
function stoker(burning: boolean): { shadow: string; item: Item } {
  const [x, y] = STOKER,
    t = Math.atan2(FURNACE[1] - y, FURNACE[0] + F + 4 - x),
    p = person({ x, y, facing: (t * 180) / Math.PI, pose: 'carry', look: STOKER_LOOK, holding: null });
  const at = (a: number, b: number, c: number) => [
    x + Math.cos(t) * a - Math.sin(t) * b,
    y + Math.sin(t) * a + Math.cos(t) * b,
    BH + c,
  ];
  // the shovel: a wooden shaft through both hands down to a steel blade near the floor, coal on it while it burns
  let sv = rod(at(-1, 0, 21), at(12, 0, 4.4), 0.7, WOOD, toneI, 0.9);
  sv += shape([at(11, -2.8, 4.6), at(16.5, -2.8, 2.2), at(16.5, 2.8, 2.2), at(11, 2.8, 4.6)], METAL.m, 0.9);
  if (burning)
    for (const b of [-1.2, 0, 1.2]) {
      const c = at(14, b, 3.6);
      sv += shape(on(PZ(c[2]), ellUV(c[0], c[1], 1, 1, 6)), DARK.d, 0.5);
    }
  const pb = p.items[0].box,
    b = span(Math.min(pb[0][0], x - 17), Math.min(pb[0][1], y - 17), BH, pb[1][0], pb[1][1], pb[1][2]);
  return { shadow: p.shadow, item: { box: b, svg: `<g class="stoker">${sv}${p.items[0].svg}</g>` } };
}

/** The model: the model machine, growing taller as training goes on; its screen reads OK once fully trained. */
function model(grown: number) {
  const [x, y] = MODEL,
    m = modelMachine(x, y, M / HALF, grown >= 1 ? 'ok' : undefined, MH0 + MH * grown);
  return {
    shadow: m.shadow,
    item: { box: m.items[0].box, svg: `<g data-grown="${grown.toFixed(2)}">${m.items[0].svg}</g>` },
  };
}

/** The checkpoint shelf: a long plank on two trestles with a slot per checkpoint; each saved checkpoint is a cast
 * ingot (a block with sloped sides), the current one gold and ringed. */
function shelf(slots: ReturnType<typeof forgeState>['slots']): Item {
  const y = SHELF_Y,
    w = (SHELF_X1 - SHELF_X0) / slots.length,
    z = BH + 4;
  let s = '';
  for (const lx of [SHELF_X0 + 4, SHELF_X1 - 4])
    s += box(lx - 1.5, y - 6, BH, lx + 1.5, y + 6, z - 1.2, WOOD, toneI, 0.8);
  s +=
    box(SHELF_X0, y - 7, z - 1.2, SHELF_X1, y + 7, z, WOOD, toneI, 1) +
    hullInk(boxCorners(SHELF_X0, y - 7, BH, SHELF_X1, y + 7, z), 1.6);
  slots.forEach((sl, i) => {
    const cx = SHELF_X0 + w * (i + 0.5);
    if (sl.lit)
      s += `<path d="${pd(on(PZ(z + 0.2), rrUV(cx - w / 2 + 1, y - 6.5, cx + w / 2 - 1, y + 6.5, 2)))}" fill="none" stroke="${ACC}" stroke-width="2.4"/>`;
    const ingot = hexa(
      [
        [cx - 4.8, y - 5, z],
        [cx + 4.8, y - 5, z],
        [cx + 4.8, y + 5, z],
        [cx - 4.8, y + 5, z],
        [cx - 3.4, y - 3.6, z + 6],
        [cx + 3.4, y - 3.6, z + 6],
        [cx + 3.4, y + 3.6, z + 6],
        [cx - 3.4, y + 3.6, z + 6],
      ],
      sl.lit ? PALS.mustard : PALS.cobalt,
      1,
    );
    s += sl.saved
      ? `<g class="slot" data-step="${sl.step}" data-lit="${sl.lit ? 1 : 0}">${ingot}</g>`
      : `<g class="slot" data-step="${sl.step}" data-lit="0"><path d="${pd(on(PZ(z + 0.1), rrUV(cx - 4, y - 4, cx + 4, y + 4, 1)))}" fill="${WOOD.d}"/></g>`;
  });
  return { box: span(SHELF_X0, y - 7, BH, SHELF_X1, y + 7, z + 6), svg: `<g class="shelf">${s}</g>` };
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;

/** The foundry. Every shadow and the wire (floor), then one depth sort over every part, then every pill on top. */
export const forgeScene = (o: ForgeOpts) => (ctx: SceneCtx) => {
  const st = forgeState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5;
  const ys = CRATE_Y.slice(0, st.crates);
  const b0 = CRATES_X + 11.5,
    b1 = FURNACE[0] - 15.5;
  const crates = ys.map((y, i) => crate(y, i === 1 ? st.odd : null)),
    kiln = furnace(st.burning),
    mdl = model(st.grown),
    man = stoker(st.burning),
    sh = shelf(st.slots);
  const shadowOf = (b: number[][]) =>
    castShadow(boxCorners(b[0][0], b[0][1], b[0][2], b[1][0], b[1][1], b[1][2]), BH, ctx.top);
  let s = [...crates.map(c => c.box), ...kiln.map(k => k.box), sh.box].map(shadowOf).join('');
  s += clipTo(ctx.top, mdl.shadow + man.shadow);
  // the roller belt from the crates into the kiln (the shared belt: a floor-level roller bed)
  s += beltAt([b0, FURNACE[1]], [b1, FURNACE[1]], [0, 1], false);
  // the wire from the furnace to the model: lit while training runs
  const d = pd(
    [
      [FURNACE[0] + F, MODEL[1], BH + 0.3],
      [MODEL[0] - M, MODEL[1], BH + 0.3],
    ],
    false,
  );
  s +=
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${st.burning ? 5 : 3.6}" stroke-linecap="round"/>` +
    `<path d="${d}" fill="none" stroke="${st.burning ? ACC : DARK.l}" stroke-width="${st.burning ? 2.8 : 1.6}" stroke-linecap="round"/>`;
  // while it burns, bundles of documents ride the belt into the kiln
  const docs: Item[] = st.burning
    ? [b0 + 5, b0 + 14].map(x => ({
        box: span(x - 3, FURNACE[1] - 3.5, BH + 1, x + 3, FURNACE[1] + 3.5, BH + 3.4),
        svg: box(x - 3, FURNACE[1] - 3.5, BH + 1, x + 3, FURNACE[1] + 3.5, BH + 3.4, CERAMIC, toneI, 0.8),
      }))
    : [];
  s += byDepth([...crates, ...kiln, ...docs, mdl.item, man.item, sh]);
  const crateAt = [CRATES_X, ys[ys.length - 1], BH + 17],
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

/** The home hero's plot: the domed kiln in miniature, burning, a crate of documents feeding it, the stoker with his
 * shovel, and the model machine trained beside it. */
export function forgePlot(x: number, y: number, top: SceneCtx['top']): string {
  const man = stoker(true),
    mdl = model(1),
    pieces = [
      mini(shaded(furnace(true)), [...FURNACE, BH], [x - 4, y - 8, BH], 0.42),
      mini(shaded([crate(CRATE_Y[0], null)]), [CRATES_X, CRATE_Y[0], BH], [x - 22, y - 10, BH], 0.5),
      mini({ shadow: man.shadow, items: [man.item] }, [...STOKER, BH], [x + 4, y + 10, BH], 0.5),
      mini({ shadow: mdl.shadow, items: [mdl.item] }, [...MODEL, BH], [x + 18, y - 8, BH], 0.42),
    ];
  return drawPieces(pieces, top);
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
