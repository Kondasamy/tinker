// Module 14's picture: the control room (KTD16). A wall at the back holds the day's traces as cards pinned in rows, a red
// stripe on each failed one and the trace being read lit; along the front stand the sorting bins, one per failure mode,
// each with its pile of sorted cards (cards as in Evals' test bench). A tally board pill reads the counts. Words only in
// pills, all escaped (esc); on phones (scale > 1.5) the bins' pills keep just their counts and the caption carries names.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc } from '../../lib/iso/blocks';
import { PALS, CERAMIC, WOOD, DARK, box, shape, castShadow, hullInk, toneI, tag, byDepth } from '../../lib/iso/core.js';

export const TRACE_BOARD: Board = [0, 0, 240, 150];
/** the most cards the wall holds: eight across, five rows */
export const WALL_MAX = 40;

export interface WallCard { failed: boolean; lit?: boolean }
export interface Bin { label: string; count: number; lit?: boolean }
export interface TraceOpts {
  /** the traces on the wall, in reading order (beyond WALL_MAX are left off, and the pill says so) */
  cards: WallCard[];
  /** the sorting bins, front left to right; none draws an empty floor */
  bins?: Bin[];
  /** the tally board's words, in place of "TRACES n · FAILED f" */
  board?: string;
  scale?: number;
}

/** What the room shows. Pure, so the tests check it without drawing. */
export function traceState({ cards, bins = [] }: TraceOpts) {
  const shown = cards.slice(0, WALL_MAX);
  return {
    total: cards.length, shown: shown.length, hidden: cards.length - shown.length,
    failed: cards.filter(c => c.failed).length, lit: shown.findIndex(c => c.lit),
    sorted: bins.reduce((n, b) => n + Math.max(0, b.count), 0),
  };
}

const WALL = { x0: 18, x1: 222, y0: 12, y1: 16, h: 74 };
const CARD = { w: 20, h: 11, col: 24, row: 13, x0: 26, z0: BH + 6 };
const BIN = { y: 112, half: 15, h: 10, pitch: 40, first: 40 };
const PILE_H = 1.3, PILE_MAX = 10;

/** A card pinned flat to the wall's front face: white, a red stripe down its left edge when failed, lit when read. */
function wallCard(i: number, c: WallCard): string {
  const col = i % 8, row = Math.floor(i / 8), x = CARD.x0 + col * CARD.col, z = CARD.z0 + (4 - row) * CARD.row, y = WALL.y1;
  let s = box(x, y, z, x + CARD.w, y + .8, z + CARD.h, c.lit ? PALS.mustard : CERAMIC, toneI, c.lit ? 1.1 : .6);
  if (c.failed) s += shape([[x + 1, y + .85, z + 1], [x + 4, y + .85, z + 1], [x + 4, y + .85, z + CARD.h - 1], [x + 1, y + .85, z + CARD.h - 1]], PALS.tomato.l, .4);
  return `<g class="card" data-i="${i}"${c.failed ? ' data-failed="1"' : ''}${c.lit ? ' data-lit="1"' : ''}>${s}</g>`;
}

/** A sorting bin: an open wooden crate with its sorted cards piled on top (a loose, hand-stacked pile). */
function bin(i: number, b: Bin): { at: number[]; svg: string } {
  const x = BIN.first + i * BIN.pitch, y = BIN.y, h = BIN.half, z1 = BH + BIN.h;
  let s = box(x - h, y - h, BH, x + h, y + h, z1, b.lit ? PALS.mustard : WOOD, toneI, b.lit ? 1.2 : .9);
  s += shape([[x - h + 2, y - h + 2, z1 + .05], [x + h - 2, y - h + 2, z1 + .05], [x + h - 2, y + h - 2, z1 + .05], [x - h + 2, y + h - 2, z1 + .05]], DARK.m, .6);
  const n = Math.min(Math.max(0, b.count), PILE_MAX);
  for (let k = 0; k < n; k++) {
    const dx = ((k * 3) % 5 - 2) * .4, z = z1 + k * PILE_H;
    s += box(x - 9 + dx, y - 6, z, x + 9 + dx, y + 6, z + PILE_H, CERAMIC, toneI, .5);
  }
  return { at: [x, y, 0], svg: `<g class="bin" data-bin="${i}" data-n="${b.count}"${b.lit ? ' data-lit="1"' : ''}>${s}</g>` };
}

const pill = (p: number[], dx: number, dy: number, text: string, on: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), on, scale)}</g>`;

/** The room. Shadows, then the wall and its cards, then the bins back to front, then every pill on top. */
export const traceScene = (o: TraceOpts) => (ctx: SceneCtx) => {
  const st = traceState(o), scale = o.scale ?? 1, narrow = scale > 1.5, bins = o.bins ?? [];
  let s = castShadow(boxCorners(WALL.x0, WALL.y0, BH, WALL.x1, WALL.y1, BH + WALL.h), BH, ctx.top);
  for (const [i] of bins.entries()) {
    const x = BIN.first + i * BIN.pitch;
    s += castShadow(boxCorners(x - BIN.half, BIN.y - BIN.half, BH, x + BIN.half, BIN.y + BIN.half, BH + BIN.h), BH, ctx.top);
  }
  s += box(WALL.x0, WALL.y0, BH, WALL.x1, WALL.y1, BH + WALL.h, DARK, toneI, 1) + hullInk(boxCorners(WALL.x0, WALL.y0, BH, WALL.x1, WALL.y1, BH + WALL.h), 2.2);
  s += o.cards.slice(0, WALL_MAX).map((c, i) => wallCard(i, c)).join('');
  s += byDepth(bins.map((b, i) => bin(i, b)));
  const pills = [pill([WALL.x1, WALL.y1, BH + WALL.h], narrow ? -30 : -10, -24, o.board ?? `TRACES ${st.total} · FAILED ${st.failed}${st.hidden ? ` · +${st.hidden} OFF WALL` : ''}`, false, scale)];
  bins.forEach((b, i) => {
    const x = BIN.first + i * BIN.pitch, top = BH + BIN.h + Math.min(Math.max(0, b.count), PILE_MAX) * PILE_H;
    // neighbours alternate high and low so their pills never overlap
    pills.push(pill([x, BIN.y + BIN.half, top], 0, (narrow ? 30 : 24) + (i % 2) * (narrow ? 26 : 20),narrow ? String(b.count) : `${b.label} ${b.count}`, !!b.lit, scale));
  });
  return s + pills.join('');
};

/** The picture in words, for its aria-label. */
export function traceLabel(o: TraceOpts): string {
  const st = traceState(o), bins = o.bins ?? [];
  let s = `A control room. A wall holds ${st.total} trace card${st.total === 1 ? '' : 's'}, ${st.failed} marked failed${st.lit >= 0 ? `; card ${st.lit + 1} is lit` : ''}.`;
  if (bins.length) s += ` In front stand ${bins.length} sorting bins: ${bins.map(b => `${b.label} ${b.count}${b.lit ? ' (lit)' : ''}`).join(', ')}.`;
  return s + (o.board ? ` Tally board: ${o.board}.` : '');
}

/** The home hero's observability plot: a short wall of three trace cards, one failed, over a single bin. */
export const controlRoomPlot = (x: number, y: number) => byDepth([
  { at: [x, y - 8, 0], svg: box(x - 14, y - 10, BH, x + 14, y - 8, BH + 18, DARK, toneI, .9)
    + [0, 1, 2].map(i => box(x - 12 + i * 8.5, y - 8, BH + 5, x - 5.5 + i * 8.5, y - 7.4, BH + 13, i === 1 ? PALS.tomato : CERAMIC, toneI, .5)).join('') },
  { at: [x, y + 8, 0], svg: box(x - 7, y + 2, BH, x + 7, y + 14, BH + 5, WOOD, toneI, .8) },
]);
