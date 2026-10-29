// Module 9's picture: the training bench (KTD11). The model machine stands at the back; in front, a cast-iron lever
// frame holds three levers, one per way to change an answer, each with its prop on the bed beside it: a recipe-card box
// (the prompt), a ring binder (the documents) and a wrench (the weights), each wired to the model. A technician stands
// at the frame. The chosen lever is pulled and lit, with its wire. For LoRA a small adapter clips onto the model's
// side. Words only in pills; on phones (scale > 1.5) only the lit lever keeps its pill.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { ACC, BH, boxCorners, esc, sayAt, calloutsLast } from '../../lib/iso/blocks';
import { SKIN, modelIn, modelMachine, person, type Look } from '../../lib/iso/figures';
import {
  INK,
  PALS,
  CERAMIC,
  DARK,
  METAL,
  WOOD,
  box,
  rod,
  cyl,
  shape,
  line,
  pd,
  on,
  PX,
  PY,
  PZ,
  rrUV,
  rectUV,
  ellUV,
  arcUV,
  extrude,
  vis,
  castShadow,
  hullInk,
  toneI,
  tag,
  byDepth,
} from '../../lib/iso/core.js';
import type { Weights } from '../../lib/lm/load';
import type { Version } from '../../lib/fine-tuning/engine';
import type { Say } from '../story/steps';

/** The weights the fine-tuning chapters train and compare. */
export type TuneWeights = Exclude<Weights, 'student' | 'mlm' | 'moe' | 'canary'>;

export const TRAIN_BOARD: Board = [0, 0, 160, 124];

/** What a lever changes: the engine's three ways (a prompt, documents, weights). */
export type Approach = Version['changes'];
export const APPROACHES: Approach[] = ['prompt', 'documents', 'weights'];

export interface TrainOpts {
  /** the lever pulled and lit (none: the bench at rest) */
  lit?: Approach | null;
  /** the weights the model runs: the base, the full fine-tune, or the base with the LoRA adapter clipped on */
  weights?: TuneWeights;
  /** pill size; phones pass more */
  scale?: number;
  /** the step's callout: a lit pill over one of TRAIN_PARTS */
  say?: Say;
}

/** The parts a step's callout may point at: the ones with a name pill (a lever by its approach). */
export const TRAIN_PARTS = ['model', 'adapter', ...APPROACHES] as const;

const MODEL_NAME: Record<TuneWeights, string> = {
  base: 'BASE MODEL',
  finetuned: 'FINE-TUNED',
  lora: 'BASE + ADAPTER',
};
const LEVER_NAME: Record<Approach, string> = { prompt: 'PROMPT', documents: 'DOCUMENTS', weights: 'WEIGHTS' };
const LEVER_WORDS: Record<Approach, string> = {
  prompt: 'a prompt card',
  documents: 'a document binder',
  weights: 'a weights wrench',
};

/** What the bench shows. Pure, so the tests can check it without drawing. */
export function trainState({ lit = null, weights = 'base' }: TrainOpts) {
  return {
    lit,
    adapter: weights === 'lora',
    model: MODEL_NAME[weights],
    levers: APPROACHES.map(a => ({ id: a, on: a === lit })),
  };
}

type Part = { at?: number[]; box?: number[][]; svg: string };
const MODEL = [50, 46],
  LEVER_X = 124,
  LEVER_Y: Record<Approach, number> = { prompt: 24, documents: 62, weights: 100 };
// where each wire meets the model's front face, spread so the three never overlap
const WIRE_Y: Record<Approach, number> = { prompt: 36, documents: 46, weights: 56 };
const HALF = 17,
  BASE = 9,
  Z = BH + 3; // model half-width; the frame's half-width and the top of its bed

/** A flat plate of thickness t cut to a CCW outline (u, w), lying on z, mapped through `at`: the walls that face the
 * viewer, then the top. A wrench's outline is concave (the jaw), so walls go first and the top covers them. */
function slab(outline: number[][], at: (u: number, w: number) => number[], z: number, t: number, m = METAL) {
  const pts = outline.map(([u, w]) => at(u, w));
  let s = '';
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i],
      b = pts[(i + 1) % pts.length],
      n = [b[1] - a[1], -(b[0] - a[0]), 0];
    if (vis(n))
      s += shape(
        [
          [a[0], a[1], z],
          [b[0], b[1], z],
          [b[0], b[1], z + t],
          [a[0], a[1], z + t],
        ],
        toneI(n, m),
        0,
      );
  }
  return s + shape(on(PZ(z + t), pts), m.l, 1);
}

/** An open-ended spanner lying flat. Real-object notes: a ring end with its hole, a tapered handle with a raised rib,
 * a round head whose jaw opens forward. */
function wrench(x: number, y: number, z: number, k = 1) {
  const R = 3.4,
    hw = 1.2,
    hx = 4.5,
    rx = -6,
    r = 2.6,
    a0 = Math.asin(hw / R),
    sq = Math.sqrt(R * R - hw * hw),
    deg = Math.PI / 180,
    arc = (cx: number, rr: number, d0: number, d1: number, n = 6) =>
      Array.from({ length: n + 1 }, (_, i) => {
        const t = d0 + ((d1 - d0) * i) / n;
        return [cx + rr * Math.cos(t), rr * Math.sin(t)];
      });
  const outline = [
    [hx + sq, -hw],
    [hx - 0.9, -hw],
    [hx - 0.9, hw],
    [hx + sq, hw],
    ...arc(hx, R, a0, 155 * deg),
    ...arc(rx, r, 30 * deg, 330 * deg, 9),
    ...arc(hx, R, 205 * deg, 2 * Math.PI - a0),
  ];
  const at = (u: number, w: number) => [x + u * k, y + w * k, z],
    zt = z + 1.45 * k;
  return (
    slab(outline, at, z, 1.4 * k) +
    shape(on(PZ(zt), ellUV(x + rx * k, y, 1.2 * k, 1.2 * k, 10)), DARK.d, 0.7) +
    line(
      [
        [x - 3 * k, y, zt],
        [x + 1.5 * k, y, zt],
      ],
      0.5,
    )
  );
}

/** The prop on a lever's bed: a recipe-card box (the prompt), a ring binder (the documents) or a wrench (the weights). */
function prop(a: Approach, x: number, y: number): string {
  if (a === 'prompt') {
    // a wooden index-card box, its lid hinged open at the back, cards standing in it, one with a coloured tab
    let s =
      shape(
        [
          [x - 8, y - 7, Z + 5],
          [x - 8, y + 2, Z + 5],
          [x - 11, y + 2, Z + 10.5],
          [x - 11, y - 7, Z + 10.5],
        ],
        WOOD.m,
        0.9,
      ) +
      box(x - 8, y - 7, Z, x - 1, y + 2, Z + 5, WOOD, toneI, 1) +
      shape(on(PZ(Z + 5.05), rectUV(x - 7.2, y - 6.2, x - 1.8, y + 1.2)), DARK.m, 0.6);
    for (const [i, cx] of [x - 6.2, x - 4.6, x - 3].entries()) {
      s += box(cx, y - 6, Z + 4, cx + 0.5, y + 1, Z + 8.6 - i * 0.5, CERAMIC, toneI, 0.6);
      if (i === 1) s += box(cx, y - 1, Z + 8.1, cx + 0.5, y + 1, Z + 9.6, PALS.mustard, toneI, 0.5);
    }
    return s;
  }
  if (a === 'documents') {
    // a lever-arch binder standing with its spine to the front: a label holder and a finger hole on the spine
    let s =
      box(x - 7, y - 7, Z, x - 1, y + 4, Z + 11, PALS.cobalt, toneI, 0.9) +
      box(x - 6.5, y - 6.5, Z + 10.2, x - 1.5, y + 3.5, Z + 11.4, CERAMIC, toneI, 0.6);
    if (vis([1, 0, 0]))
      s +=
        shape(on(PX(x - 0.9), rectUV(y - 4, Z + 6, y + 1.5, Z + 9)), CERAMIC.l, 0.5) +
        shape(on(PX(x - 0.9), ellUV(y - 1.2, Z + 3, 1.3, 1.3, 10)), DARK.d, 0.5);
    return s;
  }
  return wrench(x - 0.5, y - 2, Z);
}

/** One lever in the frame. Real-object notes: a steel quadrant plate behind it, notched where the catch drops in; the
 * lever on a pivot boss; a rubber grip on top with the catch handle beside it. At rest it stands up; pulled, it leans
 * toward you. Its prop sits on the bed beside it. */
function lever(a: Approach, on_: boolean): Part {
  const x = LEVER_X,
    y = LEVER_Y[a],
    lx = x + 5,
    ly = y + 5;
  let s = on_
    ? `<path d="${pd(on(PZ(Z + 0.05), rrUV(x - BASE + 0.8, y - BASE + 0.8, x + BASE - 0.8, y + BASE - 0.8, 3)))}" fill="none" stroke="${ACC}" stroke-width="2.2"/>`
    : '';
  s += prop(a, x, y - 1);
  const qy = ly - 1.4,
    quad = [[lx, Z], ...arcUV(lx, Z, 10, 38, 100, 8)];
  s += shape(on(PY(qy), quad), toneI([0, vis([0, 1, 0]) ? 1 : -1, 0], DARK), 1);
  for (const d of [44, 60, 78, 94]) {
    const t = (d * Math.PI) / 180;
    s += line(
      [
        [lx + 8.4 * Math.cos(t), qy, Z + 8.4 * Math.sin(t)],
        [lx + 10 * Math.cos(t), qy, Z + 10 * Math.sin(t)],
      ],
      0.7,
    );
  }
  const ang = ((on_ ? 58 : 90) * Math.PI) / 180,
    L = on_ ? 14 : 13.5,
    dir = [Math.cos(ang), Math.sin(ang)],
    // a point d along the lever, pushed off it (in its plane) by `off`
    pt = (d: number, off = 0) => [lx + dir[0] * d - dir[1] * off, ly, Z + dir[1] * d + dir[0] * off];
  s +=
    cyl(lx, ly, Z, Z + 1.5, 2.2, METAL, toneI, 0.8) +
    rod(pt(0), pt(L), 1.15, METAL) +
    rod(pt(L - 5, 1.7), pt(L - 0.5, 1.7), 0.45, METAL, toneI, 0.6) +
    rod(pt(L - 5, 0), pt(L - 5, 1.7), 0.4, METAL, toneI, 0.5) +
    rod(pt(L), pt(L + 5.5), 2.1, on_ ? PALS.mustard : PALS.tomato, toneI, 1.1, 1.7, 12);
  return {
    box: [
      [x - 11, y - BASE, Z],
      [x + 17, y + BASE, Z + 21],
    ],
    svg: `<g class="lever" data-lever="${a}" data-on="${on_ ? 1 : 0}">${s}</g>`,
  };
}

/** The adapter: a rounded mint module clipped onto the model's side, two spring clips hooked over its edge, vents. */
function adapter(): Part {
  const [x, y] = MODEL,
    y1 = y + HALF - 2,
    z0 = BH + 10,
    z1 = BH + 26,
    PROF = rrUV(y1, z0, y1 + 6, z1, 2.4, 4);
  let s = '';
  for (const [cx, n] of [
    [x - 10, [-1, 0, 0]],
    [x + 8, [1, 0, 0]],
  ] as [number, number[]][])
    if (vis(n)) s += shape(on(PX(cx), PROF), toneI(n, PALS.mint), 1);
  s += extrude(PROF, x - 10, x + 8, PALS.mint, toneI) + hullInk([...on(PX(x - 10), PROF), ...on(PX(x + 8), PROF)], 1.8);
  if (vis([0, 1, 0]))
    for (let i = 0; i < 3; i++)
      s += line(
        [
          [x - 6 + i * 4, y1 + 6.05, z0 + 4],
          [x - 6 + i * 4, y1 + 6.05, z1 - 4],
        ],
        0.8,
      );
  for (const cx of [x - 6, x + 4])
    s +=
      rod([cx, y1 + 3, z1 - 1], [cx, y1 + 3, z1 + 2], 0.6, METAL, toneI, 0.7) +
      rod([cx, y1 + 3, z1 + 2], [cx, y1 - 2, z1 + 2], 0.6, METAL, toneI, 0.7) +
      rod([cx, y1 - 2, z1 + 2], [cx, y1 - 2, z1 - 2], 0.6, METAL, toneI, 0.7);
  return {
    box: [
      [x - 10, y1 - 2.6, z0],
      [x + 8, y1 + 6, z1 + 2.6],
    ],
    svg: `<g class="adapter">${s}</g>`,
  };
}

/** The technician: blue overalls, a mustard cap, a clipboard. */
const TECHNICIAN: Look = {
  skin: SKIN[3],
  top: '#6f8fae',
  legs: '#3b4566',
  hair: '#2b231c',
  cut: 'short',
  hat: 'cap',
  hatCol: PALS.mustard.m,
  prop: 'clipboard',
};

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;

/** The bench. Shadows, the wires and the frame's bed (floor), then one sort over every part, then every pill on top. */
export const trainScene = (o: TrainOpts) => (ctx: SceneCtx) => {
  const st = trainState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5,
    [mx, my] = MODEL;
  const model = modelMachine(mx, my, 1, st.lit ? 'ok' : undefined),
    tech = person({ x: 100, y: 114, facing: 0, look: TECHNICIAN });
  const y0 = LEVER_Y.prompt - BASE - 2,
    y1 = LEVER_Y.weights + BASE + 2;
  let s =
    model.shadow +
    tech.shadow +
    castShadow(boxCorners(LEVER_X - BASE, y0, BH, LEVER_X + BASE, y1, BH + 14), BH, ctx.top);
  if (st.adapter) s += castShadow(boxCorners(mx - 10, my + HALF, BH, mx + 8, my + HALF + 4, BH + 26), BH, ctx.top);
  // wires from the frame back to the model's front face, an L along the board; the lit one glows
  for (const a of APPROACHES) {
    const lit = a === st.lit,
      mid = 96,
      d = pd(
        [
          [LEVER_X - BASE, LEVER_Y[a], BH + 0.3],
          [mid, LEVER_Y[a], BH + 0.3],
          [mid, WIRE_Y[a], BH + 0.3],
          [mx + HALF, WIRE_Y[a], BH + 0.3],
        ],
        false,
      );
    s +=
      `<g class="wire" data-wire="${a}"><path d="${d}" fill="none" stroke="${INK}" stroke-width="${lit ? 4.2 : 2.6}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="none" stroke="${lit ? ACC : DARK.l}" stroke-width="${lit ? 2.2 : 1}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  }
  // the lever frame's cast-iron bed: one long plinth under all three levers, on a recessed foot
  s +=
    box(LEVER_X - BASE + 1.5, y0 + 1.5, BH, LEVER_X + BASE - 1.5, y1 - 1.5, BH + 1, DARK, toneI, 1) +
    box(LEVER_X - BASE, y0, BH + 1, LEVER_X + BASE, y1, Z, DARK, toneI, 1) +
    hullInk(boxCorners(LEVER_X - BASE, y0, BH, LEVER_X + BASE, y1, Z), 1.8);
  const parts: Part[] = [
    ...tech.items,
    {
      box: model.items[0].box,
      svg: `<g class="model" data-weights="${o.weights ?? 'base'}">${model.items[0].svg}</g>`,
    },
  ];
  if (st.adapter) parts.push(adapter());
  for (const l of st.levers) parts.push(lever(l.id, l.on));
  s += byDepth(parts);
  const pills = [
    sayAt(o.say, 'model', [mx, my, BH + 32], -16, scale),
    pill([mx, my, BH + 32], 0, -16, st.model, false, scale),
  ];
  if (st.adapter) {
    const at = [mx - 1, my + HALF + 5, BH + 18];
    pills.push(sayAt(o.say, 'adapter', at, 14, scale));
    if (!narrow) pills.push(pill(at, -34, 14, 'LORA ADAPTER', true, scale));
  }
  for (const l of st.levers) {
    const at = [LEVER_X + 5, LEVER_Y[l.id] + 5, Z + 18];
    pills.push(sayAt(o.say, l.id, at, -12, scale));
    if (!narrow || l.on) pills.push(pill(at, 0, -12, LEVER_NAME[l.id], l.on, scale));
  }
  return s + calloutsLast(pills);
};

/** The home hero's plot (heroScene): a small training bench at (x, y). A squat model machine with the mint adapter
 * clipped onto its side, and in front a short lever frame with the wrench on its bed, the lever pulled. Squat, so the
 * pill rows stay clear. */
export function benchPlot(x: number, y: number, top: SceneCtx['top']): string {
  const m = [x - 14, y - 16, BH, x + 6, y + 2, BH + 16],
    a = [x - 10, y + 2, BH + 5, x + 2, y + 5, BH + 13];
  const px = x + 14,
    py = y + 12,
    lx = px + 4,
    ly = py + 4,
    tip = [lx + 9, ly, Z + 10];
  const model = modelIn(m).items[0].svg;
  const clip =
    box(a[0], a[1], a[2], a[3], a[4], a[5], PALS.mint, toneI, 0.9) +
    hullInk(boxCorners(a[0], a[1], a[2], a[3], a[4], a[5]), 1.4);
  const plate =
    box(px - 7, py - 7, BH, px + 7, py + 7, Z, DARK, toneI, 1) +
    hullInk(boxCorners(px - 7, py - 7, BH, px + 7, py + 7, Z), 1.6) +
    wrench(px - 1, py - 3, Z, 0.85) +
    cyl(lx, ly, Z, Z + 1.5, 2, METAL, toneI, 0.8) +
    rod([lx, ly, Z + 1], tip, 1, METAL) +
    rod(tip, [tip[0] + 2.4, tip[1], tip[2] + 2.6], 1.8, PALS.mustard, toneI, 1, 1.5, 12);
  return (
    castShadow(boxCorners(m[0], m[1], m[2], m[3], m[4] + 3, m[5]), BH, top) +
    castShadow(boxCorners(px - 7, py - 7, BH, px + 7, py + 7, Z + 10), BH, top) +
    byDepth([
      { at: [x - 4, y - 7, 0], svg: model },
      { at: [x - 4, y + 4, 0], svg: clip },
      { at: [px, py, 0], svg: plate },
    ])
  );
}

/** The picture in words, for its aria-label. */
export function trainLabel(o: TrainOpts): string {
  const st = trainState(o);
  return (
    `A training bench: the model (${st.model.toLowerCase()})${st.adapter ? ' with a small LoRA adapter clipped onto its side' : ''}, ` +
    `and a lever frame with three levers wired to it: ${APPROACHES.map(a => LEVER_WORDS[a]).join(', ')}. ` +
    (st.lit ? `The ${LEVER_NAME[st.lit].toLowerCase()} lever is pulled and lit.` : 'No lever is pulled.')
  );
}
