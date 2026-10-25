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
  hullInk,
  inkK,
  matOf,
  P,
  pd,
  rod,
  tag,
  toneI,
} from '../../lib/iso/core.js';
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

/** One item at a point: its drawing, the height of its top, and its fill for the pill. */
function itemAt(it: Item, x: number, y: number): { svg: string; top: number; fill?: string } {
  const z = TOP;
  switch (it.kind) {
    case 'pot': {
      const colour = mixPaint(it.pigments ?? ['straw']);
      const body =
        cyl(x, y, z, z + 10, 6.5, matOf(colour), toneI, 1.2) + cyl(x, y, z + 10, z + 11, 7, METAL, toneI, 0.8);
      return { svg: body, top: z + 11, fill: colour };
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

/** The eavesdropper: a dark coat and a hat behind the counter's middle. */
function eavesdropper(top: SceneCtx['top']) {
  const [x, y] = EVE;
  return {
    shadow: castShadow(boxCorners(x - 7, y - 7, BH, x + 7, y + 7, BH + 40), BH, top),
    svg:
      cyl(x, y, BH, BH + 28, 8, DARK, toneI, 1.4) +
      cyl(x, y, BH + 28, BH + 37, 5.5, matOf('#e9c9a8'), toneI, 1.2) +
      cyl(x, y, BH + 37, BH + 38, 9, DARK, toneI, 1) +
      cyl(x, y, BH + 38, BH + 43, 5.5, DARK, toneI, 1.1),
    top: BH + 43,
  };
}

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
  let s = castShadow(boxCorners(C0[0], C0[1], BH, C0[2], C0[3], TOP), BH, ctx.top);
  const parts: { at: number[]; svg: string }[] = [];
  let eveTop = 0;
  if (o.eve !== undefined) {
    const e = eavesdropper(ctx.top);
    s += e.shadow;
    eveTop = e.top;
    parts.push({ at: [EVE[0], EVE[1], 0], svg: `<g data-prop="eve">${e.svg}</g>` });
  }
  const counter =
    box(C0[0], C0[1], BH, C0[2], C0[3], TOP, WOOD, toneI, 1) +
    // the open middle: a pale mat anyone can see
    box(SLOT.counter - 22, C0[1] + 2, TOP, SLOT.counter + 22, C0[3] - 2, TOP + 0.4, CERAMIC, toneI, 0.6) +
    hullInk(boxCorners(C0[0], C0[1], BH, C0[2], C0[3], TOP), 1.8);
  parts.push({ at: [C0[0], C0[1], 0], svg: `<g data-prop="counter">${counter}</g>` });
  const placed = layout(o).map(p => ({ ...p, d: itemAt(p.it, p.x, p.y) }));
  let items = '';
  for (const p of placed)
    items += `<g data-item="${p.it.kind}" data-slot="${p.slot}"${p.it.fresh ? ' data-fresh="1"' : ''}${p.it.lit ? ' data-lit="1"' : ''}${p.it.pigments ? ` data-colour="${mixPaint(p.it.pigments)}"` : ''}>${p.d.svg}</g>`;
  s += byDepth(parts) + items + '<g data-prop="us"></g><g data-prop="them"></g>';
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
  return s + pills;
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
