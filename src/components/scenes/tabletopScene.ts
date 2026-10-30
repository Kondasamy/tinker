// Finding the way's picture: Larkspur's town as a toy town on a table (U7). A felt mat holds grey road strips between
// 30 junctions, each with a signpost (a post and a pointing blade, lit while the junction waits on the frontier); a
// river runs north to south, crossed by two plank bridges. Larkspur's depot shed stands west of the depot junction and
// the customer's cottage beside theirs. The route is painted mustard; the van is parked at the customer once a route
// is found, or held at the depot with a NO ROUTE pill. A search plants a flag at each junction it settles. A closed
// road gets a striped barrier on two posts across it (shape, not colour alone); a jam queues toy cars on its road;
// chapter 6's shortcuts arc over the town. Roads carry data-road and a wide clear stroke, so a tap picks one. Words
// only in pills; esc() on every pill; on phones (scale > 1.5) only the place names show.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, calloutsLast, esc, sayAt } from '../../lib/iso/blocks';
import {
  CERAMIC,
  DARK,
  INK,
  PALS,
  PZ,
  WOOD,
  box,
  castShadow,
  matOf,
  on,
  pd,
  rectUV,
  shape,
  tag,
  toneI,
} from '../../lib/iso/core.js';
import { building, drawPieces, mini, tight, van, type Item } from '../../lib/iso/figures';
import { compact } from '../../lib/iso/compact';
import { CUSTOMER, DEPOT, JUNCTIONS, ROADS, junction, nameOf, road, type Edits } from '../../lib/routes/graph';
import type { Say } from '../story/steps';

/** one block on the table */
export const G = 26;
const MAT = matOf('#a9c99a'),
  ROAD = '#bdb8ad',
  RIVER = [3.5 * G - 6, 3.5 * G + 6];
export const TABLE_BOARD: Board = [-27, -15, 5 * G + 25, 4 * G + 25];
export const TABLE_PARTS = [
  'van',
  'depot',
  'customer',
  'bridge',
  'river',
  'route',
  'market',
  'frontier',
  'flags',
  'road',
  'shortcuts',
] as const;

export interface TableOpts extends Edits {
  /** the route's road ids, painted */
  route?: readonly string[];
  /** the van is at the customer (a route was found and driven) */
  arrived?: boolean;
  /** no route: the van is held at the depot */
  noRoute?: boolean;
  /** the customer's junction (CUSTOMER by default) */
  goal?: string;
  /** the road picked in the list or on the map */
  selected?: string | null;
  /** junctions a search has settled (flags), in order */
  settled?: readonly string[];
  /** junctions waiting on the frontier (lit signposts) */
  frontier?: readonly string[];
  /** junction pairs joined by a shortcut arc */
  shortcuts?: readonly { a: string; b: string }[];
  scale?: number;
  say?: Say;
}

const at = (id: string, z = BH): number[] => {
  const j = junction(id);
  return [j.x * G, j.y * G, z];
};
const mid = (id: string, z = BH) => {
  const r = road(id),
    a = at(r.a, z),
    b = at(r.b, z);
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z];
};
/** a road's strip on the mat: [x0, y0, x1, y1] and whether it runs east-west */
const strip = (id: string, w = 2.6) => {
  const r = road(id),
    [ax, ay] = at(r.a),
    [bx, by] = at(r.b),
    ew = ay === by;
  return {
    ew,
    rect: ew
      ? [Math.min(ax, bx), ay - w, Math.max(ax, bx), ay + w]
      : [ax - w, Math.min(ay, by), ax + w, Math.max(ay, by)],
  };
};
/** the cottage beside a customer's junction, in a block clear of the river */
const cottageAt = (goal: string) => {
  const j = junction(goal);
  return [j.x * G + (j.x === 3 ? -11 : 11), j.y * G + 11];
};
const ZR = BH + 0.9;

/** The mat, the river and every road strip: flat, so they are painted under everything else. */
function ground(o: TableOpts) {
  const route = new Set(o.route ?? []);
  let s = box(-12, -10, BH, 5 * G + 20, 4 * G + 20, BH + 0.6, MAT, toneI, 1);
  s += shape(on(PZ(BH + 0.62), rectUV(RIVER[0], -10, RIVER[1], 4 * G + 20)), PALS.cobalt.l, 0.9);
  for (const r of ROADS) {
    const { rect, ew } = strip(r.id),
      [x0, y0, x1, y1] = rect,
      sel = o.selected === r.id,
      paint = route.has(r.id) ? PALS.mustard.l : ROAD;
    let g = r.bridge
      ? box(x0, y0 - 1, BH + 0.6, x1, y1 + 1, BH + 2.6, WOOD, toneI, 1) +
        box(x0, y0 - 1, BH + 2.6, x1, y0 - 0.2, BH + 4, WOOD, toneI, 0.8) +
        shape(on(PZ(BH + 2.62), rectUV(x0, y0 + 0.3, x1, y1 + 0.3)), paint, 0.6)
      : shape(on(PZ(ZR), rectUV(x0, y0, x1, y1)), paint, sel ? 1.8 : 0.7);
    if (sel) g += shape(on(PZ(r.bridge ? BH + 2.7 : ZR + 0.05), rectUV(x0, y0, x1, y1)), 'none', 1.8);
    // the tap target: a clear line along the road, wider than the strip
    const a = at(r.a, ZR),
      b = at(r.b, ZR);
    g += `<path d="${pd([a, b], false)}" fill="none" stroke="transparent" stroke-width="9" pointer-events="stroke"/>`;
    s += `<g data-road="${r.id}" data-ew="${ew ? 1 : 0}"${route.has(r.id) ? ' data-route=""' : ''}${sel ? ' data-selected=""' : ''}>${g}</g>`;
  }
  return s;
}

/** A signpost: a post and a blade pointing east; lit mustard while its junction waits on the frontier. */
function signpost(id: string, lit: boolean): Item {
  const [x, y] = at(id),
    px = x + 4,
    py = y - 4;
  const s =
    box(px - 0.45, py - 0.45, BH, px + 0.45, py + 0.45, BH + 8, WOOD, toneI, 0.7) +
    box(px - 0.3, py - 0.3, BH + 5.4, px + 5.5, py + 0.3, BH + 7.8, lit ? PALS.mustard : CERAMIC, toneI, 0.7);
  return {
    box: [
      [px - 0.5, py - 0.5, BH],
      [px + 5.5, py + 0.5, BH + 8],
    ],
    svg: `<g data-junction="${id}"${lit ? ' data-frontier=""' : ''}>${s}</g>`,
  };
}

/** A flag planted where a search settled a junction: a pole and a pink pennant; the newest pops in. */
function flag(id: string, fresh: boolean): Item {
  const [x, y] = at(id),
    px = x - 4,
    py = y + 4,
    z = BH + 15;
  const s =
    box(px - 0.4, py - 0.4, BH, px + 0.4, py + 0.4, z, DARK, toneI, 0.7) +
    shape(
      [
        [px, py, z],
        [px, py - 8, z - 2.4],
        [px, py, z - 5],
      ],
      PALS.blush.l,
      0.8,
    );
  return {
    box: [
      [px - 0.4, py - 8, BH],
      [px + 0.4, py + 0.4, z],
    ],
    svg: `<g class="rt-flag${fresh ? ' rt-fresh' : ''}" data-settled="${id}">${s}</g>`,
  };
}

/** A roadblock across a closed road: two posts and a bar striped tomato and white. */
function barrier(id: string): Item {
  const { ew } = strip(id),
    [cx, cy] = mid(id),
    z0 = road(id).bridge ? BH + 2.6 : ZR,
    z = z0 + 3.4,
    L = 4.2;
  // u runs across the road, v along it
  const xy = (u: number, v: number) => (ew ? [cx + v, cy + u] : [cx + u, cy + v]);
  let s = '';
  for (const u of [-L, L]) {
    const [x, y] = xy(u, 0);
    s += box(x - 0.5, y - 0.5, z0, x + 0.5, y + 0.5, z + 0.6, DARK, toneI, 0.7);
  }
  for (let k = 0; k < 4; k++) {
    const [x0, y0] = xy(-L + (k * 2 * L) / 4, -0.5),
      [x1, y1] = xy(-L + ((k + 1) * 2 * L) / 4, 0.5);
    s += box(
      Math.min(x0, x1),
      Math.min(y0, y1),
      z,
      Math.max(x0, x1),
      Math.max(y0, y1),
      z + 1.3,
      k % 2 ? CERAMIC : PALS.tomato,
      toneI,
      0.7,
    );
  }
  const [a, b] = [xy(-L - 0.5, -0.5), xy(L + 0.5, 0.5)];
  return {
    box: [
      [Math.min(a[0], b[0]), Math.min(a[1], b[1]), z0],
      [Math.max(a[0], b[0]), Math.max(a[1], b[1]), z + 1.3],
    ],
    svg: `<g data-closed="${id}">${s}</g>`,
  };
}

/** A jam: toy cars bumper to bumper, one per two minutes over the road's own (at most four). */
function jam(id: string, minutes: number): Item[] {
  const n = Math.max(0, Math.min(4, Math.ceil((minutes - road(id).min) / 2))),
    { ew } = strip(id),
    [cx, cy] = mid(id);
  return Array.from({ length: n }, (_, k) => {
    const v = (k - (n - 1) / 2) * 4.6,
      [x, y] = ew ? [cx + v, cy - 1.2] : [cx - 1.2, cy + v],
      [hx, hy] = ew ? [1.8, 1.1] : [1.1, 1.8];
    const s =
      box(x - hx, y - hy, ZR, x + hx, y + hy, ZR + 1.6, k % 2 ? PALS.cobalt : PALS.tomato, toneI, 0.7) +
      box(x - hx * 0.6, y - hy * 0.7, ZR + 1.6, x + hx * 0.6, y + hy * 0.7, ZR + 2.6, CERAMIC, toneI, 0.6);
    return {
      box: [
        [x - hx, y - hy, ZR],
        [x + hx, y + hy, ZR + 2.6],
      ],
      svg: `<g data-jam="${id}">${s}</g>`,
    };
  });
}

/** A dashed arc over the town between two junctions: a shortcut worked out ahead of time. */
function arc(a: string, b: string) {
  const p = at(a),
    q = at(b),
    pts = Array.from({ length: 13 }, (_, i) => {
      const t = i / 12;
      return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, BH + 3 + 26 * Math.sin(Math.PI * t)];
    });
  return `<g data-shortcut="${a}-${b}"><path d="${pd(pts, false)}" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/><path d="${pd(pts, false)}" fill="none" stroke="${PALS.cobalt.l}" stroke-width="1.6" stroke-dasharray="4 3" stroke-linecap="round"/></g>`;
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;

/** The tabletop town. The ground first, then every shadow and one depth sort over the buildings, posts, flags,
 * barriers, cars and the van, then arcs and pills. */
export const tabletopScene = (o: TableOpts) => (ctx: SceneCtx) => {
  const scale = o.scale ?? 1,
    narrow = scale > 1.5,
    goal = o.goal ?? CUSTOMER,
    settled = o.settled ?? [],
    frontier = new Set(o.frontier ?? []),
    closed = o.closed ?? [];
  const [dx, dy] = at(DEPOT),
    [cx, cy] = cottageAt(goal);
  const shed = building({
      x: dx - 15,
      y: dy,
      d: 14,
      w: 16,
      h: 10,
      roof: 'sawtooth',
      front: '+x',
      door: true,
      windows: 1,
    }),
    cottage = building({
      x: cx,
      y: cy,
      d: 10,
      w: 10,
      h: 7,
      roof: 'gable',
      front: '-x',
      door: true,
      windows: 1,
      pal: matOf('#f1e2c4'),
    });
  const vanAt = o.arrived && !o.noRoute ? at(goal) : at(DEPOT),
    v = mini(van({ x: 0, y: 0, facing: '+x', driver: true }), [0, 0, BH], [vanAt[0] + 1, vanAt[1] + 7, BH], 0.32);
  const items: Item[] = [
    ...JUNCTIONS.map(j => signpost(j.id, frontier.has(j.id))),
    ...settled.map((id, i) => flag(id, i === settled.length - 1)),
    ...closed.map(barrier),
    ...Object.entries(o.jams ?? {}).flatMap(([id, m]) => jam(id, m)),
  ];
  const posts = castShadow(boxCorners(-1, -1, BH, 1, 1, BH + 6), BH, ctx.top);
  const s = compact(
    tight(
      ground(o) +
        drawPieces([
          { shadow: posts, items },
          { shadow: shed.shadow, items: shed.items.map(i => ({ ...i, svg: `<g data-part="depot">${i.svg}</g>` })) },
          {
            shadow: cottage.shadow,
            items: cottage.items.map(i => ({ ...i, svg: `<g data-part="customer">${i.svg}</g>` })),
          },
          { shadow: v.shadow, items: v.items.map(i => ({ ...i, svg: `<g data-part="van">${i.svg}</g>` })) },
        ]),
    ),
  );
  const arcs = (o.shortcuts ?? []).map(sc => arc(sc.a, sc.b)).join('');
  const route = o.route ?? [],
    bridge = ROADS.find(r => r.bridge && route.includes(r.id)) ?? ROADS.find(r => r.bridge)!;
  const pills: string[] = [
    pill([dx - 15, dy, BH + 16], -10, -18, 'DEPOT', false, scale),
    pill([cx, cy, BH + 12], 8, -18, nameOf(goal).toUpperCase(), false, scale),
  ];
  if (o.noRoute) pills.push(pill([dx, dy + 7, BH + 8], 18, -30, 'NO ROUTE', true, scale));
  if (o.selected && !narrow) pills.push(pill(mid(o.selected, ZR), 0, 22, labelOf(o.selected, o), false, scale));
  const lastFlag = settled.at(-1),
    firstOpen = (o.frontier ?? [])[0],
    roadPart = o.selected ?? Object.keys(o.jams ?? {})[0] ?? route[0],
    sc = o.shortcuts?.[0];
  pills.push(
    sayAt(o.say, 'van', [vanAt[0], vanAt[1] + 7, BH + 7], -14, scale, narrow),
    sayAt(o.say, 'depot', [dx - 15, dy, BH + 16], -18, scale, narrow),
    sayAt(o.say, 'customer', [cx, cy, BH + 12], -18, scale, narrow),
    sayAt(o.say, 'bridge', mid(bridge.id, BH + 4), -8, scale, narrow),
    sayAt(o.say, 'river', [(RIVER[0] + RIVER[1]) / 2, 4 * G + 12, BH + 1], -8, scale, narrow),
    route.length ? sayAt(o.say, 'route', mid(route[Math.floor(route.length / 2)], ZR), -8, scale, narrow) : '',
    sayAt(o.say, 'market', at('market', BH + 8), -8, scale, narrow),
    firstOpen ? sayAt(o.say, 'frontier', at(firstOpen, BH + 8), -8, scale, narrow) : '',
    lastFlag ? sayAt(o.say, 'flags', at(lastFlag, BH + 15), -8, scale, narrow) : '',
    roadPart ? sayAt(o.say, 'road', mid(roadPart, ZR + 2), -8, scale, narrow) : '',
    sc ? sayAt(o.say, 'shortcuts', mid2(sc.a, sc.b), -6, scale, narrow) : '',
  );
  return s + arcs + calloutsLast(pills);
};
const mid2 = (a: string, b: string) => {
  const p = at(a),
    q = at(b);
  return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, BH + 29];
};
const labelOf = (id: string, e: Edits) => {
  const r = road(id),
    m = e.jams?.[id] ?? r.min;
  return `${nameOf(r.a)}–${nameOf(r.b)} ${e.closed?.includes(id) ? 'CLOSED' : `${m} MIN`}`;
};

/** The picture in words, for its aria-label. */
export function tableLabel(o: TableOpts): string {
  const goal = nameOf(o.goal ?? CUSTOMER),
    closed = o.closed ?? [],
    n = o.settled?.length ?? 0;
  const van = o.noRoute
    ? `No route: the van is held at the depot.`
    : o.arrived
      ? `The van is parked at ${goal}, by a ${o.route?.length ?? 0}-road route.`
      : `The van waits at the depot.`;
  const roads = closed.length
    ? ` ${closed.length} road${closed.length === 1 ? '' : 's'} closed by a barrier: ${closed.map(id => `${nameOf(road(id).a)} to ${nameOf(road(id).b)}`).join(', ')}.`
    : '';
  const flags = n
    ? ` Flags stand at ${n} settled junction${n === 1 ? '' : 's'}; ${o.frontier?.length ?? 0} wait on the frontier.`
    : '';
  const arcs = o.shortcuts?.length ? ` ${o.shortcuts.length} shortcut arcs cross the town.` : '';
  return `A toy town on a table: ${JUNCTIONS.length} signposted junctions, a river with two bridges, Larkspur's depot and the customer at ${goal}. ${van}${roads}${flags}${arcs}`;
}
