// The Search module's picture: the index cabinet (KTD15). At the back stands a wooden cabinet, a drawer per word. The
// query's drawers are pulled out and lit, page cards standing in them; a few other drawers show their cards too (the
// query's words plus at most six others, a count pill for the rest). Beside it, the stack of every page on a reading
// table: lit when the clerk reads them all (the scan). In front, the clerk's desk holds the search slip, and a ranking
// podium whose step heights follow the top three scores, a card on each. Words only in pills, all escaped; on phones
// (scale > 1.5) pills keep just the names and the caption carries the numbers (cabinetReadouts).
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import { mini, person, shaded, SKIN, tight, type Item, type Look, drawPieces } from '../../lib/iso/figures';
import {
  PALS,
  CERAMIC,
  DARK,
  WOOD,
  METAL,
  box,
  castShadow,
  cyl,
  ellUV,
  hullInk,
  matOf,
  on,
  PY,
  rod,
  toneI,
  tag,
  byDepth,
  shape,
  inkK,
  P,
} from '../../lib/iso/core.js';
import { N, PAGES, fmt, pageName, postings, search, termsOf, type Settings } from '../../lib/search/engine';
import { wordsOf } from '../../lib/search/stem';
import type { Say } from '../story/steps';

export const CABINET_BOARD: Board = [0, 0, 220, 150];

export interface Drawer {
  word: string;
  /** pages filed in it */
  cards: number;
  /** pulled out and lit: a word of the query */
  lit?: boolean;
  /** a card just filed (drawn dropping in, unless reduced motion) */
  fresh?: boolean;
  /** pulled out, not lit: a drawer being filed */
  out?: boolean;
}
export interface Step {
  /** the page's short name */
  name: string;
  score: number;
}
export interface CabinetOpts {
  /** the search slip on the desk */
  query?: string;
  /** the drawers shown, query words first; capped at MAX_DRAWERS */
  drawers: Drawer[];
  /** drawers in the whole index (the count pill names the rest) */
  words: number;
  /** pages the clerk read one by one (the scan) */
  read?: number;
  /** pages found with no ranking (the scan): the podium's pill says how many */
  found?: number;
  /** the top results, best first (at most three are drawn) */
  podium?: Step[];
  say?: Say;
  scale?: number;
}

/** The parts a step's callout may name. */
export const CABINET_PARTS = ['cabinet', 'pages', 'desk', 'podium'] as const;
/** The query's words plus at most six others (KTD15). */
export const MAX_DRAWERS = 8;
/** cards drawn standing in a drawer; the pill gives the count */
export const CARDS_DRAWN = 5;

const CAB = { x0: 12, x1: 118, y0: 8, y1: 20, z1: BH + 64, cols: 4, rows: 2 };
const STACK = { x0: 142, x1: 176, y0: 12, y1: 36, table: BH + 14 };
const DESK = { x0: 14, x1: 58, y0: 92, y1: 128, z1: BH + 12 };
const POD = { x0: 104, x1: 200, y0: 96, y1: 124, base: BH + 4, tall: 30 };
const DW = (CAB.x1 - CAB.x0 - 10) / CAB.cols,
  DH = (CAB.z1 - BH - 12) / CAB.rows;

const pill = (p: number[], dx: number, dy: number, text: string, on: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), on, scale)}</g>`;
/** A long search, cut to fit its pill. */
const clip = (q: string, n: number) => (q.length > n ? `${q.slice(0, n - 1)}…` : q);
const plural = (n: number, w: string) => `${fmt(n)} ${w}${n === 1 ? '' : 'S'}`;

/** What the room shows. Pure, so the tests check it without drawing. */
export function cabinetState(o: CabinetOpts) {
  const drawers = o.drawers.slice(0, MAX_DRAWERS);
  const steps = (o.podium ?? []).slice(0, 3);
  const top = Math.max(0, ...steps.map(s => s.score));
  return {
    drawers,
    hidden: Math.max(0, o.words - drawers.length),
    steps: steps.map(s => ({ ...s, h: top > 0 ? 6 + (POD.tall - 6) * (s.score / top) : 6 })),
    reading: (o.read ?? 0) > 0,
  };
}

/** Where drawer i sits on the cabinet's front: column, row (top row first). */
const slot = (i: number) => {
  const col = i % CAB.cols,
    row = Math.floor(i / CAB.cols);
  return { x: CAB.x0 + 5 + col * DW, z: CAB.z1 - 6 - (row + 1) * DH };
};

const BRASS = matOf('#c99a3e');
const span = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => [
  [x0, y0, z0],
  [x1, y1, z1],
];
/** a flat rectangle on the plane y = Y (u = x, v = z) */
const rectY = (Y: number, x0: number, z0: number, x1: number, z1: number, fill: string, w = 0.5) =>
  shape(
    [
      [x0, Y, z0],
      [x1, Y, z0],
      [x1, Y, z1],
      [x0, Y, z1],
    ],
    fill,
    w,
  );
/** A catalogue drawer's brass: a label holder with its card, and a cup pull under it, on the face at y = Y. */
const brass = (Y: number, cx: number, zTop: number) =>
  rectY(Y + 0.05, cx - 3.4, zTop - 4.6, cx + 3.4, zTop - 1.4, BRASS.l, 0.6) +
  rectY(Y + 0.1, cx - 2.6, zTop - 4, cx + 2.6, zTop - 2, CERAMIC.l, 0.3) +
  shape(
    on(
      PY(Y + 0.1),
      Array.from({ length: 9 }, (_, k) => {
        const t = (k / 8) * Math.PI;
        return [cx + 2.6 * Math.cos(t), zTop - 6.2 - 2.4 * Math.sin(t)];
      }),
    ),
    BRASS.m,
    0.7,
  );

/** One drawer: its face, or pulled out (lit for a query word) with page cards standing on its rod. */
function drawerSvg(d: Drawer, i: number): string {
  const { x, z } = slot(i),
    w = DW - 3,
    h = DH - 4;
  const y = CAB.y1;
  if (!d.lit && !d.fresh && !d.out) {
    const face = rectY(y + 0.05, x, z, x + w, z + h, d.cards ? '#e6bf88' : WOOD.m, 0.6);
    return `<g class="drawer" data-word="${esc(d.word)}">${face}${brass(y, x + w / 2, z + h)}</g>`;
  }
  // pulled out: a long tray with walls, open at the top, cards standing on a brass rod; the slot behind is dark
  const out = 14,
    m = d.lit ? PALS.mustard : WOOD,
    zt = z + h * 0.7;
  let s =
    rectY(y + 0.05, x, z, x + w, z + h, DARK.d, 0.5) +
    box(x, y, z, x + w, y + out, z + 0.8, m, toneI, 0.6) +
    box(x, y, z, x + 0.8, y + out, zt, m, toneI, 0.6);
  const n = Math.min(CARDS_DRAWN, d.cards);
  for (let c = 0; c < n; c++) {
    const cy = y + 2.5 + (c * (out - 4)) / Math.max(1, CARDS_DRAWN - 1),
      fresh = d.fresh && c === n - 1;
    s += `<g class="card${fresh ? ' fresh' : ''}">${box(x + 2, cy, z + 0.8, x + w - 2, cy + 0.6, zt + 5, CERAMIC, toneI, 0.5)}</g>`;
  }
  s +=
    rod([x + w / 2, y + 1, z + 2.2], [x + w / 2, y + out - 0.5, z + 2.2], 0.45, BRASS, toneI, 0.5, 0.45, 6) +
    box(x + w - 0.8, y, z, x + w, y + out, zt, m, toneI, 0.6) +
    box(x, y + out - 0.8, z, x + w, y + out, z + h, m, toneI, 0.8) +
    brass(y + out, x + w / 2, z + h);
  return `<g class="drawer out${d.lit ? ' lit' : ''}" data-word="${esc(d.word)}" data-cards="${d.cards}">${s}</g>`;
}

/** The card catalogue. Real-object notes: a wooden case on a dark plinth under an overhanging cornice; drawer fronts
 * in a grid between stiles, each with a brass label holder and cup pull. */
function cabinetSvg(drawers: Drawer[]): string {
  const { x0, x1, y0, y1, z1 } = CAB;
  let cab =
    box(x0 + 1, y0 + 1, BH, x1 - 1, y1 - 1, BH + 3, DARK, toneI, 0.9) +
    box(x0, y0, BH + 3, x1, y1, z1 - 3, WOOD, toneI, 1) +
    box(x0 - 1.2, y0 - 1.2, z1 - 3, x1 + 1.2, y1 + 1.2, z1, WOOD, toneI, 1);
  for (let i = drawers.length; i < CAB.cols * CAB.rows; i++) cab += drawerSvg({ word: '', cards: 0 }, i);
  drawers.forEach((d, i) => {
    if (!d.lit && !d.fresh && !d.out) cab += drawerSvg(d, i);
  });
  cab += hullInk(boxCorners(x0 - 1.2, y0 - 1.2, BH, x1 + 1.2, y1 + 1.2, z1), 2.2);
  drawers.forEach((d, i) => {
    if (d.lit || d.fresh || d.out) cab += drawerSvg(d, i);
  });
  return `<g data-prop="cabinet" data-drawers="${drawers.length}">${tight(cab)}</g>`;
}

/** A table top on four square legs. */
const table = (x0: number, y0: number, x1: number, y1: number, zt: number, m = WOOD) =>
  [
    [x0 + 1.5, y0 + 1.5],
    [x1 - 4, y0 + 1.5],
    [x0 + 1.5, y1 - 4],
    [x1 - 4, y1 - 4],
  ]
    .sort((a, b) => a[0] + a[1] - b[0] - b[1])
    .map(([lx, ly]) => box(lx, ly, BH, lx + 2.5, ly + 2.5, zt - 2, m, toneI, 0.8))
    .join('') + box(x0, y0, zt - 2, x1, y1, zt, m, toneI, 1.1);

/** The stack of every page on its reading table: lit while the clerk reads them all. */
function stackSvg(reading: boolean): string {
  const sheets = [0, 1, 2, 3, 4]
    .map(i => {
      const z0 = STACK.table + i * 5,
        dx = i % 2 ? 1.2 : -0.8;
      return box(
        STACK.x0 + 5 + dx,
        STACK.y0 + 4,
        z0,
        STACK.x1 - 5 + dx,
        STACK.y1 - 4,
        z0 + 5,
        reading ? PALS.mustard : CERAMIC,
        toneI,
        0.6,
      );
    })
    .join('');
  return `<g data-prop="pages" class="${reading ? 'reading' : ''}">${table(STACK.x0, STACK.y0, STACK.x1, STACK.y1, STACK.table)}${sheets}</g>`;
}

/** The clerk's desk. Real-object notes: a top on a drawer pedestal (left) and two legs (right), a brass call bell, the
 * search slip lying on it when there is a search. */
function deskSvg(query: boolean): string {
  const { x0, x1, y0, y1, z1 } = DESK,
    zt = z1 - 2;
  let s =
    box(x1 - 5, y0 + 2, BH, x1 - 2.5, y0 + 4.5, zt, WOOD, toneI, 0.8) +
    box(x0 + 1, y0 + 1, BH, x0 + 16, y1 - 1, zt, WOOD, toneI, 1) +
    box(x1 - 5, y1 - 4.5, BH, x1 - 2.5, y1 - 2, zt, WOOD, toneI, 0.8);
  for (const zz of [BH + 6, BH + 12] as number[])
    s += rectY(y1 - 0.95, x0 + 3, zz - 4.5, x0 + 14, zz + 0.5, '#e6bf88', 0.5) + brass(y1 - 1, x0 + 8.5, zz + 3.5);
  s += box(x0 - 1, y0 - 1, zt, x1 + 1, y1 + 1, z1, WOOD, toneI, 1.2);
  if (query) s += box(x0 + 10, y0 + 8, z1, x1 - 10, y1 - 8, z1 + 0.8, CERAMIC, toneI, 0.6);
  const bx = x1 - 6,
    by = y0 + 6;
  s +=
    cyl(bx, by, z1, z1 + 0.8, 3, DARK, toneI, 0.8, 12) +
    rod([bx, by, z1 + 0.8], [bx, by, z1 + 3.2], 2.4, BRASS, toneI, 0.9, 0.6, 12);
  return `<g data-prop="desk">${tight(s)}</g>`;
}

const MEDAL = [BRASS, METAL, WOOD];
/** The podium: three joined steps, first in the middle, second left, third right, each with a medal disc on its front
 * and, when ranked, a page card standing in a holder on top. */
function podiumSvg(steps: { h: number }[]): string {
  const w = (POD.x1 - POD.x0) / 3,
    order = [1, 0, 2]; // left, middle, right hold places 2, 1, 3
  const parts: Item[] = [];
  order.forEach((place, col) => {
    const st = steps[place];
    const x0 = POD.x0 + col * w,
      x1 = x0 + w - 0.4,
      h = st ? st.h : 3,
      zt = POD.base + h,
      m = place === 0 && st ? PALS.mustard : st ? PALS.cobalt : CERAMIC,
      cx = x0 + w / 2,
      cy = (POD.y0 + POD.y1) / 2;
    let s =
      box(x0, POD.y0, POD.base, x1, POD.y1, zt - 1.2, m, toneI, 1) +
      box(x0 - 0.4, POD.y0 - 0.4, zt - 1.2, x1 + 0.4, POD.y1 + 0.4, zt, CERAMIC, toneI, 0.8);
    if (st && h > 7)
      s += shape(on(PY(POD.y1 + 0.05), ellUV(cx, POD.base + (h - 1.2) / 2, 3, 3, 14)), MEDAL[place].l, 0.8);
    if (st)
      s +=
        box(cx - 5, cy - 1.6, zt, cx + 5, cy + 1.6, zt + 1.4, DARK, toneI, 0.6) +
        box(cx - 4.4, cy - 0.3, zt + 1.4, cx + 4.4, cy + 0.3, zt + 9, CERAMIC, toneI, 0.6);
    parts.push({
      box: span(x0 - 0.4, POD.y0 - 0.4, POD.base, x1 + 0.4, POD.y1 + 0.4, zt + (st ? 9 : 0)),
      svg: `<g class="step" data-place="${place + 1}">${s}</g>`,
    });
  });
  const base = box(POD.x0 - 3, POD.y0 - 3, BH, POD.x1 + 1, POD.y1 + 3, POD.base, WOOD, toneI, 1);
  return `<g data-prop="podium" data-steps="${steps.length}">${base}${byDepth(parts)}</g>`;
}

// the librarian clerk: grey bun, a sage cardigan; at the desk with the slip, or at the reading table during the scan
const CLERK: Look = { skin: SKIN[1], top: '#8fae94', legs: '#4a4642', hair: '#bdb7ab', cut: 'bun' };
const stepX = (place: number) => POD.x0 + ([1, 0, 2].indexOf(place) + 0.5) * ((POD.x1 - POD.x0) / 3) - 1;

/** The room. Shadows, cabinet, stack, desk and podium back to front, then pills, callouts last. */
export const cabinetScene = (o: CabinetOpts) => (ctx: SceneCtx) => {
  const st = cabinetState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5;
  const clerk = st.reading
    ? person({ x: (STACK.x0 + STACK.x1) / 2, y: STACK.y1 + 9, facing: 270, pose: 'reach', look: CLERK, holding: null })
    : person({ x: DESK.x0 + 26, y: DESK.y0 - 7, facing: 90, look: CLERK, holding: null });
  let s = '';
  for (const b of [
    [CAB.x0, CAB.y0, CAB.x1, CAB.y1, CAB.z1],
    [STACK.x0, STACK.y0, STACK.x1, STACK.y1, STACK.table + 25],
    [DESK.x0, DESK.y0, DESK.x1, DESK.y1, DESK.z1],
    [POD.x0, POD.y0, POD.x1, POD.y1, POD.base + POD.tall],
  ])
    s += castShadow(boxCorners(b[0], b[1], BH, b[2], b[3], b[4]), BH, ctx.top);
  s += clerk.shadow;
  s += byDepth([
    { box: span(CAB.x0 - 1.2, CAB.y0 - 1.2, BH, CAB.x1 + 1.2, CAB.y1 + 14, CAB.z1), svg: cabinetSvg(st.drawers) },
    { box: span(STACK.x0, STACK.y0, BH, STACK.x1, STACK.y1, STACK.table + 25), svg: stackSvg(st.reading) },
    { box: span(DESK.x0 - 1, DESK.y0 - 1, BH, DESK.x1 + 1, DESK.y1 + 1, DESK.z1 + 3.2), svg: deskSvg(!!o.query) },
    {
      box: span(POD.x0 - 3, POD.y0 - 3, BH, POD.x1 + 1, POD.y1 + 3, POD.base + POD.tall + 9),
      svg: podiumSvg(st.steps),
    },
    ...clerk.items,
  ]);

  // pills: open drawers' words in a column left of the cabinet, each led to its drawer (phones keep four)
  const pills: string[] = [];
  const open = st.drawers.map((d, i) => ({ d, i })).filter(x => x.d.lit || x.d.fresh || x.d.out);
  const k = inkK() * scale,
    fs = 8.6 * k,
    [right] = P(CAB.x0, CAB.y1, CAB.z1),
    [, top0] = P(CAB.x0, CAB.y0, CAB.z1);
  open.slice(0, narrow ? 4 : MAX_DRAWERS).forEach(({ d, i }, r) => {
    const { x, z } = slot(i);
    const at = [x + (DW - 3) / 2, CAB.y1 + 7, z + (DH - 4) * 0.7],
      [X, Y] = P(at[0], at[1], at[2]);
    const text = narrow ? d.word : `${d.word} · ${plural(d.cards, 'PAGE')}`,
      w = text.length * fs * 0.62 + fs * 1.5;
    const cx = right - 10 * k - w / 2,
      cy = top0 + 8 * k + r * fs * 2.2;
    pills.push(pill(at, (cx - X) / k, (cy - Y) / k, text, !!d.lit, scale));
  });
  pills.push(
    pill(
      [CAB.x0 + 6, CAB.y0, CAB.z1],
      -6,
      -16,
      !o.words ? 'NO INDEX' : narrow ? 'INDEX' : `INDEX · ${plural(o.words, 'WORD')}`,
      false,
      scale,
    ),
    pill(
      [(STACK.x0 + STACK.x1) / 2, STACK.y0, STACK.table + 25],
      0,
      -18,
      narrow ? 'PAGES' : st.reading ? `${plural(o.read ?? 0, 'PAGE')} READ` : `${plural(N, 'PAGE')}`,
      st.reading,
      scale,
    ),
    pill(
      [(DESK.x0 + DESK.x1) / 2, DESK.y1, DESK.z1],
      0,
      22,
      o.query ? `“${clip(o.query, narrow ? 14 : 26)}”` : 'NO SEARCH',
      !!o.query,
      scale,
    ),
  );
  if (st.steps[0])
    pills.push(
      pill(
        [stepX(0), POD.y1, POD.base + st.steps[0].h + 9],
        narrow ? 0 : 6,
        -28 - st.steps[0].h * 0.4,
        narrow ? 'TOP' : `TOP · ${st.steps[0].name}`,
        true,
        scale,
      ),
    );
  else
    pills.push(
      pill(
        [stepX(0), POD.y1, POD.base + 3],
        0,
        26,
        o.found === undefined ? 'NO RESULTS' : narrow ? 'FOUND' : `FOUND ON ${plural(o.found, 'PAGE')}`,
        !!o.found,
        scale,
      ),
    );
  const callouts =
    sayAt(o.say, 'cabinet', [CAB.x1 - 16, CAB.y1, CAB.z1], -16, scale) +
    sayAt(o.say, 'pages', [(STACK.x0 + STACK.x1) / 2, STACK.y0, STACK.table + 25], -18, scale) +
    sayAt(o.say, 'desk', [DESK.x0 + 22, DESK.y0 + 12, DESK.z1], -12, scale) +
    sayAt(o.say, 'podium', [stepX(2), POD.y1, POD.base], 50, scale);
  return s + pills.join('') + callouts;
};

/** The room in words, for its aria-label. */
export function cabinetLabel(o: CabinetOpts): string {
  const st = cabinetState(o);
  const lit = st.drawers.filter(d => d.lit);
  return (
    `The index cabinet: ${plural(o.words, 'drawer').toLowerCase()}, one per word` +
    (lit.length
      ? `; open: ${lit.map(d => `“${d.word}” with ${plural(d.cards, 'page').toLowerCase()}`).join(', ')}. `
      : '. ') +
    (st.reading ? `The clerk read all ${fmt(o.read ?? 0)} pages. ` : '') +
    (o.query ? `The search: “${o.query}”. ` : '') +
    (st.steps.length
      ? `On the podium: ${st.steps.map((s, i) => `${i + 1}, ${s.name}`).join('; ')}.`
      : 'The podium is empty.')
  );
}

/** The counts the caption carries (phones show only the names in the pills). */
export function cabinetReadouts(o: CabinetOpts): string[] {
  const st = cabinetState(o);
  return [
    ...(st.reading ? [`${fmt(o.read ?? 0)} pages read`] : []),
    ...st.drawers.filter(d => d.lit).map(d => `“${d.word}”: ${plural(d.cards, 'page').toLowerCase()}`),
    ...(st.steps[0] ? [`top: ${st.steps[0].name}`] : []),
    ...(o.found !== undefined && !st.steps[0] ? [`found on ${plural(o.found, 'page').toLowerCase()}`] : []),
  ];
}

/** An empty room: the index built, nothing asked. */
export const IDLE: Omit<CabinetOpts, 'say' | 'scale'> = { drawers: [], words: 0 };

/** The room after a search ran through the index: the query's drawers open, the podium from the ranking. */
export function cabinetAt(
  query: string,
  s: Settings,
  extra: Partial<CabinetOpts> = {},
  words: number = drawerCount(s),
): Omit<CabinetOpts, 'say' | 'scale'> {
  const terms = termsOf(query, s.clean).slice(0, MAX_DRAWERS);
  return {
    query,
    words,
    drawers: terms.map(word => ({ word, cards: countOf(word, s), lit: true })),
    podium: search(query, s)
      .slice(0, 3)
      .map(h => ({ name: pageName(h.id), score: h.score })),
    ...extra,
  };
}

const countOf = (w: string, s: Settings) => postings(w, s.clean).doc.length;
const counts = new Map<string, number>();
/** How many words (drawers) an index under this cleaning holds. */
export function drawerCount(s: Settings): number {
  const key = JSON.stringify(s.clean);
  let n = counts.get(key);
  if (n === undefined) counts.set(key, (n = vocabulary(s).size));
  return n;
}
const vocabulary = (s: Settings) => new Set(PAGES.flatMap(p => wordsOf(p.text, s.clean)));

/** The home hero's plot: the card catalogue in miniature, one drawer pulled out and lit, the clerk at it, and the
 * podium with its three pages. */
export function cabinetPlot(x: number, y: number, top: SceneCtx['top']): string {
  const drawers: Drawer[] = Array.from({ length: MAX_DRAWERS }, (_, i) => ({ word: '', cards: 2, lit: i === 1 })),
    cab = shaded([
      { box: span(CAB.x0 - 1.2, CAB.y0 - 1.2, BH, CAB.x1 + 1.2, CAB.y1 + 14, CAB.z1), svg: cabinetSvg(drawers) },
    ]),
    pod = shaded([
      {
        box: span(POD.x0 - 3, POD.y0 - 3, BH, POD.x1 + 1, POD.y1 + 3, POD.base + POD.tall + 9),
        svg: podiumSvg([{ h: 24 }, { h: 16 }, { h: 10 }]),
      },
    ]),
    pieces = [
      mini(cab, [(CAB.x0 + CAB.x1) / 2, CAB.y0, BH], [x - 4, y - 14, BH], 0.3),
      mini(pod, [(POD.x0 + POD.x1) / 2, (POD.y0 + POD.y1) / 2, BH], [x + 6, y + 10, BH], 0.26),
      mini(
        person({ x: 0, y: 0, facing: 270, pose: 'reach', look: CLERK, holding: null }),
        [0, 0, BH],
        [x - 10, y + 2, BH],
        0.5,
      ),
    ];
  return drawPieces(pieces, top);
}
