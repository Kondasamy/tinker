// Models on your device's picture: Larkspur's warehouse picking aisle (U6). A pallet rack of stock stands behind; in
// front lies the hero object, the warehouse handheld drawn as a walk-in phone-shaped crate on its back, open on top,
// with a home bar on its rim. Its floor holds 16 bricks, each a sixteenth of the memory the handheld leaves the app:
// weight bricks (cobalt) first, then KV-cache bricks (mint); bricks past 16 spill onto the floor beside it. A battery
// water tank stands at its back end, a glass drum whose water is the charge left, piped into the crate. A hot handheld
// glows tomato with heat lines over it. The picker (CAST.tomas) stands by. Words only in pills; esc() on every pill.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, calloutsLast, esc, sayAt } from '../../lib/iso/blocks';
import { CLEAR, DARK, METAL, PALS, WOOD, box, castShadow, cyl, matOf, P, rod, tag, toneI } from '../../lib/iso/core.js';
import { drawPieces, mini, person, tight, type Item, type Piece } from '../../lib/iso/figures';
import { compact } from '../../lib/iso/compact';
import type { Say } from '../story/steps';

/** The crate's floor holds this many bricks; spilled ones past it are drawn up to SPILL_DRAWN, then counted. */
export const CRATE_BRICKS = 16,
  SPILL_DRAWN = 8;
export const CRATE_BOARD: Board = [-8, -40, 116, 46];
/** The parts a step's callout may name. */
export const CRATE_PARTS = ['crate', 'bricks', 'cache', 'spill', 'tank', 'picker'] as const;

export interface CrateOpts {
  /** weight bricks and cache bricks (any count; past CRATE_BRICKS they spill) */
  weights: number;
  cache?: number;
  /** the battery left, 0 to 1 */
  level: number;
  /** throttled: the crate glows */
  hot?: boolean;
  /** the crate's pill (memory used), and the tank's (charge) */
  load?: string;
  charge?: string;
  /** pill size; phones pass more */
  scale?: number;
  say?: Say;
}

const X0 = 4,
  X1 = 70,
  Y0 = -12,
  Y1 = 24,
  WALL = 2.4,
  TOP = BH + 9,
  /** the floor inside, and a brick's cell */
  FX = X0 + WALL,
  FY = Y0 + WALL,
  CW = (X1 - X0 - 2 * WALL) / 4,
  CD = (Y1 - Y0 - 2 * WALL) / 4,
  BRICK_H = 5;
const TANK = { x: 84, y: 6, r: 8, z1: BH + 36 },
  PICKER = [96, 34];
const WATER = matOf('#8fc6e6');

/** How the bricks lie: the first 16 in the crate (weights then cache), the rest spilled. Pure, for tests. */
export function packOf(o: Pick<CrateOpts, 'weights' | 'cache'>) {
  const kinds = [...Array<'w'>(Math.max(0, o.weights)).fill('w'), ...Array<'c'>(Math.max(0, o.cache ?? 0)).fill('c')];
  return { inside: kinds.slice(0, CRATE_BRICKS), spilled: kinds.slice(CRATE_BRICKS) };
}

const mat = (k: 'w' | 'c') => (k === 'w' ? PALS.cobalt : PALS.mint);
const brickAt = (i: number, k: 'w' | 'c') => {
  const x = FX + (i % 4) * CW,
    y = FY + Math.floor(i / 4) * CD;
  return `<g data-brick="${k}">${box(x + 0.7, y + 0.6, BH + 1, x + CW - 0.7, y + CD - 0.6, BH + 1 + BRICK_H, mat(k), toneI, 0.8)}</g>`;
};

/** The crate: a floor, four walls (tomato when hot), a home bar on the near rim, and its bricks. */
function crate(o: CrateOpts, inside: ('w' | 'c')[]): Item {
  const body = o.hot ? PALS.tomato : DARK;
  let s = box(X0, Y0, BH, X1, Y1, BH + 1, body, toneI, 1);
  s += box(X0, Y0, BH + 1, X1, Y0 + WALL, TOP, body, toneI, 1);
  s += box(X0, Y0 + WALL, BH + 1, X0 + WALL, Y1 - WALL, TOP, body, toneI, 1);
  const w = inside.map((k, i) => (k === 'w' ? brickAt(i, k) : '')).join(''),
    c = inside.map((k, i) => (k === 'c' ? brickAt(i, k) : '')).join('');
  s += `<g data-part="bricks">${w}</g><g data-part="cache">${c}</g>`;
  s += box(X1 - WALL, Y0 + WALL, BH + 1, X1, Y1 - WALL, TOP, body, toneI, 1);
  s += box(X0, Y1 - WALL, BH + 1, X1, Y1, TOP, body, toneI, 1);
  s += box(X0 + 22, Y1 - WALL * 0.6, TOP, X1 - 22, Y1 - WALL * 0.4, TOP + 0.6, METAL, toneI, 0.6);
  if (o.hot)
    for (const x of [20, 37, 54]) {
      const [px, py] = P(x, 6, TOP + 6);
      s += `<path class="heat" d="M${px.toFixed(1)} ${py.toFixed(1)} q 3 -4 0 -8 q -3 -4 0 -8" fill="none" stroke="${PALS.tomato.m}" stroke-width="1.6" stroke-linecap="round"/>`;
    }
  return {
    box: [
      [X0, Y0, BH],
      [X1, Y1, TOP],
    ],
    svg: `<g data-part="crate" data-hot="${o.hot ? 1 : 0}">${s}</g>`,
  };
}

/** The tank: a glass drum on a base ring, its water at the charge left, a cap, and a pipe into the crate. */
function tank(level: number): Item {
  const { x, y, r, z1 } = TANK,
    lv = Math.max(0, Math.min(1, level)),
    zw = BH + 2 + lv * (z1 - BH - 4);
  let s = rod([X1, y, BH + 5], [x - r, y, BH + 5], 1.2, METAL, toneI, 0.9);
  s += cyl(x, y, BH, BH + 2, r + 1, DARK, toneI, 1);
  s += `<g opacity=".5">${cyl(x, y, BH + 2, z1, r, CLEAR, toneI, 0.9)}</g>`;
  if (lv > 0) s += cyl(x, y, BH + 2, zw, r - 0.8, WATER, toneI, 0.8);
  s += cyl(x, y, z1, z1 + 2, r + 1, DARK, toneI, 1);
  return {
    box: [
      [x - r - 1, y - r - 1, BH],
      [x + r + 1, y + r + 1, z1 + 2],
    ],
    svg: `<g data-part="tank" data-level="${lv.toFixed(3)}">${s}</g>`,
  };
}

/** The pallet rack behind: two bays of shelves with cartons. */
function rack(): Item {
  const y0 = -38,
    y1 = -26;
  let s = '';
  for (const x of [0, 52, 104]) s += box(x - 1, y0, BH, x + 1, y1, BH + 48, PALS.tomato, toneI, 0.9);
  for (const z of [BH + 14, BH + 30, BH + 46]) {
    s += box(-1, y0, z, 105, y1, z + 2, PALS.cobalt, toneI, 0.9);
    for (const [x, w] of [
      [6, 14],
      [26, 10],
      [58, 16],
      [80, 12],
    ])
      if (z < BH + 46) s += box(x, y0 + 1, z + 2, x + w, y1 - 1, z + 11, WOOD, toneI, 0.8);
  }
  return {
    box: [
      [-1, y0, BH],
      [105, y1, BH + 48],
    ],
    svg: `<g data-part="rack">${s}</g>`,
  };
}

/** Spilled bricks on the floor in front, two rows of four. */
function spill(spilled: ('w' | 'c')[]): Item[] {
  return spilled.slice(0, SPILL_DRAWN).map((k, i) => {
    const x = 8 + (i % 4) * 13 + (i % 2) * 2,
      y = 30 + Math.floor(i / 4) * 8;
    return {
      box: [
        [x, y, BH],
        [x + 10, y + 6, BH + BRICK_H],
      ],
      svg: `<g data-part="spill" data-brick="${k}">${box(x, y, BH, x + 10, y + 6, BH + BRICK_H, mat(k), toneI, 0.8)}</g>`,
    };
  });
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;

/** The aisle. Every shadow, one depth sort over rack, crate, tank and spill, the picker, then pills. */
export const crateScene = (o: CrateOpts) => (ctx: SceneCtx) => {
  const scale = o.scale ?? 1,
    narrow = scale > 1.5,
    { inside, spilled } = packOf(o);
  const spills = spill(spilled);
  const set: Piece = {
    shadow:
      castShadow(boxCorners(-1, -38, BH, 105, -26, BH + 48), BH, ctx.top) +
      castShadow(boxCorners(X0, Y0, BH, X1, Y1, TOP), BH, ctx.top) +
      castShadow(
        boxCorners(TANK.x - TANK.r, TANK.y - TANK.r, BH, TANK.x + TANK.r, TANK.y + TANK.r, TANK.z1),
        BH,
        ctx.top,
      ),
    items: [rack(), crate(o, inside), tank(o.level), ...spills],
    box: [
      [-1, -38, BH],
      [105, 44, BH + 48],
    ],
  };
  const picker = person({ x: PICKER[0], y: PICKER[1], facing: '-x', look: 'tomas', holding: null });
  const s = compact(tight(drawPieces([set], ctx.top) + `<g data-part="picker">${drawPieces([picker], ctx.top)}</g>`));
  const pills: string[] = [];
  if (o.load) pills.push(pill([(X0 + X1) / 2, Y1, TOP], 0, 34, o.load, false, scale));
  if (o.charge && !narrow) pills.push(pill([TANK.x, TANK.y, TANK.z1 + 2], 0, -14, o.charge, false, scale));
  if (spilled.length > SPILL_DRAWN) pills.push(pill([30, 44, BH], 0, 20, `+${spilled.length} SPILLED`, true, scale));
  pills.push(
    sayAt(o.say, 'crate', [X0 + 10, Y0 + 4, TOP], -8, scale, narrow),
    sayAt(o.say, 'bricks', [FX + CW, FY + CD, BH + 6], -8, scale, narrow),
    inside.includes('c') ? sayAt(o.say, 'cache', [X1 - 14, Y1 - 8, BH + 6], -8, scale, narrow) : '',
    spills.length ? sayAt(o.say, 'spill', [20, 32, BH + 5], -8, scale, narrow) : '',
    sayAt(o.say, 'tank', [TANK.x, TANK.y, TANK.z1 + 2], -8, scale, narrow),
    sayAt(o.say, 'picker', [PICKER[0], PICKER[1], BH + 36], -8, scale, narrow),
  );
  return s + calloutsLast(pills);
};

/** The picture in words, for its aria-label. */
export function crateLabel(o: CrateOpts): string {
  const { inside, spilled } = packOf(o),
    w = inside.filter(k => k === 'w').length,
    c = inside.length - w;
  const packed = `${w} weight brick${w === 1 ? '' : 's'}${c ? ` and ${c} cache brick${c === 1 ? '' : 's'}` : ''}`;
  return `The handheld drawn as a phone-shaped crate in a warehouse aisle, holding ${packed} of ${CRATE_BRICKS}${spilled.length ? `; ${spilled.length} more spill onto the floor` : ''}${o.hot ? '; it glows hot' : ''}. Its battery tank is ${Math.round(Math.max(0, Math.min(1, o.level)) * 100)}% full.`;
}

/** The home hero's plot (heroScene): the crate packed with twelve bricks and its tank, set down small. */
export function phoneCratePlot(x: number, y: number, top: SceneCtx['top']): string {
  const o: CrateOpts = { weights: 10, cache: 2, level: 0.7 };
  const p = mini(
    {
      shadow: castShadow(boxCorners(X0, Y0, BH, TANK.x + TANK.r, Y1, TOP), BH, top),
      items: [crate(o, packOf(o).inside), tank(o.level)],
    },
    [44, 6, BH],
    [x, y, BH],
    0.32,
  );
  return drawPieces([p]);
}
