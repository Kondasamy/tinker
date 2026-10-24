// Module 9's picture: the training bench (KTD11). The model is RAG's LLM block (composed, not forked) at the back; in
// front stand three levers, one per way to change an answer: a prompt card, a document binder and a weights wrench,
// each wired to the model. The chosen lever is pulled and lit, with its wire. For LoRA a small adapter clips onto the
// model's side. Words only in pills; on phones (scale > 1.5) only the lit lever keeps its pill.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { ACC, BH, boxCorners, esc, renderers, sayAt } from '../../lib/iso/blocks';
import {
  INK,
  PALS,
  CERAMIC,
  DARK,
  METAL,
  box,
  rod,
  cyl,
  shape,
  line,
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
import type { Weights } from '../../lib/lm/load';
import type { Version } from '../../lib/fine-tuning/engine';

export const TRAIN_BOARD: Board = [0, 0, 160, 124];

/** What a lever changes: the engine's three ways (a prompt, documents, weights). */
export type Approach = Version['changes'];
export const APPROACHES: Approach[] = ['prompt', 'documents', 'weights'];

export interface TrainOpts {
  /** the lever pulled and lit (none: the bench at rest) */
  lit?: Approach | null;
  /** the weights the model runs: the base, the full fine-tune, or the base with the LoRA adapter clipped on */
  weights?: Exclude<Weights, 'student'>;
  /** pill size; phones pass more */
  scale?: number;
  /** the step's callout: a lit pill over one of TRAIN_PARTS */
  say?: { block: string; text: string };
}

/** The parts a step's callout may point at: the ones with a name pill (a lever by its approach). */
export const TRAIN_PARTS = ['model', 'adapter', ...APPROACHES] as const;

const MODEL_NAME: Record<Exclude<Weights, 'student'>, string> = {
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

type Part = { at: number[]; svg: string };
const MODEL = [50, 46],
  LEVER_X = 124,
  LEVER_Y: Record<Approach, number> = { prompt: 24, documents: 62, weights: 100 };
// where each wire meets the model's front face, spread so the three never overlap
const WIRE_Y: Record<Approach, number> = { prompt: 36, documents: 46, weights: 56 };
const HALF = 17,
  BASE = 9,
  Z = BH + 3; // model half-width; lever plate half-width and top

/** The prop on a lever's plate: a standing prompt card, a document binder, or a wrench lying flat. */
function prop(a: Approach, x: number, y: number): string {
  if (a === 'prompt') {
    let s = box(x - 4, y - 7, Z, x - 2, y + 4, Z + 12, CERAMIC, toneI, 0.8);
    for (let i = 0; i < 3; i++)
      s += line(
        [
          [x - 1.9, y - 5, Z + 9 - i * 2.6],
          [x - 1.9, y + 2 - (i === 2 ? 3 : 0), Z + 9 - i * 2.6],
        ],
        0.6,
      );
    return s;
  }
  if (a === 'documents') {
    return (
      box(x - 7, y - 7, Z, x - 1, y + 4, Z + 10, PALS.cobalt, toneI, 0.9) +
      box(x - 6.5, y - 6.5, Z + 10, x - 1.5, y + 3.5, Z + 11.5, CERAMIC, toneI, 0.6) +
      shape(
        on(PX(x - 0.9), [
          [y - 4, Z + 4],
          [y + 1.5, Z + 4],
          [y + 1.5, Z + 7],
          [y - 4, Z + 7],
        ]),
        CERAMIC.l,
        0.5,
      )
    );
  }
  // an open-ended wrench: a handle, and a head with two jaws
  return (
    box(x - 8, y - 1.2, Z, x + 1, y + 1.2, Z + 1.6, METAL, toneI, 0.8) +
    box(x + 1, y - 3.5, Z, x + 4, y + 3.5, Z + 1.6, METAL, toneI, 0.8) +
    box(x + 4, y - 3.5, Z, x + 7, y - 1.6, Z + 1.6, METAL, toneI, 0.8) +
    box(x + 4, y + 1.6, Z, x + 7, y + 3.5, Z + 1.6, METAL, toneI, 0.8)
  );
}

/** One lever station: a dark plate with its prop, and a lever that stands up at rest and is pulled toward you when on. */
function lever(a: Approach, on_: boolean): Part {
  const x = LEVER_X,
    y = LEVER_Y[a],
    lx = x + 5,
    ly = y + 5;
  let s = on_
    ? `<path d="${pd(on(PZ(BH + 0.3), rrUV(x - BASE - 3, y - BASE - 3, x + BASE + 3, y + BASE + 3, 4)))}" fill="none" stroke="${ACC}" stroke-width="2.4"/>`
    : '';
  s +=
    box(x - BASE, y - BASE, BH, x + BASE, y + BASE, Z, DARK, toneI, 1) +
    hullInk(boxCorners(x - BASE, y - BASE, BH, x + BASE, y + BASE, Z), 1.8);
  s += prop(a, x, y - 1);
  const tip = on_ ? [lx + 11, ly, Z + 12] : [lx, ly, Z + 16];
  s +=
    cyl(lx, ly, Z, Z + 1.5, 2.2, METAL, toneI, 0.8) +
    rod([lx, ly, Z + 1], tip, 1, METAL) +
    rod(tip, [tip[0], tip[1], tip[2] + 3.5], 2.2, on_ ? PALS.mustard : PALS.tomato);
  return { at: [x, y, 0], svg: `<g class="lever" data-lever="${a}" data-on="${on_ ? 1 : 0}">${s}</g>` };
}

/** The adapter: a small mint module clipped onto the model's side, two clips over its top edge. */
function adapter(): Part {
  const [x, y] = MODEL,
    y1 = y + HALF,
    z0 = BH + 10,
    z1 = BH + 26;
  let s =
    box(x - 10, y1, z0, x + 8, y1 + 5, z1, PALS.mint, toneI, 1) +
    hullInk(boxCorners(x - 10, y1, z0, x + 8, y1 + 5, z1), 1.6);
  for (const cx of [x - 6, x + 4]) s += box(cx - 1.5, y1 - 2, z1, cx + 1.5, y1 + 5.5, z1 + 1.2, METAL, toneI, 0.7);
  for (let i = 0; i < 3; i++)
    s += line(
      [
        [x - 7 + i * 5, y1 + 5.05, z0 + 4],
        [x - 7 + i * 5, y1 + 5.05, z1 - 4],
      ],
      0.7,
    );
  return { at: [x, y1 + 3, 0], svg: `<g class="adapter">${s}</g>` };
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;

/** The bench. Shadows, the wires (floor), then the parts back to front, then every pill on top. */
export const trainScene = (o: TrainOpts) => (ctx: SceneCtx) => {
  const st = trainState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5,
    [mx, my] = MODEL;
  const sh = (x0: number, y0: number, x1: number, y1: number, h: number) =>
    castShadow(boxCorners(x0, y0, BH, x1, y1, BH + h), BH, ctx.top);
  let s = sh(mx - HALF, my - HALF, mx + HALF, my + HALF + (st.adapter ? 5 : 0), 32);
  for (const a of APPROACHES) s += sh(LEVER_X - BASE, LEVER_Y[a] - BASE, LEVER_X + BASE, LEVER_Y[a] + BASE, 14);
  // wires from each plate back to the model's front face, an L along the board; the lit one glows
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
  const parts: Part[] = [
    {
      at: [mx, my, 0],
      svg: `<g class="model" data-weights="${o.weights ?? 'base'}">${renderers.llm({ x: mx, y: my, state: st.lit ? 'ok' : undefined })}</g>`,
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
  return s + pills.join('');
};

/** The home hero's plot (heroScene): a small training bench at (x, y). A squat model block with the mint adapter clipped
 * onto its side, and in front the weights lever's plate with its wrench, the lever pulled. Squat, so the pill rows stay clear. */
export function benchPlot(x: number, y: number, top: SceneCtx['top']): string {
  const m = [x - 14, y - 16, BH, x + 6, y + 2, BH + 16],
    a = [x - 10, y + 2, BH + 5, x + 2, y + 5, BH + 13];
  const px = x + 14,
    py = y + 12,
    lx = px + 4,
    ly = py + 4,
    tip = [lx + 9, ly, Z + 10];
  const model =
    box(m[0], m[1], m[2], m[3], m[4], m[5], PALS.blush, toneI, 1) +
    hullInk(boxCorners(m[0], m[1], m[2], m[3], m[4], m[5]), 1.8);
  const clip =
    box(a[0], a[1], a[2], a[3], a[4], a[5], PALS.mint, toneI, 0.9) +
    hullInk(boxCorners(a[0], a[1], a[2], a[3], a[4], a[5]), 1.4);
  const plate =
    box(px - 7, py - 7, BH, px + 7, py + 7, Z, DARK, toneI, 1) +
    hullInk(boxCorners(px - 7, py - 7, BH, px + 7, py + 7, Z), 1.6) +
    prop('weights', px, py - 1) +
    cyl(lx, ly, Z, Z + 1.5, 2, METAL, toneI, 0.8) +
    rod([lx, ly, Z + 1], tip, 1, METAL) +
    rod(tip, [tip[0], tip[1], tip[2] + 3], 2, PALS.mustard);
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
    `and three levers wired to it: ${APPROACHES.map(a => LEVER_WORDS[a]).join(', ')}. ` +
    (st.lit ? `The ${LEVER_NAME[st.lit].toLowerCase()} lever is pulled and lit.` : 'No lever is pulled.')
  );
}
