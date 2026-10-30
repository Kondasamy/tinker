// Choosing a model's picture: the market hall (KTD8). Three model machines, A, B and C, stand on stone plinths in a row
// at the back; in front of them a brass steelyard hangs from a timber frame. Its short arm swings round to the machine
// that wins and tips down over it, the pan on that arm holding the winner's reply slips; its long arm carries three
// poise weights (quality cobalt, cost mint, wait tomato), each hung at the notch its weight sets. Rosa (CAST.rosa),
// Larkspur's support lead, stands by to read it. A tie hangs the beam level toward the middle, its pan empty. Words
// only in pills; esc() on every pill.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, calloutsLast, esc, sayAt, sayFits, sayTag } from '../../lib/iso/blocks';
import { CERAMIC, DARK, PALS, WOOD, box, castShadow, cyl, line, rod, tag, toneI } from '../../lib/iso/core.js';
import { drawPieces, mini, modelMachine, person, type Item, type ModelState, type Piece } from '../../lib/iso/figures';
import { IDS, type MachineId } from '../../lib/choosing-models/machines';
import { CRITERIA, type Criterion, type Weights } from '../../lib/choosing-models/score';
import type { Say } from '../story/steps';

export const STEELYARD_BOARD: Board = [14, -4, 176, 160];
/** The parts a step's callout may name. */
export const STEELYARD_PARTS = [
  'beam',
  'pan',
  'quality',
  'cost',
  'wait',
  'machine-a',
  'machine-b',
  'machine-c',
] as const;

const BRASS = { l: '#f2d27f', m: '#c9a24a', d: '#7a5d22' };
/** each poise's colour; the ranges beside the stage carry the same swatch */
export const POISE: Record<Criterion, { l: string; m: string; d: string }> = {
  quality: PALS.cobalt,
  cost: PALS.mint,
  wait: PALS.tomato,
};
/** the plinths, at the back in a row */
const PLINTH: Record<MachineId, [number, number]> = { A: [40, 20], B: [40, 70], C: [40, 120] };
const PH = 10,
  PW = 18,
  MSIZE = 1;
/** the hook the beam hangs from, and the frame's height */
const HX = 122,
  HY = 70,
  PZ = BH + 70,
  TOP = BH + 92;
const SHORT = 32,
  LONG = 58;
/** where a poise of weight w hangs along the long arm */
export const notch = (w: number) => 10 + w * 11;

/** The beam's heading (radians in plan) toward a machine; a tie heads to the middle one. */
export const aimOf = (id: MachineId | null) => {
  const [x, y] = PLINTH[id ?? 'B'];
  return Math.atan2(y - HY, x - HX);
};

export interface SteelyardOpts {
  /** the beam's heading in plan (aimOf), and its tilt in degrees, short arm down */
  aim: number;
  tilt: number;
  /** the machine the beam tips toward: its reply slips fill the pan */
  winner: MachineId | null;
  weights: Weights;
  /** each machine's pill: its score in the chapter's terms (desktop), or its letter (phones) */
  pills: Record<MachineId, string>;
  /** each machine's screen: ok, warn (???), bad (!!) or idle */
  states?: Partial<Record<MachineId, ModelState>>;
  /** machines under the bar: their plinths are roped off */
  out?: MachineId[];
  scale?: number;
  say?: Say;
}

const one = (svg: string, b: number[][]): Piece => ({
  shadow: castShadow(boxCorners(b[0][0], b[0][1], b[0][2], b[1][0], b[1][1], b[1][2]), BH),
  items: [{ box: b, svg }],
  box: b,
});
/** An item that casts no shadow of its own (hung parts: the frame's shadow covers them). */
const hung = (svg: string, b: number[][]): Item => ({ box: b, svg });
const bb = (pts: number[][], pad = 1): number[][] => [
  [0, 1, 2].map(k => Math.min(...pts.map(p => p[k])) - pad),
  [0, 1, 2].map(k => Math.max(...pts.map(p => p[k])) + pad),
];

/** The steelyard's geometry: the pivot, the short arm's end (the pan's hook), the long arm's end, and each poise's
 * hanging point, from the heading, the tilt and the weights. Pure, so tests can check it without drawing. */
export function beamOf(aim: number, tilt: number, w: Weights) {
  const t = (tilt * Math.PI) / 180,
    dx = Math.cos(aim),
    dy = Math.sin(aim),
    c = Math.cos(t),
    s = Math.sin(t);
  const at = (d: number) => [HX + dx * d * c, HY + dy * d * c, PZ - d * s];
  // the poises hang side by side across the beam, so equal weights never hide one another
  const across = [-dy, dx];
  const poise = Object.fromEntries(
    CRITERIA.map((k, i) => {
      const p = at(-notch(w[k])),
        off = (i - 1) * 4.4;
      return [k, { hook: p, body: [p[0] + across[0] * off, p[1] + across[1] * off, p[2] - 11] }];
    }),
  ) as Record<Criterion, { hook: number[]; body: number[] }>;
  return { pivot: [HX, HY, PZ], short: at(SHORT), long: at(-LONG), poise };
}

/** The timber frame, the hook, the beam, its poises and the pan, as pieces. */
function steelyard(o: Pick<SteelyardOpts, 'aim' | 'tilt' | 'winner' | 'weights'>): Piece[] {
  const g = beamOf(o.aim, o.tilt, o.weights);
  const out: Piece[] = [];
  // the frame: two posts and a crossbeam along the row, the hook hanging from its middle
  // a gallows at the back: one post, an arm out over the hook, and a brace
  const y0 = 2;
  out.push(
    one(box(HX - 2.4, y0 - 2.4, BH, HX + 2.4, y0 + 2.4, TOP + 4, WOOD, toneI, 1), [
      [HX - 2.4, y0 - 2.4, BH],
      [HX + 2.4, y0 + 2.4, TOP + 4],
    ]),
    one(
      `<g data-prop="frame">${box(HX - 2.2, y0 + 2.4, TOP, HX + 2.2, HY + 5, TOP + 4, WOOD, toneI, 1)}${rod([HX, y0 + 2, TOP - 20], [HX, y0 + 22, TOP], 1.2, WOOD, toneI, 1)}</g>`,
      [
        [HX - 2.2, y0 + 2, TOP - 20],
        [HX + 2.2, HY + 5, TOP + 4],
      ],
    ),
  );
  const items: Item[] = [];
  items.push(
    hung(rod([HX, HY, TOP], [HX, HY, PZ + 2], 0.6, DARK, toneI, 0.9), [
      [HX - 1, HY - 1, PZ],
      [HX + 1, HY + 1, TOP],
    ]),
  );
  // the beam, pivot to each end, as two items so it sorts against the poises hung on it
  const lead = o.winner ?? 'none';
  items.push(
    hung(
      `<g data-part="beam" data-winner="${lead}" data-tilt="${o.tilt.toFixed(1)}">${rod(g.short, g.pivot, 1.6, BRASS, toneI, 1)}${cyl(HX, HY, PZ - 2, PZ + 2, 2.8, BRASS, toneI, 1, 12)}</g>`,
      bb([g.short, g.pivot], 2.2),
    ),
    hung(rod(g.pivot, g.long, 1.6, BRASS, toneI, 1, 1.1), bb([g.pivot, g.long], 1.7)),
  );
  // the poises: a hanger from the beam and a weight on it
  for (const k of CRITERIA) {
    const { hook, body } = g.poise[k],
      top = [body[0], body[1], body[2] + 6.5];
    items.push(
      hung(
        `<g data-part="poise" data-poise="${k}" data-weight="${o.weights[k]}">${rod(hook, top, 0.35, DARK, toneI, 0.8)}${cyl(body[0], body[1], body[2], body[2] + 6.5, 3.4, POISE[k], toneI, 1, 14)}</g>`,
        bb([hook, [body[0], body[1], body[2]]], 3.4),
      ),
    );
  }
  // the pan: three chains down from the short arm's end to a shallow brass dish, slips in it when there's a winner
  const [sx, sy, sz] = g.short,
    pz = sz - 18;
  let pan = '';
  for (let i = 0; i < 3; i++) {
    const a = (i * 2 * Math.PI) / 3 + 0.5;
    pan += line([g.short, [sx + Math.cos(a) * 8, sy + Math.sin(a) * 8, pz + 1.6]], 0.7);
  }
  pan += cyl(sx, sy, pz, pz + 1.8, 9, BRASS, toneI, 1, 20);
  if (o.winner)
    for (let i = 0; i < 3; i++)
      pan += box(
        sx - 3 + i * 0.6,
        sy - 2.2 + i * 0.4,
        pz + 1.6 + i * 0.7,
        sx + 3 + i * 0.6,
        sy + 2.2 + i * 0.4,
        pz + 2.3 + i * 0.7,
        CERAMIC,
        toneI,
        0.6,
      );
  items.push(
    hung(`<g data-part="pan" data-slips="${o.winner ? 3 : 0}">${pan}</g>`, [
      [sx - 9, sy - 9, pz],
      [sx + 9, sy + 9, sz],
    ]),
  );
  out.push({ shadow: '', items, box: bb([g.short, g.long, [HX, HY, TOP]]) });
  return out;
}

/** A plinth and its machine; one under the bar gets a rope across its plinth's front. */
function stand(id: MachineId, state: ModelState | undefined, out: boolean): Piece[] {
  const [x, y] = PLINTH[id];
  const plinth = one(
    `<g data-part="machine-${id.toLowerCase()}" data-out="${out ? 1 : 0}">${box(x - PW, y - PW, BH, x + PW, y + PW, BH + PH, CERAMIC, toneI, 1)}${
      out ? rod([x + PW + 0.6, y - PW, BH + 6], [x + PW + 0.6, y + PW, BH + 6], 0.7, PALS.tomato, toneI, 0.9) : ''
    }</g>`,
    [
      [x - PW, y - PW, BH],
      [x + PW + 1, y + PW, BH + PH],
    ],
  );
  return [plinth, modelMachine(x, y, MSIZE, state, undefined, { z: BH + PH })];
}

const pill = (p: number[], dy: number, text: string, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, 0, dy, esc(text), false, scale)}</g>`;
const MTOP = BH + PH + 32 * MSIZE + 2;

/** The market hall. Every shadow, then one depth sort over plinths, machines, the frame, the beam and Rosa, then pills. */
export const steelyardScene = (o: SteelyardOpts) => (ctx: SceneCtx) => {
  const scale = o.scale ?? 1,
    narrow = scale > 1.5;
  const pieces: Piece[] = [
    ...IDS.flatMap(id => stand(id, o.states?.[id], !!o.out?.includes(id))),
    ...steelyard(o),
    person({ x: 144, y: 126, facing: '-x', look: 'rosa', holding: 'clipboard' }),
  ];
  let s = drawPieces(pieces, ctx.top);
  const pills: string[] = [];
  for (const id of IDS) {
    const [x, y] = PLINTH[id];
    pills.push(pill([x, y, MTOP], -14, o.pills[id], scale));
    // a machine's callout hangs below its plinth, clear of the next machine's name pill above it
    if (sayFits(o.say, `machine-${id.toLowerCase()}`, narrow))
      pills.push(sayTag([x + PW, y, BH], o.say!.text, scale, 22));
  }
  const g = beamOf(o.aim, o.tilt, o.weights);
  pills.push(
    sayAt(o.say, 'beam', g.long, 4, scale, narrow),
    sayAt(o.say, 'pan', [g.short[0], g.short[1], g.short[2] - 18], 46, scale, narrow),
  );
  for (const k of CRITERIA) pills.push(sayAt(o.say, k, g.poise[k].body, 18, scale, narrow));
  s += calloutsLast(pills);
  return s;
};

/** The picture in words, for its aria-label. */
export function steelyardLabel(o: SteelyardOpts): string {
  const w = CRITERIA.map(k => `${k} ${o.weights[k]}`).join(', ');
  const machines = IDS.map(id => `${id}: ${o.pills[id]}${o.out?.includes(id) ? ', under the bar' : ''}`).join('; ');
  return `Three made-up model machines on plinths, ${machines}. A brass steelyard with poise weights ${w} ${
    o.winner
      ? `tips toward machine ${o.winner}, its pan holding ${o.winner}'s reply slips`
      : 'hangs level, its pan empty'
  }.`;
}

/** The home hero's plot: the steelyard alone, tipping toward a machine, set down small. */
export function steelyardPlot(x: number, y: number, _top: SceneCtx['top']): string {
  const p = steelyard({ aim: aimOf('C'), tilt: 10, winner: 'C', weights: { quality: 2, cost: 3, wait: 1 } });
  return drawPieces([
    mini({ shadow: p.map(q => q.shadow).join(''), items: p.flatMap(q => q.items) }, [HX, HY, BH], [x, y, BH], 0.32),
  ]);
}
