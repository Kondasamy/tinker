// Module 7's picture: the engine room (KTD11). Two floors, one per layer: the first on the ground, the second a storey
// up behind it. Each floor has a pair of desks, one per head; the desk whose attention is shown has its screen lit.
// The prompt's pieces stand as tiles in a row along the front, and the lit head's attention is drawn as threads from
// one token (the query, default the last) back to every token it looks at, the ink heavier and darker as the weight
// grows. A weight below THREAD_FLOOR draws no thread. Words go only in label pills, every one escaped (esc).
import type { SceneCtx, Board } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc } from '../../lib/iso/blocks';
import {
  INK,
  PALS,
  METAL,
  CERAMIC,
  WOOD,
  P,
  f,
  box,
  shape,
  on,
  PX,
  hullInk,
  castShadow,
  toneI,
  tag,
  byDepth,
} from '../../lib/iso/core.js';
import { pieceLabel } from './attentionMap';

export const ENGINE_BOARD: Board = [0, 0, 260, 210];
/** Weights under this draw no thread: they would be ink too faint to see, and they crowd the strong ones. */
export const THREAD_FLOOR = 0.05;

export interface EngineOpts {
  /** the pieces read, in order (the trace's tokens); none: an empty row */
  tokens: string[];
  /** every attention matrix, [layer][head][query t][key s] (the trace's); none: no threads */
  attention?: number[][][][];
  /** the desk lit and the head whose threads are drawn (0-based; default layer 0, head 0) */
  layer?: number;
  head?: number;
  /** the token whose threads are drawn (default the last) */
  query?: number;
  /** label pill size: 1 wide, larger on phones (name only) */
  scale?: number;
}

const LIT = '#ffb627';
const X0 = 30,
  X1 = 230,
  UP = 30; // the floors' extent along x; the second floor's height
const FLOOR = [
  { y0: 82, y1: 136, z: BH + 2 },
  { y0: 12, y1: 74, z: BH + UP + 2 },
];
const DESK_X = [92, 168],
  TILE_Y = 180,
  TILE_H = 4,
  ROW = [16, 244];

/** The tiles' centres along x: an even row, at most 24 apart, centred. */
export function tileXs(n: number): number[] {
  if (!n) return [];
  const pitch = Math.min(24, (ROW[1] - ROW[0]) / n),
    start = (ROW[0] + ROW[1]) / 2 - (pitch * (n - 1)) / 2;
  return Array.from({ length: n }, (_, i) => start + i * pitch);
}

export interface Thread {
  from: number;
  to: number;
  w: number;
  opacity: number;
  width: number;
}
/** What the picture shows: the query and its threads (strongest first). Pure, so the tests can check it without drawing. */
export function engineState({ tokens, attention, layer = 0, head = 0, query }: EngineOpts) {
  const n = tokens.length,
    q = n ? Math.min(Math.max(query ?? n - 1, 0), n - 1) : -1;
  const row = q >= 0 ? (attention?.[layer]?.[head]?.[q] ?? []) : [];
  const threads: Thread[] = row
    .slice(0, q + 1)
    .map((w, to) => ({ from: q, to, w, opacity: 0.2 + 0.8 * Math.min(1, w), width: 0.6 + 2.6 * Math.min(1, w) }))
    .filter(t => Number.isFinite(t.w) && t.w >= THREAD_FLOOR)
    .sort((a, b) => b.w - a.w || a.to - b.to);
  return { n, query: q, threads, strongest: threads[0] };
}

type Part = { at: number[]; svg: string };

/** A head's desk: a wooden desk with a little screen; lit while its attention is the one shown. */
function desk(x: number, y: number, z: number, l: number, h: number, lit: boolean): Part {
  const z1 = z + 10;
  const s =
    box(x - 15, y - 10, z, x + 15, y + 10, z1, WOOD, toneI, 1) +
    box(x - 8, y - 6, z1, x + 2, y + 6, z1 + 9, PALS.blush, toneI, 1) +
    shape(
      on(PX(x + 2.05), [
        [y - 4.4, z1 + 2],
        [y + 4.4, z1 + 2],
        [y + 4.4, z1 + 7.2],
        [y - 4.4, z1 + 7.2],
      ]),
      lit ? LIT : '#1d2a26',
      0.6,
    ) +
    hullInk(boxCorners(x - 15, y - 10, z, x + 15, y + 10, z1), 1.8);
  return { at: [x, y, z], svg: `<g data-desk="${l}-${h}"${lit ? ' data-lit="1"' : ''}>${s}</g>` };
}

/** A token tile on the board's front row: the query in mustard, the token it looks at most in mint. */
function tile(i: number, x: number, w: number, mat: typeof CERAMIC): Part {
  return {
    at: [x, TILE_Y, 0],
    svg: `<g data-tile="${i}">${box(x - w / 2, TILE_Y - 6, BH, x + w / 2, TILE_Y + 6, BH + TILE_H, mat, toneI, 0.9)}</g>`,
  };
}

/** A thread: an arch of ink from the query tile's top to another tile's (a small loop when a token looks at itself). */
function thread(t: Thread, xs: number[]): string {
  const z = BH + TILE_H,
    a = xs[t.from],
    b = xs[t.to],
    pts: number[][] = [];
  if (t.from === t.to)
    for (let i = 0; i <= 16; i++) {
      const g = (i / 16) * 2 * Math.PI;
      pts.push(P(a + 3.5 * Math.sin(g), TILE_Y, z + 3.5 * (1 - Math.cos(g))));
    }
  else {
    const rise = Math.min(46, 6 + 0.38 * Math.abs(a - b));
    for (let i = 0; i <= 20; i++) {
      const u = i / 20;
      pts.push(P(a + (b - a) * u, TILE_Y, z + rise * Math.sin(Math.PI * u)));
    }
  }
  return (
    `<path class="thread" data-from="${t.from}" data-to="${t.to}" data-w="${t.w.toFixed(3)}" d="M${pts.map(p => `${f(p[0])} ${f(p[1])}`).join('L')}"` +
    ` fill="none" stroke="${INK}" stroke-opacity="${t.opacity.toFixed(3)}" stroke-width="${t.width.toFixed(2)}" stroke-linecap="round"/>`
  );
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;

/** The engine room. On phones (scale > 1) the pills name only: layers and token numbers, never the pieces. */
export const engineScene = (o: EngineOpts) => (ctx: SceneCtx) => {
  const { layer = 0, head = 0, scale = 1 } = o,
    narrow = scale > 1,
    st = engineState(o),
    xs = tileXs(st.n);
  const shadows: string[] = [],
    shade = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
      shadows.push(castShadow(boxCorners(x0, y0, z0, x1, y1, z1), BH, ctx.top));
  const [g, u] = FLOOR;
  // the second floor is a storey block behind the first; its top is the floor its desks stand on
  shade(X0, u.y0, BH, X1, u.y1, u.z);
  let s =
    `<g data-floor="1">${box(X0, u.y0, BH, X1, u.y1, u.z, PALS.cobalt, toneI, 1.1) + hullInk(boxCorners(X0, u.y0, BH, X1, u.y1, u.z), 2.4)}</g>` +
    `<g data-floor="0">${box(X0, g.y0, BH, X1, g.y1, g.z, METAL, toneI, 1) + hullInk(boxCorners(X0, g.y0, BH, X1, g.y1, g.z), 1.8)}</g>`;
  const desks: Part[] = [];
  FLOOR.forEach((fl, l) =>
    DESK_X.forEach((x, h) => desks.push(desk(x, (fl.y0 + fl.y1) / 2, fl.z, l, h, l === layer && h === head))),
  );
  for (const d of desks) shade(d.at[0] - 15, d.at[1] - 10, d.at[2], d.at[0] + 15, d.at[1] + 10, d.at[2] + 10);
  // floors back to front, each with its desks, so the storey never covers the first floor's desks
  s += byDepth(desks.filter(d => d.at[2] > g.z)) + byDepth(desks.filter(d => d.at[2] === g.z));
  const w = xs.length > 1 ? Math.min(18, (xs[1] - xs[0]) * 0.78) : 18;
  const tiles = xs.map((x, i) =>
    tile(
      i,
      x,
      w,
      i === st.query ? PALS.mustard : st.strongest && i === st.strongest.to && i !== st.query ? PALS.mint : CERAMIC,
    ),
  );
  if (xs.length) shade(xs[0] - w / 2, TILE_Y - 6, BH, xs.at(-1)! + w / 2, TILE_Y + 6, BH + TILE_H);
  s += `<g data-tiles="${st.n}">${byDepth(tiles)}</g>`;
  // weakest first, so the strongest threads lie on top
  s += `<g class="threads" data-head="${layer}-${head}">${[...st.threads]
    .reverse()
    .map(t => thread(t, xs))
    .join('')}</g>`;

  const pills = [
    pill([X1, (g.y0 + g.y1) / 2, g.z], 26, 4, 'LAYER 1', layer === 0, scale),
    pill([X1, (u.y0 + u.y1) / 2, u.z], 26, -4, 'LAYER 2', layer === 1, scale),
  ];
  const lit = FLOOR[layer] && DESK_X[head] !== undefined;
  if (lit && !narrow)
    pills.push(
      pill(
        [DESK_X[head] - 3, (FLOOR[layer].y0 + FLOOR[layer].y1) / 2, FLOOR[layer].z + 19],
        0,
        -14,
        `HEAD ${head + 1}`,
        true,
        scale,
      ),
    );
  if (st.query >= 0) {
    const say = (i: number) => (narrow ? `#${i + 1}` : `#${i + 1} ${pieceLabel(o.tokens[i])}`);
    pills.push(pill([xs[st.query], TILE_Y + 6, BH + TILE_H], 8, 22, say(st.query), true, scale));
    const top = st.strongest;
    if (top && top.to !== st.query)
      pills.push(
        pill(
          [xs[top.to], TILE_Y + 6, BH + TILE_H],
          -8,
          22,
          narrow ? say(top.to) : `${say(top.to)} · ${top.w.toFixed(2)}`,
          false,
          scale,
        ),
      );
  }
  return shadows.join('') + s + pills.join('');
};

/** The home hero's plot (heroScene): a small engine room at (x, y), one storey with a head's desk lit on top, and three
 * token tiles in front with a thread of attention from the last back to the first. Squat, so the pill rows above leave it in view. */
export function enginePlot(x: number, y: number, top: SceneCtx['top']): string {
  const ty = y + 14,
    xs = [x - 12, x, x + 12],
    z = BH + TILE_H,
    room = boxCorners(x - 16, y - 20, BH, x + 16, y, BH + 12);
  const lit = desk(x, y - 10, BH + 12, 0, 0, true);
  const tiles: Part[] = xs.map((tx, i) => ({
    at: [tx, ty, 0],
    svg: box(
      tx - 4.5,
      ty - 4.5,
      BH,
      tx + 4.5,
      ty + 4.5,
      z,
      i === 2 ? PALS.mustard : i === 0 ? PALS.mint : CERAMIC,
      toneI,
      0.9,
    ),
  }));
  const arch = Array.from({ length: 21 }, (_, i) => {
    const u = i / 20;
    return P(xs[2] + (xs[0] - xs[2]) * u, ty, z + 12 * Math.sin(Math.PI * u));
  });
  return (
    castShadow(room, BH, top) +
    castShadow(boxCorners(x - 15, y - 20, BH + 12, x + 15, y, BH + 22), BH, top) +
    byDepth([
      {
        at: [x, y - 10, 0],
        svg: box(x - 16, y - 20, BH, x + 16, y, BH + 12, PALS.cobalt, toneI, 1) + hullInk(room, 1.8) + lit.svg,
      },
      ...tiles,
    ]) +
    `<path d="M${arch.map(p => `${f(p[0])} ${f(p[1])}`).join('L')}" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`
  );
}

/** The picture in words, for its aria-label. */
export function engineLabel(o: EngineOpts): string {
  const { layer = 0, head = 0 } = o,
    st = engineState(o);
  const say = [
    `The engine room: two floors, one per layer, with two desks on each, one per head. The desk of layer ${layer + 1}, head ${head + 1} is lit.`,
  ];
  if (!st.n) say.push('No tokens yet: the row of tiles is empty.');
  else {
    say.push(`${st.n} token tiles stand in a row.`);
    const q = `token ${st.query + 1} (${pieceLabel(o.tokens[st.query])})`;
    if (!st.threads.length) say.push(o.attention ? `No threads from ${q}.` : `${q} is picked; no attention drawn yet.`);
    else {
      const t = st.strongest!;
      say.push(
        `Threads run from ${q} to ${st.threads.length} token${st.threads.length === 1 ? '' : 's'}; the heaviest goes to ${t.to === st.query ? 'itself' : `token ${t.to + 1} (${pieceLabel(o.tokens[t.to])})`}, weight ${t.w.toFixed(2)}.`,
      );
    }
  }
  return say.join(' ');
}
