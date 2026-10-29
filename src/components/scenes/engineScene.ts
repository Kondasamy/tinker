// Module 7's picture: the engine room (KTD11). Two open-plan factory floors, one per layer: the first on the ground,
// the second a railed mezzanine on columns a storey up behind it. Each floor has a pair of desks, one per head, each
// with a clerk standing at its monitor; the desk whose attention is shown has its screen lit and its clerk pointing.
// The prompt's pieces stand as tiles in a row along the front, and the lit head's attention is drawn as threads from
// one token (the query, default the last) back to every token it looks at, the ink heavier and darker as the weight
// grows. A weight below THREAD_FLOOR draws no thread. Words go only in label pills, every one escaped (esc).
import type { SceneCtx, Board } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  DARK,
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
  rod,
} from '../../lib/iso/core.js';
import { person, type Piece } from '../../lib/iso/figures';
import { pieceLabel } from './attentionMap';
import type { Say } from '../story/steps';

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
  /** the step's callout, over one of ENGINE_PARTS */
  say?: Say;
}
/** The parts a step's callout may name: each floor, the lit head's desk, the query tile and the tile it weighs most. */
export const ENGINE_PARTS = ['layer-1', 'layer-2', 'head', 'query', 'focus'] as const;

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

type Part = { at: number[]; svg: string; box?: number[][] };

/** A head's desk: a wooden desk at hip height with a little monitor on a stand (a desk screen, not the model); lit
 * while its attention is the one shown. */
function desk(x: number, y: number, z: number, l: number, h: number, lit: boolean): Part {
  const z1 = z + 11;
  const s =
    box(x - 15, y - 10, z, x + 15, y + 10, z1, WOOD, toneI, 1) +
    hullInk(boxCorners(x - 15, y - 10, z, x + 15, y + 10, z1), 1.8) +
    box(x - 6, y - 3, z1, x - 2, y + 3, z1 + 0.8, DARK, toneI, 0.7) +
    box(x - 4.6, y - 0.8, z1 + 0.8, x - 3.4, y + 0.8, z1 + 3, DARK, toneI, 0.6) +
    box(x - 5, y - 6, z1 + 3, x - 3, y + 6, z1 + 10, DARK, toneI, 1) +
    shape(
      on(PX(x - 2.95), [
        [y - 5, z1 + 3.8],
        [y + 5, z1 + 3.8],
        [y + 5, z1 + 9.2],
        [y - 5, z1 + 9.2],
      ]),
      lit ? LIT : '#1d2a26',
      0.6,
    );
  return {
    at: [x, y, z],
    box: [
      [x - 15, y - 10, z],
      [x + 15, y + 10, z1 + 10],
    ],
    svg: `<g data-desk="${l}-${h}"${lit ? ' data-lit="1"' : ''}>${s}</g>`,
  };
}

const CLERKS = ['shopper2', 'shopper5', 'shopper4', 'shopper3'];
/** The desk's clerk: standing at its far end, turned toward the monitor; pointing at it while it is lit. */
const clerk = (x: number, y: number, z: number, i: number, lit: boolean): Piece =>
  person({ x: x + 6, y: y - 15, z, facing: 105, pose: lit ? 'reach' : 'stand', look: CLERKS[i], holding: null });

/** A railing along a floor's edge from a to b at height z: posts, a mid rail and a top rail, each a thin painted bar
 * (an ink stroke under a mustard one: a rod's look at a sliver of its SVG). */
function railing(a: number[], b: number[], z: number, h = 9): Part {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]),
    n = Math.max(1, Math.round(L / 33)),
    bar = (p: number[], q: number[], w: number) => {
      const d = `M${P(p[0], p[1], p[2]).map(f).join(' ')}L${P(q[0], q[1], q[2]).map(f).join(' ')}`;
      return `<path d="${d}" stroke="${INK}" stroke-width="${w + 1.6}" stroke-linecap="round"/><path d="${d}" stroke="${PALS.mustard.l}" stroke-width="${w}" stroke-linecap="round"/>`;
    };
  let s = '';
  for (let i = 0; i <= n; i++) {
    const p = [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n];
    s += bar([p[0], p[1], z], [p[0], p[1], z + h], 1.3);
  }
  // a low rail (the ground floor's) has no mid rail
  if (h > 7) s += bar([a[0], a[1], z + h * 0.5], [b[0], b[1], z + h * 0.5], 0.8);
  s += bar([a[0], a[1], z + h], [b[0], b[1], z + h], 1.4);
  return {
    at: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z],
    box: [
      [Math.min(a[0], b[0]) - 0.8, Math.min(a[1], b[1]) - 0.8, z],
      [Math.max(a[0], b[0]) + 0.8, Math.max(a[1], b[1]) + 0.8, z + h + 0.8],
    ],
    svg: `<g class="railing" fill="none">${s}</g>`,
  };
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
  const [g, u] = FLOOR,
    DECK = 2.5;
  // the second floor is an open mezzanine: a deck on columns, railed along its open sides; its top is the floor its
  // desks stand on. The ground floor is a steel plate with a low rail along its front.
  shade(X0, u.y0, u.z - DECK, X1, u.y1, u.z);
  // columns at the deck's corners and under the middle of its open front
  const cols = [X0 + 5, X1 - 5].flatMap(x => [u.y0 + 5, u.y1 - 5].map(y => [x, y])).concat([[(X0 + X1) / 2, u.y1 - 5]]);
  for (const [x, y] of cols) shade(x - 1.6, y - 1.6, BH, x + 1.6, y + 1.6, u.z - DECK);
  let s =
    `<g data-floor="0">${box(X0, g.y0, BH, X1, g.y1, g.z, METAL, toneI, 1) + hullInk(boxCorners(X0, g.y0, BH, X1, g.y1, g.z), 1.8)}</g>` +
    byDepth(
      cols.map(([x, y]) => ({
        at: [x, y, 0],
        box: [
          [x - 1.6, y - 1.6, BH],
          [x + 1.6, y + 1.6, u.z - DECK],
        ],
        svg: rod([x, y, BH], [x, y, u.z - DECK], 1.6, DARK, toneI, 1.1, 1.6, 6),
      })),
    ) +
    `<g data-floor="1">${box(X0, u.y0, u.z - DECK, X1, u.y1, u.z, PALS.cobalt, toneI, 1.1) + hullInk(boxCorners(X0, u.y0, u.z - DECK, X1, u.y1, u.z), 2.4)}</g>`;
  // each floor's people stand on it: their shadows go down after the floor they fall on
  const floorOf = (fl: (typeof FLOOR)[number], l: number, rails: Part[]) => {
    const desks: Part[] = [],
      clerks: Piece[] = [];
    DESK_X.forEach((x, h) => {
      const y = (fl.y0 + fl.y1) / 2,
        lit = l === layer && h === head;
      desks.push(desk(x, y, fl.z, l, h, lit));
      clerks.push(clerk(x, y, fl.z, l * 2 + h, lit));
    });
    const sh =
      desks
        .map(d => castShadow(boxCorners(d.at[0] - 15, d.at[1] - 10, fl.z, d.at[0] + 15, d.at[1] + 10, fl.z + 11), fl.z))
        .join('') + clerks.map(c => c.shadow).join('');
    return sh + byDepth([...desks, ...clerks.flatMap(c => c.items), ...rails]);
  };
  const ur = u.z,
    gr = g.z;
  // floors back to front, each with its desks, so the mezzanine never covers the ground floor's desks
  s +=
    floorOf(u, 1, [
      railing([X0 + 1, u.y1 - 1], [X1 - 1, u.y1 - 1], ur),
      railing([X1 - 1, u.y0 + 1], [X1 - 1, u.y1 - 1], ur),
      railing([X0 + 1, u.y0 + 1], [X0 + 1, u.y1 - 1], ur),
    ]) + floorOf(g, 0, [railing([X0 + 1, g.y1 - 1], [X1 - 1, g.y1 - 1], gr, 6)]);
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

  const floor1 = [X1, (g.y0 + g.y1) / 2, g.z],
    floor2 = [X1, (u.y0 + u.y1) / 2, u.z];
  const pills = [
    pill(floor1, 26, 4, 'LAYER 1', layer === 0, scale),
    pill(floor2, 26, -4, 'LAYER 2', layer === 1, scale),
  ];
  const callouts = [sayAt(o.say, 'layer-1', floor1, 4, scale), sayAt(o.say, 'layer-2', floor2, -4, scale)];
  const lit = FLOOR[layer] && DESK_X[head] !== undefined;
  if (lit) {
    const at = [DESK_X[head] - 3, (FLOOR[layer].y0 + FLOOR[layer].y1) / 2, FLOOR[layer].z + 19];
    if (!narrow) pills.push(pill(at, 0, -14, `HEAD ${head + 1}`, true, scale));
    callouts.push(sayAt(o.say, 'head', at, -14, scale));
  }
  if (st.query >= 0) {
    const say = (i: number) => (narrow ? `#${i + 1}` : `#${i + 1} ${pieceLabel(o.tokens[i])}`);
    const at = (i: number) => [xs[i], TILE_Y + 6, BH + TILE_H];
    pills.push(pill(at(st.query), 8, 22, say(st.query), true, scale));
    callouts.push(sayAt(o.say, 'query', at(st.query), 22, scale));
    const top = st.strongest;
    if (top && top.to !== st.query) {
      pills.push(pill(at(top.to), -8, 22, narrow ? say(top.to) : `${say(top.to)} · ${top.w.toFixed(2)}`, false, scale));
      callouts.push(sayAt(o.say, 'focus', at(top.to), 22, scale));
    }
  }
  return shadows.join('') + s + pills.join('') + callouts.join('');
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
    `The engine room: two floors, one per layer, with two desks on each, one per head, a clerk at each. The desk of layer ${layer + 1}, head ${head + 1} is lit.`,
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
