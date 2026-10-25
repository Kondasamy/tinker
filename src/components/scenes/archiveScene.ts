// The Databases module's picture: the filing room (KTD15). At the back stands the orders cabinet, a drawer per table page
// (200, twenty across and ten down), and beside it the smaller customers cabinet (20 drawers). Each drawer read is lit
// mustard and each written tomato, so a full scan lights the whole cabinet and a lookup one drawer. In front, on a long
// desk, stands the card index: the B-tree the request used, a row of card boxes per level, the boxes on the lookup's path
// lit and joined by a thread; any other indexes stand at the desk's end. A clerk's desk at the front holds the request
// slip and the rows-read counter. Words only in pills, all escaped; on phones (scale > 1.5) pills keep just the names
// and the caption carries the numbers (archiveReadouts).
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  PALS,
  CERAMIC,
  WOOD,
  METAL,
  box,
  shape,
  castShadow,
  hullInk,
  toneI,
  tag,
  byDepth,
  line,
} from '../../lib/iso/core.js';
import { CUSTOMER_PAGES, TABLE_PAGES, fmt } from '../../lib/databases/table';
import { INDEX_NAME, bounds, treeOf, type Exec, type IndexName, type Query } from '../../lib/databases/planner';
import type { Say } from '../story/steps';

export const ARCHIVE_BOARD: Board = [0, 0, 220, 150];

/** One level of the card index: how many pages it has, and the one on the path. */
export interface TreeLevel {
  pages: number;
  at: number;
}
export interface ArchiveOpts {
  /** orders pages read (each once, whatever the repeats) */
  read: number[];
  /** orders pages written */
  written?: number[];
  /** page reads in all, repeats counted: the cabinet's pill */
  pages: number;
  /** rows read from the table, matching or not */
  rows: number;
  /** the index the request used; none: the desk's tray stands empty */
  index?: { name: string; levels: TreeLevel[]; write?: boolean };
  /** other indexes on the table, at the desk's end; written too when `write` */
  others?: number;
  /** customers cabinet: pages read in all (repeats counted) and the drawers lit */
  customers?: { pages: number; lit: number };
  say?: Say;
  scale?: number;
}

/** The parts a step's callout may name. */
export const ARCHIVE_PARTS = ['cabinet', 'customers', 'index', 'desk'] as const;

const CAB = { x0: 10, x1: 130, y0: 8, y1: 20, z1: BH + 86, cols: 20, rows: 10, pitchX: 5.8, pitchZ: 8.2, w: 5, h: 6.6 };
const CUS = { x0: 148, x1: 190, y0: 8, y1: 20, z1: BH + 45, cols: 4, rows: 5, pitchX: 10, pitchZ: 8.2, w: 8.4, h: 6.6 };
const DESK = { x0: 46, x1: 206, y0: 62, y1: 112, z1: BH + 12 };
const CLERK = { x0: 8, x1: 36, y0: 112, y1: 136, z1: BH + 10 };
const ROW_Y = [72, 87, 102],
  SLOTS = [1, 5, 9],
  PITCH = [0, 13, 11],
  TREE_X = 112,
  CARD = 3.2;

/** Which slot a page takes in a level drawn with fewer slots than pages. */
export const slotOf = (at: number, pages: number, slots: number) =>
  pages <= slots ? at : Math.min(slots - 1, Math.floor((at * slots) / pages));

/** What the room shows. Pure, so the tests check it without drawing. */
export function archiveState(o: ArchiveOpts) {
  const read = new Set(o.read.filter(p => p >= 0 && p < TABLE_PAGES)),
    written = new Set((o.written ?? []).filter(p => p >= 0 && p < TABLE_PAGES));
  return {
    lit: read.size,
    written: written.size,
    read,
    writtenSet: written,
    levels: (o.index?.levels ?? []).slice(-3),
    customersLit: Math.min(CUSTOMER_PAGES, Math.max(0, o.customers?.lit ?? 0)),
  };
}

const pill = (p: number[], dx: number, dy: number, text: string, on: boolean, scale: number, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), on, scale, fill)}</g>`;
const plural = (n: number, w: string) => `${fmt(n)} ${w}${n === 1 ? '' : 'S'}`;

/** A drawer face on a cabinet's front (y = y1), lit or written. */
function drawer(c: typeof CAB, i: number, state: 'idle' | 'read' | 'write') {
  const col = i % c.cols,
    row = Math.floor(i / c.cols),
    x = c.x0 + 1.5 + col * c.pitchX,
    z = c.z1 - 3 - row * c.pitchZ - c.h,
    y = c.y1 + 0.05,
    fill = state === 'read' ? PALS.mustard.l : state === 'write' ? PALS.tomato.l : CERAMIC.m;
  const face = shape(
    [
      [x, y, z],
      [x + c.w, y, z],
      [x + c.w, y, z + c.h],
      [x, y, z + c.h],
    ],
    fill,
    0.35,
  );
  return `<g class="drawer${state === 'idle' ? '' : ` ${state}`}" data-page="${i}">${face}</g>`;
}

function cabinet(c: typeof CAB, prop: string, n: number, stateOf: (i: number) => 'idle' | 'read' | 'write') {
  let s = box(c.x0, c.y0, BH, c.x1, c.y1, c.z1, WOOD, toneI, 1);
  for (let i = 0; i < n; i++) s += drawer(c, i, stateOf(i));
  s += hullInk(boxCorners(c.x0, c.y0, BH, c.x1, c.y1, c.z1), 2.2);
  return `<g data-prop="${prop}">${s}</g>`;
}

/** A card box on the desk: a squat box with a card standing up in it. */
function cardBox(x: number, y: number, lit: 'idle' | 'read' | 'write', cls = 'card-box') {
  const z = DESK.z1,
    m = lit === 'read' ? PALS.mustard : lit === 'write' ? PALS.tomato : METAL;
  const s =
    box(x - CARD, y - CARD, z, x + CARD, y + CARD, z + 4.5, m, toneI, 0.8) +
    box(x - CARD + 1, y - 0.4, z + 4.5, x + CARD - 1, y + 0.4, z + 7.5, CERAMIC, toneI, 0.5);
  return { at: [x, y, z], svg: `<g class="${cls}${lit === 'idle' ? '' : ` ${lit}`}">${s}</g>` };
}

/** The tree's slots, level by level: x of each slot, and the lit slot. Leaves always take the front row. */
function treeSlots(levels: TreeLevel[]) {
  const rows = ROW_Y.slice(ROW_Y.length - levels.length),
    caps = SLOTS.slice(SLOTS.length - levels.length),
    pitch = PITCH.slice(PITCH.length - levels.length);
  return levels.map((lv, d) => {
    const n = Math.min(lv.pages, caps[d]),
      x0 = TREE_X - ((n - 1) * pitch[d]) / 2;
    return { y: rows[d], xs: Array.from({ length: n }, (_, i) => x0 + i * pitch[d]), lit: slotOf(lv.at, lv.pages, n) };
  });
}

/** The room. Shadows, cabinets, then the desks and boxes back to front, then pills, callouts last. */
export const archiveScene = (o: ArchiveOpts) => (ctx: SceneCtx) => {
  const st = archiveState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5,
    write = o.index?.write ? 'write' : 'read',
    // a write with nothing read: the pills speak of writing
    writing = st.written > 0 && o.pages === 0;
  let s = '';
  for (const b of [CAB, CUS, DESK, CLERK])
    s += castShadow(boxCorners(b.x0, b.y0, BH, b.x1, b.y1, (b as { z1: number }).z1), BH, ctx.top);
  s += cabinet(CAB, 'cabinet', TABLE_PAGES, i => (st.writtenSet.has(i) ? 'write' : st.read.has(i) ? 'read' : 'idle'));
  s += cabinet(CUS, 'customers', CUSTOMER_PAGES, i => (i < st.customersLit ? 'read' : 'idle'));
  // the long desk and the card index on it
  const parts: { at: number[]; svg: string }[] = [];
  const slots = treeSlots(st.levels);
  slots.forEach(lv =>
    lv.xs.forEach((x, i) => parts.push(cardBox(x, lv.y, i === lv.lit ? (write as 'read' | 'write') : 'idle'))),
  );
  for (let i = 0; i < Math.min(4, o.others ?? 0); i++)
    parts.push(cardBox(194, 72 + i * 11, o.index?.write ? 'write' : 'idle', 'card-box other'));
  let thread = '';
  for (let d = 1; d < slots.length; d++) {
    const a = slots[d - 1],
      b = slots[d];
    if (a.lit < 0 || b.lit < 0) continue;
    thread += line(
      [
        [a.xs[a.lit], a.y + CARD, DESK.z1 + 4.5],
        [b.xs[b.lit], b.y - CARD, DESK.z1 + 4.5],
      ],
      1.3,
    );
  }
  const desk =
    box(DESK.x0, DESK.y0, BH, DESK.x1, DESK.y1, DESK.z1, WOOD, toneI, 1) +
    hullInk(boxCorners(DESK.x0, DESK.y0, BH, DESK.x1, DESK.y1, DESK.z1), 2);
  s += `<g data-prop="index" data-levels="${slots.length}">${desk}${byDepth(parts)}<g class="thread">${thread}</g></g>`;
  // the clerk's desk and the request slip
  const clerk =
    box(CLERK.x0, CLERK.y0, BH, CLERK.x1, CLERK.y1, CLERK.z1, WOOD, toneI, 1) +
    box(CLERK.x0 + 6, CLERK.y0 + 6, CLERK.z1, CLERK.x1 - 6, CLERK.y1 - 6, CLERK.z1 + 0.8, CERAMIC, toneI, 0.6) +
    hullInk(boxCorners(CLERK.x0, CLERK.y0, BH, CLERK.x1, CLERK.y1, CLERK.z1 + 0.8), 1.8);
  s += `<g data-prop="desk" data-rows="${o.rows}">${clerk}</g>`;

  const cabTop = [CAB.x1, CAB.y1, CAB.z1],
    cusTop = [CUS.x1, CUS.y1, CUS.z1],
    deskTop = [DESK.x1 - 10, DESK.y1, DESK.z1],
    clerkTop = [CLERK.x1, CLERK.y1, CLERK.z1];
  const pills = [
    pill(
      cabTop,
      narrow ? -40 : -30,
      -14,
      narrow
        ? 'ORDERS'
        : writing
          ? `ORDERS · ${plural(st.written, 'PAGE')} WRITTEN`
          : `ORDERS · ${plural(o.pages, 'PAGE')} READ`,
      st.lit > 0 || writing,
      scale,
    ),
    pill(
      cusTop,
      narrow ? -10 : 0,
      -14,
      narrow || !o.customers ? 'CUSTOMERS' : `CUSTOMERS · ${plural(o.customers.pages, 'PAGE')}`,
      st.customersLit > 0,
      scale,
    ),
    pill(
      deskTop,
      0,
      26,
      o.index ? (narrow ? 'INDEX' : `INDEX: ${o.index.name.toUpperCase()}`) : 'NO INDEX',
      !!o.index,
      scale,
    ),
    pill(
      clerkTop,
      0,
      24,
      writing ? 'NEW ORDER' : narrow ? 'ROWS' : `ROWS READ · ${fmt(o.rows)}`,
      o.rows > 0 || writing,
      scale,
    ),
  ];
  const callouts =
    sayAt(o.say, 'cabinet', [CAB.x0 + 60, CAB.y1, CAB.z1], -20, scale) +
    sayAt(o.say, 'customers', [CUS.x0 + 20, CUS.y1, CUS.z1], -20, scale) +
    sayAt(o.say, 'index', [TREE_X, DESK.y0 + 6, DESK.z1 + 8], -16, scale) +
    sayAt(o.say, 'desk', [CLERK.x0 + 14, CLERK.y0 + 12, CLERK.z1], -12, scale);
  return s + pills.join('') + callouts;
};

/** The room in words, for its aria-label. */
export function archiveLabel(o: ArchiveOpts): string {
  const st = archiveState(o);
  return (
    `The filing room: the orders cabinet, a drawer per page, ${fmt(st.lit)} of ${TABLE_PAGES} drawers opened` +
    `${st.written ? `, ${st.written} written` : ''}; ${fmt(o.pages)} page read${o.pages === 1 ? '' : 's'} in all, ${fmt(o.rows)} row${o.rows === 1 ? '' : 's'} read. ` +
    (o.index
      ? `The card index on ${o.index.name}, ${st.levels.length} levels, one box lit on each.`
      : 'No index on the desk.') +
    (o.others ? ` ${o.others} more indexes stand beside it.` : '') +
    (o.customers ? ` The customers cabinet: ${fmt(o.customers.pages)} page reads.` : '')
  );
}

/** The counts the caption carries (phones show only the names in the pills). */
export function archiveReadouts(o: ArchiveOpts): string[] {
  const w = archiveState(o).written;
  if (w && !o.pages) return [`${fmt(w)} table page${w === 1 ? '' : 's'} written`];
  return [
    `${fmt(o.pages)} page${o.pages === 1 ? '' : 's'} read`,
    `${fmt(o.rows)} row${o.rows === 1 ? '' : 's'} read`,
    ...(o.customers ? [`${fmt(o.customers.pages)} customer pages`] : []),
  ];
}

/** An empty room: nothing asked yet. */
export const IDLE: Omit<ArchiveOpts, 'say' | 'scale'> = { read: [], pages: 0, rows: 0 };

/** The card index's levels on the path to a request's first key. */
export function levelsOf(how: IndexName, q: Query): TreeLevel[] {
  const b = bounds(how, q);
  return b
    ? treeOf(how)
        .pathTo(b[0])
        .map(l => ({ pages: l.pages, at: l.at }))
    : [];
}

/** The room after a request ran: its pages lit, its index's path lit. */
export function archiveAt(exec: Exec, q: Query, extra: Partial<ArchiveOpts> = {}): Omit<ArchiveOpts, 'say' | 'scale'> {
  return {
    read: exec.pagesSeen,
    pages: exec.pages,
    rows: exec.rowsRead,
    index: exec.how === 'scan' ? undefined : { name: INDEX_NAME[exec.how], levels: levelsOf(exec.how, q) },
    ...extra,
  };
}

/** The home hero's plot: a small cabinet with one drawer lit, and a card box in front with its card up. */
export function archivePlot(x: number, y: number, top: SceneCtx['top']): string {
  const cx0 = x - 16,
    cx1 = x + 10,
    cy0 = y - 12,
    cy1 = y - 7,
    h = BH + 20;
  let cab = box(cx0, cy0, BH, cx1, cy1, h, WOOD, toneI, 1);
  for (let i = 0; i < 12; i++) {
    const col = i % 4,
      row = Math.floor(i / 4),
      dx = cx0 + 1.5 + col * 6.2,
      z = h - 2 - row * 5.8 - 4.4;
    cab += shape(
      [
        [dx, cy1 + 0.05, z],
        [dx + 5, cy1 + 0.05, z],
        [dx + 5, cy1 + 0.05, z + 4.4],
        [dx, cy1 + 0.05, z + 4.4],
      ],
      i === 6 ? PALS.mustard.l : CERAMIC.m,
      0.35,
    );
  }
  cab += hullInk(boxCorners(cx0, cy0, BH, cx1, cy1, h), 1.6);
  const bx = x + 2,
    by = y + 6,
    card =
      box(bx - 4, by - 4, BH, bx + 4, by + 4, BH + 5, PALS.mustard, toneI, 0.9) +
      box(bx - 2.5, by - 0.4, BH + 5, bx + 2.5, by + 0.4, BH + 9, CERAMIC, toneI, 0.5);
  return (
    castShadow(boxCorners(cx0, cy0, BH, cx1, cy1, h), BH, top) +
    castShadow(boxCorners(bx - 4, by - 4, BH, bx + 4, by + 4, BH + 5), BH, top) +
    byDepth([
      { at: [x, cy0, 0], svg: cab },
      { at: [bx, by, 0], svg: card },
    ])
  );
}
