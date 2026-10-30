// The Recommendations module's picture: Larkspur's shop aisle (U21). At the back, the "you might also need" shelf: a
// cabinet with SHELF product boxes on it, ranked from the left, each in its aisle's colour; an explored (random) slot
// carries a "?" in its pill. In front, the floor. In the aisle view (chapters 1 to 3) the shopper stands on it, with up
// to three similar shoppers beside them and the product in their basket at their feet. In the map view (chapters 4 to 7)
// the floor is the taste map: every product with a taste is a tile at its two numbers (at most 40), the shelf's
// products standing taller, an aisle pill over each aisle's middle, and the shopper standing at their own two numbers.
// A product with no taste yet stands off the map, on a crate by the side. Words only in pills; on phones (scale > 1.5)
// the shelf pills keep only the rank and the caption carries the names. Every string is escaped (esc).
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import { CERAMIC, METAL, PALS, WOOD, box, byDepth, castShadow, cyl, hullInk, tag, toneI } from '../../lib/iso/core.js';
import { BASE, type Vec } from '../../lib/recommendations/factorise';
import { AISLES, PRODUCTS, SHELF, productOf, type Aisle } from '../../lib/recommendations/story';
import type { Say } from '../story/steps';

export const SHELF_BOARD: Board = [0, 0, 180, 140];
/** The parts a step's callout may name. */
export const SHELF_PARTS = ['shelf', 'shopper', 'others', 'basket', 'map', 'new'] as const;
/** The map shows at most this many products (KTD13). */
export const MAX_DOTS = 40;

export const AISLE_PAL: Record<Aisle, { l: string; m: string; d: string }> = {
  wood: PALS.mustard,
  fit: PALS.blush,
  store: PALS.cobalt,
  metal: PALS.mint,
};

export interface ShelfOpts {
  view: 'aisle' | 'map';
  /** the shelf, best first (at most SHELF) */
  shelf: string[];
  /** shelf products put there at random (exploration), not ranked */
  explored?: string[];
  /** the shopper's name */
  shopper: string;
  /** map view: the shopper's two numbers; null when they have none */
  you?: Vec | null;
  /** map view: every product's two numbers; null for a product with no taste */
  items?: Record<string, Vec | null>;
  /** aisle view: similar shoppers' names, at most three */
  others?: string[];
  /** aisle view: the product in the shopper's basket */
  basket?: string;
  /** a product with no taste yet, stood off the map */
  ghost?: string;
  say?: Say;
  scale?: number;
}

// the floor's map: the mat, and the taste range it spans (fixed from the pinned tastes, so dots never rescale)
const MAT = { x0: 22, x1: 172, y0: 34, y1: 134 };
const span = (k: 0 | 1) => {
  const vs = [...Object.values(BASE.items), ...Object.values(BASE.users)].flatMap(v => (v ? [v[k]] : []));
  const lo = Math.min(0, ...vs),
    hi = Math.max(...vs),
    pad = (hi - lo) * 0.12;
  return [lo - pad, hi + pad] as const;
};
/** The taste range the map spans on each axis. */
export const RANGE = [span(0), span(1)] as const;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** Two numbers → a place on the map's floor (clamped to the mat). */
export function toFloor(v: Vec): [number, number] {
  const u = (v[0] - RANGE[0][0]) / (RANGE[0][1] - RANGE[0][0]),
    w = (v[1] - RANGE[1][0]) / (RANGE[1][1] - RANGE[1][0]);
  return [MAT.x0 + 4 + clamp(u, 0, 1) * (MAT.x1 - MAT.x0 - 8), MAT.y0 + 4 + clamp(w, 0, 1) * (MAT.y1 - MAT.y0 - 8)];
}
/** A place on the floor → two numbers (the inverse of toFloor inside the mat). */
export function fromFloor(x: number, y: number): Vec {
  const u = clamp((x - MAT.x0 - 4) / (MAT.x1 - MAT.x0 - 8), 0, 1),
    w = clamp((y - MAT.y0 - 4) / (MAT.y1 - MAT.y0 - 8), 0, 1);
  return [RANGE[0][0] + u * (RANGE[0][1] - RANGE[0][0]), RANGE[1][0] + w * (RANGE[1][1] - RANGE[1][0])];
}

// 34 apart: each slot also stands lower on screen than the last, so one row of pills never overlaps
const SLOT_X = (i: number) => 22 + i * 34;
const CAB = [8, 172] as const;
const HEAD = BH + 18;
// the aisle pills sit apart sideways, since Woodwork and Fittings share a corner of the map
const AISLE_DX: Record<Aisle, number> = { fit: -26, wood: 26, store: 18, metal: -18 };
const SHELF_Y = [6, 18] as const;
const CAB_TOP = BH + 14;
const YOU = [96, 92] as const;
const OTHERS = [
  [70, 104],
  [124, 80],
  [60, 76],
] as const;
const GHOST = [8, 118] as const;
const OVER = '#f6c2b4';
const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;

/** What the picture shows. Pure, so the tests can check it without drawing. */
export function shelfState(o: ShelfOpts) {
  const shelf = o.shelf.slice(0, SHELF);
  const dots =
    o.view === 'map' && o.items
      ? PRODUCTS.filter(p => o.items![p.id])
          .slice(0, MAX_DOTS)
          .map(p => ({ id: p.id, at: toFloor(o.items![p.id]!), lit: shelf.includes(p.id) }))
      : [];
  const you = o.view === 'map' ? (o.you ? toFloor(o.you) : null) : YOU;
  return { shelf, dots, you, others: (o.others ?? []).slice(0, OTHERS.length) };
}

/** A shopper: a body and a head, mustard for the reader's, cobalt for others. */
const person = (x: number, y: number, m: { l: string; m: string; d: string }, cls: string) =>
  `<g class="${cls}">${cyl(x, y, BH, HEAD - 5, 3.2, m, toneI, 1, 14)}${cyl(x, y, HEAD - 5, HEAD, 2.4, CERAMIC, toneI, 0.9, 12)}</g>`;
/** A product box on the shelf or the floor. */
const productBox = (x: number, y: number, z: number, w: number, h: number, id: string) =>
  box(x - w, y - w, z, x + w, y + w, z + h, AISLE_PAL[productOf(id).aisle], toneI, 0.9);

/** The scene: shadows, then parts back to front, then the pills. */
export const shelfScene = (o: ShelfOpts) => (ctx: SceneCtx) => {
  const st = shelfState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5;
  const cab = boxCorners(CAB[0], SHELF_Y[0], BH, CAB[1], SHELF_Y[1], CAB_TOP);
  let s = castShadow(cab, BH, ctx.top);
  const mid = (SHELF_Y[0] + SHELF_Y[1]) / 2;
  const items = st.shelf
    .map(
      (id, i) =>
        `<g class="rc-item" data-slot="${i}" data-product="${esc(id)}"${o.explored?.includes(id) ? ' data-explored="1"' : ''}>${productBox(SLOT_X(i), mid, CAB_TOP, 4.5, 10, id)}</g>`,
    )
    .join('');
  const parts = [
    {
      at: [90, SHELF_Y[0], 0],
      svg: `<g data-prop="shelf">${box(CAB[0], SHELF_Y[0], BH, CAB[1], SHELF_Y[1], CAB_TOP, WOOD, toneI, 1)}${hullInk(cab, 2)}${items}</g>`,
    },
  ];
  if (o.view === 'map') {
    parts.push({
      at: [MAT.x0, MAT.y0, 0],
      svg: `<g data-prop="map" data-dots="${st.dots.length}">${box(MAT.x0, MAT.y0, BH, MAT.x1, MAT.y1, BH + 0.6, CERAMIC, toneI, 0.6)}</g>`,
    });
    for (const d of st.dots)
      parts.push({
        at: [d.at[0], d.at[1], 1],
        svg: `<g class="rc-dot" data-product="${esc(d.id)}"${d.lit ? ' data-lit="1"' : ''}>${productBox(d.at[0], d.at[1], BH + 0.6, d.lit ? 2.6 : 1.8, d.lit ? 7 : 2.5, d.id)}</g>`,
      });
  }
  if (st.you)
    parts.push({
      at: [st.you[0], st.you[1], 2],
      svg: `<g data-prop="shopper">${person(st.you[0], st.you[1], PALS.mustard, 'rc-you')}</g>`,
    });
  st.others.forEach((_, i) =>
    parts.push({
      at: [OTHERS[i][0], OTHERS[i][1], 2],
      svg: `<g data-prop="others">${person(OTHERS[i][0], OTHERS[i][1], PALS.cobalt, 'rc-other')}</g>`,
    }),
  );
  if (o.view === 'aisle' && o.basket)
    parts.push({
      at: [YOU[0] + 8, YOU[1] + 6, 1],
      svg: `<g data-prop="basket" data-product="${esc(o.basket)}">${productBox(YOU[0] + 8, YOU[1] + 6, BH, 3, 6, o.basket)}</g>`,
    });
  if (o.ghost)
    parts.push({
      at: [GHOST[0], GHOST[1], 1],
      svg: `<g data-prop="new" data-product="${esc(o.ghost)}">${box(GHOST[0] - 5, GHOST[1] - 5, BH, GHOST[0] + 5, GHOST[1] + 5, BH + 6, METAL, toneI, 0.9)}${productBox(GHOST[0], GHOST[1], BH + 6, 3, 7, o.ghost)}</g>`,
    });
  s += byDepth(parts);

  // pills: the shelf's products, the aisles on the map, the shopper, the others, the basket, the new product
  let pills = '';
  st.shelf.forEach((id, i) => {
    const p = productOf(id),
      q = o.explored?.includes(id) ? '?' : String(i + 1);
    pills += pill([SLOT_X(i), mid, CAB_TOP + 10], 0, -12, narrow ? q : `${q} · ${p.short}`, true, scale);
  });
  if (o.view === 'map')
    for (const a of Object.keys(AISLES) as Aisle[]) {
      const ds = st.dots.filter(d => productOf(d.id).aisle === a);
      if (!ds.length) continue;
      const cx = ds.reduce((t, d) => t + d.at[0], 0) / ds.length,
        cy = ds.reduce((t, d) => t + d.at[1], 0) / ds.length;
      pills += pill([cx, cy, BH + 3], AISLE_DX[a] * scale, 16, AISLES[a].toUpperCase(), false, scale, '#fff');
    }
  const head = st.you ? [st.you[0], st.you[1], HEAD] : null;
  if (head) pills += pill(head, 0, -12, narrow ? 'YOU' : o.shopper.toUpperCase(), true, scale);
  st.others.forEach((name, i) => {
    pills += pill([OTHERS[i][0], OTHERS[i][1], HEAD], 0, -12, narrow ? `${i + 1}` : name.toUpperCase(), false, scale);
  });
  const basketTop = [YOU[0] + 8, YOU[1] + 6, BH + 6];
  if (o.view === 'aisle' && o.basket)
    pills += pill(basketTop, 10, 10, narrow ? 'BASKET' : `BASKET · ${productOf(o.basket).short}`, false, scale);
  const ghostTop = [GHOST[0], GHOST[1], BH + 13];
  if (o.ghost)
    pills += pill(ghostTop, 6, -12, narrow ? 'NEW' : `NEW · ${productOf(o.ghost).short}`, false, scale, OVER);
  const shelfTop = [90, mid, CAB_TOP + 10],
    // the map's callout hangs under its front corner, clear of the dots and the aisle pills
    mapMid = [MAT.x1, MAT.y1, BH];
  pills +=
    sayAt(o.say, 'shelf', shelfTop, -40, scale) +
    sayAt(o.say, 'shopper', head ?? [YOU[0], YOU[1], HEAD], -12, scale) +
    sayAt(o.say, 'others', [OTHERS[0][0], OTHERS[0][1], HEAD], -30, scale) +
    sayAt(o.say, 'basket', basketTop, -6, scale) +
    sayAt(o.say, 'map', mapMid, 40, scale) +
    sayAt(o.say, 'new', ghostTop, -12, scale);
  return s + pills;
};

/** The picture in words, for its aria-label. */
export function shelfLabel(o: ShelfOpts): string {
  const st = shelfState(o);
  const names = st.shelf.map(id => productOf(id).name).join(', ');
  return (
    `Larkspur’s shop aisle. ${o.shopper}’s shelf: ${names || 'empty'}.` +
    (o.view === 'map'
      ? ` The floor is the taste map: ${st.dots.length} products placed by their two numbers${st.you ? `, ${o.shopper} standing among them` : ''}.`
      : '') +
    (st.others.length ? ` Similar shoppers: ${st.others.join(', ')}.` : '') +
    (o.basket ? ` In the basket: ${productOf(o.basket).name}.` : '') +
    (o.ghost ? ` ${productOf(o.ghost).name} stands off the map, with no taste yet.` : '')
  );
}

/** The counts and names the caption carries (phones show only ranks in the pills). */
export function shelfReadouts(o: ShelfOpts): string[] {
  const st = shelfState(o);
  return [
    ...st.shelf.map((id, i) => `${o.explored?.includes(id) ? '?' : i + 1} ${productOf(id).short}`),
    ...(o.view === 'map' ? [`${st.dots.length} on the map`] : []),
  ];
}

/** The small cabinet with five product boxes, as a piece: the hero's plot, and Before GenAI's predictive-AI chapter. */
export function shelfPiece(x: number, y: number) {
  const tones = [PALS.mustard, PALS.blush, PALS.cobalt, PALS.mint, PALS.mustard];
  const goods = tones.map((m, i) => box(x - 14 + i * 6, y - 11, BH + 8, x - 10 + i * 6, y - 7, BH + 14, m, toneI, 0.8));
  return {
    shadow: castShadow(boxCorners(x - 16, y - 12, BH, x + 16, y - 6, BH + 8), BH),
    items: [
      {
        at: [x, y - 12, 0],
        box: [
          [x - 16, y - 12, BH],
          [x + 16, y - 6, BH + 14],
        ],
        svg: box(x - 16, y - 12, BH, x + 16, y - 6, BH + 8, WOOD, toneI, 0.9) + goods.join(''),
      },
    ],
  };
}

/** The home hero's plot: a small cabinet with five product boxes and a shopper in front. */
export function shelfPlot(x: number, y: number, top: SceneCtx['top']): string {
  const cab = boxCorners(x - 16, y - 12, BH, x + 16, y - 6, BH + 8);
  return (
    castShadow(cab, BH, top) +
    byDepth([
      { at: [x, y - 12, 0], svg: shelfPiece(x, y).items[0].svg },
      { at: [x + 2, y + 6, 1], svg: person(x + 2, y + 6, PALS.mustard, 'rc-you') },
    ])
  );
}
