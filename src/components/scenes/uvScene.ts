// Watermarks' picture: the UV print room (U16). A light table holds the reply page: its tokens as tiles in two rows of
// 32, in reading order, never words. The model machine that wrote it stands at the table's left end, Larkspur's clerk at
// the right. A UV lamp, a variant of the kit's lamp (weighted base, slim post, cap), rides a carriage along a rail at the
// table's back edge, its arm reaching over the page to a violet tube in a hood. Tokens under the tube light up: green
// as a raised mint tile, red as a flat tomato tile notched in its front edge (never colour alone); "all" stretches the
// tube over the page. Chapter 6 swaps the page for a photo print and its signed label card. Words only in pills; esc()
// on every pill.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, calloutsLast, esc, sayAt } from '../../lib/iso/blocks';
import {
  CERAMIC,
  CLEAR,
  DARK,
  METAL,
  PALS,
  P,
  WOOD,
  box,
  castShadow,
  cyl,
  hull,
  matOf,
  pd,
  rod,
  shape,
  sp,
  tag,
  toneI,
} from '../../lib/iso/core.js';
import { drawPieces, mini, modelMachine, person, tight, type Item, type Piece } from '../../lib/iso/figures';
import { compact } from '../../lib/iso/compact';
import { decode, encode } from '../../lib/lm/bpe';
import { isGreen, KEY } from '../../lib/watermarks/greenlist';
import type { Pic } from '../../lib/watermarks/pixels';
import { MARK } from '../../lib/watermarks/story';
import PINNED from '../../../data/watermarks/pinned.json' with { type: 'json' };
import type { Say } from '../story/steps';

/** Tokens a row, rows a page: the reply's 64 tokens (KTD10's cap). */
export const COLS = 32,
  ROWS = 2,
  MAX_TOKENS = COLS * ROWS;
/** Columns under the lamp's tube: both rows, so 16 tokens at a time. */
export const WINDOW = 8;
/** The lamp's left-column positions along the page. */
export const LAMP_STOPS = COLS - WINDOW + 1;

const PITCH = 4,
  TW = 3.2,
  TD = 4,
  ROW_Y = [1, 7],
  /** the light table's glass top, and the page on it */
  TOP = BH + 16,
  ZP = TOP + 0.4,
  /** the rail's top, under the lamp's carriage; raised tiles stay below it so the lamp sorts after the table */
  RAIL = TOP + 2,
  RAISE = 1.4,
  /** the tube's underside and the arm's height */
  TUBE = TOP + 13,
  ARM = TOP + 22,
  RAIL_Y = -10,
  /** the print's corner and side at full size (64 px) */
  PX0 = 52,
  PY0 = -7,
  PSIDE = 24,
  CARD = [80, 0, 92, 10];
const MX = -26,
  MY = 3,
  CLERK = [146, 4];
export const UV_BOARD: Board = [-42, -16, 154, 22];

/** The parts a step's callout may name. */
export const UV_PARTS = ['page', 'lamp', 'machine', 'clerk', 'print', 'label'] as const;

export interface PrintView {
  /** the picture as it arrived */
  pic: Pic;
  /** whether its signed label came with it */
  label: boolean;
  /** whether the checker finds the pixel mark */
  found: boolean;
}
export interface UvOpts {
  /** the page's token ids (at most 64 drawn) */
  ids: number[];
  /** the token before the first: the prompt's last */
  prev: number;
  gamma: number;
  key?: number;
  /** the tube's left column (0 to LAMP_STOPS − 1), 'all' for the whole page, null with the lamp parked and off */
  lamp: number | 'all' | null;
  /** a token picked for rewording */
  picked?: number | null;
  /** chapter 6: a photo print and its label instead of the page */
  print?: PrintView;
  /** pill size; phones pass more */
  scale?: number;
  say?: Say;
}

const clampStop = (c: number) => Math.max(0, Math.min(LAMP_STOPS - 1, Math.round(c)));

/** Each drawn tile: green by greenlist.ts after the token before it, and whether the lamp lights it. Pure, for tests. */
export function tilesOf(o: Pick<UvOpts, 'ids' | 'prev' | 'gamma' | 'key' | 'lamp'>) {
  const ids = o.ids.slice(0, MAX_TOKENS),
    c = typeof o.lamp === 'number' ? clampStop(o.lamp) : 0;
  return ids.map((id, i) => ({
    id,
    green: isGreen(i ? ids[i - 1] : o.prev, id, o.gamma, o.key ?? KEY),
    lit: o.lamp === 'all' || (o.lamp !== null && i % COLS >= c && i % COLS < c + WINDOW),
  }));
}

/** The lit tiles' green and red counts. */
export const litCounts = (tiles: ReturnType<typeof tilesOf>) => {
  const lit = tiles.filter(t => t.lit),
    green = lit.filter(t => t.green).length;
  return { lit: lit.length, green, red: lit.length - green };
};

/** A token as a pill or chip shows it: its text in quotes, a newline as ↵. */
export const pieceOf = (id: number) => `‘${decode([id]).replace(/\n/g, '↵')}’`;

const tileAt = (i: number) => {
  const x0 = (i % COLS) * PITCH + 0.4,
    y0 = ROW_Y[Math.floor(i / COLS)];
  return { x0, y0, x1: x0 + TW, y1: y0 + TD };
};
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
/** The x span the tube covers: its window of columns, the whole page, or the print. */
function span(o: UvOpts): [number, number] {
  if (o.print) return [PX0 - 2, PX0 + PSIDE + 2];
  if (o.lamp === 'all') return [-2, COLS * PITCH];
  const c = typeof o.lamp === 'number' ? clampStop(o.lamp) : LAMP_STOPS - 1;
  return [c * PITCH - 0.4, (c + WINDOW) * PITCH - 0.2];
}

/** The light table: legs, a wooden frame with a pale glass top, and the rail along its back edge. */
function table() {
  let s = '';
  for (const [x, y] of [
    [-6, -10],
    [132, -10],
    [-6, 16],
    [132, 16],
  ])
    s += box(x - 1.2, y - 1.2, BH, x + 1.2, y + 1.2, TOP - 2, DARK, toneI, 0.9);
  s += box(-8, -12, TOP - 2, 136, 18, TOP, WOOD, toneI, 1.1);
  s += flat(-6, -9.5, 134, 16, TOP + 0.02, CLEAR.l, 0.6);
  s += box(-6, RAIL_Y - 1.4, TOP, 134, RAIL_Y + 0.4, RAIL, DARK, toneI, 0.9);
  return s;
}

/** The page and its tiles; the lit window's violet pool under them. */
function page(o: UvOpts, tiles: ReturnType<typeof tilesOf>) {
  let s = `<g data-part="page" data-ids="${tiles.map(t => t.id).join(' ')}">`;
  s += flat(-2.5, -1.5, COLS * PITCH + 0.5, 13, ZP - 0.3, CERAMIC.l, 0.8);
  if (o.lamp !== null) {
    const [a, b] = span(o);
    s += `<path d="${pd([
      [Math.max(a, -2.5), -1.5, ZP - 0.25],
      [Math.min(b, COLS * PITCH + 0.5), -1.5, ZP - 0.25],
      [Math.min(b, COLS * PITCH + 0.5), 13, ZP - 0.25],
      [Math.max(a, -2.5), 13, ZP - 0.25],
    ])}" fill="#c9b6f4" opacity=".55"/>`;
  }
  tiles.forEach((t, i) => {
    const { x0, y0, x1, y1 } = tileAt(i),
      xm = (x0 + x1) / 2;
    let g: string;
    if (!t.lit) g = flat(x0, y0, x1, y1, ZP, CERAMIC.m, 0.4);
    else if (t.green) g = box(x0, y0, ZP, x1, y1, ZP + RAISE, PALS.mint, toneI, 0.6);
    else
      g = shape(
        [
          [x0, y0, ZP],
          [x1, y0, ZP],
          [x1, y1, ZP],
          [xm + 0.8, y1, ZP],
          [xm, y1 - 1.4, ZP],
          [xm - 0.8, y1, ZP],
          [x0, y1, ZP],
        ],
        PALS.tomato.l,
        0.6,
      );
    if (o.picked === i) {
      const z = ZP + (t.lit && t.green ? RAISE : 0) + 0.05;
      g += `<path class="picked" d="${pd([
        [x0 - 0.5, y0 - 0.5, z],
        [x1 + 0.5, y0 - 0.5, z],
        [x1 + 0.5, y1 + 0.5, z],
        [x0 - 0.5, y1 + 0.5, z],
      ])}" fill="none" stroke="${PALS.mustard.l}" stroke-width="1.6"/>`;
    }
    s += `<g data-i="${i}" data-lit="${t.lit ? 1 : 0}" data-green="${t.green ? 1 : 0}">${g}</g>`;
  });
  return `${s}</g>`;
}

const GREYS = 6;
/** The photo print: the picture's greys as 16 × 16 cells (a crop prints smaller), a dotted pattern when the mark is
 * found under the lamp, and the label card beside it when the label came along. */
function print(p: PrintView, lit: boolean) {
  const n = 16,
    side = (PSIDE * p.pic.w) / 64,
    cell = side / n,
    paths: string[] = Array(GREYS).fill('');
  for (let v = 0; v < n; v++)
    for (let u = 0; u < n; u++) {
      let sum = 0,
        k = 0;
      for (let y = Math.floor((v * p.pic.h) / n); y < Math.floor(((v + 1) * p.pic.h) / n); y++)
        for (let x = Math.floor((u * p.pic.w) / n); x < Math.floor(((u + 1) * p.pic.w) / n); x++) {
          sum += p.pic.px[y * p.pic.w + x];
          k++;
        }
      const g = Math.min(GREYS - 1, Math.floor((sum / k / 256) * GREYS)),
        x0 = PX0 + u * cell,
        y0 = PY0 + v * cell;
      paths[g] += pd([
        [x0, y0, ZP],
        [x0 + cell, y0, ZP],
        [x0 + cell, y0 + cell, ZP],
        [x0, y0 + cell, ZP],
      ]);
    }
  const hex = (g: number) => {
    const c = Math.round(40 + (g / (GREYS - 1)) * 200)
      .toString(16)
      .padStart(2, '0');
    return `#${c}${c}${c}`;
  };
  let s = flat(PX0 - 1.2, PY0 - 1.2, PX0 + side + 1.2, PY0 + side + 1.2, ZP - 0.3, CERAMIC.l, 0.8);
  s += paths.map((d, g) => (d ? `<path d="${d}" fill="${hex(g)}"/>` : '')).join('');
  if (lit && p.found) {
    let dots = '';
    for (let v = 0; v < n; v++)
      for (let u = (v % 2) * 1; u < n; u += 2) {
        const x = PX0 + (u + 0.5) * cell,
          y = PY0 + (v + 0.5) * cell;
        dots += pd([
          [x - 0.3, y - 0.3, ZP + 0.05],
          [x + 0.3, y - 0.3, ZP + 0.05],
          [x + 0.3, y + 0.3, ZP + 0.05],
          [x - 0.3, y + 0.3, ZP + 0.05],
        ]);
      }
    s += `<path class="mark" d="${dots}" fill="#b89cff"/>`;
  }
  s = `<g data-part="print" data-w="${p.pic.w}" data-found="${lit && p.found ? 1 : 0}">${s}</g>`;
  if (p.label) {
    const [x0, y0, x1, y1] = CARD;
    s += `<g data-part="label">${box(x0, y0, ZP - 0.3, x1, y1, ZP + 0.3, CERAMIC, toneI, 0.8)}${cyl((x0 + x1) / 2, (y0 + y1) / 2, ZP + 0.3, ZP + 1, 2, PALS.tomato, toneI, 0.7, 14)}</g>`;
  }
  return s;
}

const VIOLET = matOf('#a98bea'),
  OFF = matOf('#6f6878');
/** The UV lamp over the span: the kit lamp's weighted base and slim post on a carriage that rides the rail, an arm
 * over the page, and a hooded violet tube; its beam a pale wash down to the page. */
function lamp(o: UvOpts): Item {
  const [a, b] = span(o),
    cx = (a + b) / 2,
    on = o.lamp !== null,
    y = RAIL_Y - 0.5;
  let s = box(cx - 3, y - 2.5, RAIL, cx + 3, y + 2.5, RAIL + 1.6, METAL, toneI, 0.9);
  s += cyl(cx, y, RAIL + 1.6, RAIL + 3, 2.2, DARK, toneI, 1, 14);
  s += rod([cx, y, RAIL + 3], [cx, y, ARM], 0.75, DARK, toneI, 1);
  s += rod([cx, y, ARM], [cx, 6, ARM], 0.6, DARK, toneI, 1);
  s += rod([cx, 6, ARM], [cx, 6, TUBE + 3], 0.6, DARK, toneI, 1);
  s += cyl(cx, y, ARM, ARM + 1.2, 0.9, DARK, toneI, 0.8, 10);
  if (on) {
    const beam = [
      [a + 1, 3.5, TUBE],
      [b - 1, 3.5, TUBE],
      [b - 1, 8.5, TUBE],
      [a + 1, 8.5, TUBE],
      [a, -1.5, ZP],
      [b, -1.5, ZP],
      [b, 13, ZP],
      [a, 13, ZP],
    ];
    s += `<path class="beam" d="${sp(hull(beam.map(p => P(p[0], p[1], p[2]))))}" fill="#b49cf0" opacity=".22"/>`;
  }
  s += box(a + 1, 3.5, TUBE, b - 1, 8.5, TUBE + 1, on ? VIOLET : OFF, toneI, 0.8);
  s += box(a, 2.5, TUBE + 1, b, 9.5, TUBE + 3, DARK, toneI, 1);
  return {
    box: [
      [a, RAIL_Y - 3, RAIL],
      [b, 9.5, ARM + 1.2],
    ],
    svg: `<g data-part="lamp" data-on="${on ? 1 : 0}" data-span="${a.toFixed(1)} ${b.toFixed(1)}">${s}</g>`,
  };
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;

/** The UV print room. Every shadow, one depth sort over the table, the lamp, the machine and the clerk, then pills. */
export const uvScene = (o: UvOpts) => (ctx: SceneCtx) => {
  const scale = o.scale ?? 1,
    narrow = scale > 1.5,
    tiles = o.print ? [] : tilesOf(o),
    lit = o.lamp !== null;
  const top: Piece = {
    shadow: castShadow(boxCorners(-8, -12, BH, 136, 18, TOP), BH, ctx.top),
    items: [
      {
        box: [
          [-8, -12, BH],
          [136, 18, RAIL],
        ],
        svg: table() + (o.print ? print(o.print, lit) : page(o, tiles)),
      },
      lamp(o),
    ],
    box: [
      [-8, -12, BH],
      [136, 18, ARM + 1.2],
    ],
  };
  const machine = modelMachine(MX, MY, 0.8, 'ok'),
    clerk = person({ x: CLERK[0], y: CLERK[1], facing: '-x', look: 'employee', holding: null });
  const s = compact(
    tight(
      `<g data-part="machine">${drawPieces([machine], ctx.top)}</g>` +
        drawPieces([top], ctx.top) +
        `<g data-part="clerk">${drawPieces([clerk], ctx.top)}</g>`,
    ),
  );
  const [a, b] = span(o),
    pills: string[] = [];
  if (!o.print && lit) {
    const c = litCounts(tiles);
    pills.push(
      pill(
        [COLS * PITCH, 13, ZP],
        0,
        30,
        narrow || o.lamp === 'all'
          ? `${c.green} GREEN · ${c.red} RED`
          : `UNDER THE LAMP · ${c.green} GREEN · ${c.red} RED`,
        false,
        scale,
      ),
    );
  }
  if (!o.print && o.picked != null && o.picked >= 0 && o.picked < tiles.length) {
    const { x0, y0, x1, y1 } = tileAt(o.picked);
    pills.push(pill([(x0 + x1) / 2, (y0 + y1) / 2, ZP + RAISE], 0, -30, pieceOf(tiles[o.picked].id), true, scale));
  }
  if (o.print) {
    if (lit)
      pills.push(
        pill([PX0 + PSIDE, PY0 + PSIDE, ZP], 0, 30, o.print.found ? 'MARK FOUND' : 'NO MARK', o.print.found, scale),
      );
    if (o.print.label && !narrow) pills.push(pill([CARD[2], CARD[3], ZP + 1], 10, 20, 'LABEL', false, scale));
  }
  pills.push(
    o.print ? '' : sayAt(o.say, 'page', [COLS * PITCH * 0.3, 13, ZP], -8, scale, narrow),
    sayAt(o.say, 'lamp', [(a + b) / 2, 6, TUBE + 3], -8, scale, narrow),
    sayAt(o.say, 'machine', [MX, MY, BH + 26], -8, scale, narrow),
    sayAt(o.say, 'clerk', [CLERK[0], CLERK[1], BH + 30], -8, scale, narrow),
    o.print ? sayAt(o.say, 'print', [PX0 + PSIDE / 2, PY0 + PSIDE / 2, ZP], -10, scale, narrow) : '',
    o.print?.label ? sayAt(o.say, 'label', [(CARD[0] + CARD[2]) / 2, CARD[1], ZP + 1], -10, scale, narrow) : '',
  );
  return s + calloutsLast(pills);
};

/** The picture in words, for its aria-label. */
export function uvLabel(o: UvOpts): string {
  if (o.print) {
    const label = o.print.label ? 'its signed label card beside it' : 'no label with it';
    const mark =
      o.lamp === null ? 'the lamp off' : o.print.found ? 'the lamp finds the mark' : 'the lamp finds no mark';
    return `A photo print on the light table, ${label}; ${mark}.`;
  }
  const tiles = tilesOf(o),
    n = tiles.length,
    c = litCounts(tiles);
  const base = `A reply page of ${n} token${n === 1 ? '' : 's'} on a light table, the model machine that wrote it at one end.`;
  if (o.lamp === null) return `${base} The UV lamp is off.`;
  const where =
    o.lamp === 'all'
      ? 'The UV lamp lights the whole page'
      : `The UV lamp lights columns ${clampStop(o.lamp) + 1} to ${clampStop(o.lamp) + WINDOW} of both rows`;
  return `${base} ${where}: ${c.green} green (raised), ${c.red} red (notched).`;
}

/** The home hero's plot (heroScene): the light table with the pinned reply on it and the lamp lit over its middle,
 * set down small. */
export function uvPlot(x: number, y: number, top: SceneCtx['top']): string {
  const o: UvOpts = {
    ids: PINNED.reply.ids,
    prev: encode(PINNED.reply.prompt).at(-1) ?? 0,
    gamma: MARK.gamma,
    lamp: 12,
  };
  const p = mini(
    {
      shadow: castShadow(boxCorners(-8, -12, BH, 136, 18, TOP), BH, top),
      items: [
        {
          box: [
            [-8, -12, BH],
            [136, 18, RAIL],
          ],
          svg: table() + page(o, tilesOf(o)),
        },
        lamp(o),
      ],
    },
    [64, 3, BH],
    [x, y, BH],
    0.3,
  );
  return drawPieces([p]);
}
