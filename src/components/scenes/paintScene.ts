// The Locks and keys module's picture: the paint shop counter (KTD15). Larkspur stands at the left end, the supplier
// at the right, and the middle of the counter is open to anyone: whatever crosses it, an eavesdropper behind the
// counter sees. On it stand paint pots (Diffie–Hellman: a pot is an even mix of its pigments, so mixing your secret into
// the other side's pot gives the same colour as theirs into yours), padlocks open or shut, keys, the order crate (a
// wax seal when signed, a padlock when locked) and cards (a certificate, a fingerprint). Words only in pills; a pot's
// pill is filled with its own paint and carries its toy number. On phones (scale > 1.5) pills keep their short names
// and the caption carries the numbers. Every string is escaped (esc).
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  CERAMIC,
  DARK,
  INK,
  METAL,
  PALS,
  WOOD,
  box,
  byDepth,
  castShadow,
  cyl,
  ellUV,
  fill,
  hullInk,
  ink,
  inkK,
  line,
  loft,
  matOf,
  on,
  openShell,
  P,
  PY,
  PZ,
  pd,
  rod,
  tag,
  toneI,
  vis,
} from '../../lib/iso/core.js';
import { compact } from '../../lib/iso/compact';
import { drawPieces, person, tight, type Item as KitItem, type Look, type Piece } from '../../lib/iso/figures';
import { TOY, publicOf, sharedOf } from '../../lib/encryption/toy';
import type { Say } from '../story/steps';

export const PAINT_BOARD: Board = [0, 8, 180, 100];

// ---- paint ----

/** The pigments, as in tokens.css (--paint-<id>). */
export const PIGMENTS = {
  straw: { name: 'Straw', hex: '#f3d77e' },
  rose: { name: 'Rose', hex: '#f4a9b8' },
  sky: { name: 'Sky', hex: '#9fc8ec' },
  mint: { name: 'Mint', hex: '#a6dcb6' },
  lilac: { name: 'Lilac', hex: '#cdb7ec' },
} as const;
export type Pigment = keyof typeof PIGMENTS;

const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
const rgbOf = (hex: string) => [1, 3, 5].map(i => toLin(Number.parseInt(hex.slice(i, i + 2), 16) / 255));

/** A pot's colour: the even mix of its pigments, averaged in linear-light sRGB. Order never matters, so both sides'
 * final pots (base, mine, theirs) are one colour. */
export function mixPaint(pigments: readonly Pigment[]): string {
  const all = pigments.map(p => rgbOf(PIGMENTS[p].hex));
  return `#${[0, 1, 2]
    .map(k => Math.round(toSrgb(all.reduce((a, c) => a + c[k], 0) / all.length) * 255))
    .map(v => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

/** WCAG relative luminance and contrast ratio, for the pill check. */
export const luminance = (hex: string) => {
  const [r, g, b] = rgbOf(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// ---- the scene's data ----

export type Side = 'us' | 'them';
export interface Item {
  kind: 'pot' | 'lock' | 'box' | 'key' | 'card';
  /** the pill: wide screens */
  label: string;
  /** the pill on phones; defaults to label */
  short?: string;
  /** a pot's pigments */
  pigments?: Pigment[];
  /** whose lock or key (its colour) */
  owner?: Side;
  /** a lock's shackle is up */
  open?: boolean;
  /** a crate or card carries a wax seal (signed); broken = the seal no longer matches */
  sealed?: boolean;
  broken?: boolean;
  /** a crate is padlocked */
  locked?: boolean;
  /** the item the step is about */
  lit?: boolean;
  /** just made: it pours in (no motion with reduced motion) */
  fresh?: boolean;
}
export interface PaintOpts {
  us: Item[];
  counter: Item[];
  them: Item[];
  /** the eavesdropper behind the counter, and what she has seen (her pill) */
  eve?: string;
  /** the side names, read from data */
  names?: [string, string];
  scale?: number;
  say?: Say;
}
/** The parts a callout may name: each end of the counter, its open middle, and the eavesdropper. */
export const PAINT_PARTS = ['us', 'counter', 'them', 'eve'] as const;

const SLOT: Record<'us' | 'counter' | 'them', number> = { us: 30, counter: 90, them: 150 },
  Y = 72,
  TOP = BH + 14,
  C0 = [8, 58, 172, 88] as const,
  EVE = [90, 30] as const,
  OWNER = { us: PALS.cobalt, them: PALS.mint },
  WAX = PALS.tomato,
  ROW = 22,
  BROKEN = { l: '#c9c2b4', m: '#aaa293', d: '#6f675a' };

/** Where each item stands: one in the middle of its slot; two side by side across the screen (along x − y, so their
 * pills sit in two rows, one above the other); three or four in a row along the open middle. */
const spots = (n: number): [number, number][] =>
  n <= 1
    ? [[0, 0]]
    : n === 2
      ? [
          [-9, 9],
          [9, -9],
        ]
      : (n === 3 ? [-20, 0, 20] : [-27, -9, 9, 27]).map(d => [d, 0]);

function seal(x: number, y: number, z: number, broken?: boolean) {
  return cyl(x, y, z, z + 1.2, 3.2, broken ? BROKEN : WAX, toneI, 0.8, 16);
}
function shackle(x: number, y: number, z: number, open: boolean) {
  const lift = open ? 4 : 0,
    pts = [
      [x - 3, y, z],
      [x - 3, y, z + 5 + lift],
      [x - 1.6, y, z + 7.4 + lift],
      [x + 1.6, y, z + 7.4 + lift],
      [x + 3, y, z + 5 + lift],
      [x + 3, y, z + (open ? 3 + lift : 0)],
    ];
  const d = pd(pts, false);
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${METAL.m}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function padlock(x: number, y: number, z: number, m: typeof PALS.cobalt, open: boolean, k = 1) {
  const w = 5 * k,
    t = 3 * k,
    h = 7 * k;
  return shackle(x, y, z + h, open) + box(x - w, y - t, z, x + w, y + t, z + h, m, toneI, 0.9);
}

const ringAt = (x: number, y: number, z: number, r: number, n = 18) => on(PZ(z), ellUV(x, y, r, r, n));
/** A thin painted bar along a polyline (an ink stroke under a coloured one): a wire handle at a sliver of a rod's SVG. */
const wire = (pts: number[][], col: string, w = 1.1) => {
  const d = pd(pts, false);
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 1.6}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
};
/** A paint tin, open. Real-object notes: a steel can, its far inner wall seen over the paint inside; a label band round
 * it in the paint's own colour; a rolled rim; a wire bail handle from two ears, laid back over the far rim; a mixing
 * paddle standing in a fresh mix. 13 across and 11 tall, the old pot's footprint. */
function tin(x: number, y: number, z: number, colour: string, paddle: boolean) {
  const r = 6.3,
    h = 10,
    paint = matOf(colour),
    A = ringAt(x, y, z, r * 0.94),
    B = ringAt(x, y, z + h, r);
  const surface =
    fill(pd(ringAt(x, y, z + h - 1.6, r - 0.35)), colour) + ink(pd(ringAt(x, y, z + h - 1.6, r - 0.35)), 0.6);
  let s = openShell(A, B, (n: number[]) => toneI(n, METAL), surface);
  s += loft(ringAt(x, y, z + 2, r * 0.955 + 0.06), ringAt(x, y, z + 7.6, r * 0.985 + 0.06), (n: number[]) =>
    toneI(n, paint),
  );
  s += loft(ringAt(x, y, z + h - 1, r + 0.4), ringAt(x, y, z + h, r + 0.4), (n: number[]) => toneI(n, METAL));
  s += ink(pd(ringAt(x, y, z + h, r + 0.4)), 1) + hullInk([...A, ...ringAt(x, y, z + h, r + 0.4)], 1.5);
  if (paddle)
    s +=
      rod([x + 1.2, y - 1.2, z + h - 2], [x + 3.8, y - 3.6, z + h + 9], 0.9, WOOD, toneI, 0.9) +
      rod([x + 3.8, y - 3.6, z + h + 9], [x + 4.3, y - 4.1, z + h + 11], 1.3, WOOD, toneI, 0.9);
  // the bail: its ears on either side across x, the wire laid back over the far rim
  const bail = Array.from({ length: 11 }, (_, i) => {
    const t = (i / 10) * Math.PI;
    return [x + (r + 0.5) * Math.cos(t), y - 3.4 * Math.sin(t), z + h - 1.5 + 3.2 * Math.sin(t)];
  });
  s += wire(bail, METAL.m, 0.9);
  for (const k of [-1, 1]) s += fill(pd(on(PY(y), ellUV(x + k * (r + 0.45), z + h - 1.5, 0.9, 0.9, 8))), DARK.m);
  return s;
}

/** One item at a point: its drawing, the height of its top, and its fill for the pill. */
function itemAt(it: Item, x: number, y: number): { svg: string; top: number; fill?: string } {
  const z = TOP;
  switch (it.kind) {
    case 'pot': {
      const colour = mixPaint(it.pigments ?? ['straw']);
      // a fresh mix still has the paddle standing in it
      return { svg: tin(x, y, z, colour, !!it.fresh && (it.pigments?.length ?? 0) > 1), top: z + 11, fill: colour };
    }
    case 'lock':
      return { svg: padlock(x, y, z, OWNER[it.owner ?? 'them'], !!it.open), top: z + 7 + 7.4 + (it.open ? 4 : 0) };
    case 'key': {
      const m = OWNER[it.owner ?? 'them'];
      return {
        svg:
          rod([x - 7, y, z + 1.4], [x + 3, y, z + 1.4], 1.1, m) +
          box(x - 7, y - 0.6, z, x - 4, y + 2.6, z + 1.2, m, toneI, 0.6) +
          cyl(x + 6, y, z, z + 2.4, 3.4, m, toneI, 0.9, 16),
        top: z + 3,
      };
    }
    case 'card': {
      let s = box(x - 8, y - 6, z, x + 8, y + 6, z + 1, CERAMIC, toneI, 0.9);
      if (it.sealed || it.broken) s += seal(x + 3, y + 2, z + 1, it.broken);
      if (it.locked) s += padlock(x - 3, y - 1, z + 1, OWNER[it.owner ?? 'us'], false, 0.6);
      return { svg: s, top: z + (it.locked ? 10 : 2.2) };
    }
    default: {
      const top = z + 11;
      let s = box(x - 9, y - 8, z, x + 9, y + 8, top, WOOD, toneI, 1);
      s += box(x - 9.2, y - 1, top - 0.1, x + 9.2, y + 1, top + 0.2, CERAMIC, toneI, 0.4);
      if (it.sealed || it.broken) s += seal(x - 4, y + 4, top + 0.2, it.broken);
      if (it.locked) s += padlock(x + 4, y + 3, top + 0.2, OWNER[it.owner ?? 'them'], false, 0.7);
      s += hullInk(boxCorners(x - 9, y - 8, z, x + 9, y + 8, top), 1.4);
      return { svg: s, top: top + (it.locked ? 10 : 2) };
    }
  }
}

const pill = (p: number[], dy: number, text: string, lit: boolean, scale: number, fill?: string, dx = 0) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;

/** A sortable piece of the shop that is one item (the counter, a shelf, the pillar, a thing on the counter). */
const one = (box: number[][], svg: string, shadow = ''): Piece => ({ shadow, items: [{ box, svg }], box });
/** Wrap a kit piece's items in a group (a part's data-prop). */
const wrap = (p: Piece, attrs: string): Piece => ({
  ...p,
  items: p.items.map((i: KitItem) => ({ ...i, svg: `<g ${attrs}>${i.svg}</g>` })),
});

/** The eavesdropper: Eve in her trench coat and hat behind the counter's middle, half behind a pillar. */
const EVE_TOP = BH + 43;
const eavesdropper = () => wrap(person({ x: EVE[0], y: EVE[1], facing: 80, look: 'eve' }), 'data-prop="eve"');

/** The shop's stone pillar, a plinth and a capital, that Eve keeps behind. */
function pillar(x: number, y: number, top: SceneCtx['top']): Piece {
  const z1 = BH + 50,
    stone = matOf('#e6dccb');
  const svg =
    box(x - 5.5, y - 5.5, BH, x + 5.5, y + 5.5, BH + 3, stone, toneI, 1) +
    cyl(x, y, BH + 3, z1 - 3, 4.2, stone, toneI, 1.6, 20) +
    box(x - 5.5, y - 5.5, z1 - 3, x + 5.5, y + 5.5, z1, stone, toneI, 1);
  const b = [
    [x - 5.5, y - 5.5, BH],
    [x + 5.5, y + 5.5, z1],
  ];
  return one(
    b,
    `<g class="pillar">${svg}</g>`,
    castShadow(boxCorners(x - 5.5, y - 5.5, BH, x + 5.5, y + 5.5, z1), BH, top),
  );
}

/** A wall shelf of closed paint tins, three boards on four posts, the tins' lids in their paint. */
function shelves(x0: number, x1: number, y0: number, top: SceneCtx['top']): Piece {
  const y1 = y0 + 9,
    z1 = BH + 34,
    tones = Object.values(PIGMENTS).map(p => p.hex);
  let s = '';
  for (const [x, y] of [
    [x0 + 1, y0 + 1],
    [x1 - 1, y0 + 1],
  ])
    s += box(x - 1, y - 1, BH, x + 1, y + 1, z1, WOOD, toneI, 0.8);
  let n = 0;
  // the bottom board stands empty (stock on the floor); the two above it carry a row of tins each
  for (const z of [BH + 1, BH + 12, BH + 23]) {
    s += box(x0, y0, z, x1, y1, z + 1.6, WOOD, toneI, 0.9);
    if (z > BH + 1)
      for (let x = x0 + 5.5; x < x1 - 3; x += 8.2) {
        const c = tones[n++ % tones.length];
        s += cyl(x, y0 + 4.5, z + 1.6, z + 7.6, 3, matOf(c), toneI, 0.9, 10);
      }
  }
  for (const [x, y] of [
    [x0 + 1, y1 - 1],
    [x1 - 1, y1 - 1],
  ])
    s += box(x - 1, y - 1, BH, x + 1, y + 1, z1, WOOD, toneI, 0.8);
  s += box(x0, y0, z1, x1, y1, z1 + 1.6, WOOD, toneI, 0.9);
  const b = [
    [x0, y0, BH],
    [x1, y1, z1 + 1.6],
  ];
  return one(b, `<g class="shelves">${s}</g>`, castShadow(boxCorners(x0, y0, BH, x1, y1, z1 + 1.6), BH, top));
}

/** The shopkeepers at the counter's ends, in their side's colours (Larkspur cobalt, the supplier mint). */
const KEEPER: Record<'us' | 'them', Look> = {
  us: { skin: '#c18456', top: PALS.cobalt.l, legs: '#3b4566', hair: '#2b231c', cut: 'bun' },
  them: {
    skin: '#f3cfae',
    top: PALS.mint.m,
    legs: '#4a4642',
    hair: '#bdb7ab',
    cut: 'short',
    hat: 'cap',
    hatCol: PALS.mint.d,
  },
};

/** Each item's place and pill row: two items take two rows; three or four in the open middle climb a row each. */
function layout(o: PaintOpts) {
  return (['us', 'counter', 'them'] as const).flatMap(slot =>
    o[slot].slice(0, slot === 'counter' ? 4 : 2).map((it, i, all) => {
      const [dx, dy] = spots(all.length)[i];
      return { slot, it, x: SLOT[slot] + dx, y: Y + dy, row: all.length > 2 ? i : i % 2 };
    }),
  );
}

export const paintScene = (o: PaintOpts) => (ctx: SceneCtx) => {
  const scale = o.scale ?? 1,
    narrow = scale > 1.5;
  const eveTop = EVE_TOP;
  // the shop: shelves of tins along the back wall, the pillar, a shopkeeper behind each end of the counter, Eve
  const pieces: Piece[] = [
    shelves(8, 60, 10, ctx.top),
    shelves(120, 172, 10, ctx.top),
    pillar(EVE[0] + 9, EVE[1] + 2, ctx.top),
    // each at the far end of its side, clear of its pots and their pills
    wrap(person({ x: SLOT.us - 19, y: C0[1] - 10, facing: 70, look: KEEPER.us }), 'data-prop="us"'),
    wrap(person({ x: SLOT.them + 18, y: C0[1] - 10, facing: 110, look: KEEPER.them }), 'data-prop="them"'),
  ];
  if (o.eve !== undefined) pieces.push(eavesdropper());
  // the counter: a body with panelled front and a top slab overhanging it; the open middle a pale mat anyone can see
  let counter = box(C0[0], C0[1], BH, C0[2], C0[3], TOP - 2, WOOD, toneI, 1);
  if (vis([0, 1, 0]))
    for (let x = C0[0] + 14; x < C0[2] - 6; x += 18)
      counter += line(
        on(PY(C0[3] + 0.1), [
          [x, BH + 2],
          [x, TOP - 4],
        ]),
        0.7,
      );
  counter +=
    box(C0[0] - 1, C0[1] - 1, TOP - 2, C0[2] + 1, C0[3] + 1, TOP, WOOD, toneI, 1) +
    box(SLOT.counter - 22, C0[1] + 2, TOP, SLOT.counter + 22, C0[3] - 2, TOP + 0.4, CERAMIC, toneI, 0.6) +
    hullInk(boxCorners(C0[0] - 1, C0[1] - 1, BH, C0[2] + 1, C0[3] + 1, TOP), 1.8);
  const placed = layout(o).map(p => ({ ...p, d: itemAt(p.it, p.x, p.y) }));
  // the counter and what stands on it are one item (a flat counter sorts in front of its load otherwise)
  const onTop = byDepth(
    placed.map(p => ({
      box: [
        [p.x - 9, p.y - 8, TOP + 0.4],
        [p.x + 9, p.y + 8, p.d.top],
      ],
      svg: `<g data-item="${p.it.kind}" data-slot="${p.slot}"${p.it.fresh ? ' data-fresh="1"' : ''}${p.it.lit ? ' data-lit="1"' : ''}${p.it.pigments ? ` data-colour="${mixPaint(p.it.pigments)}"` : ''}>${p.d.svg}</g>`,
    })),
  );
  pieces.push(
    one(
      [
        [C0[0] - 1, C0[1] - 1, BH],
        [C0[2] + 1, C0[3] + 1, Math.max(TOP + 0.4, ...placed.map(p => p.d.top))],
      ],
      `<g data-prop="counter">${counter}</g>${onTop}`,
      castShadow(boxCorners(C0[0], C0[1], BH, C0[2], C0[3], TOP), BH, ctx.top),
    ),
  );
  const s = drawPieces(pieces);
  let pills = '';
  if (o.names) {
    pills += pill([SLOT.us, C0[3], BH + 4], 18, o.names[0], false, scale, '#ffffff');
    pills += pill([SLOT.them, C0[3], BH + 4], 18, o.names[1], false, scale, '#ffffff');
  }
  // a slot's pills float in level rows above its highest item on screen (each leader runs down to its own item)
  const k = inkK() * scale,
    yOf = (p3: number[]) => P(p3[0], p3[1], p3[2])[1],
    inSlot = (slot: string) => placed.filter(p => p.slot === slot),
    slotTop = (slot: string) => Math.max(TOP, ...inSlot(slot).map(p => p.d.top)),
    highest = (slot: string) =>
      Math.min(yOf([SLOT[slot as 'us'], Y, slotTop(slot)]), ...inSlot(slot).map(p => yOf([p.x, p.y, p.d.top]))),
    rows = (slot: string) => Math.max(0, ...inSlot(slot).map(p => p.row + 1)),
    rowDy = (slot: string, p3: number[], row: number) => -14 - ROW * row - (yOf(p3) - highest(slot)) / k;
  for (const p of placed)
    pills += pill(
      [p.x, p.y, p.d.top],
      rowDy(p.slot, [p.x, p.y, p.d.top], p.row),
      narrow ? (p.it.short ?? p.it.label) : p.it.label,
      !!p.it.lit,
      scale,
      p.d.fill,
    );
  if (o.eve !== undefined && o.eve)
    // her pill sits off to the right, clear of the open middle's rows
    pills += pill([EVE[0], EVE[1], eveTop], 6, o.eve, false, scale, '#ffffff', 40);
  for (const part of ['us', 'counter', 'them'] as const) {
    const at = [SLOT[part], Y, slotTop(part)];
    pills += sayAt(o.say, part, at, rowDy(part, at, Math.max(1, rows(part) - 1)), scale);
  }
  if (o.eve !== undefined) pills += sayAt(o.say, 'eve', [EVE[0], EVE[1], eveTop], o.eve ? -12 : 8, scale);
  return compact(tight(s)) + pills;
};

/** The picture in words, for its aria-label. */
export function paintLabel(o: PaintOpts): string {
  const name = (it: Item) => `${it.kind === 'box' ? 'crate' : it.kind} (${it.label})`;
  const at = (items: Item[], where: string) => (items.length ? `${where}: ${items.map(name).join(', ')}.` : '');
  return [
    'The paint shop counter.',
    at(o.us, o.names?.[0] ?? 'Larkspur’s end'),
    at(o.counter, 'In the open middle'),
    at(o.them, o.names?.[1] ?? 'The supplier’s end'),
    o.eve !== undefined ? `An eavesdropper watches the middle${o.eve ? `: ${o.eve}` : ''}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** What the caption carries (phones show only short names in the pills): the open middle's labels. */
export const paintReadouts = (o: PaintOpts): string[] =>
  o.counter.length ? [`In the open: ${o.counter.map(i => i.label).join(', ')}`] : [];

// ---- the reader: Diffie–Hellman as paint ----

export const DH_STAGES = ['start', 'mixed', 'swapped', 'final'] as const;
export type DhStage = (typeof DH_STAGES)[number];
const BASE = TOY.dh.base as Pigment,
  THEIRS = TOY.dh.supplier.pigment as Pigment;
export const secretOf = (p: Pigment) => TOY.dh.secrets.find(s => s.pigment === p)?.secret ?? 0;

/** The counter at each stage of the mix, for the reader's secret pigment. Pills carry the toy numbers. */
export function paintAt(mine: Pigment, stage: DhStage, names?: [string, string]): PaintOpts {
  const a = secretOf(mine),
    b = TOY.dh.supplier.secret,
    A = publicOf(a),
    B = publicOf(b),
    shared = sharedOf(B, a),
    n = DH_STAGES.indexOf(stage);
  const base: Item = { kind: 'pot', label: `BASE ${TOY.dh.g}`, short: 'BASE', pigments: [BASE] };
  const secret = (p: Pigment, x: number): Item => ({
    kind: 'pot',
    label: `SECRET ${x}`,
    short: 'SECRET',
    pigments: [p],
  });
  const pub = (p: Pigment, x: number, fresh: boolean): Item => ({
    kind: 'pot',
    label: `${x}`,
    pigments: [BASE, p],
    fresh,
  });
  const final: Item = {
    kind: 'pot',
    label: `SHARED ${shared}`,
    short: `${shared}`,
    pigments: [BASE, mine, THEIRS],
    lit: true,
    fresh: true,
  };
  const eve = n === 0 ? `SEES ${TOY.dh.g}` : n === 1 ? `SEES ${TOY.dh.g}` : `SEES ${TOY.dh.g}, ${A}, ${B}`;
  if (n === 0) return { us: [secret(mine, a)], counter: [base], them: [secret(THEIRS, b)], eve, names };
  if (n === 1)
    return {
      us: [secret(mine, a), pub(mine, A, true)],
      counter: [base],
      them: [secret(THEIRS, b), pub(THEIRS, B, true)],
      eve,
      names,
    };
  if (n === 2)
    return {
      us: [secret(mine, a)],
      counter: [pub(mine, A, false), pub(THEIRS, B, true)],
      them: [secret(THEIRS, b)],
      eve,
      names,
    };
  return {
    us: [secret(mine, a), final],
    counter: [pub(mine, A, false), pub(THEIRS, B, false)],
    them: [secret(THEIRS, b), final],
    eve,
    names,
  };
}

/** The home card's picture: the mix finished, both ends holding the same colour. */
export const PAINT_CARD: PaintOpts = paintAt('rose', 'final');

/** The home hero's plot: a short counter with two pots, a shared pot and an open padlock. */
export function paintPlot(x: number, y: number, top: SceneCtx['top']): string {
  let s = castShadow(boxCorners(x - 18, y - 6, BH, x + 18, y + 8, BH + 7), BH, top);
  const z = BH + 7;
  const parts = [
    { at: [x, y, 0], svg: box(x - 18, y - 6, BH, x + 18, y + 8, z, WOOD, toneI, 0.9) },
    { at: [x - 11, y + 1, 1], svg: cyl(x - 11, y + 1, z, z + 6, 3.6, matOf(mixPaint([BASE, 'rose'])), toneI, 1) },
    {
      at: [x, y + 1, 1],
      svg: cyl(x, y + 1, z, z + 6, 3.6, matOf(mixPaint([BASE, 'rose', THEIRS])), toneI, 1),
    },
    { at: [x + 11, y + 1, 1], svg: padlock(x + 11, y + 1, z, OWNER.them, true, 0.6) },
  ];
  s += byDepth(parts);
  return s;
}
