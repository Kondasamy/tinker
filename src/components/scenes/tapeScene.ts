// Text and Unicode's picture: the telegraph office (KTD8). A long desk; at its left the paper-tape punch, a cast-iron
// body with a paper roll on its back and eight key caps on top (the caps of the last byte's 1 bits are pressed and lit);
// the punched tape runs out along the desk to the reader at the right, which prints a label slip. Rosa (CAST) works the
// punch and Tom (CAST) waits at the reader. Each byte is one row of holes across the tape (a hole for each 1 bit, top
// bit nearest the viewer, a small sprocket hole in every row); the rows of one character share a tint band, so a
// two-byte ë reads as one character. At most MAX_ROWS rows are drawn, then a count pill. The reader's plate is mint
// when its table is the writer's (UTF-8) and tomato with a bar across when not (never colour alone). Words only in
// pills, every one through esc(): the typed text is untrusted.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, calloutsLast, esc, sayAt } from '../../lib/iso/blocks';
import {
  CERAMIC,
  DARK,
  METAL,
  PALS,
  WOOD,
  box,
  castShadow,
  ellUV,
  line,
  matOf,
  on,
  PZ,
  rod,
  shape,
  tag,
  toneI,
} from '../../lib/iso/core.js';
import { drawPieces, person, tight, type Item } from '../../lib/iso/figures';
import { compact } from '../../lib/iso/compact';
import { rowsOf } from '../../lib/unicode/bytes';
import type { Say } from '../story/steps';

/** KTD8's cap: rows (bytes) drawn on the tape; the rest are counted in a pill. */
export const MAX_ROWS = 24;
/** The parts a step's callout may name. */
export const TAPE_PARTS = ['punch', 'tape', 'reader', 'label'] as const;
export const TAPE_BOARD: Board = [12, 24, 208, 88];

export interface TapeOpts {
  /** the text on the punch (untrusted: drawn only through esc) */
  text: string;
  /** the reader's table, as its pill names it, and whether it is the writer's (UTF-8) */
  table: { short: string; right: boolean };
  /** what the reader prints (untrusted) */
  printed: string;
  /** rows from this index on were just punched: they drop in (left out with reduced motion) */
  fresh?: number;
  scale?: number;
  say?: Say;
}

// ---- layout ----
const T = BH + 18,
  DESK = [30, 38, 188, 74],
  PUNCH = [34, 42, 64, 70],
  PUNCH_H = 16,
  READER = [154, 44, 172, 68],
  READER_H = 12,
  LABEL = [172, 50, 186, 62],
  /** the tape's near edge (y), its far edge, and where row 0 sits (x) */
  TY0 = 47,
  TY1 = 65,
  X0 = 67,
  PITCH = 3.6,
  ROSA = [21, 70],
  TOM = [198, 50];
const TAPE_X1 = READER[0];
/** lane k's y: eight bit lanes and the sprocket lane after the third, top bit (k = 0) nearest the viewer */
const laneY = (k: number) => TY1 - 2 - k * 1.75;
const BIT_LANES = [0, 1, 2, 4, 5, 6, 7, 8];
const SPROCKET = 3;
export const rowX = (i: number) => X0 + i * PITCH;

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;
/** A pill's text kept short: at most n code points, then an ellipsis. */
export const clip = (s: string, n = 14) => {
  const cps = [...s];
  return cps.length > n ? `${cps.slice(0, n - 1).join('')}…` : s;
};

/** The desk: a thick wooden top on four square legs. */
function desk(): Item {
  const [x0, y0, x1, y1] = DESK;
  let s = '';
  for (const [x, y] of [
    [x0 + 3, y0 + 3],
    [x1 - 3, y0 + 3],
    [x0 + 3, y1 - 3],
    [x1 - 3, y1 - 3],
  ])
    s += box(x - 1.6, y - 1.6, BH, x + 1.6, y + 1.6, T - 3, WOOD, toneI, 1);
  s += box(x0, y0, T - 3, x1, y1, T, WOOD, toneI, 1.1);
  return {
    box: [
      [x0, y0, BH],
      [x1, y1, T],
    ],
    svg: `<g data-part="desk">${s}</g>`,
  };
}

/** The punch: a cast-iron body, the paper roll on its back, eight key caps on top (the last byte's 1 bits pressed). */
function punch(last: number | null): Item {
  const [x0, y0, x1, y1] = PUNCH,
    zt = T + PUNCH_H;
  let s = box(x0, y0, T, x1, y1, zt, DARK, toneI, 1.1);
  // the die block the tape leaves through, on the reader's side
  s += box(x1, TY0 - 2, T, x1 + 3, TY1 + 2, T + 4, METAL, toneI, 0.9);
  // the paper roll on its spindle, axis across the tape
  s += rod([x0 + 6, y0 + 4, zt + 7], [x0 + 6, y1 - 4, zt + 7], 7, CERAMIC, toneI, 1);
  s += rod([x0 + 6, y0 + 1.5, zt + 7], [x0 + 6, y0 + 4, zt + 7], 1.6, METAL, toneI, 0.8);
  // eight key caps in a row, top bit nearest the viewer, like the tape's lanes
  for (let k = 0; k < 8; k++) {
    const on1 = last !== null && (last >> (7 - k)) & 1,
      y = y1 - 4 - k * 2.7,
      x = x1 - 7;
    s += `<g data-key="${k}"${on1 ? ' data-on="1"' : ''}>${box(x - 1, y - 1, zt, x + 1, y + 1, zt + (on1 ? 0.6 : 2), on1 ? matOf(PALS.mustard.l) : CERAMIC, toneI, 0.7)}</g>`;
  }
  return {
    box: [
      [x0, y0, T],
      [x1 + 3, y1, zt + 14],
    ],
    svg: `<g data-part="punch">${s}</g>`,
  };
}

const hole = (x: number, y: number, r: number, z: number) => shape(on(PZ(z), ellUV(x, y, r, r, 10)), DARK.d, 0.5);

/** The tape: a paper strip on the desk, a tint band per character, a row of holes per byte. */
function tape(text: string, fresh: number): Item {
  const rows = rowsOf(text).slice(0, MAX_ROWS),
    z = T + 0.4;
  let s = box(PUNCH[2] + 3, TY0, T, TAPE_X1, TY1, z, CERAMIC, toneI, 0.8);
  // one tint band per character, alternating, under its rows
  let start = 0;
  rows.forEach((r, i) => {
    const end = i === rows.length - 1 || rows[i + 1].glyph !== r.glyph;
    if (!end) return;
    if (r.glyph % 2 === 0)
      s += shape(
        on(PZ(z + 0.01), [
          [rowX(start) - PITCH / 2 + 0.3, TY0 + 0.4],
          [rowX(i) + PITCH / 2 - 0.3, TY0 + 0.4],
          [rowX(i) + PITCH / 2 - 0.3, TY1 - 0.4],
          [rowX(start) - PITCH / 2 + 0.3, TY1 - 0.4],
        ]),
        '#f6e3a6',
        0,
      );
    start = i + 1;
  });
  rows.forEach((r, i) => {
    const x = rowX(i);
    let h = hole(x, laneY(SPROCKET), 0.45, z + 0.02);
    BIT_LANES.forEach((lane, k) => {
      if ((r.byte >> (7 - k)) & 1) h += hole(x, laneY(lane), 0.8, z + 0.02);
    });
    const anim = i >= fresh ? ` class="tp-new" style="animation-delay:${(i - fresh) * 60}ms"` : '';
    s += `<g data-row="${i}" data-byte="${r.byte}" data-glyph="${r.glyph}"${anim}>${h}</g>`;
  });
  return {
    box: [
      [PUNCH[2] + 3, TY0, T],
      [TAPE_X1, TY1, z],
    ],
    svg: `<g data-part="tape" data-rows="${rows.length}">${s}</g>`,
  };
}

/** The reader: a steel housing over the tape's end, its table plate on the viewer's side, and the printed label. */
function reader(right: boolean, printed: boolean): Item[] {
  const [x0, y0, x1, y1] = READER,
    zt = T + READER_H;
  let s = box(x0, y0, T, x1, y1, zt, METAL, toneI, 1.1);
  s += box(x0 + 2, y0 + 3, zt, x1 - 2, y1 - 3, zt + 3, METAL, toneI, 0.9);
  // the table plate on the +y face: mint when it matches the writer, tomato with a bar across when not
  const py = y1 + 0.05,
    u0 = x0 + 4,
    u1 = x1 - 4,
    v0 = T + 3,
    v1 = T + 9;
  s += shape(
    [
      [u0, py, v0],
      [u1, py, v0],
      [u1, py, v1],
      [u0, py, v1],
    ],
    right ? PALS.mint.l : PALS.tomato.l,
    0.8,
  );
  if (!right)
    s += line(
      [
        [u0 + 1, py + 0.02, v0 + 1],
        [u1 - 1, py + 0.02, v1 - 1],
      ],
      1.1,
    );
  const items: Item[] = [
    {
      box: [
        [x0, y0, T],
        [x1, y1, zt + 3],
      ],
      svg: `<g data-part="reader" data-right="${right ? 1 : 0}">${s}</g>`,
    },
  ];
  if (printed) {
    const [a0, b0, a1, b1] = LABEL,
      z = T + 0.5;
    let p = box(a0, b0, T, a1, b1, z, CERAMIC, toneI, 0.8);
    for (let k = 0; k < 3; k++)
      p += line(
        [
          [a0 + 3 + k * 3, b1 - 2, z + 0.02],
          [a0 + 3 + k * 3, b0 + (k === 2 ? 6 : 2), z + 0.02],
        ],
        0.6,
      );
    items.push({
      box: [
        [a0, b0, T],
        [a1, b1, z],
      ],
      svg: `<g data-part="label">${p}</g>`,
    });
  }
  return items;
}

/** The office: every shadow, one depth sort over the desk, punch, tape, reader and the two people, then pills. */
export const tapeScene = (o: TapeOpts) => (ctx: SceneCtx) => {
  const scale = o.scale ?? 1,
    narrow = scale > 1.5,
    all = rowsOf(o.text),
    rows = all.slice(0, MAX_ROWS),
    last = rows.length ? rows[rows.length - 1].byte : null;
  const rosa = person({ x: ROSA[0], y: ROSA[1], facing: '+x', pose: 'reach', look: 'rosa', holding: null }),
    tom = person({ x: TOM[0], y: TOM[1], facing: '-x', look: 'tom', holding: null });
  const shadow =
    castShadow(boxCorners(DESK[0], DESK[1], BH, DESK[2], DESK[3], T), BH, ctx.top) +
    castShadow(boxCorners(PUNCH[0], PUNCH[1], T, PUNCH[2], PUNCH[3], T + PUNCH_H + 14), BH, ctx.top);
  const items: Item[] = [desk(), punch(last), tape(o.text, o.fresh ?? MAX_ROWS), ...reader(o.table.right, !!o.printed)];
  const s = compact(
    tight(
      drawPieces([
        { shadow, items },
        { shadow: rosa.shadow, items: rosa.items },
        { shadow: tom.shadow, items: tom.items },
      ]),
    ),
  );
  const pills: string[] = [];
  const pTop = [(PUNCH[0] + PUNCH[2]) / 2, (PUNCH[1] + PUNCH[3]) / 2, T + PUNCH_H + 14],
    rTop = [(READER[0] + READER[2]) / 2, (READER[1] + READER[3]) / 2, T + READER_H + 3],
    lTop = [(LABEL[0] + LABEL[2]) / 2, (LABEL[1] + LABEL[3]) / 2, T + 0.5],
    tEnd = [rowX(Math.max(0, rows.length - 1)), (TY0 + TY1) / 2, T + 0.4],
    tMid = [rowX(Math.min(rows.length, 6)), (TY0 + TY1) / 2, T + 0.4];
  if (!narrow) {
    if (o.text) pills.push(pill(pTop, -6, -14, clip(o.text), false, scale));
    pills.push(pill(rTop, -4, -26, o.table.short, !o.table.right, scale, o.table.right ? undefined : '#f6c9bd'));
  }
  if (o.printed) pills.push(pill(lTop, -14, 30, clip(o.printed, narrow ? 10 : 14), false, scale));
  if (all.length > MAX_ROWS)
    pills.push(pill(tEnd, -30, 34, `+${all.length - MAX_ROWS} BYTES`, false, scale, '#ece7dc'));
  pills.push(
    sayAt(o.say, 'punch', pTop, -14, scale, narrow),
    sayAt(o.say, 'tape', tMid, 6, scale, narrow),
    sayAt(o.say, 'reader', rTop, -26, scale, narrow),
    o.printed ? sayAt(o.say, 'label', lTop, -4, scale, narrow) : '',
  );
  return s + calloutsLast(pills);
};

/** The picture in words, for its aria-label. The text itself is left to the read-out, so the label stays short. */
export function tapeLabel(o: TapeOpts): string {
  const n = rowsOf(o.text).length;
  const tape = n
    ? `a paper tape punched with ${n} row${n === 1 ? '' : 's'} of holes, one per byte${n > MAX_ROWS ? `, the first ${MAX_ROWS} shown` : ''}`
    : 'a blank paper tape';
  return `A telegraph office desk: Rosa at the tape punch, ${tape}, and Tom at the reader, set to ${o.table.short === 'UTF-8' ? 'UTF-8' : 'Latin-1'}${o.table.right ? ', the same table as the punch' : ', not the punch’s table'}.${o.printed ? ' It prints a label.' : ''}`;
}
