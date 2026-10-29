// The Opening a web page module's picture: the post town (KTD15). The customer's house stands at the front; a street
// runs left to the directory offices (the root's and .example's), and the main road runs back to Larkspur's shop, with
// Larkspur's own directory office beside it. The road's length follows the customer's real distance, compressed past
// a fixed maximum (a break mark on the road, the real distance in the shop's pill). A cart rides the main road for each
// round trip to the shop (three at most, the count in the pill), and the directory street for each office asked; once
// the TLS handshake is up the carts' envelopes wear a wax seal. A lost packet tips its cart into a ditch beside the
// road it was on, with a RESENT pill; the tip is animated, and with reduced motion the ditch and the pill show alone.
// The seal office (the certificate authority) stands apart: it signed the shop's certificate long before. Words only
// in pills; on phones (scale > 1.5) pills keep just the names and the caption carries the numbers.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  P,
  PALS,
  CERAMIC,
  METAL,
  box,
  byDepth,
  castShadow,
  hullInk,
  line,
  shape,
  tag,
  toneI,
  ink,
  pd,
  clipTo,
  cyl,
  matOf,
  DARK,
  vis,
} from '../../lib/iso/core.js';
import { building, cart as kitCart, lamp, person, type Facing, type Piece } from '../../lib/iso/figures';
import { num } from '../../lib/format';
import { ASSUMPTIONS, type Customer, type Http, type Office, type Run } from '../../lib/web-requests/sim';
import type { Say } from '../story/steps';

export const TOWN_BOARD: Board = [6, 6, 118, 214];

/** Where a lost packet's cart went into the ditch: the main road, or the road to a directory office. */
export type Ditch = 'road' | Office;
export interface TownOpts {
  customer: Pick<Customer, 'name' | 'town' | 'km'>;
  /** directory offices asked so far */
  asked: Office[];
  /** the answer came from the resolver's memory */
  cached: boolean;
  /** round trips to the shop so far: handshakes and requests */
  trips: number;
  /** the TLS (or QUIC) handshake is done, so envelopes are sealed */
  sealed: boolean;
  lost: Ditch[];
  /** ms on the stopwatch, or null before anything is sent */
  ms: number | null;
  http?: Http;
  connections?: number;
  /** light the seal office: the certificate is being checked */
  seal?: boolean;
  say?: Say;
  scale?: number;
}

/** The parts a step's callout may name. */
export const TOWN_PARTS = ['house', 'root', 'tld', 'nameserver', 'seal', 'shop', 'road'] as const;

const HOUSE = { x: 100, y: 196, h: 9 };
const ROAD_X = 100;
const NEAR = HOUSE.y - HOUSE.h - 4; // where the main road leaves the house
const SPAN = { min: 30, max: 150 }; // road length on the board
const OFFICE: Record<'root' | 'tld', [number, number]> = { root: [62, 200], tld: [26, 200] };
const SEAL: [number, number] = [36, 100];
const SHOP_H = 13;
const DOOR = [HOUSE.x + HOUSE.h + 3.2, HOUSE.y + 1]; // where the customer stands, at the front door

/** The road's length for a distance: linear up to the planning maximum, then held there (`broken`). */
export function roadFor(km: number) {
  const k = Math.min(km, ASSUMPTIONS.kmFull) / ASSUMPTIONS.kmFull;
  return { len: SPAN.min + (SPAN.max - SPAN.min) * k, broken: km > ASSUMPTIONS.kmFull };
}
const shopAt = (km: number) => [ROAD_X, NEAR - roadFor(km).len - SHOP_H] as const;
const nsAt = (km: number) => {
  const [x, y] = shopAt(km);
  return [x - 30, y + 2] as const;
};

/** The town as of the first `upTo` phases of a run (all of them by default). */
export function townAt(r: Run, upTo = r.phases.length): Omit<TownOpts, 'say' | 'scale'> {
  const shown = r.phases.slice(0, Math.max(0, upTo));
  return {
    customer: r.customer,
    asked: shown.filter(p => p.kind === 'dns').map(p => p.office!),
    cached: r.dnsCached,
    trips: shown.filter(p => p.kind !== 'dns').length,
    sealed: shown.some(p => p.kind === 'tls' || p.kind === 'quic'),
    lost: shown.filter(p => p.lost).map(p => (p.kind === 'dns' ? p.office! : 'road')),
    ms: shown.length ? Math.max(...shown.map(p => p.end)) : null,
    http: r.setting.http,
    connections: r.connections,
  };
}
/** The town before anything is sent. */
export const idleTown = (customer: TownOpts['customer']): Omit<TownOpts, 'say' | 'scale'> => ({
  customer,
  asked: [],
  cached: false,
  trips: 0,
  sealed: false,
  lost: [],
  ms: null,
});

/** What the town shows. Pure, so the tests can check it without drawing. */
export function townState(o: TownOpts) {
  return {
    carts: Math.min(3, o.trips),
    lit: o.asked,
    ditches: [...new Set(o.lost)],
    ...roadFor(o.customer.km),
  };
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;
const ms = (x: number) => `${num(Math.round(x))} MS`;

/** A pitched roof over a box, its ridge along y. */
function roof(x0: number, y0: number, x1: number, y1: number, z: number, h: number, m = PALS.tomato) {
  const xm = (x0 + x1) / 2,
    e = 1.2;
  const L = [
      [x0 - e, y0 - e, z],
      [xm, y0 - e, z + h],
      [xm, y1 + e, z + h],
      [x0 - e, y1 + e, z],
    ],
    R = [
      [xm, y0 - e, z + h],
      [x1 + e, y0 - e, z],
      [x1 + e, y1 + e, z],
      [xm, y1 + e, z + h],
    ],
    G = [
      [x0, y1, z],
      [x1, y1, z],
      [xm, y1, z + h - 0.6],
    ];
  return (
    shape(L, toneI([-h, 0, (x1 - x0) / 2], m), 0.9) +
    shape(R, toneI([h, 0, (x1 - x0) / 2], m), 0.9) +
    shape(G, toneI([0, 1, 0], CERAMIC), 0.9)
  );
}

type Item = Piece['items'][number];
/** A kit piece drawn at k of its size about the board point (cx, cy): the town is a map, so its people and carts are
 * a model village's. Boxes scale with it so sorting holds; the shadow scales the same way. */
function shrink(p: Piece, cx: number, cy: number, k: number): Pick<Piece, 'shadow' | 'items'> {
  const o = P(cx, cy, BH),
    t = `transform="translate(${o[0].toFixed(1)} ${o[1].toFixed(1)}) scale(${k}) translate(${(-o[0]).toFixed(1)} ${(-o[1]).toFixed(1)})"`,
    s = (q: number[]) => [cx + (q[0] - cx) * k, cy + (q[1] - cy) * k, BH + (q[2] - BH) * k];
  return {
    shadow: `<g ${t}>${p.shadow}</g>`,
    items: p.items.map(i => ({ box: i.box.map(s), svg: `<g ${t}>${i.svg}</g>` })),
  };
}
const FOLK = 0.6; // carts at this size beside the buildings
const SOUL = 0.72; // people a little larger, so a person still reads on a phone
/** who stands at the door: Ines and Tomas as the cast draws them, the other customers as shoppers */
const LOOK: Record<string, string> = { ines: 'ines', tomas: 'tomas', dara: 'shopper5', wen: 'shopper2' };
const one = (b: number[][], svg: string): Item => ({ box: b, svg });

/** The customer's house: a cottage with a pitched roof, a brick chimney astride the ridge and a door toward the road. */
function house() {
  const { x, y, h } = HOUSE,
    b = building({ x, y, d: 2 * h, w: 2 * h, h: 13, roof: 'gable', windows: 1 }),
    zr = BH + 13 + 0.75 * h; // the ridge: the kit's gable rises 0.75 × half the span
  const brick = matOf('#b5654a');
  const ch =
    box(x - 1.6, y - 6, zr - 4, x + 1.6, y - 2.6, zr + 4.5, brick, toneI, 0.9) +
    box(x - 2.1, y - 6.5, zr + 4.5, x + 2.1, y - 2.1, zr + 5.6, DARK, toneI, 0.8);
  const bb = b.items[0].box;
  return {
    shadow: b.shadow,
    items: [one([bb[0], [bb[1][0], bb[1][1], zr + 5.6]], `<g data-prop="house">${b.items[0].svg}${ch}</g>`)],
  };
}

/** A directory office: a small hall behind a portico (two columns on a step under a lintel); its roof lit when asked. */
function office(part: Office, x: number, y: number, lit: boolean) {
  const h = 7,
    top = BH + 12,
    cap = lit ? PALS.mustard : METAL,
    b = building({ x: x - 2, y, d: 10, w: 2 * h, h: 12, roof: 'gable', windows: 0, pal: CERAMIC, roofPal: cap });
  let s = box(x + 3, y - h, BH, x + h + 0.6, y + h, BH + 1.2, CERAMIC, toneI, 0.8);
  for (const c of [-4.4, 4.4]) s += cyl(x + 5.2, y + c, BH + 1.2, top - 1.6, 1.1, CERAMIC, toneI, 0.9, 12);
  s += box(x + 3, y - h, top - 1.6, x + h + 0.6, y + h, top, cap, toneI, 0.9);
  return {
    shadow: b.shadow,
    items: [
      one(b.items[0].box, `<g data-prop="${part}" data-lit="${lit ? 1 : 0}">${b.items[0].svg}</g>`),
      one(
        [
          [x + 3, y - h, BH],
          [x + h + 0.6, y + h, top],
        ],
        s,
      ),
    ],
  };
}

/** Larkspur's shop: a flat-roofed corner shop with a striped awning over its door. */
function shop(km: number) {
  const [x, y] = shopAt(km),
    b = building({ x, y, d: 2 * SHOP_H, w: 2 * SHOP_H, h: 18, roof: 'parapet', awning: true, pal: matOf('#cfeedd') });
  return { shadow: b.shadow, items: [one(b.items[0].box, `<g data-prop="shop">${b.items[0].svg}</g>`)] };
}

/** The seal office: a squat flat-roofed office with a big wax seal (a scalloped red disc) on whichever end faces the
 * viewer, and a lamp at its door, lit while the certificate is checked. */
function sealOffice(lit: boolean) {
  const [x, y] = SEAL,
    h = 8,
    b = building({
      x,
      y,
      d: 2 * h,
      w: 2 * h,
      h: 13,
      roof: 'parapet',
      front: '+y',
      windows: 1,
      pal: lit ? matOf('#f6d2c6') : CERAMIC,
    });
  let emb = '';
  for (const sx of [1, -1]) {
    if (!vis([sx, 0, 0])) continue;
    const X = x + sx * (h + 0.3),
      ring = (r: number, n: number, wob = 0) =>
        Array.from({ length: n }, (_, i) => {
          const a = (i / n) * 2 * Math.PI,
            rr = r + (i % 2 ? wob : 0);
          return [X, y + rr * Math.cos(a), BH + 10.6 + rr * Math.sin(a)];
        });
    emb += shape(ring(2.6, 16, 0.6), PALS.tomato.m, 1) + shape(ring(1.4, 12), PALS.tomato.d, 0.6);
  }
  const lp = lamp({ x: x + h - 1.5, y: y + h + 3.5, h: 16, lit });
  return {
    shadow: b.shadow + lp.shadow,
    items: [
      one(b.items[0].box, `<g data-prop="seal" data-lit="${lit ? 1 : 0}">${b.items[0].svg}${emb}</g>`),
      ...lp.items,
    ],
  };
}

/** A postal cart at (x, y) heading `facing`, an envelope in its tray, sealed or not. `from` is where it rode from, for
 * the ride-in (the offset is in the shrunk cart's own units). */
function cart(x: number, y: number, sealed: boolean, facing: Facing, from?: number[]) {
  const c = kitCart({ x, y, facing }),
    z = BH + 12.6;
  let env = shape(
    [
      [x - 4, y - 3, z],
      [x + 4, y - 3, z],
      [x + 4, y + 3, z],
      [x - 4, y + 3, z],
    ],
    CERAMIC.l,
    0.9,
  );
  env += line(
    [
      [x - 4, y - 3, z + 0.05],
      [x, y, z + 0.05],
      [x + 4, y - 3, z + 0.05],
    ],
    0.7,
  );
  if (sealed) env += cyl(x, y, z, z + 0.8, 1.7, PALS.tomato, toneI, 0.7, 12);
  let style = '';
  if (from) {
    const a = P(from[0], from[1], BH),
      b = P(x, y, BH);
    style = ` style="--dx:${((a[0] - b[0]) / FOLK).toFixed(1)}px;--dy:${((a[1] - b[1]) / FOLK).toFixed(1)}px"`;
  }
  c.items[0].svg = c.items[0].svg
    .replace('<g class="cart">', `<g class="cart"${style}>`)
    .replace(/<\/g>$/, `${env}</g>`);
  return shrink(c, x, y, FOLK);
}

/** The hero plot's small cart: a box with an envelope, sealed or not. */
function plotCart(x: number, y: number, sealed: boolean) {
  const z = BH + 0.4;
  let s = box(x - 3.5, y - 2.5, z + 1, x + 3.5, y + 2.5, z + 4.5, PALS.mustard, toneI, 0.9);
  s += box(x - 2.4, y - 1.8, z + 4.5, x + 2.4, y + 1.8, z + 5.5, CERAMIC, toneI, 0.6);
  if (sealed) s += box(x - 0.9, y - 0.9, z + 5.5, x + 0.9, y + 0.9, z + 6.2, PALS.tomato, toneI, 0.5);
  s += box(x - 3, y - 3.2, z, x - 1.6, y - 2.5, z + 1.6, METAL, toneI, 0.6);
  s += box(x + 1.6, y - 3.2, z, x + 3, y - 2.5, z + 1.6, METAL, toneI, 0.6);
  return { at: [x, y, 1], svg: `<g class="cart">${s}</g>` };
}

/** A ditch beside a road at (x, y), its cart on its side. */
function ditch(x: number, y: number, where: Ditch) {
  const z = BH + 0.2;
  let s = shape(
    [
      [x - 6, y - 4, z],
      [x + 6, y - 4, z],
      [x + 6, y + 4, z],
      [x - 6, y + 4, z],
    ],
    '#41538f',
    1,
  );
  // the cart, tipped: its tray on its side, a wheel come off, its envelope spilled beside it
  const tip =
    box(x - 3.5, y - 1.5, z, x + 3.5, y + 3.5, z + 2.5, PALS.cobalt, toneI, 0.9) +
    cyl(x + 1, y - 2.6, z, z + 0.9, 2.2, DARK, toneI, 0.8, 14);
  s += `<g class="tip">${tip}${box(x - 5, y - 3.5, z, x - 1.5, y - 1, z + 0.6, CERAMIC, toneI, 0.6)}</g>`;
  return { at: [x, y, 0], svg: `<g class="ditch" data-ditch="${where}">${s}</g>` };
}

/** The roads: the main road from the house to the shop, the directory street, and the lane to Larkspur's directory. */
function roads(km: number, broken: boolean) {
  const z = BH + 0.25,
    [, sy] = shopAt(km),
    [nx, ny] = nsAt(km),
    w = 4;
  const strip = (q: number[][]) => shape(q, '#b7ae9c', 1.1);
  let s = strip([
    [ROAD_X - w, NEAR + 2, z],
    [ROAD_X + w, NEAR + 2, z],
    [ROAD_X + w, sy + SHOP_H + 1, z],
    [ROAD_X - w, sy + SHOP_H + 1, z],
  ]);
  // the centre line, dashed
  for (let yy = NEAR - 4; yy > sy + SHOP_H + 4; yy -= 9)
    s += line(
      [
        [ROAD_X, yy, z + 0.05],
        [ROAD_X, yy - 4, z + 0.05],
      ],
      0.8,
    ).replace(/stroke="[^"]+"/, 'stroke="#fbfaf3"');
  if (broken) {
    // a break mark: the road is longer than the board can hold
    const m = (NEAR + sy + SHOP_H) / 2;
    s += ink(
      pd(
        [
          [ROAD_X - w - 3, m + 2, z + 0.1],
          [ROAD_X - 1.5, m - 2, z + 0.1],
          [ROAD_X + 1.5, m + 2, z + 0.1],
          [ROAD_X + w + 3, m - 2, z + 0.1],
        ],
        false,
      ),
      1.6,
    );
  }
  s += strip([
    [HOUSE.x - HOUSE.h - 1, HOUSE.y + 3, z],
    [HOUSE.x - HOUSE.h - 1, HOUSE.y + 9, z],
    [OFFICE.tld[0] + 8, HOUSE.y + 9, z],
    [OFFICE.tld[0] + 8, HOUSE.y + 3, z],
  ]);
  s += strip([
    [nx + 7, ny - 2.5, z],
    [ROAD_X - w, ny - 2.5, z],
    [ROAD_X - w, ny + 2.5, z],
    [nx + 7, ny + 2.5, z],
  ]);
  return `<g data-prop="road">${s}</g>`;
}

/** The town: shadows and roads (floor), then buildings, carts and ditches back to front, then the pills. */
export const townScene = (o: TownOpts) => (ctx: SceneCtx) => {
  const st = townState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5,
    km = o.customer.km,
    [sx, sy] = shopAt(km),
    [nx, ny] = nsAt(km);
  const pieces: Pick<Piece, 'shadow' | 'items'>[] = [
    house(),
    office('root', ...OFFICE.root, st.lit.includes('root')),
    office('tld', ...OFFICE.tld, st.lit.includes('tld')),
    office('nameserver', nx, ny, st.lit.includes('nameserver')),
    sealOffice(!!o.seal),
    shop(km),
    // the customer at the front door, waiting on the page
    shrink(
      person({ x: DOOR[0], y: DOOR[1], facing: 45, look: LOOK[o.customer.name.toLowerCase()] }),
      DOOR[0],
      DOOR[1],
      SOUL,
    ),
  ];
  // carts on the main road, spread along it, riding in from the house
  const home = [ROAD_X, NEAR];
  for (let i = 0; i < st.carts; i++) {
    const f = 0.25 + i * 0.25,
      y = NEAR - (NEAR - sy - SHOP_H) * f;
    pieces.push(cart(ROAD_X, y, o.sealed, '-y', home));
  }
  // a cart outside each office asked, at the foot of its steps
  for (const a of st.lit) {
    const [x, y] = a === 'nameserver' ? [nx + 14, ny] : [OFFICE[a][0] + 14, HOUSE.y + 6];
    pieces.push(cart(x, y, false, '-x', [HOUSE.x - HOUSE.h, HOUSE.y + 6]));
  }
  const items: { at?: number[]; box?: number[][]; svg: string }[] = pieces.flatMap(p => p.items);
  for (const d of st.ditches) {
    const at: [number, number] =
      d === 'road'
        ? [ROAD_X + 12, NEAR - (NEAR - sy - SHOP_H) * 0.6]
        : d === 'nameserver'
          ? [nx + 12, ny + 9]
          : [OFFICE[d][0] + 10, HOUSE.y + 16];
    items.push(ditch(...at, d));
  }
  // every shadow first (clipped to the board), then the roads, then one sort over everything standing
  let s = clipTo(ctx.top, pieces.map(p => p.shadow).join('')) + roads(km, st.broken);
  s += `<g data-prop="carts" data-carts="${st.carts}" data-sealed="${o.sealed ? 1 : 0}">${byDepth(items)}</g>`;

  const shopText = narrow ? 'SHOP' : `SHOP · ${num(km)} KM${o.http && o.ms !== null ? ` · HTTP/${o.http}` : ''}`;
  let pills = pill([sx, sy, BH + 21], 0, -20, shopText, o.trips > 0, scale);
  pills += pill(
    [HOUSE.x + HOUSE.h, HOUSE.y + HOUSE.h, BH],
    4,
    18,
    narrow || o.ms === null
      ? o.customer.name.toUpperCase()
      : `${o.customer.name.toUpperCase()} · ${ms(o.ms)}${o.cached ? ' · REMEMBERED' : ''}`,
    o.ms !== null,
    scale,
  );
  const tops: Record<Office, number[]> = {
    root: [...OFFICE.root, BH + 15],
    tld: [...OFFICE.tld, BH + 15],
    nameserver: [nx, ny, BH + 15],
  };
  const NAMES: Record<Office, string> = { root: 'ROOT', tld: '.EXAMPLE', nameserver: 'LARKSPUR DNS' };
  for (const k of ['root', 'tld'] as Office[]) pills += pill(tops[k], 0, -16, NAMES[k], st.lit.includes(k), scale);
  // Larkspur's office stands by the shop, so its pill hangs in front of it, clear of the shop's
  pills += pill([nx + 7, ny + 7, BH], 0, 14, narrow ? 'DNS' : NAMES.nameserver, st.lit.includes('nameserver'), scale);
  pills += pill([...SEAL, BH + 18], 0, -16, narrow ? 'SEALS' : 'SEAL OFFICE', !!o.seal, scale);
  for (const d of st.ditches) {
    const p =
      d === 'road'
        ? [ROAD_X + 12, NEAR - (NEAR - sy - SHOP_H) * 0.6, BH]
        : d === 'nameserver'
          ? [nx + 12, ny + 9, BH]
          : [OFFICE[d][0] + 10, HOUSE.y + 16, BH];
    pills += pill(p, 6, 12, 'RESENT', false, scale, '#f6c2b4');
  }
  // callouts stand a row above their part's pill
  pills += sayAt(o.say, 'house', [HOUSE.x, HOUSE.y, BH + 20], -16, scale);
  for (const k of ['root', 'tld'] as Office[]) pills += sayAt(o.say, k, tops[k], -16, scale);
  pills += sayAt(o.say, 'nameserver', tops.nameserver, -16, scale);
  pills += sayAt(o.say, 'seal', [...SEAL, BH + 18], -16, scale);
  pills += sayAt(o.say, 'shop', [sx, sy, BH + 21], -20, scale);
  pills += sayAt(o.say, 'road', [ROAD_X + 10, NEAR - (NEAR - sy - SHOP_H) * 0.45, BH], -6, scale);
  return s + pills;
};

/** The town in words, for its aria-label. */
export function townLabel(o: TownOpts): string {
  const st = townState(o),
    c = o.customer;
  const asked = st.lit.length
    ? `Directory offices asked: ${st.lit.map(k => ({ root: 'the root', tld: '.example', nameserver: 'Larkspur’s' })[k]).join(', ')}.`
    : o.cached
      ? 'The directory was not asked: the answer was remembered.'
      : 'No directory office asked yet.';
  return (
    `The post town: ${c.name}’s house in ${c.town}, ${num(c.km)} km from Larkspur’s shop. ${asked} ` +
    `${o.trips} round ${o.trips === 1 ? 'trip' : 'trips'} to the shop${o.sealed ? ', sealed' : ''}.` +
    (st.ditches.length ? ` ${st.ditches.length} lost and sent again.` : '') +
    (o.ms !== null ? ` ${num(Math.round(o.ms))} ms so far.` : '')
  );
}

/** The counts the caption carries (phones show only the names in the pills). */
export function townReadouts(o: TownOpts): string[] {
  return [
    `${num(o.customer.km)} km`,
    `${o.trips} ${o.trips === 1 ? 'trip' : 'trips'} to the shop`,
    ...(o.lost.length ? [`${o.lost.length} resent`] : []),
    ...(o.ms !== null ? [`${num(Math.round(o.ms))} ms`] : []),
  ];
}

/** The home hero's plot: a small house, a road with a cart on it, and the shop at its end with its striped awning. */
export function townPlot(x: number, y: number, top: SceneCtx['top']): string {
  const hx = x + 10,
    hy = y + 12,
    h = 5,
    shx = x + 10,
    shy = y - 16,
    sh = 7,
    z = BH + 0.25;
  let hs = box(hx - h, hy - h, BH, hx + h, hy + h, BH + 7, CERAMIC, toneI, 1);
  hs += roof(hx - h, hy - h, hx + h, hy + h, BH + 7, 5);
  hs += hullInk([...boxCorners(hx - h - 1, hy - h - 1, BH, hx + h + 1, hy + h + 1, BH + 7), [hx, hy, BH + 12]], 1.6);
  let ss = box(shx - sh, shy - sh, BH, shx + sh, shy + sh, BH + 10, CERAMIC, toneI, 1);
  ss += box(shx - sh - 0.6, shy - sh - 0.6, BH + 10, shx + sh + 0.6, shy + sh + 0.6, BH + 12, PALS.mint, toneI, 0.8);
  ss += box(shx + sh, shy - 4, BH + 6, shx + sh + 2.5, shy + 4, BH + 7, PALS.mint, toneI, 0.6);
  ss += hullInk(boxCorners(shx - sh - 0.6, shy - sh - 0.6, BH, shx + sh + 2.5, shy + sh + 0.6, BH + 12), 1.8);
  const road = shape(
    [
      [hx - 2.5, hy - h - 1, z],
      [hx + 2.5, hy - h - 1, z],
      [hx + 2.5, shy + sh + 1, z],
      [hx - 2.5, shy + sh + 1, z],
    ],
    '#b7ae9c',
    1,
  );
  return (
    castShadow(boxCorners(hx - h, hy - h, BH, hx + h, hy + h, BH + 10), BH, top) +
    castShadow(boxCorners(shx - sh, shy - sh, BH, shx + sh, shy + sh, BH + 12), BH, top) +
    road +
    byDepth([{ at: [hx, hy, 0], svg: hs }, { at: [shx, shy, 0], svg: ss }, plotCart(hx, (hy + shy) / 2, true)])
  );
}
