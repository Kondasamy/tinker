// The Compression module's picture: the sorting table (KTD15). A file's bytes lie sorted into piles on a workshop table,
// one pile per byte value, as tall as that byte is common: mustard tiles for one byte, cobalt on a tray for piles merged
// into the code tree, pale for "others" (the rest of a big file), tomato for pointer tickets. A parcel at the right is
// the file as sent: a wireframe crate for its raw size and a solid kraft box (taped and tied with string) for its packed
// size, poking out of the crate when packing made it bigger. It stands on a weighing scale whose needle reads packed
// over raw; the packer stands at the table's front. Words only in pills; on phones (scale > 1.5) pills keep short names and the
// caption carries the numbers. Every string is escaped (esc).
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  CERAMIC,
  DARK,
  INK,
  METAL,
  PALS,
  WOOD,
  PY,
  PZ,
  box,
  byDepth,
  castShadow,
  cyl,
  ellUV,
  fill,
  hullInk,
  ink,
  line,
  on,
  openShell,
  pd,
  rod,
  shape,
  tag,
  toneI,
  vis,
} from '../../lib/iso/core.js';
import { SKIN, mini, person, shaded, type Item, type Look, floor } from '../../lib/iso/figures';
import { countOf, type Node } from '../../lib/compression/huffman';
import { byteName } from '../../lib/compression/files';
import type { Say } from '../story/steps';

export const PILE_BOARD: Board = [0, 0, 240, 132];
/** The most piles the table shows; a bigger file's eighth is "others" (KTD15). */
export const MAX_PILES = 8;

export interface Pile {
  label: string;
  w: number;
  kind?: 'byte' | 'merged' | 'others' | 'pointer';
  /** the pile just made */
  lit?: boolean;
}
export interface PileOpts {
  piles: Pile[];
  /** the file as sent: bytes before packing and after */
  parcel?: { raw: number; packed: number };
  scale?: number;
  say?: Say;
}
/** The parts a callout may name: the first pile, the newest merged pile (or the first, with none) and the parcel. */
export const PILE_PARTS = ['piles', 'tray', 'parcel'] as const;

const GHOST = { l: '#efe9dd', m: '#ddd5c4', d: '#bdb3a0' };
const KRAFT = { l: '#e2b77a', m: '#c99a5c', d: '#7a5a32' };
const TWINE = { l: '#f1e6c8', m: '#d9c69c', d: '#a8946a' };
/** the scale's platform: the parcel stands this much above the table */
const PLAT = 2.5;
const ROWS = [36, 78],
  X0 = 24,
  DX = 40,
  HALF = 7,
  TILE = 2.4,
  STEP = 3,
  MAX_TILES = 9,
  PARCEL = [208, 96] as const,
  P_HALF = 15,
  P_RAW = 34;

/** A file's bytes as piles: its seven most common bytes, then "others" for the rest (a read-only tree, KTD15). */
export function pilesOf(bytes: Uint8Array): Pile[] {
  const all = [...countOf(bytes)].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  if (all.length <= MAX_PILES) return all.map(([b, w]) => ({ label: byteName(b), w }));
  const top = all.slice(0, MAX_PILES - 1).map(([b, w]) => ({ label: byteName(b), w }));
  const rest = all.slice(MAX_PILES - 1).reduce((a, [, w]) => a + w, 0);
  return [...top, { label: 'others', w: rest, kind: 'others' as const }];
}

/** A pile's symbols in order, for its label: "l", or "o+r" once merged. */
export const symbolsOf = (n: Node): number[] =>
  n.kids ? [...symbolsOf(n.kids[0]), ...symbolsOf(n.kids[1])] : [n.sym!];
const short = (syms: number[]) => {
  const s = syms.map(byteName).join('');
  return s.length > 5 ? `${s.slice(0, 4)}…` : s;
};
/** The merge puzzle's piles: each root of the forest, merged ones on a tray, the last made lit. */
export const forestPiles = (roots: Node[], lit?: Node): Pile[] =>
  roots.map(n => ({ label: short(symbolsOf(n)), w: n.w, kind: n.kids ? 'merged' : 'byte', lit: n === lit }));

/** What the table shows. Pure, so the tests can check it without drawing. */
export function pileState(o: PileOpts) {
  const shown = o.piles.slice(0, MAX_PILES),
    // "others" is the rest of a big file: it stands full height, so it never flattens the piles beside it
    max = Math.max(1, ...shown.filter(p => p.kind !== 'others').map(p => p.w));
  const at = (i: number): [number, number] => [X0 + (i % 4) * DX, ROWS[Math.floor(i / 4)]];
  return {
    shown,
    tiles: shown.map(p => Math.max(1, Math.min(MAX_TILES, Math.round((p.w / max) * MAX_TILES)))),
    at,
    tray: Math.max(
      0,
      shown.findIndex(p => p.lit),
      shown.findIndex(p => p.kind === 'merged'),
    ),
  };
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;

/** One pile: a stack of tiles, on a tray when merged. */
function pile(x: number, y: number, n: number, p: Pile) {
  const m = p.lit
    ? PALS.mint
    : p.kind === 'merged'
      ? PALS.cobalt
      : p.kind === 'others'
        ? GHOST
        : p.kind === 'pointer'
          ? PALS.tomato
          : PALS.mustard;
  let s = '',
    z = BH;
  let tiles = '';
  const tray = p.kind === 'merged' || p.lit;
  if (tray) z += 1.4;
  for (let i = 0; i < n; i++)
    tiles += box(x - HALF, y - HALF, z + i * STEP, x + HALF, y + HALF, z + i * STEP + TILE, m, toneI, 0.7);
  const top = z + (n - 1) * STEP + TILE;
  tiles += hullInk(boxCorners(x - HALF, y - HALF, z, x + HALF, y + HALF, top), 1.4);
  if (tray) {
    // an open wooden tray: a floor, then walls round it (the far ones behind the tiles, the near ones in front)
    const g = HALF + 3,
      ring = (zz: number, k: number) =>
        on(PZ(zz), [
          [x - g - k, y - g - k],
          [x + g + k, y - g - k],
          [x + g + k, y + g + k],
          [x - g - k, y + g + k],
        ]);
    s += box(x - g, y - g, BH, x + g, y + g, BH + 1.4, WOOD, toneI, 0.8);
    s += openShell(ring(BH + 1.4, 0), ring(BH + 4.4, 0.4), (nn: number[]) => toneI(nn, WOOD), tiles);
    s += ink(pd(ring(BH + 4.4, 0.4)), 0.9) + hullInk([...ring(BH, 0), ...ring(BH + 4.4, 0.4)], 1.4);
  } else s += tiles;
  return { svg: s, top };
}

/** The parcel: the raw size as a wireframe crate, the packed size as a solid box that may rise out of it. */
function parcel(raw: number, packed: number) {
  const [x, y] = PARCEL,
    hp = Math.min(P_RAW * 1.6, (P_RAW * packed) / Math.max(1, raw)),
    x0 = x - P_HALF,
    x1 = x + P_HALF,
    y0 = y - P_HALF,
    y1 = y + P_HALF,
    z0 = BH + PLAT,
    zb = z0 + Math.max(1, hp);
  let s = box(x0 + 2, y0 + 2, z0, x1 - 2, y1 - 2, zb, KRAFT, toneI, 1);
  // a strip of tape across the box's lid
  s += box(x - 1.5, y0 + 2, zb, x + 1.5, y1 - 2, zb + 0.3, CERAMIC, toneI, 0.4);
  // string tied round it both ways: over the lid, down the sides that face the viewer, a knot where it crosses
  // a twine stroke over an ink one: a rod's look at a sliver of its SVG
  const tw = (a: number[], b: number[]) => {
      const d = pd([a, b], false);
      return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${TWINE.l}" stroke-width=".7" stroke-linecap="round"/>`;
    },
    ty = y + 5,
    zs = zb + 0.45;
  s += tw([x0 + 2, ty, zs], [x1 - 2, ty, zs]) + tw([x - 4, y0 + 2, zs], [x - 4, y1 - 2, zs]);
  for (const [n, a, b] of [
    [
      [1, 0, 0],
      [x1 - 1.6, ty, zs],
      [x1 - 1.6, ty, z0],
    ],
    [
      [-1, 0, 0],
      [x0 + 1.6, ty, zs],
      [x0 + 1.6, ty, z0],
    ],
    [
      [0, 1, 0],
      [x - 4, y1 - 1.6, zs],
      [x - 4, y1 - 1.6, z0],
    ],
    [
      [0, -1, 0],
      [x - 4, y0 + 1.6, zs],
      [x - 4, y0 + 1.6, z0],
    ],
  ])
    if (vis(n)) s += tw(a, b);
  s += cyl(x - 4, ty, zs - 0.2, zs + 0.6, 1, TWINE, toneI, 0.5, 8);
  const zt = z0 + P_RAW,
    corners: [number, number][] = [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ];
  s += line([...corners.map(([a, b]) => [a, b, zt]), [x0, y0, zt]], 0.9);
  for (const [a, b] of corners)
    s += line(
      [
        [a, b, z0],
        [a, b, zt],
      ],
      0.7,
    );
  s += line(
    [
      [x0, y1, z0],
      [x1, y1, z0],
      [x1, y0, z0],
    ],
    0.7,
  );
  return {
    svg: `<g data-prop="parcel" data-raw="${raw}" data-packed="${packed}">${s}</g>`,
    top: z0 + Math.max(hp, P_RAW),
  };
}

/** The weighing scale under the parcel. Real-object notes: a steel platform on a low dark base; a column at the back
 * corner carrying a round dial, its face toward the viewer, ticks round the rim and a red needle that swings with the
 * weight on the platform (here packed over raw, a full turn's three quarters for the raw size). No numerals. */
function weighScale(raw: number, packed: number): { plat: string; dial: Item } {
  const [x, y] = PARCEL,
    g = P_HALF + 2,
    cx = 232,
    cy = 74,
    dz = BH + 26,
    R = 6.5;
  const plat =
    box(x - g + 1, y - g + 1, BH, x + g - 1, y + g - 1, BH + 1, DARK, toneI, 0.9) +
    box(x - g, y - g, BH + 1, x + g, y + g, BH + PLAT, METAL, toneI, 1);
  // the dial lies in the plane y = cy + 2.6, facing +y; on a turn where that face looks away only its back shows
  const Y = cy + 2.6,
    face = vis([0, 1, 0]),
    disc = (r: number, out = 0) => on(PY(Y + out), ellUV(cx, dz, r, r, 24));
  let col =
    rod([cx, cy, BH], [cx, cy, dz - R], 1.6, METAL, toneI, 1) + cyl(cx, cy, BH, BH + 1.6, 3.4, DARK, toneI, 1, 14);
  col += rod([cx, cy - 0.4, dz], [cx, Y, dz], R + 1, PALS.tomato, toneI, 1.2, R + 1, 14);
  if (face) {
    col += fill(pd(disc(R, 0.05)), CERAMIC.l) + ink(pd(disc(R, 0.05)), 0.8);
    for (let i = 0; i <= 8; i++) {
      const a = ((225 - i * 33.75) * Math.PI) / 180;
      col += line(
        [
          [cx + Math.cos(a) * R * 0.78, Y + 0.1, dz + Math.sin(a) * R * 0.78],
          [cx + Math.cos(a) * R * 0.95, Y + 0.1, dz + Math.sin(a) * R * 0.95],
        ],
        0.6,
      );
    }
    const t = Math.min(1.6, packed / Math.max(1, raw)) * 0.75,
      a = ((225 - t * 270) * Math.PI) / 180;
    col += shape(
      [
        [cx - Math.sin(a) * 0.5, Y + 0.15, dz + Math.cos(a) * 0.5],
        [cx + Math.cos(a) * R * 0.85, Y + 0.15, dz + Math.sin(a) * R * 0.85],
        [cx + Math.sin(a) * 0.5, Y + 0.15, dz - Math.cos(a) * 0.5],
      ],
      PALS.tomato.d,
      0.5,
    );
    col += fill(pd(on(PY(Y + 0.2), ellUV(cx, dz, 0.9, 0.9, 10))), DARK.d);
  }
  // the platform is drawn with the parcel standing on it (one item: nothing can come between them)
  return {
    plat: `<g data-prop="scale" data-needle="${packed}/${raw}">${plat}</g>`,
    dial: {
      box: [
        [cx - R - 1, cy - 3.4, BH],
        [cx + R + 1, Y + 0.3, dz + R + 1],
      ],
      svg: `<g data-prop="dial">${col}</g>`,
    },
  };
}

/** The packer at the table's front, apron on, turned toward the scale. */
const PACKER: Look = {
  skin: SKIN[4],
  top: PALS.blush.m,
  legs: '#4a4642',
  hair: '#2b231c',
  cut: 'ponytail',
  hat: 'cap',
  hatCol: PALS.mint.m,
};
const packer = () => person({ x: 150, y: 118, facing: 330, look: PACKER });

export const bytesWord = (n: number) => `${n} B`;

/** The table: shadows, piles back to front, the parcel, then the pills. */
export const pileScene = (o: PileOpts) => (ctx: SceneCtx) => {
  const st = pileState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5;
  // every shadow first (the floor layer), then one sort over every item
  let s = '';
  const parts: Item[] = [];
  const tops: number[] = [];
  st.shown.forEach((p, i) => {
    const [x, y] = st.at(i),
      d = pile(x, y, st.tiles[i], p),
      g = p.kind === 'merged' || p.lit ? HALF + 3.4 : HALF;
    tops.push(d.top);
    s += castShadow(boxCorners(x - g, y - g, BH, x + g, y + g, d.top), BH, ctx.top);
    parts.push({
      box: [
        [x - g, y - g, BH],
        [x + g, y + g, d.top],
      ],
      svg: `<g data-pile="${i}" data-w="${p.w}"${p.kind ? ` data-kind="${p.kind}"` : ''}${p.lit ? ' data-lit="1"' : ''}>${d.svg}</g>`,
    });
  });
  let ptop = 0;
  if (o.parcel) {
    const pc = parcel(o.parcel.raw, o.parcel.packed),
      sc = weighScale(o.parcel.raw, o.parcel.packed);
    ptop = pc.top;
    const b = sc.dial.box,
      g = P_HALF + 2;
    s += castShadow(boxCorners(b[0][0], b[0][1], b[0][2], b[1][0], b[1][1], b[1][2]), BH, ctx.top);
    s += castShadow(boxCorners(PARCEL[0] - g, PARCEL[1] - g, BH, PARCEL[0] + g, PARCEL[1] + g, ptop), BH, ctx.top);
    parts.push(sc.dial, {
      box: [
        [PARCEL[0] - g, PARCEL[1] - g, BH],
        [PARCEL[0] + g, PARCEL[1] + g, ptop],
      ],
      svg: sc.plat + pc.svg,
    });
  }
  const pk = packer();
  s += pk.shadow;
  parts.push(...pk.items);
  s += byDepth(parts);
  if (st.shown.length) s += `<g data-prop="piles"></g><g data-prop="tray"></g>`;
  let pills = '';
  // the back row's pills ride higher, so they clear the front row's
  const lift = (i: number) => (i < 4 ? -30 : -12);
  st.shown.forEach((p, i) => {
    const [x, y] = st.at(i);
    const text = narrow ? p.label : `${p.label} · ${p.w}`;
    pills += pill([x, y, tops[i]], 0, lift(i), text, !!p.lit, scale, p.kind === 'others' ? '#ece7dc' : undefined);
  });
  if (o.parcel) {
    const { raw, packed } = o.parcel,
      top = [PARCEL[0], PARCEL[1], ptop];
    pills += pill(
      top,
      0,
      -14,
      narrow ? bytesWord(packed) : `${bytesWord(packed)} OF ${bytesWord(raw)}`,
      packed !== raw,
      scale,
    );
    pills += sayAt(o.say, 'parcel', top, -14, scale);
  }
  if (st.shown.length) {
    const first = st.at(0),
      t = st.at(st.tray);
    pills += sayAt(o.say, 'piles', [...first, tops[0]], lift(0), scale);
    pills += sayAt(o.say, 'tray', [...t, tops[st.tray]], lift(st.tray), scale);
  }
  return s + pills;
};

/** The picture in words, for its aria-label. */
export function pileLabel(o: PileOpts): string {
  const st = pileState(o);
  const piles = st.shown.length
    ? `A sorting table with ${st.shown.length} pile${st.shown.length === 1 ? '' : 's'}: ${st.shown.map(p => `${p.label} (${p.w})`).join(', ')}.`
    : 'An empty sorting table.';
  const box = o.parcel
    ? ` The parcel holds ${bytesWord(o.parcel.packed)} of the ${bytesWord(o.parcel.raw)} file${o.parcel.packed > o.parcel.raw ? ', bigger than it started' : ''}.`
    : '';
  return piles + box;
}

/** What the caption carries (phones show only short names in the pills). */
export function pileReadouts(o: PileOpts): string[] {
  const st = pileState(o);
  return [
    ...(st.shown.length ? [`${st.shown.length} pile${st.shown.length === 1 ? '' : 's'}`] : []),
    ...(o.parcel ? [`${bytesWord(o.parcel.packed)} of ${bytesWord(o.parcel.raw)}`] : []),
  ];
}

/** The reader: a file's bytes on the table, with its packed size in the parcel. */
export const pileAt = (bytes: Uint8Array, packed = bytes.length): PileOpts => ({
  piles: pilesOf(bytes),
  parcel: { raw: bytes.length, packed },
});

/** The home hero's plot: three piles of tiles, tall to short, the parcel on its weighing scale, and the packer. */
export function pilePlot(x: number, y: number, top: SceneCtx['top']): string {
  const h = 4.5;
  const stacks: [number, number, number, typeof PALS.mustard][] = [
    [x - 14, y - 6, 5, PALS.mustard],
    [x - 2, y - 6, 3, PALS.mustard],
    [x - 8, y + 8, 2, PALS.cobalt],
  ];
  let s = stacks
    .map(([sx, sy, n]) => castShadow(boxCorners(sx - h, sy - h, BH, sx + h, sy + h, BH + n * 2.2), BH, top))
    .join('');
  const parts = stacks.map(([sx, sy, n, m]) => {
    let c = '';
    for (let i = 0; i < n; i++)
      c += box(sx - h, sy - h, BH + i * 2.2, sx + h, sy + h, BH + i * 2.2 + 1.8, m, toneI, 0.5);
    return { at: [sx, sy, 0], svg: c + hullInk(boxCorners(sx - h, sy - h, BH, sx + h, sy + h, BH + n * 2.2), 1.1) };
  });
  // the parcel on the weighing scale, in miniature, and the packer beside it
  const pc = parcel(34, 20),
    sc = weighScale(34, 20),
    g = P_HALF + 2,
    table = shaded([
      sc.dial,
      {
        box: [
          [PARCEL[0] - g, PARCEL[1] - g, BH],
          [PARCEL[0] + g, PARCEL[1] + g, pc.top],
        ],
        svg: sc.plat + pc.svg,
      },
    ]),
    pieces = [
      mini(table, [...PARCEL, BH], [x + 10, y + 6, BH], 0.4),
      mini(packer(), [150, 118, BH], [x - 6, y + 16, BH], 0.5),
    ];
  s += floor(pieces.map(p => p.shadow).join(''), top);
  return s + byDepth([...parts, ...pieces.flatMap(p => p.items)]);
}
