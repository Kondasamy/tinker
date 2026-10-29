// Module 8's picture: the window desk. A glass case of fixed size on a desk is the context window; its height is the
// token budget. Inside, the call's parts lie as stacked papers, bottom up in window order, each coloured by kind and as
// thick as its tokens. A window over the budget rises past the rim and spills papers onto the desk. agentScene's gauge
// stands on the desk (the cached share, then the window's fill), and each prop is turned on by the chapter: a cache
// shelf behind (a copy of the shared prefix, lit on a hit), a filing cabinet for memory (a drawer out when notes were
// read), and agentScene's in-tray for cleared results (a binder once summarised). Everything is read off one run, up to a call.
// The hero is the reading desk itself: a wooden desk with a leather inlay and a lit banker's lamp under the glass case,
// a reader seated at its back edge; the shelf is a bookcase and spilled papers curl.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, glassCase, sayAt, calloutsLast } from '../../lib/iso/blocks';
import {
  PALS,
  METAL,
  CERAMIC,
  CLEAR,
  DARK,
  WOOD,
  box,
  rod,
  shape,
  line,
  on,
  PX,
  castShadow,
  hullInk,
  toneI,
  tag,
  byDepth,
  PY,
  PZ,
  cyl,
  loft,
  vis,
  rrUV,
  rectUV,
  ellUV,
  matOf,
} from '../../lib/iso/core.js';
import { num } from '../../lib/format';
import { gaugeProp, trayProp } from './agentScene';
import { SKIN, drawPieces, person, type Look } from '../../lib/iso/figures';
import { KIND_NAME, KIND_PAL } from './windowBar';
import { DEFAULTS, REPLY_ROOM, type Run } from '../../lib/context/loop';
import { MEMORY_DIR } from '../../lib/context/memory';
import type { PartKind } from '../../lib/context/window';
import type { Say } from '../story/steps';

export const WINDOW_BOARD: Board = [0, 0, 200, 186];

export interface WindowOpts {
  run: Run;
  /** calls shown so far (default all, the refused one included); the last one is the current call */
  upTo?: number;
  /** the host's token budget, the reply's room included (default: the engine's) */
  budget?: number;
  /** the cache shelf: a copy of the prefix the last call left, lit when this call reads it */
  shelf?: boolean;
  /** the memory cabinet: a drawer out when the session's notes were read into the window */
  cabinet?: boolean;
  /** the in-tray: tool results cleared out of the window; a binder once the history is one summary */
  tray?: boolean;
  /** pill size; on phones (> 1) the props' readout pills are left to the caption */
  scale?: number;
  /** the step's callout: a lit pill over one of WINDOW_PARTS */
  say?: Say;
}

/** The parts a step's callout may point at: the ones with a name pill. */
export const WINDOW_PARTS = ['window', 'shelf', 'cabinet', 'tray'] as const;

/** What the picture shows at the current call. Pure, so the tests can check it without drawing. */
export function windowState({ run, upTo, budget = DEFAULTS.budget }: Pick<WindowOpts, 'run' | 'upTo' | 'budget'>) {
  const calls = run.meter.length + (run.refused ? 1 : 0),
    call = Math.max(0, Math.min(upTo ?? calls, calls));
  // the call after the last metered one is the window the host refused
  const meter = run.meter[call - 1],
    win = meter?.window ?? (call > run.meter.length ? (run.refused ?? null) : null);
  const parts = win?.parts ?? [],
    tokens = win?.tokens ?? 0,
    cached = meter?.hit.read ?? 0;
  return {
    call,
    calls,
    meter,
    window: win,
    tokens,
    refused: !meter && !!win,
    over: !!win && tokens + REPLY_ROOM > budget,
    /** the window and the reply's room, as a share of the budget (1 when over) */
    fill: win && budget > 0 ? Math.min(1, (tokens + REPLY_ROOM) / budget) : 0,
    cached,
    cachedShare: tokens ? cached / tokens : 0,
    notes: parts.filter(p => p.kind === 'memory').flatMap(p => p.text.split('\n').filter(l => l.startsWith(MEMORY_DIR)))
      .length,
    cleared: parts.filter(p => p.cleared).length,
    summary: parts.some(p => p.kind === 'history' && p.label === 'Summary'),
  };
}

/** Tokens by kind, in window order, for the caption and the label. */
export function kindsOf(o: Pick<WindowOpts, 'run' | 'upTo' | 'budget'>): [PartKind, number][] {
  const by = new Map<PartKind, number>();
  for (const p of windowState(o).window?.parts ?? []) by.set(p.kind, (by.get(p.kind) ?? 0) + p.tokens);
  return [...by];
}

/** The picture's readouts in words, for the caption and the label (on phones the drawing drops these pills). */
export function windowReadouts(o: WindowOpts): string[] {
  const st = windowState(o),
    budget = o.budget ?? DEFAULTS.budget,
    out: string[] = [];
  if (!st.window) return [`window empty, budget ${num(budget)} tokens`];
  out.push(
    `${st.over ? 'over budget: ' : ''}window ${num(st.tokens)} + ${num(REPLY_ROOM)} for the reply, of ${num(budget)} tokens`,
  );
  out.push(
    kindsOf(o)
      .map(([k, n]) => `${KIND_NAME[k]} ${num(n)}`)
      .join(', '),
  );
  if (o.shelf) out.push(st.cached ? `cache hit: ${num(st.cached)} tokens` : 'no cache hit');
  if (o.cabinet)
    out.push(st.notes ? `memory: ${st.notes} note${st.notes === 1 ? '' : 's'} read` : 'memory: nothing read');
  if (o.tray)
    out.push(
      st.summary
        ? `history summarised${st.cleared ? `, ${st.cleared} cleared` : ''}`
        : `${st.cleared} result${st.cleared === 1 ? '' : 's'} cleared`,
    );
  return out;
}

type Part = { at: number[]; svg: string };
const LIT = { l: '#ffb627', m: '#ffb627', d: PALS.mustard.m };
const DZ = BH + 16; // the desk's top: gaugeProp stands at this height
const DESK = [62, 52, 152, 132],
  CASE = [72, 62, 116, 120],
  CASE_H = 52;
const GAUGE = [140, 70],
  SHELF = [22, 58, 40, 126],
  SHELF_Z = BH + 46,
  CABINET = [160, 10, 186, 40],
  TRAY = [100, 168];
const INLAY = [123, 96, 150, 130],
  LAMP = [140, 117],
  READER = [51, 125];
const LEATHER = matOf('#4f8a5e'),
  BRASS = matOf('#d9a93f'),
  SHADE = matOf('#2f8a5a');
const READER_LOOK: Look = { skin: SKIN[3], top: PALS.cobalt.m, legs: '#4a4642', hair: '#2b231c', cut: 'long' };
const BOOKS: [number, number, Mat][] = [
  [0, 11, PALS.tomato],
  [6, 9, PALS.mint],
  [12, 12, PALS.mustard],
  [18, 10, PALS.cobalt],
  [24, 8, PALS.blush],
  [30, 11, PALS.tomato],
  [36, 9, PALS.mint],
  [42, 12, PALS.mustard],
];
type Mat = typeof WOOD;
const PAD = 3; // papers sit this far inside the glass
const SPILL = 0.35; // shortcut: an overflow draws at most this much of the case's height above the rim; the bar is exact
const THIN = 0.6; // the thinnest paper drawn, so a 20-token part still shows

/** The papers: one slab per part, bottom up, as thick as its tokens on the case's scale (its height = the budget).
 * Returns what sits inside the glass and what rises past the rim. */
function papers(
  parts: { kind: PartKind; tokens: number; cleared?: boolean }[],
  budget: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  const k = CASE_H / Math.max(budget, 1),
    total = parts.reduce((n, p) => n + Math.max(THIN, p.tokens * k), 0);
  // above the rim, squeeze the overflow into the spill room
  const squeeze = total > CASE_H ? Math.min(1, (CASE_H * SPILL) / (total - CASE_H)) : 1;
  const top = (h: number) => (h <= CASE_H ? h : CASE_H + (h - CASE_H) * squeeze);
  let inside = '',
    above = '',
    h = 0;
  parts.forEach((p, i) => {
    const a = top(h),
      b = top((h += Math.max(THIN, p.tokens * k))),
      m = KIND_PAL[p.kind],
      z = DZ + 0.2;
    const slab = (lo: number, hi: number) =>
      hi - lo > 1e-6
        ? box(x0 + PAD, y0 + PAD, z + lo, x1 - PAD, y1 - PAD, z + hi, m, toneI, p.cleared ? 0.4 : 0.6)
        : '';
    const g = (s: string) =>
      s && `<g class="paper" data-kind="${p.kind}" data-part="${i}"${p.cleared ? ' data-cleared="1"' : ''}>${s}</g>`;
    inside += g(slab(a, Math.min(b, CASE_H)));
    above += g(slab(Math.max(a, CASE_H), b));
  });
  return { inside, above, height: top(h) };
}

/** The window: a glass case on the desk holding the papers; spilled sheets on the desk when it overflows. */
function windowCase(parts: Parameters<typeof papers>[0], budget: number, over: boolean): Part {
  const [x0, y0, x1, y1] = CASE,
    p = papers(parts, budget, x0, y0, x1, y1);
  let s = glassCase(x0, y0, DZ, x1, y1, DZ + CASE_H, CLEAR, p.inside) + p.above;
  if (over)
    for (const [dx, dy, t] of [
      [6, 4, 0.2],
      [14, -8, -0.35],
      [4, -18, 0.5],
    ]) {
      // a sheet fallen on the desk in front of the case, turned a little, its far end curling up
      s += `<g class="spill">${curled(x1 + dx, (y0 + y1) / 2 + dy, t, DZ + 0.3)}</g>`;
    }
  return {
    at: [(x0 + x1) / 2, (y0 + y1) / 2, 1],
    svg: `<g data-prop="window" data-over="${over ? 1 : 0}" data-height="${p.height.toFixed(2)}">${s}</g>`,
  };
}

/** A sheet of paper lying at (cx, cy) on z, turned t, its far end curling up off the desk. */
function curled(cx: number, cy: number, t: number, z: number) {
  const c = Math.cos(t),
    sn = Math.sin(t),
    at = (u: number, v: number, h: number) => [cx + u * c - v * sn, cy + u * sn + v * c, z + h];
  // cross-sections down the sheet: flat to v = 3, then a curl of radius 2.2
  const cs: [number, number][] = [[-7, 0]];
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * Math.PI * 1.1;
    cs.push([3 + 2.2 * Math.sin(a), 2.2 - 2.2 * Math.cos(a)]);
  }
  let s = '';
  for (let i = 0; i + 1 < cs.length; i++) {
    const [v0, h0] = cs[i],
      [v1, h1] = cs[i + 1];
    s += shape([at(-5, v0, h0), at(5, v0, h0), at(5, v1, h1), at(-5, v1, h1)], v1 >= v0 ? CERAMIC.l : CERAMIC.m, 0.6);
  }
  return s;
}

/** The reading desk the window stands on. Real-object notes: a thick wooden top on four square legs, an apron under
 * it with a drawer front and a knob on each side toward the viewer, a green leather inlay on the top. */
function desk(): string {
  const [x0, y0, x1, y1] = DESK,
    zt = DZ - 3,
    za = zt - 4;
  let s = '';
  for (const [lx, ly] of [
    [x0 + 2, y0 + 2],
    [x1 - 5, y0 + 2],
    [x0 + 2, y1 - 5],
    [x1 - 5, y1 - 5],
  ].sort((a, b) => a[0] + a[1] - b[0] - b[1]))
    s += box(lx, ly, BH, lx + 3, ly + 3, za, WOOD, toneI, 1);
  s += box(x0 + 2, y0 + 2, za, x1 - 2, y1 - 2, zt, WOOD, toneI, 1);
  // a drawer front and its knob on each apron face toward the viewer
  for (const [n, plane, u0, u1] of [
    [[0, 1, 0], PY(y1 - 1.95), x0 + 30, x1 - 30],
    [[1, 0, 0], PX(x1 - 1.95), y0 + 26, y1 - 26],
  ] as [number[], (p: number[]) => number[], number, number][])
    if (vis(n))
      s +=
        shape(on(plane, rrUV(u0, za + 0.7, u1, zt - 0.7, 0.6, 2)), WOOD.l, 0.6) +
        shape(on(plane, ellUV((u0 + u1) / 2, (za + zt) / 2, 0.9, 0.9, 8)), PALS.mustard.l, 0.5);
  s += box(x0, y0, zt, x1, y1, DZ, WOOD, toneI, 1.2);
  s += shape(on(PZ(DZ + 0.05), rrUV(INLAY[0], INLAY[1], INLAY[2], INLAY[3], 2, 3)), LEATHER.l, 0.7);
  // the reader's own sheet, under their hands
  s += curled(READER[0] + 15, READER[1] + 1, Math.PI / 2, DZ + 0.1);
  return s + hullInk(boxCorners(x0, y0, BH, x1, y1, DZ), 2.2);
}

/** The banker's lamp (the hero's light). Real-object notes: a round brass foot, a short brass stem bent forward at
 * the top, an emerald-green glass shade lying across it like half a barrel, a pull chain with a bead; it is on, so a
 * warm pool of light lies on the desk under it. */
function bankersLamp(): Part {
  const [x, y] = LAMP,
    z = DZ,
    zs = z + 16,
    pool = shape(on(PZ(z + 0.08), ellUV(x + 4, y, 9, 12, 24)), '#ffe9a8', 0).replace('<path', '<path opacity=".75"');
  let s =
    cyl(x - 3, y, z, z + 2, 5, BRASS, toneI, 1.1, 20) +
    rod([x - 3, y, z + 2], [x - 3, y, zs - 1.5], 0.9, BRASS, toneI, 0.9) +
    rod([x - 3, y, zs - 1.5], [x, y, zs], 0.9, BRASS, toneI, 0.9);
  // the shade: a half barrel along y (u = x, v = z), open below
  const prof = Array.from({ length: 9 }, (_, i) => {
      const a = (i / 8) * Math.PI;
      return [x + 5.5 * Math.cos(a), zs - 1.5 + 4.5 * Math.sin(a)];
    }),
    A = on(PY(y - 8.5), prof),
    B = on(PY(y + 8.5), prof);
  s += loft(A, B, (n: number[]) => toneI(n, SHADE));
  for (const [E, n] of [
    [A, [0, -1, 0]],
    [B, [0, 1, 0]],
  ] as [number[][], number[]][])
    if (vis(n)) s += shape(E, toneI(n, SHADE), 0.9);
  s +=
    hullInk([...A, ...B], 2) +
    line(
      [
        [x + 3, y + 5, zs - 1.5],
        [x + 3, y + 5, zs - 7],
      ],
      0.5,
    ) +
    cyl(x + 3, y + 5, zs - 8, zs - 7, 0.7, BRASS, toneI, 0.5, 8);
  return { at: [x, y, z], svg: `<g data-prop="lamp">${pool}${s}</g>` };
}

/** The reader: a person sitting on a chair at the desk's back edge, reading, a curled paper in front of them. */
function reader(): string {
  const [x, y] = READER,
    zs = BH + 11;
  let chair = '';
  for (const [lx, ly] of [
    [x - 7, y - 5],
    [x - 7, y + 4],
    [x + 1, y - 5],
    [x + 1, y + 4],
  ])
    chair += box(lx, ly, BH, lx + 1.2, ly + 1.2, zs - 1.2, WOOD, toneI, 0.8);
  chair +=
    box(x - 7.5, y - 5.5, zs - 1.2, x + 2.5, y + 5.5, zs, WOOD, toneI, 1) +
    box(x - 7.5, y - 5.5, zs, x - 6, y + 5.5, zs + 13, WOOD, toneI, 1);
  return chair + drawPieces([person({ x: x - 2, y, z: zs - 7.5, facing: '+x', pose: 'sit', look: READER_LOOK })]);
}

/** A bookcase shelf behind the desk: two wooden uprights, a plank, and the cached prefix on it as a slab as thick
 * as the cached tokens, lit while this call reads it; a row of books on a lower shelf. */
function shelf(cached: number, budget: number, hit: boolean): Part {
  const [x0, y0, x1, y1] = SHELF,
    z = SHELF_Z,
    h = Math.min(14, (cached * CASE_H) / Math.max(budget, 1));
  let s = '';
  for (const yy of [y0 + 2, y1 - 4]) s += box(x0, yy, BH, x0 + 3, yy + 2, z + 2, WOOD, toneI, 0.9);
  s += box(x0, y0, BH + 18, x1, y1, BH + 20, WOOD, toneI, 1);
  BOOKS.forEach(([dy, ht, c], i) => {
    const yy = y0 + 6 + dy;
    s += box(x0 + 3 + (i % 2), yy, BH + 20, x1 - 4, yy + 4.5, BH + 20 + ht, c, toneI, 0.7);
  });
  s += box(x0, y0, z, x1, y1, z + 2, WOOD, toneI, 1);
  if (cached > 0)
    s += `<g class="cached">${box(x0 + 3, y0 + 6, z + 2, x1 - 3, y1 - 6, z + 2 + Math.max(THIN, h), hit ? LIT : PALS.cobalt, toneI, 0.8)}</g>`;
  return { at: [x1, (y0 + y1) / 2, 0], svg: `<g data-prop="shelf" data-hit="${hit ? 1 : 0}">${s}</g>` };
}

/** A steel filing cabinet: a plinth, a lipped top, three drawers facing the viewer, each with a card holder and a bar
 * pull; the top one out, with a note in it, when memory was read. */
function cabinet(open: boolean): Part {
  const [x0, y0, x1, y1] = CABINET,
    z1 = BH + 40,
    dz = (z1 - BH - 2) / 3,
    my = (y0 + y1) / 2;
  let s =
    box(x0 + 1, y0 + 1, BH, x1 - 1, y1 - 1, BH + 2, DARK, toneI, 0.9) +
    box(x0, y0, BH + 2, x1, y1, z1 - 1.5, METAL, toneI, 1) +
    box(x0 - 0.6, y0 - 0.6, z1 - 1.5, x1 + 0.6, y1 + 0.6, z1, METAL, toneI, 1);
  const pull = (x: number, cz: number) =>
    rod([x + 1.3, my - 4, cz], [x + 1.3, my + 4, cz], 0.6, DARK, toneI, 0.7, 0.6, 8);
  for (let i = 0; i < 3; i++) {
    const a = BH + 2 + i * dz + 1.5,
      b = BH + 2 + (i + 1) * dz - 1.5;
    if (open && i === 2) continue;
    s +=
      shape(on(PX(x1 + 0.05), rectUV(y0 + 3, a, y1 - 3, b)), METAL.m, 0.6) +
      shape(on(PX(x1 + 0.1), rectUV(my - 3, b - 3.4, my + 3, b - 1.4)), CERAMIC.l, 0.4) +
      pull(x1, (a + b) / 2);
  }
  if (open) {
    const a = BH + 2 + 2 * dz + 1.5,
      b = z1 - 3;
    s += `<g class="drawer">${
      shape(on(PX(x1 + 0.05), rectUV(y0 + 3, a, y1 - 3, b)), DARK.d, 0.5) +
      box(x1, y0 + 3, a, x1 + 12, y1 - 3, b, METAL, toneI, 1) +
      box(x1 + 2, y0 + 6, b, x1 + 10, y1 - 6, b + 4, CERAMIC, toneI, 0.6) +
      pull(x1 + 12, (a + b) / 2)
    }</g>`;
  }
  return { at: [(x0 + x1) / 2, (y0 + y1) / 2, 0], svg: `<g data-prop="cabinet" data-open="${open ? 1 : 0}">${s}</g>` };
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;

/** The window desk with the props that are on. Words go only in pills; on phones (scale > 1) the caption carries the readouts. */
export const windowScene = (o: WindowOpts) => (ctx: SceneCtx) => {
  const { budget = DEFAULTS.budget, scale = 1 } = o,
    narrow = scale > 1,
    st = windowState(o);
  const parts: Part[] = [],
    pills: string[] = [],
    shadows: string[] = [];
  const shade = (x0: number, y0: number, x1: number, y1: number, h: number) =>
    shadows.push(castShadow(boxCorners(x0, y0, BH, x1, y1, BH + h), BH, ctx.top));
  shade(DESK[0], DESK[1], DESK[2], DESK[3], DZ - BH);
  shade(READER[0] - 8, READER[1] - 6, READER[0] + 3, READER[1] + 6, 30);

  const win = windowCase(st.window?.parts ?? [], budget, st.over),
    caseAt = [CASE[2], (CASE[1] + CASE[3]) / 2, DZ + CASE_H];
  parts.push(win);
  pills.push(
    sayAt(o.say, 'window', caseAt, -26, scale),
    pill(
      caseAt,
      20,
      -26,
      narrow ? (st.over ? 'OVER' : 'WINDOW') : `${st.over ? 'OVER · ' : 'WINDOW '}${num(st.tokens)} / ${num(budget)}`,
      st.over,
      scale,
    ),
  );
  parts.push(gaugeProp(GAUGE[0], GAUGE[1], st.cachedShare, st.fill, st.over));

  if (o.shelf) {
    const hit = st.cached > 0,
      at = [SHELF[0], SHELF[1] + 4, SHELF_Z + 4];
    parts.push(shelf(st.cached, budget, hit));
    pills.push(sayAt(o.say, 'shelf', at, -24, scale));
    if (!narrow || hit)
      pills.push(pill(at, -6, -24, narrow ? 'CACHE' : hit ? `CACHE HIT ${num(st.cached)}` : 'CACHE', hit, scale));
  }
  if (o.cabinet) {
    parts.push(cabinet(st.notes > 0));
    shade(CABINET[0], CABINET[1], CABINET[2], CABINET[3], 40);
    const at = [CABINET[2], CABINET[1] + 4, BH + 40];
    pills.push(
      sayAt(o.say, 'cabinet', at, -14, scale),
      pill(at, 24, -14, narrow || !st.notes ? 'MEMORY' : `MEMORY · ${st.notes} READ`, st.notes > 0, scale),
    );
  }
  if (o.tray) {
    parts.push(trayProp(TRAY[0], TRAY[1], st.cleared, st.summary));
    shade(TRAY[0] - 11, TRAY[1] - 8, TRAY[0] + 11, TRAY[1] + 8, 3 + Math.min(st.cleared, 14) * 0.9);
    const at = [TRAY[0], TRAY[1] + 6, BH + 4];
    pills.push(sayAt(o.say, 'tray', at, 22, scale));
    if (!narrow)
      pills.push(
        pill(
          at,
          -10,
          22,
          st.summary ? (st.cleared ? `SUMMARY + ${st.cleared}` : 'SUMMARY') : `CLEARED ${st.cleared}`,
          false,
          scale,
        ),
      );
  }
  // the desk is under everything on it, so it is drawn first, not sorted by depth
  parts.push(bankersLamp());
  // the reader and the shelf stand behind the desk; the desk is under everything on it, so it is drawn between them
  const behind = parts.filter(p => p.svg.startsWith('<g data-prop="shelf"')),
    onDesk = parts.filter(p => !behind.includes(p));
  return shadows.join('') + byDepth(behind) + reader() + desk() + byDepth(onDesk) + calloutsLast(pills);
};

/** The home hero's plot (heroScene): a small desk at (x, y) with the glass window on it, holding four papers (system,
 * tools, documents, this turn) that fill it most of the way. Squat, so the pill rows above leave it in view. */
export function deskPlot(x: number, y: number, top: SceneCtx['top']): string {
  const z = BH + 6,
    x0 = x - 7,
    y0 = y - 9,
    x1 = x + 7,
    y1 = y + 9,
    h = 18;
  let inside = '',
    a = z + 0.2;
  for (const [k, t] of [
    ['system', 3],
    ['tools', 4],
    ['docs', 5],
    ['message', 2],
  ] as [PartKind, number][])
    inside += box(x0 + 1.5, y0 + 1.5, a, x1 - 1.5, y1 - 1.5, (a += t), KIND_PAL[k], toneI, 0.6);
  return (
    castShadow(boxCorners(x - 14, y - 14, BH, x + 14, y + 14, z), BH, top) +
    box(x - 14, y - 14, BH, x + 14, y + 14, z, WOOD, toneI, 1) +
    hullInk(boxCorners(x - 14, y - 14, BH, x + 14, y + 14, z), 1.8) +
    glassCase(x0, y0, z, x1, y1, z + h, CLEAR, inside)
  );
}

/** The picture in words, for its aria-label. */
export function windowLabel(o: WindowOpts): string {
  const st = windowState(o),
    budget = o.budget ?? DEFAULTS.budget;
  return [
    `Larkspur's window desk: a glass case of fixed size is the ${num(budget)}-token window.`,
    st.window
      ? `Call ${st.call} of ${st.calls}: ${st.window.parts.length} papers stacked by kind, ${st.over ? 'rising past the rim and spilling onto the desk; the host refuses it' : 'within the rim'}.`
      : 'The case is empty.',
    o.shelf ? `A cache shelf behind it${st.cached ? ', lit' : ''}.` : '',
    o.cabinet ? `A filing cabinet for memory${st.notes ? ', a drawer out' : ', shut'}.` : '',
    o.tray ? `An in-tray for cleared results${st.summary ? ' with one binder' : ''}.` : '',
    windowReadouts(o).join('; ') + '.',
  ]
    .filter(Boolean)
    .join(' ');
}
