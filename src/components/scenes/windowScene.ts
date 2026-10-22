// Module 8's picture: the window desk. A glass case of fixed size on a desk is the context window; its height is the
// token budget. Inside, the call's parts lie as stacked papers, bottom up in window order, each coloured by kind and as
// thick as its tokens. A window over the budget rises past the rim and spills papers onto the desk. agentScene's gauge
// stands on the desk (the cached share, then the window's fill), and each prop is turned on by the chapter: a cache
// shelf behind (a copy of the shared prefix, lit on a hit), a filing cabinet for memory (a drawer out when notes were
// read), and agentScene's in-tray for cleared results (a binder once summarised). Everything is read off one run, up to a call.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, glassCase } from '../../lib/iso/blocks';
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
  INK,
} from '../../lib/iso/core.js';
import { num } from '../../lib/format';
import { gaugeProp, trayProp } from './agentScene';
import { KIND_NAME, KIND_PAL } from './windowBar';
import { DEFAULTS, REPLY_ROOM, type Run } from '../../lib/context/loop';
import { MEMORY_DIR } from '../../lib/context/memory';
import type { PartKind } from '../../lib/context/window';

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
}

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
      // a sheet fallen on the desk in front of the case, turned a little
      const cx = x1 + dx,
        cy = (y0 + y1) / 2 + dy,
        c = Math.cos(t),
        sn = Math.sin(t),
        q = [
          [-5, -7],
          [5, -7],
          [5, 7],
          [-5, 7],
        ];
      s += `<g class="spill">${shape(
        q.map(([u, v]) => [cx + u * c - v * sn, cy + u * sn + v * c, DZ + 0.3]),
        CERAMIC.l,
        0.7,
      )}</g>`;
    }
  return {
    at: [(x0 + x1) / 2, (y0 + y1) / 2, 1],
    svg: `<g data-prop="window" data-over="${over ? 1 : 0}" data-height="${p.height.toFixed(2)}">${s}</g>`,
  };
}

/** The desk the window stands on. */
function desk(): Part {
  const [x0, y0, x1, y1] = DESK;
  return {
    at: [0, 0, 0],
    svg: box(x0, y0, BH, x1, y1, DZ, WOOD, toneI, 1) + hullInk(boxCorners(x0, y0, BH, x1, y1, DZ), 2.2),
  };
}

/** A wall shelf behind the desk: a slab as thick as the cached prefix, lit while this call reads it. */
function shelf(cached: number, budget: number, hit: boolean): Part {
  const [x0, y0, x1, y1] = SHELF,
    z = SHELF_Z,
    h = Math.min(14, (cached * CASE_H) / Math.max(budget, 1));
  let s =
    rod([x0 + 3, y0 + 4, BH], [x0 + 3, y0 + 4, z], 1.2, METAL) +
    rod([x0 + 3, y1 - 4, BH], [x0 + 3, y1 - 4, z], 1.2, METAL) +
    box(x0, y0, z, x1, y1, z + 2, WOOD, toneI, 1);
  if (cached > 0)
    s += `<g class="cached">${box(x0 + 3, y0 + 6, z + 2, x1 - 3, y1 - 6, z + 2 + Math.max(THIN, h), hit ? LIT : PALS.cobalt, toneI, 0.8)}</g>`;
  return { at: [x1, (y0 + y1) / 2, 0], svg: `<g data-prop="shelf" data-hit="${hit ? 1 : 0}">${s}</g>` };
}

/** A metal filing cabinet: three drawers facing the viewer; the top one out, with a note in it, when memory was read. */
function cabinet(open: boolean): Part {
  const [x0, y0, x1, y1] = CABINET,
    z1 = BH + 40,
    dz = (z1 - BH) / 3;
  let s = box(x0, y0, BH, x1, y1, z1, METAL, toneI, 1);
  for (let i = 0; i < 3; i++) {
    const a = BH + i * dz + 2,
      b = BH + (i + 1) * dz - 2;
    s +=
      shape(
        on(PX(x1 + 0.05), [
          [y0 + 3, a],
          [y1 - 3, a],
          [y1 - 3, b],
          [y0 + 3, b],
        ]),
        METAL.m,
        0.6,
      ) +
      line(
        on(PX(x1 + 0.1), [
          [(y0 + y1) / 2 - 3, b - 3],
          [(y0 + y1) / 2 + 3, b - 3],
        ]),
        1.4,
      ).replace(INK, DARK.m);
  }
  if (open) {
    const a = BH + 2 * dz + 2,
      b = z1 - 2;
    s += `<g class="drawer">${
      box(x1, y0 + 3, a, x1 + 12, y1 - 3, b, METAL, toneI, 1) +
      box(x1 + 2, y0 + 6, b, x1 + 10, y1 - 6, b + 4, CERAMIC, toneI, 0.6)
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

  const win = windowCase(st.window?.parts ?? [], budget, st.over);
  parts.push(win);
  pills.push(
    pill(
      [CASE[2], (CASE[1] + CASE[3]) / 2, DZ + CASE_H],
      20,
      -26,
      narrow ? (st.over ? 'OVER' : 'WINDOW') : `${st.over ? 'OVER · ' : 'WINDOW '}${num(st.tokens)} / ${num(budget)}`,
      st.over,
      scale,
    ),
  );
  parts.push(gaugeProp(GAUGE[0], GAUGE[1], st.cachedShare, st.fill, st.over));

  if (o.shelf) {
    const hit = st.cached > 0;
    parts.push(shelf(st.cached, budget, hit));
    if (!narrow || hit)
      pills.push(
        pill(
          [SHELF[0], SHELF[1] + 4, SHELF_Z + 4],
          -6,
          -24,
          narrow ? 'CACHE' : hit ? `CACHE HIT ${num(st.cached)}` : 'CACHE',
          hit,
          scale,
        ),
      );
  }
  if (o.cabinet) {
    parts.push(cabinet(st.notes > 0));
    shade(CABINET[0], CABINET[1], CABINET[2], CABINET[3], 40);
    pills.push(
      pill(
        [CABINET[2], CABINET[1] + 4, BH + 40],
        24,
        -14,
        narrow || !st.notes ? 'MEMORY' : `MEMORY · ${st.notes} READ`,
        st.notes > 0,
        scale,
      ),
    );
  }
  if (o.tray) {
    parts.push(trayProp(TRAY[0], TRAY[1], st.cleared, st.summary));
    shade(TRAY[0] - 11, TRAY[1] - 8, TRAY[0] + 11, TRAY[1] + 8, 3 + Math.min(st.cleared, 14) * 0.9);
    if (!narrow)
      pills.push(
        pill(
          [TRAY[0], TRAY[1] + 6, BH + 4],
          -10,
          22,
          st.summary ? (st.cleared ? `SUMMARY + ${st.cleared}` : 'SUMMARY') : `CLEARED ${st.cleared}`,
          false,
          scale,
        ),
      );
  }
  // the desk is under everything on it, so it is drawn first, not sorted by depth
  return shadows.join('') + desk().svg + byDepth(parts) + pills.join('');
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
