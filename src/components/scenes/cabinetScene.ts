// The Search module's picture: the index cabinet (KTD15). At the back stands a wooden cabinet, a drawer per word. The
// query's drawers are pulled out and lit, page cards standing in them; a few other drawers show their cards too (the
// query's words plus at most six others, a count pill for the rest). Beside it, the stack of every page on a reading
// table: lit when the clerk reads them all (the scan). In front, the clerk's desk holds the search slip, and a ranking
// podium whose step heights follow the top three scores, a card on each. Words only in pills, all escaped; on phones
// (scale > 1.5) pills keep just the names and the caption carries the numbers (cabinetReadouts).
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  PALS,
  CERAMIC,
  WOOD,
  METAL,
  box,
  castShadow,
  hullInk,
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

/** One drawer: its face, or pulled out and lit with page cards standing in it. */
function drawerSvg(d: Drawer, i: number): string {
  const { x, z } = slot(i),
    w = DW - 3,
    h = DH - 4;
  const y = CAB.y1;
  if (!d.lit && !d.fresh && !d.out) {
    const face = shape(
      [
        [x, y + 0.05, z],
        [x + w, y + 0.05, z],
        [x + w, y + 0.05, z + h],
        [x, y + 0.05, z + h],
      ],
      d.cards ? CERAMIC.l : CERAMIC.m,
      0.4,
    );
    const handle = box(x + w / 2 - 2.5, y, z + h - 4, x + w / 2 + 2.5, y + 1, z + h - 2.6, METAL, toneI, 0.4);
    return `<g class="drawer" data-word="${esc(d.word)}">${face}${handle}</g>`;
  }
  // pulled out: a tray in front of the cabinet, open at the top, cards standing in a row
  const out = 14,
    m = d.lit ? PALS.mustard : CERAMIC;
  let s = box(x, y, z, x + w, y + out, z + h * 0.7, m, toneI, 0.8);
  const n = Math.min(CARDS_DRAWN, d.cards);
  for (let c = 0; c < n; c++) {
    const cy = y + 2.5 + (c * (out - 4)) / Math.max(1, CARDS_DRAWN - 1),
      fresh = d.fresh && c === n - 1;
    s += `<g class="card${fresh ? ' fresh' : ''}">${box(x + 2, cy, z + h * 0.7, x + w - 2, cy + 0.6, z + h * 0.7 + 5, CERAMIC, toneI, 0.5)}</g>`;
  }
  return `<g class="drawer out${d.lit ? ' lit' : ''}" data-word="${esc(d.word)}" data-cards="${d.cards}">${s}</g>`;
}

/** The stack of every page on its reading table: lit while the clerk reads them all. */
function stackSvg(reading: boolean): string {
  const t = box(STACK.x0, STACK.y0, BH, STACK.x1, STACK.y1, STACK.table, WOOD, toneI, 1);
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
  return `<g data-prop="pages" class="${reading ? 'reading' : ''}">${t}${sheets}${hullInk(boxCorners(STACK.x0, STACK.y0, BH, STACK.x1, STACK.y1, STACK.table + 25), 1.6)}</g>`;
}

/** The podium: three steps, first in the middle, second left, third right, each with a card on top. */
function podiumSvg(steps: { h: number }[]): string {
  const w = (POD.x1 - POD.x0) / 3,
    order = [1, 0, 2]; // left, middle, right hold places 2, 1, 3
  const parts: { at: number[]; svg: string }[] = [];
  order.forEach((place, col) => {
    const st = steps[place];
    const x0 = POD.x0 + col * w,
      x1 = x0 + w - 2,
      h = st ? st.h : 3,
      m = place === 0 && st ? PALS.mustard : st ? PALS.cobalt : CERAMIC;
    let s = box(x0, POD.y0, POD.base, x1, POD.y1, POD.base + h, m, toneI, 1);
    if (st)
      s += box(
        x0 + w / 2 - 6,
        (POD.y0 + POD.y1) / 2 - 0.4,
        POD.base + h,
        x0 + w / 2 + 6,
        (POD.y0 + POD.y1) / 2 + 0.4,
        POD.base + h + 9,
        CERAMIC,
        toneI,
        0.6,
      );
    parts.push({ at: [x0 + w / 2, POD.y0, 0], svg: `<g class="step" data-place="${place + 1}">${s}</g>` });
  });
  const base = box(POD.x0 - 3, POD.y0 - 3, BH, POD.x1 + 1, POD.y1 + 3, POD.base, WOOD, toneI, 1);
  return `<g data-prop="podium" data-steps="${steps.length}">${base}${byDepth(parts)}</g>`;
}

const stepX = (place: number) => POD.x0 + ([1, 0, 2].indexOf(place) + 0.5) * ((POD.x1 - POD.x0) / 3) - 1;

/** The room. Shadows, cabinet, stack, desk and podium back to front, then pills, callouts last. */
export const cabinetScene = (o: CabinetOpts) => (ctx: SceneCtx) => {
  const st = cabinetState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5;
  let s = '';
  for (const b of [
    [CAB.x0, CAB.y0, CAB.x1, CAB.y1, CAB.z1],
    [STACK.x0, STACK.y0, STACK.x1, STACK.y1, STACK.table + 25],
    [DESK.x0, DESK.y0, DESK.x1, DESK.y1, DESK.z1],
    [POD.x0, POD.y0, POD.x1, POD.y1, POD.base + POD.tall],
  ])
    s += castShadow(boxCorners(b[0], b[1], BH, b[2], b[3], b[4]), BH, ctx.top);
  // the cabinet, its drawers (pulled-out ones drawn after the faces, nearer the viewer)
  let cab = box(CAB.x0, CAB.y0, BH, CAB.x1, CAB.y1, CAB.z1, WOOD, toneI, 1);
  for (let i = st.drawers.length; i < CAB.cols * CAB.rows; i++) cab += drawerSvg({ word: '', cards: 0 }, i);
  st.drawers.forEach((d, i) => {
    if (!d.lit && !d.fresh && !d.out) cab += drawerSvg(d, i);
  });
  cab += hullInk(boxCorners(CAB.x0, CAB.y0, BH, CAB.x1, CAB.y1, CAB.z1), 2.2);
  st.drawers.forEach((d, i) => {
    if (d.lit || d.fresh || d.out) cab += drawerSvg(d, i);
  });
  s += `<g data-prop="cabinet" data-drawers="${st.drawers.length}">${cab}</g>`;
  s += stackSvg(st.reading);
  const desk =
    box(DESK.x0, DESK.y0, BH, DESK.x1, DESK.y1, DESK.z1, WOOD, toneI, 1) +
    (o.query
      ? box(DESK.x0 + 10, DESK.y0 + 8, DESK.z1, DESK.x1 - 10, DESK.y1 - 8, DESK.z1 + 0.8, CERAMIC, toneI, 0.6)
      : '') +
    hullInk(boxCorners(DESK.x0, DESK.y0, BH, DESK.x1, DESK.y1, DESK.z1 + 0.8), 1.8);
  s += `<g data-prop="desk">${desk}</g>`;
  s += podiumSvg(st.steps);

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

/** The home hero's plot: a small cabinet with one drawer out and lit, and a two-step podium in front. */
export function cabinetPlot(x: number, y: number, top: SceneCtx['top']): string {
  const cx0 = x - 16,
    cx1 = x + 10,
    cy0 = y - 12,
    cy1 = y - 7,
    h = BH + 18;
  let cab = box(cx0, cy0, BH, cx1, cy1, h, WOOD, toneI, 1);
  for (let i = 0; i < 4; i++) {
    const col = i % 2,
      row = Math.floor(i / 2),
      dx = cx0 + 1.5 + col * 12,
      z = h - 2 - (row + 1) * 7;
    if (i === 1) continue;
    cab += shape(
      [
        [dx, cy1 + 0.05, z],
        [dx + 10, cy1 + 0.05, z],
        [dx + 10, cy1 + 0.05, z + 6],
        [dx, cy1 + 0.05, z + 6],
      ],
      CERAMIC.m,
      0.35,
    );
  }
  cab += hullInk(boxCorners(cx0, cy0, BH, cx1, cy1, h), 1.6);
  // the lit drawer pulled out, a card standing in it
  const dz = h - 2 - 7,
    drawer =
      box(cx0 + 13.5, cy1, dz, cx0 + 23.5, cy1 + 6, dz + 4, PALS.mustard, toneI, 0.8) +
      box(cx0 + 15, cy1 + 3, dz + 4, cx0 + 22, cy1 + 3.5, dz + 8, CERAMIC, toneI, 0.4);
  const px = x + 4,
    py = y + 6,
    podium =
      box(px - 8, py - 3, BH, px - 1, py + 3, BH + 4, PALS.cobalt, toneI, 0.8) +
      box(px - 1, py - 3, BH, px + 6, py + 3, BH + 8, PALS.mustard, toneI, 0.8);
  return (
    castShadow(boxCorners(cx0, cy0, BH, cx1, cy1, h), BH, top) +
    castShadow(boxCorners(px - 8, py - 3, BH, px + 6, py + 3, BH + 8), BH, top) +
    byDepth([
      { at: [x, cy0, 0], svg: cab + drawer },
      { at: [px, py, 0], svg: podium },
    ])
  );
}
