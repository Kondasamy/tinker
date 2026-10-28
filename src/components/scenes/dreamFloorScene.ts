// Video and world models' picture: the warehouse dream (U29). The real floor stands on the left: its 16 × 16 cells as
// flat tiles, the belt row dark, shelves as mint racks, the robot a mustard drum and the crate a tomato box. Beside it
// the projector screen lies flat on its stand: the model's guess of the same frame, every cell a flat tile in its kind's
// colour, any cell that differs from the real floor ringed in tomato. On phones (or when the kit asks) one floor shows
// at a time on its own board, so cells stay large. Words only in pills; esc() on every pill.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, calloutsLast, esc, sayAt } from '../../lib/iso/blocks';
import {
  CERAMIC,
  CLEAR,
  DARK,
  METAL,
  PALS,
  box,
  byDepth,
  castShadow,
  cyl,
  hullInk,
  line,
  pd,
  shape,
  tag,
  toneI,
} from '../../lib/iso/core.js';
import { BELT, CRATE, FLOOR, ROBOT, SHELF, SIZE } from '../../lib/video-models/world';
import type { Say } from '../story/steps';

/** A cell's side in board units; a floor is SIZE cells square. */
const CELL = 6,
  SIDE = SIZE * CELL,
  /** the screen's left edge: a cell's gap past the real floor */
  GAP = 18,
  /** the floor's tiles and the screen's face, above the board */
  FLOOR_TOP = BH + 2,
  SCREEN_TOP = BH + 4;
export const DREAM_X = SIDE + GAP;
/** Both floors side by side. */
export const PAIR_BOARD: Board = [-4, -4, DREAM_X + SIDE + 4, SIDE + 4];
/** One floor alone (phones, or a chapter with no dream yet). */
export const FLOOR_ONLY_BOARD: Board = [-4, -4, SIDE + 4, SIDE + 4];

export type Show = 'both' | 'real' | 'dream';
export interface DreamOpts {
  /** the real frame (SIZE × SIZE kinds) */
  real: Uint8Array;
  /** the model's frame for the same step; none before a model runs */
  dream?: Uint8Array | null;
  /** which floors to draw; 'both' needs a dream */
  show?: Show;
  /** the frame's step number */
  step?: number;
  /** whether the dream's frame is a real one swapped in */
  synced?: boolean;
  /** pill size; phones pass more */
  scale?: number;
  say?: Say;
}
/** The parts a step's callout may name. */
export const DREAM_PARTS = ['floor', 'dream', 'robot', 'crate', 'belt'] as const;

/** What the options draw: both floors only with a dream to show. */
export const shownOf = (o: Pick<DreamOpts, 'dream' | 'show'>): Show =>
  !o.dream ? 'real' : o.show === 'real' || o.show === 'dream' ? o.show : 'both';
export const boardOf = (o: Pick<DreamOpts, 'dream' | 'show'>): Board =>
  shownOf(o) === 'both' ? PAIR_BOARD : FLOOR_ONLY_BOARD;

const TILE = { [FLOOR]: CERAMIC.l, [SHELF]: PALS.mint.l, [ROBOT]: PALS.mustard.l, [CRATE]: PALS.tomato.l } as Record<
  number,
  string
>;
const flat = (x0: number, y0: number, x1: number, y1: number, z: number, c: string, w = 0) =>
  shape(
    [
      [x0, y0, z],
      [x1, y0, z],
      [x1, y1, z],
      [x0, y1, z],
    ],
    c,
    w,
  );

/** The grid's lines over a floor at x0. */
function grid(x0: number, z: number) {
  let s = '';
  for (let i = 0; i <= SIZE; i++) {
    s += line(
      [
        [x0 + i * CELL, 0, z],
        [x0 + i * CELL, SIDE, z],
      ],
      0.25,
    );
    s += line(
      [
        [x0, i * CELL, z],
        [x0 + SIDE, i * CELL, z],
      ],
      0.25,
    );
  }
  return s;
}

/** The real floor: tiles and the belt, then racks, the robot and the crate in depth order. */
function realFloor(f: Uint8Array, x0: number) {
  const z = FLOOR_TOP;
  let s = box(x0 - 2, -2, BH, x0 + SIDE + 2, SIDE + 2, z, METAL, toneI, 1);
  s += flat(x0, BELT * CELL, x0 + SIDE, (BELT + 1) * CELL, z + 0.02, DARK.m);
  s += grid(x0, z + 0.04);
  const parts: { at: number[]; svg: string }[] = [];
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const k = f[y * SIZE + x],
        a = x0 + x * CELL,
        b = y * CELL;
      if (k === SHELF)
        parts.push({
          at: [a + 3, b + 3, 0],
          svg: box(a + 0.4, b + 0.4, z, a + 5.6, b + 5.6, z + 7, PALS.mint, toneI, 0.7),
        });
      else if (k === ROBOT)
        parts.push({
          at: [a + 3, b + 3, 0],
          svg: `<g data-robot="${x},${y}">${cyl(a + 3, b + 3, z, z + 5, 2.4, PALS.mustard, toneI, 0.8)}${cyl(a + 3, b + 3, z + 5, z + 6.4, 1.2, DARK, toneI, 0.6)}</g>`,
        });
      else if (k === CRATE)
        parts.push({
          at: [a + 3, b + 3, 0],
          svg: `<g data-crate="${x}">${box(a + 0.9, b + 0.9, z, a + 5.1, b + 5.1, z + 4.2, PALS.tomato, toneI, 0.8)}</g>`,
        });
    }
  return `<g data-part="floor" data-frame="${f.join('')}">${s + byDepth(parts) + hullInk(boxCorners(x0 - 2, -2, BH, x0 + SIDE + 2, SIDE + 2, z), 1.4)}</g>`;
}

/** The projector screen: a pale slab on a dark stand, every cell a flat tile, wrong cells ringed. */
function screen(f: Uint8Array, real: Uint8Array | null, x0: number) {
  const z = SCREEN_TOP;
  let s = box(x0 + 6, 6, BH, x0 + SIDE - 6, SIDE - 6, FLOOR_TOP, DARK, toneI, 1);
  s += box(x0 - 2, -2, FLOOR_TOP, x0 + SIDE + 2, SIDE + 2, z, CLEAR, toneI, 1);
  // one path per kind, so 256 tiles cost four paths
  const paths: Record<number, string> = {};
  let wrong = '',
    n = 0;
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const k = f[y * SIZE + x],
        a = x0 + x * CELL,
        b = y * CELL;
      if (k !== FLOOR) paths[k] = (paths[k] ?? '') + flat(a + 0.3, b + 0.3, a + 5.7, b + 5.7, z + 0.05, TILE[k], 0.5);
      if (real && real[y * SIZE + x] !== k) {
        n++;
        wrong += pd([
          [a + 0.2, b + 0.2, z + 0.1],
          [a + 5.8, b + 0.2, z + 0.1],
          [a + 5.8, b + 5.8, z + 0.1],
          [a + 0.2, b + 5.8, z + 0.1],
        ]);
      }
    }
  s += flat(x0, BELT * CELL, x0 + SIDE, (BELT + 1) * CELL, z + 0.02, CLEAR.m);
  s += grid(x0, z + 0.03);
  s += Object.values(paths).join('');
  if (wrong) s += `<path class="wrong" d="${wrong}" fill="none" stroke="${PALS.tomato.m}" stroke-width="1.3"/>`;
  return `<g data-part="dream" data-frame="${f.join('')}" data-wrong="${n}">${s + hullInk(boxCorners(x0 - 2, -2, BH, x0 + SIDE + 2, SIDE + 2, z), 1.4)}</g>`;
}

const pill = (p: number[], dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, 0, dy, esc(text), lit, scale)}</g>`;
const cellAt = (f: Uint8Array, kind: number) => {
  const c = f.indexOf(kind);
  return c < 0 ? null : { x: c % SIZE, y: Math.floor(c / SIZE) };
};

/** The warehouse dream. Shadows, the floors, then the pills (callouts last). */
export const dreamScene = (o: DreamOpts) => (ctx: SceneCtx) => {
  const scale = o.scale ?? 1,
    narrow = scale > 1.5,
    show = shownOf(o);
  const realX = show === 'both' || show === 'real' ? 0 : null,
    dreamX = show === 'both' ? DREAM_X : show === 'dream' ? 0 : null;
  let s = '';
  if (realX !== null)
    s += castShadow(boxCorners(realX - 2, -2, BH, realX + SIDE + 2, SIDE + 2, FLOOR_TOP), BH, ctx.top);
  if (dreamX !== null)
    s += castShadow(boxCorners(dreamX - 2, -2, BH, dreamX + SIDE + 2, SIDE + 2, SCREEN_TOP), BH, ctx.top);
  if (realX !== null) s += realFloor(o.real, realX);
  if (dreamX !== null && o.dream) s += screen(o.dream, o.real, dreamX);
  // parts named on the floor shown: the real one, else the dream
  const on = realX !== null ? o.real : (o.dream ?? o.real),
    x0 = realX ?? dreamX ?? 0;
  const robot = cellAt(on, ROBOT),
    crate = cellAt(on, CRATE);
  const front = (x: number) => [x + SIDE, SIDE, FLOOR_TOP],
    at = (c: { x: number; y: number } | null, h: number) =>
      c ? [x0 + c.x * CELL + 3, c.y * CELL + 3, FLOOR_TOP + h] : [x0 + SIDE / 2, SIDE / 2, FLOOR_TOP];
  const robotAt = at(robot, 6),
    crateAt = at(crate, 4),
    beltAt = [x0 + SIDE, (BELT + 0.5) * CELL, FLOOR_TOP];
  const step = o.step === undefined ? '' : narrow ? '' : ` · STEP ${o.step}`;
  const pills: string[] = [];
  if (realX !== null) pills.push(pill(front(realX), 22, `REAL${dreamX === null ? step : ''}`, false, scale));
  if (dreamX !== null)
    pills.push(pill(front(dreamX), 22, `${o.synced ? 'RE-SYNCED' : 'DREAM'}${step}`, !!o.synced, scale));
  pills.push(
    sayAt(o.say, 'floor', front(realX ?? x0), 22, scale, narrow),
    sayAt(o.say, 'dream', front(dreamX ?? x0), 22, scale, narrow),
    sayAt(o.say, 'robot', robotAt, -10, scale, narrow),
    sayAt(o.say, 'crate', crateAt, -10, scale, narrow),
    sayAt(o.say, 'belt', beltAt, 14, scale, narrow),
  );
  return s + calloutsLast(pills);
};

const where = (f: Uint8Array) => {
  const robots = [...f].filter(k => k === ROBOT).length,
    r = cellAt(f, ROBOT),
    crates = [...f.slice(BELT * SIZE, (BELT + 1) * SIZE)].filter(k => k === CRATE).length,
    c = cellAt(f, CRATE);
  const robot =
    robots === 1 && r ? `the robot at column ${r.x + 1}, row ${r.y + 1}` : robots ? `${robots} robots` : 'no robot';
  const crate = crates === 1 && c ? `the crate at belt cell ${c.x + 1}` : crates ? `${crates} crates` : 'no crate';
  return `${robot}, ${crate}`;
};
/** The picture in words, for its aria-label. */
export function dreamLabel(o: DreamOpts): string {
  const show = shownOf(o),
    step = o.step === undefined ? '' : ` at step ${o.step}`;
  const real = `The real warehouse floor${step}: ${where(o.real)}.`;
  if (!o.dream) return real;
  const n = [...o.dream].filter((k, i) => k !== o.real[i]).length;
  const dream = `${o.synced ? 'The screen shows the real frame, re-synced' : 'The model’s dream on the screen'}: ${where(o.dream)}; ${n} cell${n === 1 ? ' differs' : 's differ'} from the real floor.`;
  return show === 'dream' ? dream : show === 'real' ? real : `${real} ${dream}`;
}

/** The home hero's plot (heroScene): a small floor with a rack, the robot and a crate, and the screen beside it. */
export function dreamPlot(x: number, y: number, top: SceneCtx['top']): string {
  const z = BH + 2;
  let fl = box(x - 18, y - 12, BH, x + 2, y + 12, z, METAL, toneI, 1);
  fl += flat(x - 18, y - 2, x + 2, y + 2, z + 0.05, DARK.m, 0.5);
  fl += box(x - 15, y - 10, z, x - 11, y - 5, z + 6, PALS.mint, toneI, 0.8);
  fl += cyl(x - 6, y + 7, z, z + 4, 2, PALS.mustard, toneI, 0.8);
  fl += box(x - 3, y - 1.5, z, x, y + 1.5, z + 3, PALS.tomato, toneI, 0.8);
  let sc = box(x + 8, y - 12, BH, x + 26, y + 12, z + 1, CLEAR, toneI, 1);
  sc += flat(x + 8, y - 2, x + 26, y + 2, z + 1.05, CLEAR.m, 0.5);
  sc += flat(x + 12, y - 10, x + 16, y - 5, z + 1.1, PALS.mint.l, 0.5);
  sc += flat(x + 17, y + 5, x + 21, y + 9, z + 1.1, PALS.mustard.l, 0.5);
  return (
    castShadow(boxCorners(x - 18, y - 12, BH, x + 26, y + 12, z), BH, top) +
    byDepth([
      { at: [x - 8, y, 0], svg: `<g>${fl}</g>` },
      { at: [x + 17, y, 0], svg: `<g>${sc}</g>` },
    ])
  );
}
