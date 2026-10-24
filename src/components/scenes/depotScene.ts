// The Caching module's picture: the depot map (KTD15). Larkspur's central depot (the origin) stands at the back, joined by
// roads to three regional warehouses (the edge caches), the west one farthest. Each warehouse has a shelf in front with a
// cubby per kind of content (price mustard, photo cobalt, stock mint), a box in it while a copy is kept. A truck rides a
// road for every trip to the depot this quarter hour (three at most); a tomato tag flies over a warehouse that served a
// stale copy this quarter hour; an overloaded depot has trucks queued round it. Words only in pills; on phones
// (scale > 1.5) pills keep just the names and the caption carries the numbers.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import { PALS, METAL, CERAMIC, WOOD, box, castShadow, hullInk, toneI, tag, byDepth, line } from '../../lib/iso/core.js';
import { EDGES, KINDS, type Edge, type Kind, type Result } from '../../lib/caching/sim';
import { beltAt } from './officeScene';
import type { Say } from '../story/steps';

export const DEPOT_BOARD: Board = [30, 4, 196, 198];

export interface EdgeView {
  hits: number;
  misses: number;
  stale: number;
  trips: number;
  shelf: Kind[];
}
export interface DepotOpts {
  edges: Record<Edge, EdgeView>;
  /** trips to the depot this quarter hour, from every warehouse */
  trips: number;
  overloaded: boolean;
  /** the step's callout, over one of DEPOT_PARTS */
  say?: Say;
  /** pill size; phones pass more */
  scale?: number;
}

/** The parts a step's callout may name: the depot and each warehouse. */
export const DEPOT_PARTS = ['depot', ...EDGES] as const;

const DEPOT = { x: 60, y: 30, half: 20, top: BH + 34 };
const SITE: Record<Edge, [number, number]> = { north: [110, 105], east: [170, 45], west: [45, 180] };
const WH = { half: 12, top: BH + 16 };
export const KIND_PAL: Record<Kind, { l: string; m: string; d: string }> = {
  price: PALS.mustard,
  photo: PALS.cobalt,
  stock: PALS.mint,
};
export const EDGE_NAME: Record<Edge, string> = { north: 'North', east: 'East', west: 'West' };

const empty = (): EdgeView => ({ hits: 0, misses: 0, stale: 0, trips: 0, shelf: [] });
/** The map as of tick t of a run. */
export function depotAt(r: Result, t: number): Omit<DepotOpts, 'say' | 'scale'> {
  const k = r.ticks[Math.max(0, Math.min(t, r.ticks.length - 1))];
  return {
    edges: Object.fromEntries(EDGES.map(e => [e, k ? { ...k.edges[e] } : empty()])) as Record<Edge, EdgeView>,
    trips: k?.trips ?? 0,
    overloaded: k?.overloaded ?? false,
  };
}
/** An idle map: nothing asked, empty shelves. */
export const IDLE: Omit<DepotOpts, 'say' | 'scale'> = {
  edges: { north: empty(), east: empty(), west: empty() },
  trips: 0,
  overloaded: false,
};

/** What the map shows. Pure, so the tests can check it without drawing. */
export function depotState(o: DepotOpts) {
  return {
    trucks: Object.fromEntries(EDGES.map(e => [e, Math.min(3, o.edges[e].trips)])) as Record<Edge, number>,
    tagged: EDGES.filter(e => o.edges[e].stale > 0),
    queued: o.overloaded ? Math.min(4, Math.ceil((o.trips - 20) / 10) + 1) : 0,
  };
}

const plural = (n: number, w: string) => {
  const end = /s$/i.test(w) ? 'es' : 's';
  return `${n} ${w}${n === 1 ? '' : w === w.toUpperCase() ? end.toUpperCase() : end}`;
};
const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;

/** A road from a warehouse to the depot, and its unit direction and sideways normal. */
function road(e: Edge) {
  const [x, y] = SITE[e],
    dx = DEPOT.x - x,
    dy = DEPOT.y - y,
    L = Math.hypot(dx, dy),
    u = [dx / L, dy / L],
    n = [-u[1], u[0]];
  const a = [x + u[0] * (WH.half + 2), y + u[1] * (WH.half + 2)],
    b = [DEPOT.x - u[0] * (DEPOT.half + 2), DEPOT.y - u[1] * (DEPOT.half + 2)];
  return { a, b, u, n };
}

/** A small truck at (x, y), facing along u. */
function truck(x: number, y: number, cls = 'truck') {
  const z = BH + 0.4;
  return {
    at: [x, y, 1],
    svg: `<g class="${cls}">${box(x - 4, y - 3, z, x + 4, y + 3, z + 5, PALS.mustard, toneI, 0.9)}${box(x + 4, y - 2.5, z, x + 6.5, y + 2.5, z + 3.5, METAL, toneI, 0.8)}</g>`,
  };
}

function depot() {
  const { x, y, half: h, top } = DEPOT;
  let s = box(x - h, y - h, BH, x + h, y + h, top, METAL, toneI, 1);
  s += box(x + h, y - 8, BH, x + h + 0.6, y + 8, BH + 16, PALS.cobalt, toneI, 0.9);
  s += box(x - h + 2, y - h + 2, top, x + h - 2, y + h - 2, top + 3, PALS.cobalt, toneI, 0.9);
  return {
    at: [x, y, 0],
    svg: `<g data-prop="depot">${s}${hullInk(boxCorners(x - h, y - h, BH, x + h, y + h, top + 3), 2.4)}</g>`,
  };
}

function warehouse(e: Edge, v: EdgeView, tagged: boolean) {
  const [x, y] = SITE[e],
    h = WH.half;
  let s = box(x - h, y - h, BH, x + h, y + h, WH.top, CERAMIC, toneI, 1);
  s += box(x - h, y - h, WH.top, x + h, y + h, WH.top + 2.5, WOOD, toneI, 0.9);
  s += hullInk(boxCorners(x - h, y - h, BH, x + h, y + h, WH.top + 2.5), 2);
  if (tagged)
    s += `<g class="stale-tag">${line(
      [
        [x, y, WH.top + 2.5],
        [x, y, WH.top + 14],
      ],
      1.1,
    )}${box(x, y - 0.3, WH.top + 9, x + 7, y + 0.3, WH.top + 14, PALS.tomato, toneI, 0.9)}</g>`;
  // the shelf: a plank along the warehouse's front, a cubby per kind
  const sx = x + h + 3;
  let shelf = box(sx, y - h, BH, sx + 6, y + h, BH + 1.5, WOOD, toneI, 0.8);
  KINDS.forEach((k, i) => {
    const cy = y - h + 4 + i * 8,
      kept = v.shelf.includes(k);
    shelf += `<g class="copy" data-kind="${k}" data-kept="${kept ? 1 : 0}">${box(sx + 1, cy - 2.6, BH + 1.5, sx + 5, cy + 2.6, BH + 1.5 + (kept ? 5 : 0.4), kept ? KIND_PAL[k] : CERAMIC, toneI, 0.7)}</g>`;
  });
  return [
    {
      at: [x, y, 0],
      svg: `<g data-prop="${e}" data-stale="${tagged ? 1 : 0}" data-trips="${v.trips}">${s}</g>`,
    },
    { at: [sx + 3, y, 0], svg: `<g data-prop="shelf" data-edge="${e}">${shelf}</g>` },
  ];
}

/** The map: shadows and roads (floor), then the buildings, shelves and trucks back to front, then the pills. */
export const depotScene = (o: DepotOpts) => (ctx: SceneCtx) => {
  const st = depotState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5;
  let s = castShadow(
    boxCorners(DEPOT.x - DEPOT.half, DEPOT.y - DEPOT.half, BH, DEPOT.x + DEPOT.half, DEPOT.y + DEPOT.half, DEPOT.top),
    BH,
    ctx.top,
  );
  for (const e of EDGES) {
    const [x, y] = SITE[e];
    s += castShadow(boxCorners(x - WH.half, y - WH.half, BH, x + WH.half, y + WH.half, WH.top + 2), BH, ctx.top);
    const { a, b, n } = road(e);
    s += `<g data-prop="road" data-edge="${e}">${beltAt(a, b, n, false)}</g>`;
  }
  const parts = [depot(), ...EDGES.flatMap(e => warehouse(e, o.edges[e], st.tagged.includes(e)))];
  for (const e of EDGES) {
    const { a, b } = road(e);
    for (let i = 0; i < st.trucks[e]; i++) {
      const t = 0.3 + i * 0.22;
      parts.push(truck(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t));
    }
  }
  for (let i = 0; i < st.queued; i++)
    parts.push(truck(DEPOT.x + DEPOT.half + 6 + (i % 2) * 10, DEPOT.y - 14 + i * 9, 'truck queued'));
  s += `<g data-prop="trips" data-trips="${o.trips}" data-overloaded="${o.overloaded ? 1 : 0}">${byDepth(parts)}</g>`;
  const OVER = '#f6c2b4';
  let pills = pill(
    [DEPOT.x, DEPOT.y, DEPOT.top + 3],
    -10,
    -20,
    narrow ? 'DEPOT' : `DEPOT · ${plural(o.trips, 'TRIP')}${o.overloaded ? ' · OVERLOADED' : ''}`,
    o.trips > 0 && !o.overloaded,
    scale,
    o.overloaded ? OVER : undefined,
  );
  for (const e of EDGES) {
    const [x, y] = SITE[e],
      v = o.edges[e],
      name = EDGE_NAME[e].toUpperCase();
    // north's pill floats over it; the front pair's sit in front, so the three never meet in one row
    const front = e !== 'north';
    pills += pill(
      front ? [x + WH.half, y + WH.half, BH] : [x, y, WH.top + 2.5],
      0,
      front ? 20 : -20,
      narrow || v.hits + v.misses === 0 ? name : `${name} · ${plural(v.hits, 'HIT')} · ${plural(v.misses, 'MISS')}`,
      v.hits > 0,
      scale,
    );
  }
  // the callout stands over its part, even where phones shorten the part's pill
  pills += sayAt(o.say, 'depot', [DEPOT.x, DEPOT.y, DEPOT.top + 3], -20, scale);
  for (const e of EDGES) pills += sayAt(o.say, e, [...SITE[e], WH.top + 2.5], -18, scale);
  return s + pills;
};

/** The map in words, for its aria-label. */
export function depotLabel(o: DepotOpts): string {
  const st = depotState(o);
  const edge = (e: Edge) => {
    const v = o.edges[e];
    return (
      `${EDGE_NAME[e]}: ${v.hits} served from the shelf, ${v.misses} sent to the depot` +
      `${v.stale ? `, ${v.stale} stale` : ''}; shelf holds ${v.shelf.length ? v.shelf.join(', ') : 'nothing'}`
    );
  };
  return (
    `The depot map: the central depot joined by roads to three regional warehouses. ` +
    `${plural(o.trips, 'trip')} to the depot this quarter hour${o.overloaded ? ', more than it can take' : ''}. ` +
    `${EDGES.map(edge).join('. ')}.` +
    (st.tagged.length ? ` Stale tag over ${st.tagged.map(e => EDGE_NAME[e]).join(', ')}.` : '')
  );
}

/** The counts the caption carries (phones show only the names in the pills). */
export function depotReadouts(o: DepotOpts): string[] {
  const n = (f: (v: EdgeView) => number) => EDGES.reduce((a, e) => a + f(o.edges[e]), 0);
  return [
    `${n(v => v.hits)} from shelves`,
    `${n(v => v.misses)} to the depot`,
    `${plural(o.trips, 'trip')}${o.overloaded ? ' (overloaded)' : ''}`,
    ...(n(v => v.stale) ? [`${n(v => v.stale)} stale`] : []),
  ];
}

/** The home hero's plot: a small depot, one road to a small warehouse with its three copies on the shelf, and a truck
 * on the way. */
export function depotPlot(x: number, y: number, top: SceneCtx['top']): string {
  const dx = x - 14,
    dy = y - 10,
    h = 8,
    wx = x + 14,
    wy = y + 6,
    w = 6;
  let d = box(dx - h, dy - h, BH, dx + h, dy + h, BH + 14, METAL, toneI, 1);
  d += box(dx - h + 1, dy - h + 1, BH + 14, dx + h - 1, dy + h - 1, BH + 15.5, PALS.cobalt, toneI, 0.8);
  d += hullInk(boxCorners(dx - h, dy - h, BH, dx + h, dy + h, BH + 15.5), 1.8);
  let wh = box(wx - w, wy - w, BH, wx + w, wy + w, BH + 8, CERAMIC, toneI, 1);
  wh += box(wx - w, wy - w, BH + 8, wx + w, wy + w, BH + 9.5, WOOD, toneI, 0.8);
  wh += hullInk(boxCorners(wx - w, wy - w, BH, wx + w, wy + w, BH + 9.5), 1.6);
  KINDS.forEach((k, i) => {
    const cy = wy - w + 2 + i * 4;
    wh += box(wx + w + 1.5, cy - 1.4, BH, wx + w + 4.5, cy + 1.4, BH + 3, KIND_PAL[k], toneI, 0.6);
  });
  const L = Math.hypot(wx - dx, wy - dy),
    u = [(wx - dx) / L, (wy - dy) / L],
    n = [-u[1], u[0]];
  return (
    castShadow(boxCorners(dx - h, dy - h, BH, dx + h, dy + h, BH + 15), BH, top) +
    beltAt([dx + u[0] * (h + 1), dy + u[1] * (h + 1)], [wx - u[0] * (w + 1), wy - u[1] * (w + 1)], n, false) +
    byDepth([{ at: [dx, dy, 0], svg: d }, { at: [wx, wy, 0], svg: wh }, truck((dx + wx) / 2, (dy + wy) / 2)])
  );
}
