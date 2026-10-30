// Robots that act's picture: Larkspur's parts bay (U8). A gridded parts bin under a gantry: two rails on four posts,
// a bridge that rides them across the bin's columns, a trolley that rides the bridge across its rows, and the claw
// gripper hanging from it with a camera on the trolley (the hero object). Crates block cells; one part waits; the
// goal tray stands just past the bin's right wall at its row. Mira (CAST) stands at the bay; the model machine (the
// policy) is the robot's brain, its screen the run's outcome. The claw's path so far is a line on the bin's floor.
// Poor light dims the bay. Words only in pills; esc() on every pill.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, calloutsLast, esc, sayAt } from '../../lib/iso/blocks';
import { CERAMIC, DARK, METAL, PALS, WOOD, box, castShadow, cyl, line, rod, tag, toneI } from '../../lib/iso/core.js';
import { drawPieces, mini, modelMachine, person, type Item, type ModelState } from '../../lib/iso/figures';
import { compact } from '../../lib/iso/compact';
import { H, W, type Cell, type Layout, type State } from '../../lib/robots/world';
import type { Say } from '../story/steps';

/** The parts a step's callout may name. */
export const CLAW_PARTS = ['claw', 'camera', 'part', 'tray', 'crate', 'bin', 'mira', 'machine'] as const;

export interface ClawOpts {
  layout: Layout;
  state: State;
  /** the claw's cells so far, drawn as a line on the floor */
  trail?: Cell[];
  /** the bay's light (default the layout's): under 1 the bay dims */
  light?: number;
  /** the machine's screen; none: idle */
  machine?: ModelState;
  /** the claw's pill (a few words); none: no pill */
  pill?: string;
  scale?: number;
  say?: Say;
}

// ---- layout: a cell is C units; the bin from (0, 0) to (W·C, H·C), the tray past its right wall ----
const C = 8,
  BX = W * C,
  BY = H * C,
  WALL = 3,
  ZR = BH + 38,
  /** the claw's hanging height: its fingers reach the part */
  ZC = BH + 12;
const MIRA: Cell = [-16, 30],
  MACHINE: Cell = [96, 2];
export const CLAW_BOARD: Board = [-28, -14, 112, 60];
const mid = (c: Cell): [number, number] => [c[0] * C + C / 2 + (c[0] >= W ? 3 : 0), c[1] * C + C / 2];

const wrap = (part: string, svg: string, extra = '') => `<g data-part="${part}"${extra}>${svg}</g>`;

/** The bin: a low floor ruled into cells and four low walls. The near walls are their own items, so crates sort
 * between them. */
function bin(trail: number[][] = []): Item[] {
  let floor = box(0, 0, BH, BX, BY, BH + 1, CERAMIC, toneI, 1);
  for (let i = 1; i < W; i++)
    floor += line(
      [
        [i * C, 0, BH + 1.02],
        [i * C, BY, BH + 1.02],
      ],
      0.5,
    );
  for (let j = 1; j < H; j++)
    floor += line(
      [
        [0, j * C, BH + 1.02],
        [BX, j * C, BH + 1.02],
      ],
      0.5,
    );
  if (trail.length > 1) floor += `<g class="trail">${line(trail, 1.4)}</g>`;
  const wall = (x0: number, y0: number, x1: number, y1: number) => box(x0, y0, BH, x1, y1, BH + WALL, WOOD, toneI, 1);
  return [
    {
      box: [
        [-1, -1, BH],
        [BX, BY, BH + 1],
      ],
      svg: wrap('bin', floor + wall(-1, -1, BX + 1, 0) + wall(-1, 0, 0, BY + 1)),
    },
    {
      box: [
        [BX, -1, BH],
        [BX + 1, BY + 1, BH + WALL],
      ],
      svg: wall(BX, -1, BX + 1, BY + 1),
    },
    {
      box: [
        [-1, BY, BH],
        [BX, BY + 1, BH + WALL],
      ],
      svg: wall(-1, BY, BX, BY + 1),
    },
  ];
}

/** A crate filling one cell: slats on its top. */
function crate(c: Cell, first: boolean): Item {
  const x0 = c[0] * C + 0.6,
    y0 = c[1] * C + 0.6,
    x1 = x0 + C - 1.2,
    y1 = y0 + C - 1.2,
    z1 = BH + 9;
  const s =
    box(x0, y0, BH + 1, x1, y1, z1, WOOD, toneI, 1) +
    line(
      [
        [x0 + 2, y0 + 1, z1 + 0.02],
        [x0 + 2, y1 - 1, z1 + 0.02],
      ],
      0.6,
    ) +
    line(
      [
        [x1 - 2, y0 + 1, z1 + 0.02],
        [x1 - 2, y1 - 1, z1 + 0.02],
      ],
      0.6,
    );
  return {
    box: [
      [x0, y0, BH + 1],
      [x1, y1, z1],
    ],
    svg: first ? wrap('crate', s) : s,
  };
}

/** The part: a cobalt flanged bushing, lying in its cell or hanging in the claw. */
function part(x: number, y: number, z: number): string {
  return (
    cyl(x, y, z, z + 1.2, 2.8, PALS.cobalt, toneI, 0.9, 14) +
    cyl(x, y, z + 1.2, z + 3.6, 1.8, PALS.cobalt, toneI, 0.9, 12)
  );
}

/** The tray: a mint tray on a short stand beside the bin, at its row. */
function tray(row: number, holds: boolean): Item {
  const [x, y] = mid([W, row]),
    x0 = x - 5,
    x1 = x + 5,
    y0 = y - 5,
    y1 = y + 5,
    z = BH + 4;
  let s = box(x - 1.5, y - 1.5, BH, x + 1.5, y + 1.5, z, METAL, toneI, 0.9);
  s += box(x0, y0, z, x1, y1, z + 1, PALS.mint, toneI, 1);
  s +=
    box(x0, y0, z + 1, x1, y0 + 0.8, z + 2.6, PALS.mint, toneI, 0.8) +
    box(x0, y0, z + 1, x0 + 0.8, y1, z + 2.6, PALS.mint, toneI, 0.8);
  if (holds) s += part(x, y, z + 1);
  s +=
    box(x0, y1 - 0.8, z + 1, x1, y1, z + 2.6, PALS.mint, toneI, 0.8) +
    box(x1 - 0.8, y0, z + 1, x1, y1, z + 2.6, PALS.mint, toneI, 0.8);
  return {
    box: [
      [x0, y0, BH],
      [x1, y1, z + 2.6],
    ],
    svg: wrap('tray', s, ` data-holds="${holds ? 1 : 0}"`),
  };
}

/** The gantry: four posts and two rails along the bin's columns; the bridge across at the claw's column, the trolley
 * on it at the claw's row with the camera, and the claw on its cable (fingers closed while it holds). */
function gantry(x: number, y: number, holding: boolean): Item[] {
  const y0 = -5,
    y1 = BY + 5,
    x0 = -5,
    x1 = BX + 14;
  const post = (px: number, py: number): Item => ({
    box: [
      [px - 1.2, py - 1.2, BH],
      [px + 1.2, py + 1.2, ZR],
    ],
    svg: box(px - 1.2, py - 1.2, BH, px + 1.2, py + 1.2, ZR, METAL, toneI, 1),
  });
  const rail = (py: number): Item => ({
    box: [
      [x0 - 1.5, py - 1.5, ZR],
      [x1 + 1.5, py + 1.5, ZR + 2.4],
    ],
    svg: box(x0 - 1.5, py - 1.5, ZR, x1 + 1.5, py + 1.5, ZR + 2.4, PALS.mustard, toneI, 1),
  });
  let claw = box(x - 2.4, y0, ZR + 2.4, x + 2.4, y1, ZR + 5, PALS.mustard, toneI, 1);
  claw += box(x - 3.4, y - 3.4, ZR - 1.5, x + 3.4, y + 3.4, ZR + 5.8, DARK, toneI, 1);
  const cam =
    box(x + 3.4, y - 1.6, ZR - 1, x + 5.6, y + 1.6, ZR + 1.8, DARK, toneI, 0.9) +
    cyl(x + 5.6, y, ZR - 0.6, ZR + 1.4, 0.9, PALS.cobalt, toneI, 0.7, 10);
  claw += wrap('camera', cam);
  let hand = rod([x, y, ZR - 1.5], [x, y, ZC + 3], 0.5, METAL, toneI, 0.8);
  hand += cyl(x, y, ZC + 1, ZC + 3.2, 2.6, PALS.tomato, toneI, 1, 14);
  const spread = holding ? 2.4 : 3.6;
  for (const [dx, dy] of [
    [spread, 0],
    [-spread, 0],
    [0, spread],
    [0, -spread],
  ])
    hand += rod([x + dx * 0.6, y + dy * 0.6, ZC + 1], [x + dx, y + dy, ZC - 4], 0.45, METAL, toneI, 0.8);
  if (holding) hand += part(x, y, ZC - 5);
  return [
    post(x0, y0),
    post(x1, y0),
    post(x0, y1),
    post(x1, y1),
    rail(y0),
    rail(y1),
    {
      box: [
        [x - 3.4, y0, ZC - 6],
        [x + 5.6, y1, ZR + 5.8],
      ],
      svg: wrap('claw', claw + hand, ` data-cell="${x},${y}"`),
    },
  ];
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;

/** The parts bay. Every shadow, one depth sort, the dimming, then pills. */
export const clawScene = (o: ClawOpts) => (ctx: SceneCtx) => {
  const scale = o.scale ?? 1,
    narrow = scale > 1.5,
    l = o.layout,
    s = o.state,
    light = o.light ?? l.light;
  const [cx, cy] = mid(s.claw);
  const mira = person({ x: MIRA[0], y: MIRA[1], facing: '+x', look: 'mira', holding: null }),
    machine = modelMachine(MACHINE[0], MACHINE[1], 0.7, o.machine);
  const inTray = !s.holding && s.end === 'done';
  const trail = (o.trail ?? []).map(c => [...mid(c), BH + 1.1]);
  const items: Item[] = [
    ...bin(trail),
    ...l.crates.map((c, i) => crate(c, i === 0)),
    tray(l.tray, inTray),
    ...gantry(cx, cy, s.holding),
  ];
  if (!s.holding && !inTray) {
    const [px, py] = mid(s.part);
    items.push({
      box: [
        [px - 2.8, py - 2.8, BH + 1],
        [px + 2.8, py + 2.8, BH + 4.6],
      ],
      svg: wrap('part', part(px, py, BH + 1)),
    });
  }
  const shadow =
    castShadow(boxCorners(-1, -1, BH, BX + 1, BY + 1, BH + WALL), BH, ctx.top) +
    castShadow(boxCorners(-5, -6, ZR, BX + 14, BY + 6, ZR + 2.4), BH, ctx.top);
  const svg = compact(
    drawPieces([
      { shadow, items },
      { shadow: mira.shadow, items: mira.items.map(i => ({ ...i, svg: wrap('mira', i.svg) })) },
      { shadow: machine.shadow, items: machine.items.map(i => ({ ...i, svg: wrap('machine', i.svg) })) },
    ]),
  );
  // poor light: the whole bay dims (the camera's view of it too)
  const dim =
    light < 1
      ? `<rect class="dim" x="-2000" y="-2000" width="4000" height="4000" fill="#1c2948" opacity="${Math.min(0.5, (1 - light) * 0.8).toFixed(2)}" pointer-events="none"/>`
      : '';
  const [tx, ty] = mid([W, l.tray]);
  const pills: string[] = [];
  if (o.pill) pills.push(pill([cx, cy, ZR + 6], 0, -18, o.pill, s.end === 'done', scale));
  if (!narrow) pills.push(pill([tx, ty, BH + 6], 18, 22, 'TRAY', false, scale));
  pills.push(
    sayAt(o.say, 'claw', [cx, cy, ZC], -10, scale, narrow),
    sayAt(o.say, 'camera', [cx + 5, cy, ZR], -40, scale, narrow),
    sayAt(o.say, 'tray', [tx, ty, BH + 6], -6, scale, narrow),
    sayAt(o.say, 'bin', [BX / 2, BY, BH + WALL], 30, scale, narrow),
    sayAt(o.say, 'mira', [MIRA[0], MIRA[1], BH + 32], -10, scale, narrow),
    sayAt(o.say, 'machine', [MACHINE[0], MACHINE[1], BH + 24], -10, scale, narrow),
    !s.holding && !inTray ? sayAt(o.say, 'part', [...mid(s.part), BH + 4], 10, scale, narrow) : '',
    l.crates.length ? sayAt(o.say, 'crate', [...mid(l.crates[0]), BH + 9], 10, scale, narrow) : '',
  );
  return `<g data-light="${light.toFixed(2)}" data-end="${s.end ?? ''}">${svg}</g>${dim}${calloutsLast(pills)}`;
};

/** The picture in words, for its aria-label. */
export function clawLabel(o: ClawOpts): string {
  const s = o.state,
    l = o.layout;
  const where = s.holding
    ? 'holding the part'
    : s.end === 'done'
      ? 'and the part is in the tray'
      : 'with the part on the floor';
  const end = s.end === 'off-grid' ? ' It drove off the grid.' : s.end === 'stuck' ? ' It is stuck.' : '';
  const dim = (o.light ?? l.light) < 1 ? ' The bay is dimly lit.' : '';
  return `Larkspur's parts bay: a claw on a gantry over a bin of ${W} by ${H} cells with ${l.crates.length} crates, at column ${s.claw[0] + 1}, row ${s.claw[1] + 1}, ${where}. The tray is beside the bin at row ${l.tray + 1}. Mira stands at the bay.${end}${dim}`;
}

/** The home hero's stand plot: the claw gantry over a small bin, set down small. */
export function clawPlot(x: number, y: number, top: SceneCtx['top']): string {
  const items = [...bin(), ...gantry(mid([3, 2])[0], mid([3, 2])[1], true)];
  const p = mini(
    { shadow: castShadow(boxCorners(-1, -1, BH, BX + 1, BY + 1, BH + WALL), BH, top), items },
    [BX / 2, BY / 2, BH],
    [x, y, BH],
    0.32,
  );
  return drawPieces([p]);
}
